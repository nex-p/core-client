/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ProTable } from "@ant-design/pro-components";
import { Alert, App, Button, Spin } from "antd";
import { isAxiosError } from "axios";
import { Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, } from "react";
import { DataCore } from "../core-client/client";
import CreateForm from "./create-form";
import Delete from "./delete-button";
import UpdateForm from "./update-form";
const ADT = ({ title, entity, scope, disableCreate, disableUpdate, disableDelete, customColumns, fieldsList, extendsField, createFormInitialData, updateDataTransform, excludeCreateForm, excludeUpdateForm, createForm, updateForm, getRefURL, dataCoreFilter, redirectAfterCreate, afterCreate, afterDelete, afterUpdate, createBtnTitle, customRowAction, expandable, transformCreateData, transformUpdateData, createPreProcess }) => {
    const actionRef = useRef(undefined);
    const [loading, setLoading] = useState(true);
    const [checkingPermission, setCheckPermission] = useState(true);
    const app = App.useApp();
    const [permissions, setPermissions] = useState();
    useEffect(() => {
        setCheckPermission(true);
        new DataCore(entity, scope).allowPermission().then((permissions) => {
            setPermissions(permissions);
            setCheckPermission(false);
            setLoading(false);
        });
    }, [entity, scope]);
    const columns = useMemo(() => {
        const cols = [
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
        if (typeof disableUpdate == "function" ||
            !disableUpdate ||
            getRefURL ||
            typeof disableDelete == "function" ||
            !disableDelete) {
            cols.push({
                title: "Action",
                valueType: "option",
                align: "right",
                key: "option",
                fixed: "right",
                width: 200,
                render: (text, record) => (_jsxs("div", { className: "flex justify-end gap-1", children: [customRowAction && customRowAction(record, actionRef), (!disableUpdate ||
                            (typeof disableUpdate == "function" &&
                                !disableUpdate(record))) &&
                            updateForm &&
                            (permissions === null || permissions === void 0 ? void 0 : permissions.update) && (_jsx(UpdateForm, { record: record, data: updateDataTransform ? updateDataTransform(record) : record, content: (form, record) => updateForm(form, record), entity: entity, scope: scope, actionRef: actionRef, permission: permissions === null || permissions === void 0 ? void 0 : permissions.update, coreId: record.core_id, excludeKeys: excludeUpdateForm, afterUpdate: afterUpdate, transformData: transformUpdateData }, "create-btn")), (!disableDelete ||
                            (typeof disableDelete == "function" &&
                                !disableDelete(record))) &&
                            (permissions === null || permissions === void 0 ? void 0 : permissions.delete.allow) && (_jsx(Delete, { actionRef: actionRef, disabled: false, scope: scope, entity: entity, coreId: record.core_id, permission: permissions === null || permissions === void 0 ? void 0 : permissions.delete.allow, afterDelete: afterDelete })), getRefURL && (_jsx(Link, { href: getRefURL(record), children: _jsx(Button, { type: "text", children: _jsx(Settings, { size: 15 }) }) }))] })),
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
        permissions === null || permissions === void 0 ? void 0 : permissions.delete.allow,
        permissions === null || permissions === void 0 ? void 0 : permissions.read.columns,
        permissions === null || permissions === void 0 ? void 0 : permissions.update,
        scope,
        updateDataTransform,
        updateForm,
    ]);
    return (_jsxs(_Fragment, { children: [checkingPermission && (_jsx(Alert, { message: _jsxs(_Fragment, { children: [_jsx(Spin, {}), " Checking permissions"] }) })), !checkingPermission && (_jsx(_Fragment, { children: (permissions === null || permissions === void 0 ? void 0 : permissions.read.allow) ? (_jsx(ProTable, { loading: loading, expandable: expandable, scroll: { x: 1000 }, columns: columns, actionRef: actionRef, cardBordered: true, headerTitle: title, request: async (parms, sort, filter) => {
                        var _a;
                        try {
                            setLoading(true);
                            const dataSource = new DataCore(entity, scope);
                            // handle pagination
                            if (typeof parms.current == "number" &&
                                typeof parms.pageSize == "number") {
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
                                    if (field.refFieldName &&
                                        field.refEntityFields.length > 0) {
                                        dataSource.extends(field.refFieldName, field.refEntityFields);
                                    }
                                });
                            }
                            if (filter_keys.length > 0) {
                                filter_keys.forEach((key) => {
                                    if (Array.isArray(filter[key])) {
                                        try {
                                            if (typeof filter[key][0] == "string") {
                                                const data = JSON.parse(filter[key][0]);
                                                if (data.type == "string") {
                                                    if (data.filter == "equal") {
                                                        dataSource.eq(key, data.value);
                                                    }
                                                    else if (data.filter == "contain") {
                                                        dataSource.like(key, data.value);
                                                    }
                                                    else if (data.filter == "not_equal") {
                                                        dataSource.neq(key, data.value);
                                                    }
                                                    else if (data.filter == "not_contain") {
                                                        dataSource.not_like(key, data.value);
                                                    }
                                                    else if (data.filter == "starts_with") {
                                                        dataSource.startWith(key, data.value);
                                                    }
                                                    else if (data.filter == "ends_with") {
                                                        dataSource.endWith(key, data.value);
                                                    }
                                                }
                                                else if (data.type == "number") {
                                                    if (data.filter == "equal") {
                                                        dataSource.eq(key, data.value);
                                                    }
                                                    else if (data.filter == "not_equal") {
                                                        dataSource.neq(key, data.value);
                                                    }
                                                    else if (data.filter == "greater_than") {
                                                        dataSource.gt(key, data.value);
                                                    }
                                                    else if (data.filter == "greater_than_or_equal") {
                                                        dataSource.gte(key, data.value);
                                                    }
                                                    else if (data.filter == "less_than") {
                                                        dataSource.lt(key, data.value);
                                                    }
                                                    else if (data.filter == "less_than_or_equal") {
                                                        dataSource.lte(key, data.value);
                                                    }
                                                    else if (data.filter == "between") {
                                                        dataSource.endWith(key, data.value);
                                                    }
                                                    else if (data.filter == "not_between") {
                                                        dataSource.endWith(key, data.value);
                                                    }
                                                }
                                                else if (data.type == "date") {
                                                    if (data.filter == "equal") {
                                                        dataSource.eq(key, data.value);
                                                    }
                                                    else if (data.filter == "not_equal") {
                                                        dataSource.neq(key, data.value);
                                                    }
                                                    else if (data.filter == "greater_than") {
                                                        dataSource.gt(key, data.value);
                                                    }
                                                    else if (data.filter == "greater_than_or_equal") {
                                                        dataSource.gte(key, data.value);
                                                    }
                                                    else if (data.filter == "less_than") {
                                                        dataSource.lt(key, data.value);
                                                    }
                                                    else if (data.filter == "less_than_or_equal") {
                                                        dataSource.lte(key, data.value);
                                                    }
                                                    else if (data.filter == "between") {
                                                        dataSource.endWith(key, data.value);
                                                    }
                                                    else if (data.filter == "not_between") {
                                                        dataSource.endWith(key, data.value);
                                                    }
                                                }
                                                else if (data.type == "ref") {
                                                    if (data.filter == "equal") {
                                                        dataSource.eq(key, data.value);
                                                    }
                                                    else if (data.filter == "in") {
                                                        dataSource.in(key, data.value.split(","));
                                                    }
                                                }
                                            }
                                            else {
                                                dataSource.in(key, filter[key]);
                                            }
                                        }
                                        catch (_a) {
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
                            }
                            else {
                                dataSource.order("created_at", true);
                            }
                            const data = await dataSource.query();
                            setLoading(false);
                            return { data: data.data, success: true, total: data.count };
                        }
                        catch (e) {
                            console.log("ERROR");
                            let message = "Something went wrong fetching data";
                            if (isAxiosError(e)) {
                                message = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data;
                            }
                            app.message.error(message);
                            setLoading(false);
                            return { data: [], success: false, total: 0 };
                        }
                    }, columnsState: {
                        persistenceKey: `sdf-list`,
                        persistenceType: "localStorage",
                        defaultValue: {
                            option: { fixed: "right", disable: true },
                        },
                    }, options: {
                        setting: {
                            listsHeight: 20,
                        },
                    }, rowKey: "core_id", search: false, pagination: {
                        pageSize: 10,
                        onChange: (page) => console.log(page),
                    }, toolBarRender: () => [
                        createForm && !disableCreate && (_jsx(CreateForm, { content: (form) => createForm(form), entity: entity, scope: scope, actionRef: actionRef, permission: permissions.insert, init_data: createFormInitialData, excludeKeys: excludeCreateForm, redirectAfterCreate: redirectAfterCreate, afterCreate: afterCreate, btnTitle: createBtnTitle, transformData: transformCreateData, preProcess: createPreProcess }, "create-btn")),
                    ] }, "adt")) : (_jsx(Alert, { message: `User does not have permission to read ${scope} scope ${entity} entity data.` })) }))] }));
};
export default ADT;
