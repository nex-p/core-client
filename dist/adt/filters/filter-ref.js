/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { ProForm, ProFormSelect, } from "@ant-design/pro-components";
import { DataCore } from "../..";
const FilterRef = ({ props, entity, scope, field, orderBy }) => {
    return (_jsx("div", { className: "m-5 w-full", children: _jsx(ProForm, { onFinish: (formData) => {
                console.log(formData);
                const data = {
                    type: "ref",
                    filter: 'in',
                    value: formData.value.join(',')
                };
                props.setSelectedKeys([JSON.stringify(data)]);
                props.confirm();
            }, onReset: () => {
                if (props.clearFilters)
                    props.clearFilters();
                props.confirm();
            }, initialValues: { filter: "equal" }, submitter: {
                searchConfig: { submitText: "Search" },
            }, children: _jsx(ProForm.Group, { children: _jsx(ProFormSelect, { showSearch: true, mode: "multiple", request: ({ keyWords }) => {
                        return new Promise(async (res) => {
                            try {
                                const dataSource = new DataCore(entity, scope);
                                if (orderBy) {
                                    dataSource.order(orderBy);
                                }
                                if (keyWords) {
                                    dataSource.ilike(field, keyWords);
                                }
                                const resp = await dataSource.query();
                                res(resp.data.map((d) => ({
                                    label: d[field],
                                    value: d.core_id,
                                })));
                            }
                            catch (_a) {
                                res([]);
                            }
                        });
                    }, rules: [{ required: true }], name: "value", width: "md" }) }) }) }));
};
export default FilterRef;
