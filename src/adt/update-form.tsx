/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { EditOutlined } from "@ant-design/icons";
import { ActionType, DrawerForm } from "@ant-design/pro-components";
import { App, Button, Form, FormInstance, Tooltip } from "antd";
import { isAxiosError } from "axios";
import { RefObject } from "react";
import { UIPermission } from "../types";
import { DataCore } from "../core-client/client";

const UpdateForm = ({
  coreId,
  entity,
  scope,
  actionRef,
  title,
  permission,
  content,
  data,
  excludeKeys,
  afterUpdate,
  transformData,
  record
}: {
  record:Record<string, any>
  coreId: string;
  entity: string;
  scope: string;
  actionRef: RefObject<ActionType | undefined>;
  title?: string;
  btnTitle?: string;
  permission: UIPermission;
  content: (formRef: FormInstance,record?:Record<string, any>) => React.ReactNode;
  data: any;
  excludeKeys?: string[];
  afterUpdate?: (record: Record<string, any>) => void;
  transformData?: (
    data: Record<string, any>
  ) => Record<string, any> | Record<string, any>[];
}) => {
  const [form] = Form.useForm<{ name: string }>();
  const app = App.useApp();

  return (
    <>
    <DrawerForm
      title={title ?? "Update"}
      resize={{
        onResize() {
          console.log("resize!");
        },
        maxWidth: window.innerWidth * 0.8,
        minWidth: "800px",
      }}
      initialValues={data}
      form={form}
      trigger={
        <Tooltip
          title={
            !permission.allow ? "User does not have permission" : undefined
          }
        >
          <Button type="text" disabled={!permission.allow}>
            <EditOutlined />
            {/* {btnTitle ?? "Edit"} */}
          </Button>
        </Tooltip>
      }
      autoFocusFirstInput
      drawerProps={{
        destroyOnHidden: true,
      }}
      submitter={{
        render: (props) => {
          return [
            <Button
              key="cancel-btn"
              onClick={() => {
                props.reset();
              }}
            >
              Cancel
            </Button>,
            <Button
              key="create-btn"
              type="primary"
              onClick={() => {
                props.submit();
              }}
            >
              Update
            </Button>,
          ];
        },
      }}
      submitTimeout={2000}
      onFinish={async (values) => {
        try {
          let data =  transformData ? transformData(values) : values;
          if (excludeKeys) {
            data = Object.fromEntries(
              Object.entries(values).filter(
                ([key]) => !excludeKeys.includes(key)
              )
            );
          }

          const resp = await new DataCore(entity, scope).payload(data).updateById(coreId);
          app.message.success(
            `Successfully updated  the ${entity} entity in ${scope} scope  `
          );
          if (afterUpdate) {
            afterUpdate(resp['data'][0]);
          }
          actionRef.current?.reload();

          return true;
        } catch (e) {
          if (isAxiosError(e)) {
            app.message.open({
              type: "error",
              key: `${scope}-${entity}-create`,
              content: (
                <div className=" text-left">
                  {" "}
                  <p>
                    Something went wrong, while updating the {entity} entity in{" "}
                    {scope} scope !
                  </p>{" "}
                  <p>REASON : {e.response?.data}</p>
                </div>
              ),
            });
          } else {
            app.message.error(
              `Something went wrong, while updating the ${entity} entity in ${scope} scope !`
            );
          }

          return false;
        }
      }}
    >
      {content(form,record)}
    </DrawerForm>
    </>
  );
};

export default UpdateForm;
