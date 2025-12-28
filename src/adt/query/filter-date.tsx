"use client";
import {
  ProForm,
  ProFormDatePicker,
  ProFormDateRangePicker,
  ProFormDependency,
  ProFormSelect,
} from "@ant-design/pro-components";
import { FilterDropdownProps } from "antd/lib/table/interface";
import { FunctionComponent, useMemo } from "react";

const FilterDate: FunctionComponent<{ props: FilterDropdownProps }> = ({
  props,
}) => {
  const initialData = useMemo(() => {
    const data = props.selectedKeys;

    if (data.length > 0) {
      const filterValue = JSON.parse(String(data[0])) as {
        type: string;
        filter: string;
        value: string;
        value1: string;
      };
      return { ...filterValue };
    }

    return { filter: "equal" };
  }, [props]);

  return (
    <div className="m-5 w-full p-4">
      <ProForm<{ filter: string; value?: string }>
        onFinish={(formData) => {

          const data = {
            type: "date",
            ...formData,
          };

          console.log('data',data);

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
            width="sm"
            name="filter"
            allowClear={false}
          />

          <ProFormDependency name={["filter"]}>
            {({ filter }) => {
              if (["not_between", "between"].includes(filter)) {
                return (
                  <ProFormDateRangePicker
                    name="value"
                    width="sm"
                    rules={[{ required: true }]}
                  />
                );
              } else {
                return (
                  <ProFormDatePicker
                    name="value"
                    width="sm"
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
