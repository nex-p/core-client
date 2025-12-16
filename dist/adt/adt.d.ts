import { ActionType, ProColumns } from "@ant-design/pro-components";
import { ExpandableConfig } from "antd/es/table/interface";
import { FormInstance } from "antd/lib";
import { FunctionComponent, ReactNode, RefObject } from "react";
import { DataCore } from "../core-client/client";
interface ADTProps {
    title: string;
    entity: string;
    scope: string;
    disableUpdate?: ((record: Record<string, any>) => boolean) | boolean;
    disableDelete?: ((record: Record<string, any>) => boolean) | boolean;
    disableCreate?: boolean;
    customColumns?: ProColumns<Record<string, any>, "string">[];
    fieldsList?: string[];
    extendsField?: {
        refFieldName: string;
        refEntityFields: string[];
    }[];
    updateDataTransform?: (data: Record<string, any>) => Record<string, any>;
    createFormInitialData?: Record<string, any>;
    excludeCreateForm?: string[];
    excludeUpdateForm?: string[];
    dataCoreFilter?: (dataCore: DataCore) => void;
    createForm?: (form: FormInstance, data?: Record<string, any>) => ReactNode;
    updateForm?: (form: FormInstance, data?: Record<string, any>) => ReactNode;
    getRefURL?: (record: Record<string, any>) => string;
    redirectAfterCreate?: (record: Record<string, any>) => void;
    afterCreate?: (record: Record<string, any>) => void;
    afterDelete?: () => void;
    afterUpdate?: (record: Record<string, any>) => void;
    createBtnTitle?: string;
    createPreProcess?: (record: Record<string, any>) => Promise<void>;
    customRowAction?: (record: Record<string, any>, actionRef?: RefObject<ActionType | undefined>) => ReactNode[];
    expandable?: ExpandableConfig<Record<string, any>>;
    transformCreateData?: (data: Record<string, any>) => Record<string, any> | Record<string, any>[];
    transformUpdateData?: (data: Record<string, any>) => Record<string, any> | Record<string, any>[];
}
declare const ADT: FunctionComponent<ADTProps>;
export default ADT;
