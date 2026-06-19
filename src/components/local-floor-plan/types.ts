import type { FloorTable, FloorTableShape, FloorTableStatus } from "@/data/types";

export type FloorTableDraft = Pick<
  FloorTable,
  | "label"
  | "seats"
  | "width"
  | "height"
  | "rotation"
  | "status"
  | "shape"
  | "isJoinable"
> & {
  x?: number;
  y?: number;
};

export type FloorTableModalMode = "create";

export type FloorTableEditorMode = "edit";

export type FloorTableFormValues = {
  label: string;
  seats: string;
  width: string;
  height: string;
  rotation: string;
  status: FloorTableStatus;
  shape: FloorTableShape;
  cornerRadius: string;
  isJoinable: boolean;
};

export type FloorTableResizeHandle =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "right"
  | "bottom";
