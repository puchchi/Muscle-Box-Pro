import { machineCall as call, queryString } from "./adminMachineApi";
import {
  assetEnvelopeSchema,
  assetsSchema,
  batchesSchema,
  costReportSchema,
  homesSchema,
  itemEnvelopeSchema,
  itemsSchema,
  movementsResultSchema,
  movementsSchema,
  stockSchema,
  warehouseEnvelopeSchema,
  warehousesSchema,
  type AssetInput,
  type CountInput,
  type ItemInput,
  type MovementFilters,
  type ReceiptInput,
  type WarehouseInput,
  type WriteOffInput,
} from "@shared/admin/inventorySchema";

const seg = encodeURIComponent;
const base = "/inventory";

export const fetchItems = () => call(itemsSchema, "GET", `${base}/items`);

export const createItem = (input: ItemInput) => call(itemEnvelopeSchema, "POST", `${base}/items`, input);

export const updateItem = (itemId: string, input: ItemInput, expectedVersion: number) =>
  call(itemEnvelopeSchema, "PATCH", `${base}/items/${seg(itemId)}`, { ...input, expectedVersion });

export const fetchWarehouses = () => call(warehousesSchema, "GET", `${base}/warehouses`);

export const createWarehouse = (input: WarehouseInput) => call(warehouseEnvelopeSchema, "POST", `${base}/warehouses`, input);

export const updateWarehouse = (warehouseId: string, input: WarehouseInput, expectedVersion: number) =>
  call(warehouseEnvelopeSchema, "PATCH", `${base}/warehouses/${seg(warehouseId)}`, { ...input, expectedVersion });

export const fetchHomes = () => call(homesSchema, "GET", `${base}/homes`);

export const setHomeWarehouse = (sn: string, warehouseId: string) =>
  call(homesSchema.shape.items.element, "PUT", `/machines/${seg(sn)}/home-warehouse`, { warehouseId });

export const fetchStockBalances = (warehouseId?: string) => call(stockSchema, "GET", `${base}/stock${queryString({ warehouseId })}`);

export const fetchExpiringBatches = (withinDays: number) =>
  call(batchesSchema, "GET", `${base}/batches${queryString({ expiringWithinDays: withinDays })}`);

export const receiveStock = (input: ReceiptInput) => call(movementsResultSchema, "POST", `${base}/receipts`, input);

export const writeOffStock = (input: WriteOffInput) => call(movementsResultSchema, "POST", `${base}/write-offs`, input);

export const countStock = (input: CountInput) => call(movementsResultSchema, "POST", `${base}/counts`, input);

export const fetchMovements = (filters: MovementFilters, cursor: string | null) =>
  call(movementsSchema, "GET", `${base}/movements${queryString({ ...filters, cursor })}`);

export const fetchCostReport = (month: string) => call(costReportSchema, "GET", `${base}/costs${queryString({ month })}`);

export const fetchAssets = () => call(assetsSchema, "GET", "/assets");

export const createAsset = (input: AssetInput) => call(assetEnvelopeSchema, "POST", "/assets", input);

export const updateAsset = (assetId: string, input: AssetInput, expectedVersion: number) =>
  call(assetEnvelopeSchema, "PATCH", `/assets/${seg(assetId)}`, { ...input, expectedVersion });
