'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ProForm, ProFormDependency, ProFormDigit, ProFormSelect } from "@ant-design/pro-components";
import { useMemo } from "react";
const FilterNumber = ({ props, }) => {
    const initialData = useMemo(() => {
        const data = props.selectedKeys;
        if (data.length > 0) {
            const filterValue = JSON.parse(String(data[0]));
            return Object.assign({}, filterValue);
        }
        return { filter: 'equal' };
    }, [props]);
    return (_jsx("div", { className: "m-5 w-full p-4", children: _jsx(ProForm, { onFinish: (formData) => {
                const data = Object.assign({ type: "number" }, formData);
                props.setSelectedKeys([JSON.stringify(data)]);
                props.confirm();
            }, onReset: () => {
                if (props.clearFilters)
                    props.clearFilters();
                props.confirm();
            }, initialValues: initialData, submitter: {
                searchConfig: { submitText: "Search" },
            }, children: _jsxs(ProForm.Group, { children: [_jsx(ProFormSelect, { options: [
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
                        ], width: "xs", name: "filter", allowClear: false }), _jsx(ProFormDigit, { name: "value", width: "xs", rules: [{ required: true }] }), _jsx(ProFormDependency, { name: ["filter"], children: ({ filter }) => {
                            if (["not_between", "between"].includes(filter)) {
                                return (_jsx(ProFormDigit, { name: "value1", width: "xs", rules: [{ required: true }] }));
                            }
                        } })] }) }) }));
};
export default FilterNumber;
