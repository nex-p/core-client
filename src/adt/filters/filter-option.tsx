/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";
import { ProForm, ProFormSelect } from "@ant-design/pro-components";
import { FilterDropdownProps } from "antd/lib/table/interface";
import { FunctionComponent, use, useEffect, useMemo, useRef } from "react";
import { Form } from "antd";
import useFormInstance from "antd/es/form/hooks/useFormInstance";

const FilterOption: FunctionComponent<{
  props: FilterDropdownProps;
  field: string;
  options: { label: string; value: string }[];
}> = ({ props, field, options }) => {
  const [form] = Form.useForm();

  const initialData = useMemo(() => {
    console.log("props.selectedKeys", props.selectedKeys);
    const data = props.selectedKeys;

    if (data.length > 0) {
      try {
        const filterValue = JSON.parse(String(data[0]));

        // Parse the value back into array format
        let valueArray: string[] = [];
        if (typeof filterValue.value === "string") {
          valueArray = filterValue.value
            .split(",")
            .map((v: string) => v.trim());
        } else if (Array.isArray(filterValue.value)) {
          valueArray = filterValue.value;
        }

        return {
          filter: filterValue.filter || "in",
          value: valueArray,
        };
      } catch (error) {
        console.warn("Failed to parse filter value:", error);
      }
    }
    form.setFieldsValue({ filter: "in", value: [] });
    return { filter: "in", value: [] };
  }, [props.selectedKeys]);

  return (
    <div className="m-5 w-full p-4">
      <ProForm<{ value: string[]; filter: string }>
        form={form}
        onFinish={(formData) => {
          console.log("Filter submitted:", formData);

          const data = {
            type: "option",
            filter: formData.filter || "in",
            value: formData.value.join(","),
          };

          props.setSelectedKeys([JSON.stringify(data)]);
          props.confirm();
        }}
        onReset={() => {
          // Clear the filter
          form?.resetFields();
          if (props.clearFilters) {
            props.clearFilters({ confirm: true, closeDropdown: true });
          }

          // // Confirm to close dropdown and trigger table update
          // props.setSelectedKeys([]);
          // // Reset form fields
          
          // props.confirm();
        }}
        initialValues={initialData}
        submitter={{
          searchConfig: {
            submitText: "Apply",
            resetText: "Clear",
          },
        }}
      >
        <ProForm.Group>
          <ProFormSelect
            shouldUpdate={true}
            showSearch
            dependencies={[props.selectedKeys]}
            mode="multiple"
            options={options.map((opt) => ({
              label: opt.label,
              value: opt.value,
            }))}
            rules={[
              { required: true, message: "Please select at least one option" },
            ]}
            name="value"
            width="md"
            placeholder="Select options to filter"
            fieldProps={{
              maxTagCount: "responsive",
            }}
          />
        </ProForm.Group>
      </ProForm>
    </div>
  );
};

export default FilterOption;
