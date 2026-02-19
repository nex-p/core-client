/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  ActionType,
  ParamsType,
  ProColumns,
  ProTable,
  ProTableProps,
} from "@ant-design/pro-components";
import { Alert, App, Button, Spin, Typography } from "antd";
import { ExpandableConfig } from "antd/es/table/interface";
import { FormInstance } from "antd/lib";
import { isAxiosError } from "axios";
import { Settings, AlertCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FunctionComponent,
  JSX,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DataCore } from "../core-client/client";
import { ApplyQuery } from "../core-client/ds-query-min";
import { UIPermission } from "../types";
import CreateForm from "./create-form";
import Delete from "./delete-button";
import UpdateForm from "./update-form";

const { Text } = Typography;

/* -------------------- Type Definitions -------------------- */

interface Permissions {
  read: UIPermission;
  insert: UIPermission;
  update: UIPermission;
  delete: UIPermission;
}

interface ADTProps {
  title: string;
  entity: string;
  scope: string;

  disableUpdate?: ((record: Record<string, any>) => boolean) | boolean;
  disableDelete?: ((record: Record<string, any>) => boolean) | boolean;
  disableCreate?: boolean;

  customColumns?: ProColumns<Record<string, any>, "string">[];
  fieldsList?: string[];
  extendsField?: { refFieldName: string; refEntityFields: string[] }[];

  updateDataTransform?: (data: Record<string, any>) => Record<string, any>;
  transformCreateData?: (
    data: Record<string, any>,
  ) => Record<string, any> | Record<string, any>[];
  transformUpdateData?: (
    data: Record<string, any>,
  ) => Record<string, any> | Record<string, any>[];

  createFormInitialData?: Record<string, any>;
  excludeCreateForm?: string[];
  excludeUpdateForm?: string[];
  createForm?: (form: FormInstance, data?: Record<string, any>) => ReactNode;
  updateForm?: (form: FormInstance, data?: Record<string, any>) => ReactNode;

  getRefURL?: (record: Record<string, any>) => string;
  redirectAfterCreate?: (record: Record<string, any>) => void;

  afterCreate?: (record: Record<string, any>) => void;
  afterDelete?: () => void;
  afterUpdate?: (record: Record<string, any>) => void;

  createBtnTitle?: string;
  createPreProcess?: (record: Record<string, any>) => Promise<void>;
  customRowAction?: (
    record: Record<string, any>,
    actionRef?: RefObject<ActionType | undefined>,
  ) => ReactNode[];

  expandable?: ExpandableConfig<Record<string, any>>;
  onRow?: any;
  params?: ParamsType;

  dataCoreFilter?: (dataCore: DataCore) => void;

  showIndexColumn?: boolean;
  defaultPageSize?: number;
  enablePersistentState?: boolean;
  persistenceKey?: string;

  search?: ProTableProps<Record<string, any>, ParamsType>["search"];
  options?: ProTableProps<Record<string, any>, ParamsType>["options"];
  toolBarRender?: ProTableProps<
    Record<string, any>,
    ParamsType
  >["toolBarRender"];
  pagination?: ProTableProps<Record<string, any>, ParamsType>["pagination"];

  queryStringKey?: string;

  footer?: ReactNode;
  searchFormRender?:
    | ((
        props: ProTableProps<
          Record<string, any>,
          {
            __q: string | null;
          },
          "string"
        >,
        defaultDom: JSX.Element,
      ) => React.ReactNode)
    | undefined;
}

/* -------------------- Query String Parsing -------------------- */

interface ParsedFilter {
  operator: string;
  value: string | string[];
  rawValue: string;
}

interface ParsedSort {
  field: string;
  order: "ascend" | "descend";
}

/**
 * Extract filters and sorting from query string
 * Returns a map of column names to filter objects for ProTable
 */
const extractFiltersFromQuery = (
  queryString: string | null,
): {
  filtersMap: Record<string, ParsedFilter | null>;
  sortConfig: ParsedSort | null;
} => {
  const filtersMap: Record<string, ParsedFilter | null> = {};
  let sortConfig: ParsedSort | null = null;

  if (!queryString) {
    return { filtersMap, sortConfig };
  }

  try {
    const params = new URLSearchParams(queryString);

    params.forEach((value, key) => {
      // Handle order parameter
      if (key === "order") {
        const match = value.match(/^([^.]+)\.(asc|desc)$/);
        if (match) {
          sortConfig = {
            field: match[1],
            order: match[2] === "asc" ? "ascend" : "descend",
          };
        }
        return;
      }

      // Skip other structural parameters
      if (["select", "limit", "offset", "or", "and"].includes(key)) {
        return;
      }

      // Parse field filters
      if (value === "is.null") {
        filtersMap[key] = {
          operator: "is_null",
          value: "",
          rawValue: value,
        };
        return;
      }

      if (value === "not.is.null") {
        filtersMap[key] = {
          operator: "is_not_null",
          value: "",
          rawValue: value,
        };
        return;
      }

      // Parse operator.value format
      const dotIndex = value.indexOf(".");
      if (dotIndex === -1) {
        // No operator, default to eq
        filtersMap[key] = {
          operator: "eq",
          value: decodeURIComponent(value),
          rawValue: value,
        };
        return;
      }

      let operator = value.slice(0, dotIndex);
      let operatorValue = value.slice(dotIndex + 1);

      // Handle negation
      const isNegated = operator.startsWith("not.");
      if (isNegated) {
        operator = operator.slice(4); // Remove 'not.' prefix
      }

      // Parse different operator types
      switch (operator) {
        case "eq":
          filtersMap[key] = {
            operator: isNegated ? "neq" : "eq",
            value: decodeURIComponent(operatorValue),
            rawValue: value,
          };
          break;

        case "neq":
          filtersMap[key] = {
            operator: "neq",
            value: decodeURIComponent(operatorValue),
            rawValue: value,
          };
          break;

        case "gt":
        case "gte":
        case "lt":
        case "lte":
          filtersMap[key] = {
            operator: isNegated ? `not_${operator}` : operator,
            value: decodeURIComponent(operatorValue),
            rawValue: value,
          };
          break;

        case "like":
          // Extract pattern without wildcards for display
          const likePattern = operatorValue.replace(/^\*|\*$/g, "");
          const likeOp =
            operatorValue.startsWith("*") && operatorValue.endsWith("*")
              ? "contain"
              : operatorValue.startsWith("*")
                ? "ends_with"
                : operatorValue.endsWith("*")
                  ? "starts_with"
                  : "equal";

          filtersMap[key] = {
            operator: isNegated ? `not_${likeOp}` : likeOp,
            value: decodeURIComponent(likePattern),
            rawValue: value,
          };
          break;

        case "ilike":
          const ilikePattern = operatorValue.replace(/^\*|\*$/g, "");
          filtersMap[key] = {
            operator: isNegated ? "not_contain" : "contain",
            value: decodeURIComponent(ilikePattern),
            rawValue: value,
          };
          break;

        case "in":
          // Format: in.(value1,value2,value3)
          const inMatch = operatorValue.match(/^\((.+)\)$/);
          if (inMatch) {
            const values = inMatch[1]
              .split(",")
              .map((v) => decodeURIComponent(v.trim()));
            filtersMap[key] = {
              operator: isNegated ? "not_in" : "in",
              value: values,
              rawValue: value,
            };
          }
          break;

        case "cs":
          // Format: cs.{value1,value2}
          const csMatch = operatorValue.match(/^\{(.+)\}$/);
          if (csMatch) {
            const values = csMatch[1]
              .split(",")
              .map((v) => decodeURIComponent(v.trim()));
            filtersMap[key] = {
              operator: isNegated ? "not_contains" : "contains",
              value: values,
              rawValue: value,
            };
          }
          break;

        case "phfts":
        case "plfts":
        case "wfts":
          // Full-text search
          const ftsValue = operatorValue.replace(/^english\./, "");
          filtersMap[key] = {
            operator: "fts",
            value: decodeURIComponent(ftsValue),
            rawValue: value,
          };
          break;

        default:
          // Unknown operator, store as-is
          filtersMap[key] = {
            operator,
            value: decodeURIComponent(operatorValue),
            rawValue: value,
          };
      }
    });
  } catch (error) {
    console.error("Failed to extract filters from query string:", error);
  }

  return { filtersMap, sortConfig };
};

/**
 * Convert parsed filter to ProTable filter format
 */
const convertToProTableFilter = (filter: ParsedFilter | null): any[] | null => {
  if (!filter) return null;

  // For ProTable, we need to return the filter in the format it expects
  // This is typically an array with the filter definition as JSON string
  const filterObject = {
    filter: filter.operator,
    value: filter.value,
  };

  return [JSON.stringify(filterObject)];
};

/* -------------------- Query String Validation -------------------- */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const validateQueryString = (queryString: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!queryString || queryString.trim() === "") {
    return { isValid: true, errors, warnings };
  }

  try {
    // Parse the query string
    const params = new URLSearchParams(queryString);

    // Valid operators
    const validOperators = new Set([
      "eq",
      "neq",
      "gt",
      "gte",
      "lt",
      "lte",
      "like",
      "ilike",
      "not.like",
      "not.ilike",
      "in",
      "not.in",
      "is",
      "not.is",
      "cs",
      "not.cs",
      "cd",
      "not.cd",
      "ov",
      "not.ov",
      "sl",
      "not.sl",
      "sr",
      "not.sr",
      "nxl",
      "not.nxl",
      "nxr",
      "not.nxr",
      "adj",
      "not.adj",
      "phfts",
      "plfts",
      "wfts",
    ]);

    // Valid structural keys
    const structuralKeys = new Set([
      "select",
      "order",
      "limit",
      "offset",
      "or",
      "and",
    ]);

    params.forEach((value, key) => {
      // Skip structural parameters
      if (structuralKeys.has(key)) {
        // Validate structural parameters
        switch (key) {
          case "limit":
          case "offset":
            if (isNaN(Number(value)) || Number(value) < 0) {
              errors.push(
                `${key} must be a non-negative number, got: ${value}`,
              );
            }
            break;
          case "order":
            // Format: column.asc or column.desc
            if (!value.match(/^[a-zA-Z_][a-zA-Z0-9_]*\.(asc|desc)$/)) {
              errors.push(
                `Invalid order format: ${value}. Expected: column.asc or column.desc`,
              );
            }
            break;
          case "select":
            // Format: column1,column2 or column1(subfield1,subfield2)
            if (!value.match(/^[a-zA-Z_][a-zA-Z0-9_,().*]*$/)) {
              warnings.push(`Potentially invalid select format: ${value}`);
            }
            break;
          case "or":
          case "and":
            // Format: (condition1,condition2)
            if (!value.match(/^\(.+\)$/)) {
              errors.push(`${key} must be wrapped in parentheses: ${value}`);
            }
            break;
        }
        return;
      }

      // Validate field filters
      if (value === "is.null" || value === "not.is.null") {
        // Valid null checks
        return;
      }

      // Check for operator format: operator.value
      const dotIndex = value.indexOf(".");
      if (dotIndex === -1) {
        // No operator, might be shorthand for eq
        warnings.push(
          `No operator specified for ${key}, will default to eq: ${value}`,
        );
        return;
      }

      const operator = value.slice(0, dotIndex);
      const operatorValue = value.slice(dotIndex + 1);

      // Handle negation prefix
      const actualOperator = operator.startsWith("not.") ? operator : operator;

      // Check if operator is valid
      if (
        !validOperators.has(actualOperator) &&
        !actualOperator.startsWith("phfts") &&
        !actualOperator.startsWith("plfts")
      ) {
        errors.push(
          `Unknown operator '${actualOperator}' for field '${key}' in: ${value}`,
        );
      }

      // Validate operator-specific formats
      if (actualOperator === "in" || actualOperator === "not.in") {
        // Format: in.(value1,value2,value3)
        if (!operatorValue.match(/^\(.+\)$/)) {
          errors.push(
            `'in' operator must have values in parentheses for field '${key}': ${value}`,
          );
        }
      }

      if (actualOperator === "cs" || actualOperator === "not.cs") {
        // Format: cs.{value1,value2}
        if (!operatorValue.match(/^\{.+\}$/)) {
          errors.push(
            `'cs' operator must have values in curly braces for field '${key}': ${value}`,
          );
        }
      }

      // Validate field name
      if (!key.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
        warnings.push(`Potentially invalid field name: ${key}`);
      }

      // Check for empty values
      if (!operatorValue || operatorValue.trim() === "") {
        errors.push(
          `Empty value for field '${key}' with operator '${actualOperator}'`,
        );
      }
    });

    // Check for common mistakes
    const queryLower = queryString.toLowerCase();

    if (queryLower.includes("=like.%") || queryLower.includes("=ilike.%")) {
      warnings.push(
        "Pattern matching: Use * instead of % for wildcards (e.g., like.*value* not like.%value%)",
      );
    }

    if (queryLower.includes(" and ") || queryLower.includes(" or ")) {
      warnings.push(
        "Logical operators should use the and=(...) or or=(...) format, not inline AND/OR",
      );
    }

    if (queryString.includes("==")) {
      errors.push("Use single = for assignment, not ==");
    }
  } catch (error) {
    errors.push(
      `Failed to parse query string: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/* -------------------- Custom Hooks -------------------- */

const usePermissions = (entity: string, scope: string) => {
  const [permissions, setPermissions] = useState<Permissions>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkPermissions = async () => {
      setLoading(true);
      setError(null);

      try {
        const p = await new DataCore(entity, scope).allowPermission();
        if (mounted) setPermissions(p);
      } catch (err) {
        if (!mounted) return;
        const message = isAxiosError(err)
          ? (err.response?.data ?? "Permission check failed")
          : "Permission check failed";
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkPermissions();
    return () => {
      mounted = false;
    };
  }, [entity, scope]);

  return { permissions, loading, error };
};

const useUrlState = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialPagination = useMemo(() => {
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.max(10, Number(searchParams.get("size") ?? "10"));
    return { current: page, pageSize };
  }, [searchParams]);

  // Extract filters and sort from query string
  const { filtersMap, sortConfig } = useMemo(() => {
    const queryString = searchParams.get("q");
    return extractFiltersFromQuery(queryString);
  }, [searchParams]);

  const urlKey = useMemo(() => searchParams.get("q"), [searchParams]);

  return {
    router,
    pathname,
    searchParams,
    initialPagination,
    filtersMap,
    sortConfig,
    urlKey,
  };
};

/* -------------------- Main Component -------------------- */

const ADT: FunctionComponent<ADTProps> = ({
  title,
  entity,
  scope,
  disableCreate = false,
  disableUpdate = false,
  disableDelete = false,

  customColumns = [],
  fieldsList,
  extendsField,
  createFormInitialData,
  updateDataTransform,
  excludeCreateForm,
  excludeUpdateForm,

  createForm,
  updateForm,

  getRefURL,
  dataCoreFilter,
  redirectAfterCreate,

  afterCreate,
  afterDelete,
  afterUpdate,

  createBtnTitle,
  customRowAction,
  expandable,
  transformCreateData,
  transformUpdateData,
  createPreProcess,
  onRow,
  params,

  showIndexColumn = true,
  defaultPageSize = 10,
  enablePersistentState = true,
  persistenceKey,

  search,
  options,
  toolBarRender,
  pagination,

  queryStringKey = "q",
  footer,
  searchFormRender,
}) => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [dataLoading, setDataLoading] = useState(false);

  const app = App.useApp();

  const {
    permissions,
    loading: permissionsLoading,
    error: permissionsError,
  } = usePermissions(entity, scope);

  const {
    router,
    pathname,
    searchParams,
    initialPagination,
    filtersMap,
    sortConfig,
    urlKey,
  } = useUrlState();

  // Columns generation
  const columns: ProColumns<Record<string, any>, "string">[] = useMemo(() => {
    const cols: ProColumns<Record<string, any>, "string">[] = [];

    if (showIndexColumn) {
      cols.push({
        dataIndex: "index",
        valueType: "indexBorder",
        onFilter: true,
        fixed: "left",
        width: 48,
      });
    }

    if (customColumns.length > 0) {
      const mapped = customColumns.map((c) => {
        const clone = { ...c };

        // Apply filters from query string
        if (typeof clone.dataIndex === "string") {
          const filter = filtersMap[clone.dataIndex];

          if (filter && !(clone as any).defaultFilteredValue) {
            // Convert to ProTable filter format
            const proTableFilter = convertToProTableFilter(filter);
            if (proTableFilter) {
              (clone as any).filteredValue = proTableFilter;
              (clone as any).filtered = true;
            }
          }

          // Apply sort from query string
          if (
            sortConfig &&
            clone.dataIndex === sortConfig.field &&
            !(clone as any).defaultSortOrder
          ) {
            (clone as any).defaultSortOrder = sortConfig.order;
          }
        }

        return clone;
      });

      cols.push(...mapped);
    }

    // Action column
    const hasActions =
      typeof disableUpdate === "function" ||
      !disableUpdate ||
      getRefURL ||
      typeof disableDelete === "function" ||
      !disableDelete ||
      customRowAction;

    if (hasActions) {
      cols.push({
        title: "Action",
        valueType: "option",
        align: "right",
        key: "option",
        fixed: "right",
        width: 200,
        render: (text, record) => {
          const actions: ReactNode[] = [];

          if (customRowAction) {
            actions.push(...customRowAction(record, actionRef));
          }

          const canUpdate =
            typeof disableUpdate === "function"
              ? !disableUpdate(record)
              : !disableUpdate;

          if (canUpdate && updateForm && permissions?.update?.allow) {
            actions.push(
              <UpdateForm
                key={`update-${record.core_id}`}
                record={record}
                data={
                  updateDataTransform ? updateDataTransform(record) : record
                }
                content={(form, rec) => updateForm(form, rec)}
                entity={entity}
                scope={scope}
                actionRef={actionRef}
                permission={permissions.update}
                coreId={record.core_id}
                excludeKeys={excludeUpdateForm}
                afterUpdate={afterUpdate}
                transformData={transformUpdateData}
              />,
            );
          }

          const canDelete =
            typeof disableDelete === "function"
              ? !disableDelete(record)
              : !disableDelete;

          if (canDelete && permissions?.delete?.allow) {
            actions.push(
              <Delete
                key={`delete-${record.core_id}`}
                actionRef={actionRef}
                disabled={false}
                scope={scope}
                entity={entity}
                coreId={record.core_id}
                permission={permissions.delete.allow}
                afterDelete={afterDelete}
              />,
            );
          }

          if (getRefURL) {
            actions.push(
              <Link key={`ref-${record.core_id}`} href={getRefURL(record)}>
                <Button type="text" icon={<Settings size={15} />} />
              </Link>,
            );
          }

          return <div className="flex justify-end gap-1">{actions}</div>;
        },
      });
    }

    return cols;
  }, [
    showIndexColumn,
    customColumns,
    filtersMap,
    sortConfig,
    disableUpdate,
    disableDelete,
    getRefURL,
    customRowAction,
    updateForm,
    permissions,
    updateDataTransform,
    excludeUpdateForm,
    afterUpdate,
    transformUpdateData,
    entity,
    scope,
    afterDelete,
  ]);

  // Request handler with query string parser and validation
  const request = useCallback(
    async (
      parms: any,
      sort: Record<string, any>,
      _filter: Record<string, any>,
    ) => {
      console.log("ADT request called with params:", parms, sort, _filter);
      try {
        setDataLoading(true);
        const dataSource = new DataCore(entity, scope);

        // Apply query string if present
        const queryString = searchParams.get(queryStringKey);
        if (queryString) {
          console.log("Applying query string:", queryString);

          // Validate query string
          const validation = validateQueryString(queryString);

          // Log warnings
          if (validation.warnings.length > 0) {
            console.warn("Query string warnings:", validation.warnings);
            validation.warnings.forEach((warning) => {
              app.message.warning(warning, 3);
            });
          }

          // Handle errors
          if (!validation.isValid) {
            console.error("Query string validation errors:", validation.errors);
            validation.errors.forEach((error) => {
              app.message.error(error, 5);
            });

            // Still try to apply the query, but user is warned
            // You can choose to return early here if you want strict validation
            // return { data: [], success: false, total: 0 };
          } else {
            console.log("Query string is valid.");
          }

          ApplyQuery(dataSource, queryString);
        }

        // Pagination (always apply, can override query string)
        if (
          typeof parms.current === "number" &&
          typeof parms.pageSize === "number"
        ) {
          dataSource.includeCount();
          dataSource.limit(parms.pageSize);
          dataSource.offset((parms.current - 1) * parms.pageSize);
        }

        // Field selection
        if (fieldsList && fieldsList.length > 0) {
          dataSource.select(...fieldsList);
        }

        // Extend fields
        if (extendsField && extendsField.length > 0) {
          extendsField.forEach((field) => {
            if (field.refFieldName && field.refEntityFields.length > 0) {
              dataSource.extends(field.refFieldName, field.refEntityFields);
            }
          });
        }

        if (params && Object.keys(params).length > 0) {
          const searchFilter: string[] = [];

          Object.keys(params).forEach((key: string) => {
            const value = params[key];
            if (
              !["current", "pageSize", "sort", "filter", "__q"].includes(key)
            ) {
              searchFilter.push(`${key}.${value}`);
            }
          });
          if (searchFilter.length > 0) {
            dataSource.and(searchFilter);
          }
        }

        // Apply custom data core filter (always runs last)
        if (dataCoreFilter) {
          dataCoreFilter(dataSource);
        }

        const result = await dataSource.query();
        return {
          data: result.data || [],
          success: true,
          total: result.count || 0,
        };
      } catch (error) {
        let message = "Something went wrong fetching data";
        if (isAxiosError(error)) {
          message =
            error.response?.data?.message ||
            error.response?.data ||
            error.message ||
            message;
        } else if (error instanceof Error) {
          message = error.message;
        }

        app.message.error(message);
        return { data: [], success: false, total: 0 };
      } finally {
        setDataLoading(false);
      }
    },
    [
      entity,
      scope,
      queryStringKey,
      searchParams,
      fieldsList,
      extendsField,
      dataCoreFilter,
      app.message,
    ],
  );

  // Build query string from filters and sorters
  const buildQueryString = useCallback(
    (filters: Record<string, any>, sorter: any): string => {
      const queryParts: string[] = [];

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value == null) return;

        if (Array.isArray(value)) {
          if (value.length === 0) return;

          // Parse filter object from JSON string
          try {
            const filterData = JSON.parse(value[0]);
            const { filter, value: filterValue, value1 } = filterData;

            switch (filter) {
              // Equality operators
              case "equal":
              case "equals":
                queryParts.push(`${key}=eq.${encodeURIComponent(filterValue)}`);
                break;
              case "not_equal":
              case "not equals":
                queryParts.push(
                  `${key}=neq.${encodeURIComponent(filterValue)}`,
                );
                break;

              // Pattern matching
              case "contain":
              case "ilike":
                queryParts.push(
                  `${key}=ilike.*${encodeURIComponent(filterValue)}*`,
                );
                break;
              case "not_contain":
              case "not ilike":
              case "not like":
                queryParts.push(
                  `${key}=not.like.*${encodeURIComponent(filterValue)}*`,
                );
                break;
              case "starts_with":
                queryParts.push(
                  `${key}=like.${encodeURIComponent(filterValue)}*`,
                );
                break;
              case "ends_with":
                queryParts.push(
                  `${key}=like.*${encodeURIComponent(filterValue)}`,
                );
                break;

              // Comparison operators
              case "gt":
              case "greater_than":
                queryParts.push(`${key}=gt.${encodeURIComponent(filterValue)}`);
                break;
              case "gte":
              case "greater_than_or_equal":
                queryParts.push(
                  `${key}=gte.${encodeURIComponent(filterValue)}`,
                );
                break;
              case "lt":
              case "less_than":
                queryParts.push(`${key}=lt.${encodeURIComponent(filterValue)}`);
                break;
              case "lte":
              case "less_than_or_equal":
                queryParts.push(
                  `${key}=lte.${encodeURIComponent(filterValue)}`,
                );
                break;

              // Range operators
              case "between":
                if (Array.isArray(filterValue) && filterValue.length >= 2) {
                  queryParts.push(
                    `${key}=gte.${encodeURIComponent(filterValue[0])}`,
                  );
                  queryParts.push(
                    `${key}=lte.${encodeURIComponent(filterValue[1])}`,
                  );
                } else if (value1) {
                  queryParts.push(
                    `${key}=gte.${encodeURIComponent(filterValue)}`,
                  );
                  queryParts.push(`${key}=lte.${encodeURIComponent(value1)}`);
                }
                break;
              case "not_between":
              case "not between":
                if (Array.isArray(filterValue) && filterValue.length >= 2) {
                  queryParts.push(
                    `or=(${key}.lt.${encodeURIComponent(filterValue[0])},${key}.gt.${encodeURIComponent(filterValue[1])})`,
                  );
                } else if (value1) {
                  queryParts.push(
                    `or=(${key}.lt.${encodeURIComponent(filterValue)},${key}.gt.${encodeURIComponent(value1)})`,
                  );
                }
                break;

              // Set operators
              case "in":
                if (Array.isArray(filterValue)) {
                  const values = filterValue
                    .map((v) => encodeURIComponent(v))
                    .join(",");
                  queryParts.push(`${key}=in.(${values})`);
                } else if (typeof filterValue === "string") {
                  // Handle comma-separated string
                  const values = filterValue
                    .split(",")
                    .map((v) => encodeURIComponent(v.trim()))
                    .join(",");
                  queryParts.push(`${key}=in.(${values})`);
                }
                break;
              case "not_in":
              case "not in":
                if (Array.isArray(filterValue)) {
                  const values = filterValue
                    .map((v) => encodeURIComponent(v))
                    .join(",");
                  queryParts.push(`${key}=not.in.(${values})`);
                } else if (typeof filterValue === "string") {
                  const values = filterValue
                    .split(",")
                    .map((v) => encodeURIComponent(v.trim()))
                    .join(",");
                  queryParts.push(`${key}=not.in.(${values})`);
                }
                break;

              // Null checks
              case "is_null":
              case "is null":
                queryParts.push(`${key}=is.null`);
                break;
              case "is_not_null":
              case "is not null":
                queryParts.push(`${key}=not.is.null`);
                break;

              // Full-text search
              case "fts":
              case "plfts":
                queryParts.push(
                  `${key}=phfts(english).${encodeURIComponent(filterValue)}`,
                );
                break;

              default:
                console.warn(`Unknown filter type: ${filter}`);
                // Fallback to equals
                queryParts.push(`${key}=eq.${encodeURIComponent(filterValue)}`);
            }
          } catch (error) {
            // If not a JSON string, treat as simple array for 'in' operator
            console.warn("Failed to parse filter, using simple array:", error);
            const values = value.map((v) => encodeURIComponent(v)).join(",");
            queryParts.push(`${key}=in.(${values})`);
          }
        } else {
          // Single value - use 'eq' operator
          queryParts.push(`${key}=eq.${encodeURIComponent(value)}`);
        }
      });

      // Apply sorting
      const sortArray = Array.isArray(sorter) ? sorter : [sorter];
      const activeSorters = sortArray.filter((s: any) => s?.field && s?.order);

      activeSorters.forEach((s: any) => {
        const direction = s.order === "ascend" ? "asc" : "desc";
        queryParts.push(`order=${s.field}.${direction}`);
      });

      return queryParts.join("&");
    },
    [],
  );

  // Table change handler with query string building
  const onChange = useCallback(
    (pagination: any, filters: Record<string, any>, sorter: any) => {
      const next = new URLSearchParams(searchParams.toString());

      // Build and set query string from filters and sorters
      const newQuery = buildQueryString(filters, sorter);

      if (newQuery) {
        next.set(queryStringKey, newQuery);
      } else {
        next.delete(queryStringKey);
      }

      // Handle pagination
      if (pagination?.current > 1) {
        next.set("page", String(pagination.current));
      } else {
        next.delete("page");
      }

      if (pagination?.pageSize && pagination.pageSize !== defaultPageSize) {
        next.set("size", String(pagination.pageSize));
      } else {
        next.delete("size");
      }

      // Navigate only if URL changed
      const currentQuery = searchParams.toString();
      const nextQuery = next.toString();

      if (currentQuery !== nextQuery) {
        router.replace(`${pathname}?${nextQuery}`, { scroll: false });
      }

      actionRef.current?.reload();
    },
    [
      pathname,
      router,
      searchParams,
      defaultPageSize,
      queryStringKey,
      buildQueryString,
    ],
  );

  // Loading states
  if (permissionsLoading) {
    return (
      <Alert
        message={
          <div className="flex items-center gap-2">
            <Spin size="small" />
            <Text>Checking permissions...</Text>
          </div>
        }
        type="info"
      />
    );
  }

  if (permissionsError) {
    return (
      <Alert
        message="Permission Check Failed"
        description={permissionsError}
        type="error"
        icon={<AlertCircle size={16} />}
        showIcon
      />
    );
  }

  if (!permissions?.read?.allow) {
    return (
      <Alert
        message="Access Denied"
        description={`You do not have permission to read ${scope} scope ${entity} entity data.`}
        type="warning"
        showIcon
      />
    );
  }

  const tableTitle = (
    <div className="flex items-center justify-between">
      <Text strong>{title}</Text>
    </div>
  );

  return (
    <div className="h-[100px] overflow-hidden">
      <ProTable
        loading={dataLoading}
        expandable={expandable}
        key="adt"
        scroll={{ x: 100 }}
        columns={columns}
        searchFormRender={searchFormRender}
        actionRef={actionRef}
        cardBordered
        headerTitle={tableTitle}
        onRow={onRow}
        request={request}
        search={search ?? false}
        footer={() => footer}
        columnsState={
          enablePersistentState
            ? {
                persistenceKey: persistenceKey || `adt-${entity}-${scope}`,
                persistenceType: "localStorage",
                defaultValue: {
                  option: { fixed: "right", disable: true },
                },
              }
            : undefined
        }
        options={
          options ?? {
            setting: {
              listsHeight: 20,
            },
          }
        }
        rowKey="core_id"
        pagination={
          pagination ?? {
            pageSize: initialPagination.pageSize,
            current: initialPagination.current,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} items`,
          }
        }
        params={{ ...(params ?? {}), __q: urlKey }}
        onChange={onChange}
        toolBarRender={
          toolBarRender ??
          (() => {
            const tools: ReactNode[] = [];

            if (createForm && !disableCreate && permissions?.insert?.allow) {
              tools.push(
                <CreateForm
                  key="create-btn"
                  content={(form) => createForm(form)}
                  entity={entity}
                  scope={scope}
                  actionRef={actionRef}
                  permission={permissions.insert}
                  init_data={createFormInitialData}
                  excludeKeys={excludeCreateForm}
                  redirectAfterCreate={redirectAfterCreate}
                  afterCreate={afterCreate}
                  btnTitle={createBtnTitle}
                  transformData={transformCreateData}
                  preProcess={createPreProcess}
                />,
              );
            }

            return tools;
          })
        }
      />
    </div>
  );
};

export default ADT;
