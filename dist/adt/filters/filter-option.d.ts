import { FilterDropdownProps } from "antd/lib/table/interface";
import { FunctionComponent } from "react";
declare const FilterOption: FunctionComponent<{
    props: FilterDropdownProps;
    field: string;
    options: {
        label: string;
        value: string;
    }[];
}>;
export default FilterOption;
