"use client";
import {
  ProForm,
  ProFormDependency,
  ProFormSelect,
  ProFormText,
} from "@ant-design/pro-components";
import { FilterDropdownProps } from "antd/lib/table/interface";
import { useSearchParams } from "next/navigation";
import { FunctionComponent, useEffect, useMemo } from "react";

const FilterString: FunctionComponent<{
  props: FilterDropdownProps;
  allowOption?: string[];
}> = ({ props, allowOption }) => {
  const options = useMemo(
    () =>
      [
        { value: "equal", label: "Equal" },
        { value: "not_equal", label: "Not Equal" },
        { value: "contain", label: "Contains" },
        { value: "not_contain", label: "Does Not Contain" },
        { value: "starts_with", label: "Starts With" },
        { value: "ends_with", label: "Ends With" },
      ].filter((d) => !allowOption || allowOption.includes(d.value)),
    [allowOption]
  );

  const searchParams = useSearchParams();

  const initialData = useMemo(() => {
    const data = props.selectedKeys;

    if (data.length > 0) {
      const filterValue = JSON.parse(String(data[0])) as {
        type: string;
        filter: string;
        value: string;
        value1: string;
      };
      return { filter: filterValue.filter, value: filterValue.value };
    }

    return { filter: options[0].value };
  }, [props]);

  return (
    <div className="m-5 w-full p-4">
      <ProForm<{ filter: string; value?: string }>
        onFinish={(formData) => {
          const data = {
            type: "string",
            ...formData,
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
          
            options={options}
            width="sm"
            name="filter"
            allowClear={false}
          />
          <ProFormDependency name={["filter"]}>
            {({ filter }) => {
              if (!["not_empty", "empty"].includes(filter)) {
                return (
                  <ProFormText
                    name="value"
                    width="sm"
                    placeholder="Search Key"
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

export default FilterString;
