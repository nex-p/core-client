/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { ProForm, ProFormSelect } from "@ant-design/pro-components";
import { useMemo } from "react";
import { Form } from "antd";
const FilterOption = ({ props, field, options }) => {
    const [form] = Form.useForm();
    const initialData = useMemo(() => {
        console.log("props.selectedKeys", props.selectedKeys);
        const data = props.selectedKeys;
        if (data.length > 0) {
            try {
                const filterValue = JSON.parse(String(data[0]));
                // Parse the value back into array format
                let valueArray = [];
                if (typeof filterValue.value === "string") {
                    valueArray = filterValue.value
                        .split(",")
                        .map((v) => v.trim());
                }
                else if (Array.isArray(filterValue.value)) {
                    valueArray = filterValue.value;
                }
                return {
                    filter: filterValue.filter || "in",
                    value: valueArray,
                };
            }
            catch (error) {
                console.warn("Failed to parse filter value:", error);
            }
        }
        form.setFieldsValue({ filter: "in", value: [] });
        return { filter: "in", value: [] };
    }, [props.selectedKeys]);
    return (_jsx("div", { className: "m-5 w-full p-4", children: _jsx(ProForm, { form: form, onFinish: (formData) => {
                console.log("Filter submitted:", formData);
                const data = {
                    type: "option",
                    filter: formData.filter || "in",
                    value: formData.value.join(","),
                };
                props.setSelectedKeys([JSON.stringify(data)]);
                props.confirm();
            }, onReset: () => {
                // Clear the filter
                form === null || form === void 0 ? void 0 : form.resetFields();
                if (props.clearFilters) {
                    props.clearFilters({ confirm: true, closeDropdown: true });
                }
                // // Confirm to close dropdown and trigger table update
                // props.setSelectedKeys([]);
                // // Reset form fields
                // props.confirm();
            }, initialValues: initialData, submitter: {
                searchConfig: {
                    submitText: "Apply",
                    resetText: "Clear",
                },
            }, children: _jsx(ProForm.Group, { children: _jsx(ProFormSelect, { shouldUpdate: true, showSearch: true, dependencies: [props.selectedKeys], mode: "multiple", options: options.map((opt) => ({
                        label: opt.label,
                        value: opt.value,
                    })), rules: [
                        { required: true, message: "Please select at least one option" },
                    ], name: "value", width: "md", placeholder: "Select options to filter", fieldProps: {
                        maxTagCount: "responsive",
                    } }) }) }) }));
};
export default FilterOption;
