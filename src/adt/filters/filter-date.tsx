'use client'
import {
  ProForm,
  ProFormDatePicker,
  ProFormDependency,
  ProFormSelect
} from "@ant-design/pro-components";
import { FilterDropdownProps } from "antd/lib/table/interface";
import { FunctionComponent } from "react";

const FilterDate: FunctionComponent<{ props: FilterDropdownProps }> = ({
  props,
}) => {
  return (
    <div className="m-5 w-full">
      <ProForm<{ filter: string; value?: string }>
        onFinish={(formData) => {
          const data = {
            type: "date",
            ...formData,
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
            options={[
              { value: "equal", label: "Equal" },
              { value: "not_equal", label: "Not Equal" },
              { value: "greater_than", label: "Greater Than" },
              {
                value: "greater_than_or_equal",
                label: "Greater Than or Equal",
              },
              { value: "less_than", label: "Less Than" },
              { value: "less_than_or_equal", label: "Less Than or Equal" },
              { value: "between", label: "Between" },
              { value: "not_between", label: "Not Between" },
            ]}
            width="xs"
            name="filter"
            allowClear={false}
          />
          <ProFormDatePicker
            name="value"
            width="xs"
            rules={[{ required: true }]}
          />
          <ProFormDependency name={["filter"]}>
            {({ filter }) => {
              if (["not_between", "between"].includes(filter)) {
                return (
                  <ProFormDatePicker
                    name="value1"
                    width="xs"
                    rules={[{ required: true }]}
                  />
                );
              }
            }}
          </ProFormDependency>
        </ProForm.Group>
      </ProForm>
    </div>
  );
};

export default FilterDate;
