/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PlusOutlined } from "@ant-design/icons";
import { DrawerForm } from "@ant-design/pro-components";
import { App, Button, Form, Tooltip } from "antd";
import { isAxiosError } from "axios";
import { DataCore } from "../core-client/client";
const CreateForm = ({ entity, scope, actionRef, title, btnTitle, permission, content, init_data, excludeKeys, redirectAfterCreate, afterCreate, transformData, preProcess }) => {
    const [form] = Form.useForm();
    const app = App.useApp();
    return (_jsx(DrawerForm, { title: title !== null && title !== void 0 ? title : "Create", initialValues: init_data, resize: {
            onResize() {
                console.log("resize!");
            },
            maxWidth: window.innerWidth * 0.8,
            minWidth: "800px",
        }, form: form, trigger: _jsx(Tooltip, { title: !permission.allow
                ? "User does not have permission to create"
                : undefined, children: _jsxs(Button, { type: "primary", disabled: !permission.allow, children: [_jsx(PlusOutlined, {}), btnTitle !== null && btnTitle !== void 0 ? btnTitle : "Create"] }) }), autoFocusFirstInput: true, drawerProps: {
            destroyOnClose: true,
        }, submitter: {
            render: (props) => {
                return [
                    _jsx(Button, { onClick: () => {
                            props.reset();
                        }, children: "Cancel" }, "cancel-btn"),
                    _jsx(Button, { type: "primary", onClick: () => {
                            props.submit();
                        }, children: btnTitle !== null && btnTitle !== void 0 ? btnTitle : "Create" }, "create-btn"),
                ];
            },
        }, submitTimeout: 2000, onFinish: async (values) => {
            var _a, _b;
            try {
                let data = transformData ? transformData(values) : values;
                if (preProcess) {
                    await preProcess(data);
                }
                if (excludeKeys) {
                    data = Object.fromEntries(Object.entries(values).filter(([key]) => !excludeKeys.includes(key)));
                }
                const resp = await new DataCore(entity, scope).payload(data).insert();
                app.message.open({
                    type: "success",
                    key: `${scope}-${entity}-create`,
                    content: `Successfully created  the ${entity} entity in ${scope} scope  `,
                });
                if (afterCreate) {
                    afterCreate(resp[0]);
                }
                if (!redirectAfterCreate) {
                    (_a = actionRef === null || actionRef === void 0 ? void 0 : actionRef.current) === null || _a === void 0 ? void 0 : _a.reload();
                }
                else {
                    app.message.open({
                        type: "loading",
                        key: `${scope}-${entity}-create`,
                        content: `Redirecting...`,
                    });
                    redirectAfterCreate(resp[0]);
                }
                return true;
            }
            catch (e) {
                console.log(e);
                if (isAxiosError(e)) {
                    app.message.open({
                        type: "error",
                        key: `${scope}-${entity}-create`,
                        content: (_jsxs("div", { className: " text-left", children: [" ", _jsxs("p", { children: ["Something went wrong, while creating the ", entity, " entity in", " ", scope, " scope !", " "] }), " ", _jsxs("p", { children: ["REASON : ", (_b = e.response) === null || _b === void 0 ? void 0 : _b.data] })] })),
                    });
                }
                else {
                    app.message.open({
                        type: "error",
                        key: `${scope}-${entity}-create`,
                        content: `Something went wrong, while creating the ${entity} entity in ${scope} scope !`,
                    });
                }
                return false;
            }
        }, children: content(form) }));
};
export default CreateForm;
