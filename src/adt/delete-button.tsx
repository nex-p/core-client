
import { ActionType } from "@ant-design/pro-components";
import { App, Button, Tooltip } from "antd";
import { isAxiosError } from "axios";
import { Trash } from "lucide-react";
import { FunctionComponent, RefObject } from "react";
import { DataCore } from "../core-client/client";

interface DeleteProps {
  disabled: boolean;
  scope: string;
  entity: string;
  coreId: string;
  actionRef: RefObject<ActionType | undefined>;
  permission: boolean;
  afterDelete?: () => void;
}

const Delete: FunctionComponent<DeleteProps> = ({
  coreId,
  entity,
  scope,
  actionRef,
  disabled,
  permission,
  afterDelete,
}) => {
  const app = App.useApp();
  const deleteAction = async () => {
    try {
      await new DataCore(entity, scope).deleteById(coreId);

      app.message.success(
        `Successfully deleted the ${entity} record (${coreId}) `
      );
      if (afterDelete) {
        afterDelete();
      }
      actionRef.current?.reload();

      return true;
    } catch (e) {
      let message;
      if (isAxiosError(e)) {
        message = e.response?.data;
      }
      

      app.message.error(
        message ?? "Something went wrong, while deleting the column!"
      );

      return false;
    }
  };

  return (
    <Tooltip
      title={
        !permission ? "User does not have permission to create" : undefined
      }
    >
      <Button
        disabled={disabled}
        danger
        type="text"
        onClick={() => {
          app.modal.confirm({
            title: "Are you sure?",
            content: `Do you want to remove ${entity} record (${coreId}) ?`,
            okText: "Yes",
            cancelText: "No",
            onOk: () => deleteAction(),
          });
        }}
      >
        <Trash size={15} />
      </Button>
    </Tooltip>
  );
};

export default Delete;
