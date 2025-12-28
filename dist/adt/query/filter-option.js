/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { ProForm, ProFormSelect, } from "@ant-design/pro-components";
import { useMemo } from "react";
const FilterOption = ({ props, field, options }) => {
    const initialData = useMemo(() => {
        const data = props.selectedKeys;
        if (data.length > 0) {
            const filterValue = JSON.parse(String(data[0]));
            return Object.assign({}, filterValue);
        }
        return { filter: "in" };
    }, [props]);
    return (_jsx("div", { className: "m-5 w-full p-4", children: _jsx(ProForm, { onFinish: (formData) => {
                console.log(formData);
                const data = {
                    type: "option",
                    filter: "in",
                    value: formData.value.join(","),
                };
                props.setSelectedKeys([JSON.stringify(data)]);
                props.confirm();
            }, onReset: () => {
                if (props.clearFilters)
                    props.clearFilters();
                props.confirm();
            }, initialValues: initialData, submitter: {
                searchConfig: { submitText: "Search" },
            }, children: _jsx(ProForm.Group, { children: _jsx(ProFormSelect, { showSearch: true, mode: "multiple", options: options.map((opt) => ({ label: opt.label, value: opt.value })), rules: [{ required: true }], name: "value", width: "md" }) }) }) }));
};
export default FilterOption;
