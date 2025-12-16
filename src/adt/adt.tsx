/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ActionType, ProColumns, ProTable } from "@ant-design/pro-components";
import { Alert, App, Button, Spin } from "antd";
import { ExpandableConfig } from "antd/es/table/interface";
import { FormInstance } from "antd/lib";
import { isAxiosError } from "axios";
import { Settings } from "lucide-react";
import Link from "next/link";
import {
  FunctionComponent,
  ReactNode,
  RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DataCore } from "../core-client/client";
import { UIPermission } from "../types";
import CreateForm from "./create-form";
import Delete from "./delete-button";
import UpdateForm from "./update-form";

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

  createFormInitialData?: Record<string, any>;

  excludeCreateForm?: string[];
  excludeUpdateForm?: string[];

  dataCoreFilter?: (dataCore: DataCore) => void;
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
    actionRef?: RefObject<ActionType | undefined>
  ) => ReactNode[];

  expandable?: ExpandableConfig<Record<string, any>>;

  transformCreateData?: (
    data: Record<string, any>
  ) => Record<string, any> | Record<string, any>[];

  transformUpdateData?: (
    data: Record<string, any>
  ) => Record<string, any> | Record<string, any>[];
}

const ADT: FunctionComponent<ADTProps> = ({
  title,
  entity,
  scope,
  disableCreate,
  disableUpdate,
  disableDelete,

  customColumns,
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
  
  createPreProcess
}) => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [checkingPermission, setCheckPermission] = useState(true);

  const app = App.useApp();

  const [permissions, setPermissions] = useState<{
    read: UIPermission;
    insert: UIPermission;
    update: UIPermission;
    delete: UIPermission;
  }>();

  useEffect(() => {
    setCheckPermission(true);
    new DataCore(entity, scope).allowPermission().then((permissions) => {
      setPermissions(permissions);
      setCheckPermission(false);
      setLoading(false);
    });
  }, [entity, scope]);

  const columns: ProColumns<Record<string, any>, "string">[] | undefined =
    useMemo(() => {
      const cols: ProColumns<Record<string, any>, "string">[] = [
        {
          dataIndex: "index",
          valueType: "indexBorder",
          onFilter: true,
          fixed: "left",
          width: 48,
        },
      ];

      if (customColumns) {
        cols.push(...customColumns);
      }

      if (
        typeof disableUpdate == "function" ||
        !disableUpdate ||
        getRefURL ||
        typeof disableDelete == "function" ||
        !disableDelete
      ) {
        cols.push({
          title: "Action",
          valueType: "option",
          align: "right",
          key: "option",
          fixed: "right",
          width: 200,
          render: (text, record) => (
            <div className="flex justify-end gap-1">
              {customRowAction && customRowAction(record, actionRef)}

              {(!disableUpdate ||
                (typeof disableUpdate == "function" &&
                  !disableUpdate(record))) &&
                updateForm &&
                permissions?.update && (
                  <UpdateForm
                    record={record}
                    data={
                      updateDataTransform ? updateDataTransform(record) : record
                    }
                    content={(form, record) => updateForm(form, record)}
                    entity={entity}
                    scope={scope}
                    key="create-btn"
                    actionRef={actionRef}
                    permission={permissions?.update}
                    coreId={record.core_id}
                    excludeKeys={excludeUpdateForm}
                    afterUpdate={afterUpdate}
                    transformData={transformUpdateData}
                  />
                )}
              {(!disableDelete ||
                (typeof disableDelete == "function" &&
                  !disableDelete(record))) &&
                permissions?.delete.allow && (
                  <Delete
                    actionRef={actionRef}
                    disabled={false}
                    scope={scope}
                    entity={entity}
                    coreId={record.core_id}
                    permission={permissions?.delete.allow}
                    afterDelete={afterDelete}
                  />
                )}
              {getRefURL && (
                <Link href={getRefURL(record)}>
                  <Button type="text">
                    <Settings size={15} />
                  </Button>
                </Link>
              )}
            </div>
          ),
        });
      }
      return cols;
    }, [
      afterDelete,
      afterUpdate,
      customColumns,
      disableDelete,
      disableUpdate,
      entity,
      excludeUpdateForm,
      getRefURL,
      permissions?.delete.allow,
      permissions?.read.columns,
      permissions?.update,
      scope,
      updateDataTransform,
      updateForm,
    ]);

  return (
    <>
      {checkingPermission && (
        <Alert
          message={
            <>
              <Spin /> Checking permissions
            </>
          }
        />
      )}
      {!checkingPermission && (
        <>
          {permissions?.read.allow ? (
            <ProTable
              loading={loading}
              expandable={expandable}
              key="adt"
              scroll={{ x: 1000 }}
              columns={columns}
              actionRef={actionRef}
              cardBordered
              headerTitle={title}
              request={async (parms, sort, filter) => {
                try {
                  setLoading(true);
                  const dataSource = new DataCore(entity, scope);

                  // handle pagination
                  if (
                    typeof parms.current == "number" &&
                    typeof parms.pageSize == "number"
                  ) {
                    dataSource.includeCount();
                    dataSource.limit(parms.pageSize);
                    dataSource.offset((parms.current - 1) * parms.pageSize);
                  }

                  const filter_keys = Object.keys(filter);

                  if (fieldsList && fieldsList.length > 0) {
                    dataSource.select(...fieldsList);
                  }

                  if (extendsField && extendsField.length > 0) {
                    extendsField.forEach((field) => {
                      if (
                        field.refFieldName &&
                        field.refEntityFields.length > 0
                      ) {
                        dataSource.extends(
                          field.refFieldName,
                          field.refEntityFields
                        );
                      }
                    });
                  }

                  if (filter_keys.length > 0) {
                    filter_keys.forEach((key) => {
                      if (Array.isArray(filter[key])) {
                        try {
                          if (typeof filter[key][0] == "string") {
                            const data = JSON.parse(filter[key][0]) as {
                              type: string;
                              filter: string;
                              value: string;
                              value1: string;
                            };

                            if (data.type == "string") {
                              if (data.filter == "equal") {
                                dataSource.eq(key, data.value);
                              } else if (data.filter == "contain") {
                                dataSource.like(key, data.value);
                              } else if (data.filter == "not_equal") {
                                dataSource.neq(key, data.value);
                              } else if (data.filter == "not_contain") {
                                dataSource.not_like(key, data.value);
                              } else if (data.filter == "starts_with") {
                                dataSource.startWith(key, data.value);
                              } else if (data.filter == "ends_with") {
                                dataSource.endWith(key, data.value);
                              }
                            } else if (data.type == "number") {
                              if (data.filter == "equal") {
                                dataSource.eq(key, data.value);
                              } else if (data.filter == "not_equal") {
                                dataSource.neq(key, data.value);
                              } else if (data.filter == "greater_than") {
                                dataSource.gt(key, data.value);
                              } else if (
                                data.filter == "greater_than_or_equal"
                              ) {
                                dataSource.gte(key, data.value);
                              } else if (data.filter == "less_than") {
                                dataSource.lt(key, data.value);
                              } else if (data.filter == "less_than_or_equal") {
                                dataSource.lte(key, data.value);
                              } else if (data.filter == "between") {
                                dataSource.endWith(key, data.value);
                              } else if (data.filter == "not_between") {
                                dataSource.endWith(key, data.value);
                              }
                            } else if (data.type == "date") {
                              if (data.filter == "equal") {
                                dataSource.eq(key, data.value);
                              } else if (data.filter == "not_equal") {
                                dataSource.neq(key, data.value);
                              } else if (data.filter == "greater_than") {
                                dataSource.gt(key, data.value);
                              } else if (
                                data.filter == "greater_than_or_equal"
                              ) {
                                dataSource.gte(key, data.value);
                              } else if (data.filter == "less_than") {
                                dataSource.lt(key, data.value);
                              } else if (data.filter == "less_than_or_equal") {
                                dataSource.lte(key, data.value);
                              } else if (data.filter == "between") {
                                dataSource.endWith(key, data.value);
                              } else if (data.filter == "not_between") {
                                dataSource.endWith(key, data.value);
                              }
                            } else if (data.type == "ref") {
                              if (data.filter == "equal") {
                                dataSource.eq(key, data.value);
                              } else if (data.filter == "in") {
                                dataSource.in(key, data.value.split(","));
                              }
                            }
                          } else {
                            dataSource.in(key, filter[key]);
                          }
                        } catch {
                          dataSource.in(key, filter[key]);
                        }
                      }
                    });
                  }

                  if (dataCoreFilter) {
                    dataCoreFilter(dataSource);
                  }

                  // handling sort
                  const keys = Object.keys(sort);
                  if (keys.length > 0) {
                    const field = keys[0];
                    dataSource.order(field, sort[field] == "ascend");
                  } else {
                    dataSource.order("created_at", true);
                  }

                  const data = await dataSource.query();

                  setLoading(false);

                  return { data: data.data, success: true, total: data.count };
                } catch (e) {
                  console.log("ERROR");
                  let message = "Something went wrong fetching data";
                  if (isAxiosError(e)) {
                    message = e.response?.data;
                  }

                  app.message.error(message);
                  setLoading(false);
                  return { data: [], success: false, total: 0 };
                }
              }}
              columnsState={{
                persistenceKey: `sdf-list`,
                persistenceType: "localStorage",
                defaultValue: {
                  option: { fixed: "right", disable: true },
                },
              }}
              options={{
                setting: {
                  listsHeight: 20,
                },
              }}
              rowKey="core_id"
              search={false}
              pagination={{
                pageSize: 10,
                onChange: (page) => console.log(page),
              }}
              toolBarRender={() => [
                createForm && !disableCreate && (
                  <CreateForm
                    content={(form) => createForm(form)}
                    entity={entity}
                    scope={scope}
                    key="create-btn"
                    actionRef={actionRef}
                    permission={permissions.insert}
                    init_data={createFormInitialData}
                    excludeKeys={excludeCreateForm}
                    redirectAfterCreate={redirectAfterCreate}
                    afterCreate={afterCreate}
                    btnTitle={createBtnTitle}
                    transformData={transformCreateData}
                     preProcess={createPreProcess}
                  />
                ),
              ]}
            />
          ) : (
            <Alert
              message={`User does not have permission to read ${scope} scope ${entity} entity data.`}
            />
          )}
        </>
      )}
    </>
  );
};

export default ADT;
