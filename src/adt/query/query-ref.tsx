/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";
import {
  ProForm,
  ProFormSelect,
  QueryFilterProps,
  RequestOptionsType,
} from "@ant-design/pro-components";
import { FilterDropdownProps } from "antd/lib/table/interface";
import { FunctionComponent, useMemo } from "react";
import { DataCore } from "../..";
import { FormInstance } from "antd/lib";

const QueryRef: FunctionComponent<{
  formInstance: FormInstance ;
  entity: string;
  scope: string;
  field: string;
  orderBy?: string;
  renderLabel?: (item: Record<string,any>) => string;
  filterFields?: string[];
  
}> = ({ formInstance, entity, scope, field, orderBy,renderLabel, filterFields }) => {

    // const initialData = useMemo(() => {
    //   // const data = props.selectedKeys;
  
    //   if (data.length > 0) {
    //     const filterValue = JSON.parse(String(data[0])) as {
    //       type: string;
    //       filter: string;
    //       value: string;
    //       value1: string;
    //     };
    //     return { ...filterValue };
    //   }
  
    //   return { filter: 'in' };
    // }, [props]);
  
  return (
    <div className="m-5 w-full p-4">
      <ProForm<{ value: string[] }>
        onFinish={(formData) => {
          console.log(formData);
          const data = {
            type: "ref",
            filter: "in",
            value: formData.value.join(","),
          };

          // props.setSelectedKeys([JSON.stringify(data)]);
          // props.confirm();
        }}
        onReset={() => {
          // if (props.clearFilters) props.clearFilters();
          // props.confirm();
        }}
        // initialValues={initialData}
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

                  if (orderBy) {
                    dataSource.order(orderBy);
                  }

                  if (keyWords) {
                    if(filterFields && filterFields.length > 0){
                      const orConditions = filterFields.map(f=>`${f}.ilike.*%${keyWords.split(" ").join("%")}%`);
                      dataSource.or(orConditions);
                    }else{
                       dataSource.ilike(field, keyWords);
                    }
                  }

                  const resp = await dataSource.query();

                  res(
                    resp.data.map((d) => ({
                      label: renderLabel ? renderLabel(d) : d[field],
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

export default QueryRef;
