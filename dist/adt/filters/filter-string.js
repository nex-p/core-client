'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ProForm, ProFormDependency, ProFormSelect, ProFormText, } from "@ant-design/pro-components";
import { useMemo } from "react";
const FilterString = ({ props, allowOption }) => {
    const options = useMemo(() => [
        { value: "equal", label: "Equal" },
        { value: "not_equal", label: "Not Equal" },
        { value: "contain", label: "Contains" },
        { value: "not_contain", label: "Does Not Contain" },
        { value: "starts_with", label: "Starts With" },
        { value: "ends_with", label: "Ends With" },
    ].filter((d) => !allowOption || allowOption.includes(d.value)), [allowOption]);
    return (_jsx("div", { className: "m-5 w-full", children: _jsx(ProForm, { onFinish: (formData) => {
                const data = Object.assign({ type: "string" }, formData);
                props.setSelectedKeys([JSON.stringify(data)]);
                props.confirm();
            }, onReset: () => {
                if (props.clearFilters)
                    props.clearFilters();
                props.confirm();
            }, initialValues: { filter: options[0].value }, submitter: {
                searchConfig: { submitText: "Search" },
            }, children: _jsxs(ProForm.Group, { children: [_jsx(ProFormSelect, { options: options, width: "xs", name: "filter", allowClear: false }), _jsx(ProFormDependency, { name: ["filter"], children: ({ filter }) => {
                            if (!["not_empty", "empty"].includes(filter)) {
                                return (_jsx(ProFormText, { name: "value", width: "sm", placeholder: "Search Key", rules: [{ required: true }] }));
                            }
                        } })] }) }) }));
};
export default FilterString;
