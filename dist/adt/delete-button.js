import { jsx as _jsx } from "react/jsx-runtime";
import { App, Button, Tooltip } from "antd";
import { isAxiosError } from "axios";
import { Trash } from "lucide-react";
import { DataCore } from "../core-client/client";
const Delete = ({ coreId, entity, scope, actionRef, disabled, permission, afterDelete, }) => {
    const app = App.useApp();
    const deleteAction = async () => {
        var _a, _b;
        try {
            await new DataCore(entity, scope).deleteById(coreId);
            app.message.success(`Successfully deleted the ${entity} record (${coreId}) `);
            if (afterDelete) {
                afterDelete();
            }
            (_a = actionRef.current) === null || _a === void 0 ? void 0 : _a.reload();
            return true;
        }
        catch (e) {
            let message;
            if (isAxiosError(e)) {
                message = (_b = e.response) === null || _b === void 0 ? void 0 : _b.data;
            }
            app.message.error(message !== null && message !== void 0 ? message : "Something went wrong, while deleting the column!");
            return false;
        }
    };
    return (_jsx(Tooltip, { title: !permission ? "User does not have permission to create" : undefined, children: _jsx(Button, { disabled: disabled, danger: true, type: "text", onClick: () => {
                app.modal.confirm({
                    title: "Are you sure?",
                    content: `Do you want to remove ${entity} record (${coreId}) ?`,
                    okText: "Yes",
                    cancelText: "No",
                    onOk: () => deleteAction(),
                });
            }, children: _jsx(Trash, { size: 15 }) }) }));
};
export default Delete;
