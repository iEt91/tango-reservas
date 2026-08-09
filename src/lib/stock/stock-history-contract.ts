import type {
  BusinessStockMovementOrigin,
  BusinessStockMovementType,
  BusinessStockUnit,
} from "@/lib/stock/business-stock-contract";

export type StockHistoryActorRole =
  | "owner"
  | "admin"
  | "staff"
  | "";

export type StockHistoryEntry = {
  id: string;
  productId: string;
  productName: string;
  movementType: BusinessStockMovementType;
  origin: BusinessStockMovementOrigin;
  quantityDelta: number;
  unit: BusinessStockUnit;
  unitCost: number;
  operationKey: string;
  referenceId: string;
  label: string;
  detail: string;
  createdBy: string;
  actorName: string;
  actorEmail: string;
  actorRole: StockHistoryActorRole;
  createdAt: string;
};
