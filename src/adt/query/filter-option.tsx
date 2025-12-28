/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";
import {
  ProForm,
  ProFormSelect,
  RequestOptionsType,
} from "@ant-design/pro-components";
import { FilterDropdownProps } from "antd/lib/table/interface";
import { FunctionComponent, useMemo } from "react";

const FilterOption: FunctionComponent<{
  props: FilterDropdownProps;
  field: string;
  options: {label: string; value: string}[];
}> = ({ props, field, options }) => {
  const initialData = useMemo(() => {
    const data = props.selectedKeys;

    if (data.length > 0) {
      const filterValue = JSON.parse(String(data[0]))
      return { ...filterValue };
    }

    return { filter: "in" };
  }, [props]);

  return (
    <div className="m-5 w-full p-4">
      <ProForm<{ value: string[] }>
        onFinish={(formData) => {
          console.log(formData);
          const data = {
            type: "option",
            filter: "in",
            value: formData.value.join(","),
          };

          props.setSelectedKeys([JSON.stringify(data)]);
          props.confirm();
        }}
        onReset={() => {
          if (props.clearFilters) props.clearFilters();
          props.confirm();
        }}
        initialValues={initialData}
        submitter={{
          searchConfig: { submitText: "Search" },
        }}
      >
        <ProForm.Group>
          <ProFormSelect
            showSearch
            mode="multiple"
            options={options.map((opt) => ({ label: opt.label, value: opt.value }))}
            rules={[{ required: true }]}
            name="value"
            width="md"
          />
        </ProForm.Group>
      </ProForm>
    </div>
  );
};

export default FilterOption;
