/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { PlusOutlined } from "@ant-design/icons";
import { ActionType, DrawerForm } from "@ant-design/pro-components";
import { App, Button, Form, FormInstance, Tooltip } from "antd";
import { isAxiosError } from "axios";
import React, { RefObject } from "react";
import { UIPermission } from "../types";
import { DataCore } from "../core-client/client";

const CreateForm = ({
  entity,
  scope,
  actionRef,
  title,
  btnTitle,
  permission,
  content,
  init_data,
  excludeKeys,
  redirectAfterCreate,
  afterCreate,
  transformData,
  preProcess
}: {
  entity: string;
  scope: string;
  actionRef?: RefObject<ActionType | undefined>;
  title?: string;
  btnTitle?: string;
  permission: UIPermission;
  content: (formRef: FormInstance, data?: any) => React.ReactNode;
  init_data?: any;
  excludeKeys?: string[];
  redirectAfterCreate?: (record: Record<string, any>) => void;
  afterCreate?: (record: Record<string, any>) => void;

  transformData?: (
    data: Record<string, any>
  ) => Record<string, any> | Record<string, any>[];
   preProcess?: (record: Record<string, any>) => Promise<void>;
}) => {
  const [form] = Form.useForm();
  const app = App.useApp();

  return (
    <DrawerForm
      title={title ?? "Create"}
      initialValues={init_data}
      resize={{
        onResize() {
          console.log("resize!");
        },
        maxWidth: window.innerWidth * 0.8,
        minWidth: "800px",
      }}
      form={form}
      trigger={
        <Tooltip
          title={
            !permission.allow
              ? "User does not have permission to create"
              : undefined
          }
        >
          <Button type="primary" disabled={!permission.allow}>
            <PlusOutlined />
            {btnTitle ?? "Create"}
          </Button>
        </Tooltip>
      }
      autoFocusFirstInput
      drawerProps={{
        destroyOnClose: true,
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
             {btnTitle?? "Create"}
            </Button>,
          ];
        },
      }}
      submitTimeout={2000}
      onFinish={async (values) => {
        try {
          let data = transformData ? transformData(values) : values;

          if (preProcess) {
            await preProcess(data);
          }

          if (excludeKeys) {
            data = Object.fromEntries(
              Object.entries(values).filter(
                ([key]) => !excludeKeys.includes(key)
              )
            );
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
            actionRef?.current?.reload();
          } else {
            app.message.open({
              type: "loading",
              key: `${scope}-${entity}-create`,
              content: `Redirecting...`,
            });
            redirectAfterCreate(resp[0]);
          }

          return true;
        } catch (e) {
          console.log(e);

          if (isAxiosError(e)) {
            app.message.open({
              type: "error",
              key: `${scope}-${entity}-create`,
              content: (
                <div className=" text-left">
                  {" "}
                  <p>
                    Something went wrong, while creating the {entity} entity in{" "}
                    {scope} scope !{" "}
                  </p>{" "}
                  <p>REASON : {e.response?.data}</p>
                </div>
              ),
            });
          } else {
            app.message.open({
              type: "error",
              key: `${scope}-${entity}-create`,
              content: `Something went wrong, while creating the ${entity} entity in ${scope} scope !`,
            });
          }

          return false;
        }
      }}
    >
      {content(form)}
    </DrawerForm>
  );
};

export default CreateForm;
