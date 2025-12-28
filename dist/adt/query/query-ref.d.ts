import { FunctionComponent } from "react";
import { FormInstance } from "antd/lib";
declare const QueryRef: FunctionComponent<{
    formInstance: FormInstance;
    entity: string;
    scope: string;
    field: string;
    orderBy?: string;
    renderLabel?: (item: Record<string, any>) => string;
    filterFields?: string[];
}>;
export default QueryRef;
