/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { EditOutlined } from "@ant-design/icons";
import { DrawerForm } from "@ant-design/pro-components";
import { App, Button, Form, Tooltip } from "antd";
import { isAxiosError } from "axios";
import { DataCore } from "../core-client/client";
const UpdateForm = ({ coreId, entity, scope, actionRef, title, permission, content, data, excludeKeys, afterUpdate, transformData, record }) => {
    const [form] = Form.useForm();
    const app = App.useApp();
    return (_jsx(_Fragment, { children: _jsx(DrawerForm, { title: title !== null && title !== void 0 ? title : "Update", resize: {
                onResize() {
                    console.log("resize!");
                },
                maxWidth: window.innerWidth * 0.8,
                minWidth: "800px",
            }, initialValues: data, form: form, trigger: _jsx(Tooltip, { title: !permission.allow ? "User does not have permission" : undefined, children: _jsx(Button, { type: "text", disabled: !permission.allow, children: _jsx(EditOutlined, {}) }) }), autoFocusFirstInput: true, drawerProps: {
                destroyOnHidden: true,
            }, submitter: {
                render: (props) => {
                    return [
                        _jsx(Button, { onClick: () => {
                                props.reset();
                            }, children: "Cancel" }, "cancel-btn"),
                        _jsx(Button, { type: "primary", onClick: () => {
                                props.submit();
                            }, children: "Update" }, "create-btn"),
                    ];
                },
            }, submitTimeout: 2000, onFinish: async (values) => {
                var _a, _b;
                try {
                    let data = transformData ? transformData(values) : values;
                    if (excludeKeys) {
                        data = Object.fromEntries(Object.entries(values).filter(([key]) => !excludeKeys.includes(key)));
                    }
                    const resp = await new DataCore(entity, scope).payload(data).updateById(coreId);
                    app.message.success(`Successfully updated  the ${entity} entity in ${scope} scope  `);
                    if (afterUpdate) {
                        afterUpdate(resp['data'][0]);
                    }
                    (_a = actionRef.current) === null || _a === void 0 ? void 0 : _a.reload();
                    return true;
                }
                catch (e) {
                    if (isAxiosError(e)) {
                        app.message.open({
                            type: "error",
                            key: `${scope}-${entity}-create`,
                            content: (_jsxs("div", { className: " text-left", children: [" ", _jsxs("p", { children: ["Something went wrong, while updating the ", entity, " entity in", " ", scope, " scope !"] }), " ", _jsxs("p", { children: ["REASON : ", (_b = e.response) === null || _b === void 0 ? void 0 : _b.data] })] })),
                        });
                    }
                    else {
                        app.message.error(`Something went wrong, while updating the ${entity} entity in ${scope} scope !`);
                    }
                    return false;
                }
            }, children: content(form, record) }) }));
};
export default UpdateForm;
