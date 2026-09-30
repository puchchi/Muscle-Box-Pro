import type * as z from "zod";
import { machineApiRequest, type ApiMethod } from "./apiClient";
import type {
  AdInput,
  AdScheduleInput,
  EquipmentLogFilters,
  GoodInput,
  MachineAdminError,
  MachineCreateInput,
  MachineEditInput,
  MachineGoodsPatch,
  MachineListFilters,
  MaterialInput,
  OperationsLogFilters,
  OrderFilters,
  PromotionFilters,
  PromotionInput,
  QrInput,
  RedeemCodeFilters,
  RedeemCodeInput,
  RestockLine,
  MachineFileKind,
  StatFilters,
  UploadKind,
  VoicePositionsInput,
} from "@shared/admin/machines";
import {
  adDeleteSchema,
  adEnvelopeSchema,
  adStatsSchema,
  adsSchema,
  availableGoodsSchema,
  backupSchema,
  backupsSchema,
  crashFilesSchema,
  logFilesSchema,
  machineFileSchema,
  orderStatsSchema,
  salesStatsSchema,
  deletedSchema,
  equipmentLogSchema,
  goodEnvelopeSchema,
  goodsListSchema,
  listingResultSchema,
  machineEnvelopeSchema,
  machineGoodsSchema,
  machineListSchema,
  machineVoicesSchema,
  materialSaveSchema,
  materialsSchema,
  modelsSchema,
  operationsLogSchema,
  orderDetailSchema,
  ordersSchema,
  parseWith,
  pinResultSchema,
  factoryPinResultSchema,
  factoryPinBulkResultSchema,
  promotionGetSchema,
  promotionSaveSchema,
  promotionsSchema,
  qrEnvelopeSchema,
  redeemCodeEnvelopeSchema,
  redeemCodesSchema,
  redeemUsesSchema,
  restockHistorySchema,
  restockResultSchema,
  stockSchema,
  summarySchema,
  uploadCompleteSchema,
  uploadStartSchema,
  voiceDefaultsSaveSchema,
  voicesSchema,
  type Good,
  type MachineRow,
  type Order,
  type PromotionKind,
  type UploadedFile,
} from "@shared/admin/machinesSchema";

export type MachineCall<T> =
  | { ok: true; data: T }
  | { ok: false; error: MachineAdminError; issues: string[] };

const MALFORMED: MachineAdminError = {
  code: "network",
  message: "The server answered in a shape this page does not understand. The details are below.",
};

async function call<S extends z.ZodTypeAny>(
  schema: S,
  method: ApiMethod,
  path: string,
  body?: unknown,
): Promise<MachineCall<z.infer<S>>> {
  const result = await machineApiRequest<unknown>(method, path, body);
  if (!result.ok) return { ok: false, error: result.error, issues: [] };
  const parsed = parseWith(schema, result.data);
  if (!parsed.ok) return { ok: false, error: MALFORMED, issues: parsed.issues };
  return { ok: true, data: parsed.data };
}

export function queryString(params: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    qs.set(key, String(value));
  }
  const text = qs.toString();
  return text ? `?${text}` : "";
}

const seg = encodeURIComponent;

export const fetchMachineSummary = () => call(summarySchema, "GET", "/summary");

export const fetchMachines = (filters: MachineListFilters, page: number, pageSize: number) =>
  call(machineListSchema, "GET", `/machines${queryString({ ...filters, page, pageSize })}`);

export async function fetchAllMachines(): Promise<MachineCall<MachineRow[]>> {
  const rows: MachineRow[] = [];
  for (let page = 1; ; page++) {
    const result = await fetchMachines({}, page, 50);
    if (!result.ok) return result;
    rows.push(...result.data.items);
    if (result.data.items.length === 0 || rows.length >= result.data.total) return { ok: true, data: rows };
  }
}

export const fetchMachine = (sn: string) => call(machineEnvelopeSchema, "GET", `/machines/${seg(sn)}`);

export const createMachine = (input: MachineCreateInput) =>
  call(machineEnvelopeSchema, "POST", "/machines", input);

export const updateMachine = (sn: string, input: MachineEditInput, expectedVersion: number) =>
  call(machineEnvelopeSchema, "PATCH", `/machines/${seg(sn)}`, { ...input, expectedVersion });

export const setMachinePin = (sn: string, pin: string, confirmPin: string) =>
  call(pinResultSchema, "PUT", `/machines/${seg(sn)}/pin`, { pin, confirmPin });

export const setFactoryPin = (sn: string, pin: string, confirmPin: string) =>
  call(factoryPinResultSchema, "PUT", `/machines/${seg(sn)}/factory-pin`, { pin, confirmPin });

export const setFactoryPinBulk = (sns: string[], pin: string, confirmPin: string) =>
  call(factoryPinBulkResultSchema, "PUT", "/machines/factory-pin", { sns, pin, confirmPin });

export const fetchMachineGoods = (sn: string, filters: { name?: string; listed?: "yes" | "no" }) =>
  call(machineGoodsSchema, "GET", `/machines/${seg(sn)}/goods${queryString(filters)}`);

export const fetchAvailableGoods = (sn: string) =>
  call(availableGoodsSchema, "GET", `/machines/${seg(sn)}/goods/available`);

export const addMachineGoods = (sn: string, goodsIds: string[]) =>
  call(machineGoodsSchema, "POST", `/machines/${seg(sn)}/goods`, { goodsIds });

export const updateMachineGoods = (sn: string, items: MachineGoodsPatch[]) =>
  call(machineGoodsSchema, "PATCH", `/machines/${seg(sn)}/goods`, { items });

export const fetchStock = (sn: string) => call(stockSchema, "GET", `/machines/${seg(sn)}/stock`);

export const restock = (sn: string, items: RestockLine[]) =>
  call(restockResultSchema, "POST", `/machines/${seg(sn)}/stock/restock`, { items });

export const fetchRestockHistory = (sn: string, cursor: string | null) =>
  call(restockHistorySchema, "GET", `/machines/${seg(sn)}/stock/history${queryString({ cursor })}`);

export const fetchModels = () => call(modelsSchema, "GET", "/models");

export const fetchMaterials = (modelId: string) =>
  call(materialsSchema, "GET", `/models/${seg(modelId)}/materials`);

export const createMaterial = (modelId: string, input: MaterialInput & { rawType: string }) =>
  call(materialSaveSchema, "POST", `/models/${seg(modelId)}/materials`, input);

export const updateMaterial = (
  modelId: string,
  materialId: string,
  input: MaterialInput,
  expectedVersion: number,
) =>
  call(materialSaveSchema, "PATCH", `/models/${seg(modelId)}/materials/${seg(materialId)}`, {
    ...input,
    expectedVersion,
  });

export const fetchGoods = (
  filters: { name?: string; modelId?: string; listed?: "yes" | "no" },
  page: number,
  pageSize: number,
) => call(goodsListSchema, "GET", `/goods${queryString({ ...filters, page, pageSize })}`);

export const fetchGood = (goodsId: string) => call(goodEnvelopeSchema, "GET", `/goods/${seg(goodsId)}`);

export const createGood = (input: GoodInput) => call(goodEnvelopeSchema, "POST", "/goods", input);

export const updateGood = (goodsId: string, input: Omit<GoodInput, "modelId">, expectedVersion: number) =>
  call(goodEnvelopeSchema, "PATCH", `/goods/${seg(goodsId)}`, { ...input, expectedVersion });

export async function deleteGood(goodsId: string): Promise<MachineCall<true>> {
  const result = await machineApiRequest<unknown>("DELETE", `/goods/${seg(goodsId)}`);
  return result.ok ? { ok: true, data: true } : { ok: false, error: result.error, issues: [] };
}

export const setGoodListing = (goodsId: string, listed: boolean, dryRun: boolean) =>
  call(listingResultSchema, "PUT", `/goods/${seg(goodsId)}/listing`, { listed, dryRun });

export const fetchOrders = (filters: OrderFilters, cursor: string | null, limit = 20) =>
  call(ordersSchema, "GET", `/orders${queryString({ ...filters, cursor, limit })}`);

export async function fetchAllOrders(filters: OrderFilters, max: number): Promise<MachineCall<{ items: Order[]; complete: boolean }>> {
  const items: Order[] = [];
  let cursor: string | null = null;
  do {
    const result = await fetchOrders(filters, cursor, 100);
    if (!result.ok) return result;
    items.push(...result.data.items);
    cursor = result.data.nextCursor;
  } while (cursor && items.length < max);
  return { ok: true, data: { items: items.slice(0, max), complete: !cursor && items.length <= max } };
}

export const fetchOrderStats = (filters: StatFilters) => call(orderStatsSchema, "GET", `/stats/orders${queryString(filters)}`);

export const fetchSalesStats = (filters: StatFilters) => call(salesStatsSchema, "GET", `/stats/sales${queryString(filters)}`);

export const fetchAdStats = (filters: StatFilters) => call(adStatsSchema, "GET", `/stats/ads${queryString(filters)}`);

export const fetchLogFiles = (sn: string, page: number, pageSize: number) =>
  call(logFilesSchema, "GET", `/machines/${seg(sn)}/files${queryString({ kind: "logs", page, pageSize })}`);

export const fetchCrashFiles = (sn: string, page: number, pageSize: number) =>
  call(crashFilesSchema, "GET", `/machines/${seg(sn)}/files${queryString({ kind: "crashes", page, pageSize })}`);

export const fetchMachineFile = (sn: string, kind: MachineFileKind, name: string, withText = false) =>
  call(machineFileSchema, "GET", `/machines/${seg(sn)}/files/${kind}/${seg(name)}${queryString({ text: withText ? 1 : undefined })}`);

export const fetchBackups = (sn: string, page: number, pageSize: number) =>
  call(backupsSchema, "GET", `/machines/${seg(sn)}/backups${queryString({ page, pageSize })}`);

export const fetchBackup = (sn: string, backupId: string) => call(backupSchema, "GET", `/machines/${seg(sn)}/backups/${seg(backupId)}`);

export const fetchOrder = (orderId: string) => call(orderDetailSchema, "GET", `/orders/${seg(orderId)}`);

export const fetchEquipmentLog = (filters: EquipmentLogFilters, cursor: string | null, limit = 20) =>
  call(equipmentLogSchema, "GET", `/logs/equipment${queryString({ ...filters, cursor, limit })}`);

export const fetchOperationsLog = (filters: OperationsLogFilters, cursor: string | null, limit = 20) =>
  call(operationsLogSchema, "GET", `/logs/operations${queryString({ ...filters, cursor, limit })}`);

const UPLOAD_FAILED: MachineAdminError = {
  code: "network",
  message: "The file didn't upload. Check your connection and try again.",
};

export const uploadGoodsPicture = (file: File) => uploadMachineFile("goods", file);

const TYPE_ALIASES: Record<string, string> = {
  "audio/mp3": "audio/mpeg",
  "audio/x-aac": "audio/aac",
  "audio/aacp": "audio/aac",
  "audio/vnd.wave": "audio/wav",
};

const TYPE_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  aac: "audio/aac",
  wav: "audio/wav",
};

/** Browsers disagree on audio types, and some send none, so the extension settles it. */
export function contentTypeOf(file: { name: string; type: string }): string {
  if (file.type) return TYPE_ALIASES[file.type] ?? file.type;
  return TYPE_BY_EXTENSION[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? "";
}

export async function uploadMachineFile(kind: UploadKind, file: File): Promise<MachineCall<UploadedFile>> {
  const started = await call(uploadStartSchema, "POST", "/uploads", {
    kind,
    fileName: file.name,
    contentType: contentTypeOf(file),
    size: file.size,
  });
  if (!started.ok) return started;

  try {
    // No cookies: S3 refuses a credentialed cross-origin PUT, and the signature is the authorisation.
    const put = await fetch(started.data.url, {
      method: "PUT",
      headers: started.data.headers,
      body: file,
      credentials: "omit",
    });
    if (!put.ok) return { ok: false, error: UPLOAD_FAILED, issues: [] };
  } catch {
    return { ok: false, error: UPLOAD_FAILED, issues: [] };
  }

  const done = await call(uploadCompleteSchema, "POST", `/uploads/${seg(started.data.uploadId)}/complete`);
  return done.ok ? { ok: true, data: done.data.file } : done;
}

export const fetchAds = (name: string, page: number, pageSize: number) =>
  call(adsSchema, "GET", `/ads${queryString({ name, page, pageSize })}`);

export const fetchAd = (adId: string) => call(adEnvelopeSchema, "GET", `/ads/${seg(adId)}`);

export const createAd = (input: AdInput) => call(adEnvelopeSchema, "POST", "/ads", input);

export const updateAd = (adId: string, input: AdInput, expectedVersion: number) =>
  call(adEnvelopeSchema, "PATCH", `/ads/${seg(adId)}`, { ...input, expectedVersion });

export const deleteAd = (adId: string) => call(adDeleteSchema, "DELETE", `/ads/${seg(adId)}`);

export const setAdSchedules = (adId: string, schedules: AdScheduleInput[], expectedVersion: number) =>
  call(adEnvelopeSchema, "PUT", `/ads/${seg(adId)}/schedules`, { schedules, expectedVersion });

export const fetchVoices = () => call(voicesSchema, "GET", "/voices");

export const setVoiceDefaults = (positions: VoicePositionsInput, expectedVersion: number) =>
  call(voiceDefaultsSaveSchema, "PUT", "/voices", { positions, expectedVersion });

export const fetchMachineVoices = (sn: string) => call(machineVoicesSchema, "GET", `/machines/${seg(sn)}/voices`);

export const setMachineVoices = (sn: string, positions: VoicePositionsInput, expectedVersion: number) =>
  call(machineVoicesSchema, "PUT", `/machines/${seg(sn)}/voices`, { positions, expectedVersion });

export const fetchQrSettings = () => call(qrEnvelopeSchema, "GET", "/qr");

export const setQrSettings = (input: QrInput, expectedVersion: number) =>
  call(qrEnvelopeSchema, "PUT", "/qr", { ...input, expectedVersion });

export async function fetchAllGoods(): Promise<MachineCall<Good[]>> {
  const rows: Good[] = [];
  for (let page = 1; ; page++) {
    const result = await fetchGoods({}, page, 50);
    if (!result.ok) return result;
    rows.push(...result.data.items);
    if (result.data.items.length === 0 || rows.length >= result.data.total) return { ok: true, data: rows };
  }
}

export const fetchPromotions = (kind: PromotionKind, filters: PromotionFilters, page: number, pageSize: number) =>
  call(
    promotionsSchema,
    "GET",
    `/promotions${queryString({ kind, name: filters.name, status: filters.status, hideEnded: filters.hideEnded ? "true" : undefined, page, pageSize })}`,
  );

export const fetchPromotion = (promoId: string) => call(promotionGetSchema, "GET", `/promotions/${seg(promoId)}`);

export const createPromotion = (kind: PromotionKind, input: PromotionInput) =>
  call(promotionSaveSchema, "POST", "/promotions", { kind, ...input });

export const updatePromotion = (promoId: string, input: PromotionInput, expectedVersion: number) =>
  call(promotionSaveSchema, "PATCH", `/promotions/${seg(promoId)}`, { ...input, expectedVersion });

export const setPromotionPaused = (promoId: string, paused: boolean, expectedVersion: number) =>
  call(promotionSaveSchema, "PUT", `/promotions/${seg(promoId)}/paused`, { paused, expectedVersion });

export const deletePromotion = (promoId: string) => call(deletedSchema, "DELETE", `/promotions/${seg(promoId)}`);

export const fetchRedeemCodes = (filters: RedeemCodeFilters, page: number, pageSize: number) =>
  call(redeemCodesSchema, "GET", `/redeem-codes${queryString({ ...filters, page, pageSize })}`);

export const fetchRedeemCode = (code: string) => call(redeemCodeEnvelopeSchema, "GET", `/redeem-codes/${seg(code)}`);

export const createRedeemCode = (code: string, input: RedeemCodeInput) =>
  call(redeemCodeEnvelopeSchema, "POST", "/redeem-codes", { code, ...input });

export const updateRedeemCode = (code: string, input: RedeemCodeInput, expectedVersion: number) =>
  call(redeemCodeEnvelopeSchema, "PATCH", `/redeem-codes/${seg(code)}`, { ...input, expectedVersion });

export const setRedeemCodeDisabled = (code: string, disabled: boolean, expectedVersion: number) =>
  call(redeemCodeEnvelopeSchema, "PUT", `/redeem-codes/${seg(code)}/disabled`, { disabled, expectedVersion });

export const deleteRedeemCode = (code: string) => call(deletedSchema, "DELETE", `/redeem-codes/${seg(code)}`);

export const fetchRedeemUses = (code: string) => call(redeemUsesSchema, "GET", `/redeem-codes/${seg(code)}/uses`);
