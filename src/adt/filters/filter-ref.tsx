/* eslint-disable @typescript-eslint/no-explicit-any */

'use client'
import {
  ProForm,
  ProFormSelect,
  RequestOptionsType,
} from "@ant-design/pro-components";
import { FilterDropdownProps } from "antd/lib/table/interface";
import { FunctionComponent } from "react";
import { DataCore } from "../..";



const FilterRef: FunctionComponent<{
  props: FilterDropdownProps;
  entity: string;
  scope: string;
  field: string;
  orderBy?:string
}> = ({ props, entity, scope, field,orderBy }) => {

  return (
    <div className="m-5 w-full">
      <ProForm<{ value: string[] }>
        onFinish={(formData) => {
          console.log(formData)
          const data = {
            type: "ref",
            filter: 'in',
            value:formData.value.join(',')
          };

          props.setSelectedKeys([JSON.stringify(data)]);
          props.confirm();
        }}
        onReset={() => {
          if (props.clearFilters) props.clearFilters();
          props.confirm();
        }}
        initialValues={{ filter: "equal" }}
        submitter={{
          searchConfig: { submitText: "Search" },
        }}
      >
        <ProForm.Group>
          <ProFormSelect
            showSearch
            mode="multiple"
            request={({ keyWords }) => {
              return new Promise<RequestOptionsType[]>(async (res) => {
                try {
                  const dataSource = new DataCore(entity, scope);

                  if(orderBy){
                    dataSource.order(orderBy)
                  }

                  if (keyWords) {
                    dataSource.ilike(field, keyWords);
                  }

                  const resp = await dataSource.query();

                  res(
                    resp.data.map((d) => ({
                      label: d[field],
                      value: d.core_id,
                    }))
                  );
                } catch {
                  res([]);
                }
              });
            }}
            rules={[{ required: true }]}
            name="value"
            width="md"
          />
        </ProForm.Group>
      </ProForm>
    </div>
  );
};

export default FilterRef;
