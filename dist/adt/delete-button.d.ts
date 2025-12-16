import { ActionType } from "@ant-design/pro-components";
import { FunctionComponent, RefObject } from "react";
interface DeleteProps {
    disabled: boolean;
    scope: string;
    entity: string;
    coreId: string;
    actionRef: RefObject<ActionType | undefined>;
    permission: boolean;
    afterDelete?: () => void;
}
declare const Delete: FunctionComponent<DeleteProps>;
export default Delete;
