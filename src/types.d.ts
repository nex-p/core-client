export interface Permission {
  columns: string[];
  entity: string;
  operation: string;
  scope: string;
}


export interface UIPermission {
  allow: boolean;
  columns: string[];
  entity: string;
  operation: string;
  scope: string;
}
