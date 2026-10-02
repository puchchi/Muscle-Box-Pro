import type { OwnerState } from "./ownership";

export const MACHINE_ADMIN_ERROR_CODES = [
  "validation",
  "invalid_token",
  "not_found",
  "conflict",
  "stale_write",
  "stale_stock",
  "in_use",
  "network",
] as const;

export type MachineAdminErrorCode = (typeof MACHINE_ADMIN_ERROR_CODES)[number];

export type MachineAdminError = {
  code: MachineAdminErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
};

export type MachineAdminResult<T> = { ok: true; data: T } | { ok: false; error: MachineAdminError };

export const PAGE_SIZES = [10, 20, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export type MachineListFilters = {
  deviceExtNo?: string;
  name?: string;
  sn?: string;
  modelId?: string;
  network?: "online" | "offline";
  restartPending?: "yes";
  fault?: "normal" | "exception" | "faulty";
  stock?: "lack" | "normal";
  freeVend?: "yes" | "no";
  factoryPin?: "none";
  ownerState?: OwnerState;
} & OwnerFilters;

export type OwnerFilters = { gymId?: string; franchiseId?: string };

export type MachineEditInput = {
  deviceExtNo: string;
  name: string;
  servicePhone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  hotMax: number;
  hotMin: number;
  coldMax: number;
  coldMin: number;
  enabled: boolean;
  qrPay: boolean;
  freeVend: boolean;
};

export type MachineCreateInput = MachineEditInput & { sn: string; modelId: string };

export type MachineGoodsPatch = {
  goodsId: string;
  listed?: boolean;
  devicePriceInr?: number | null;
  sort?: number;
};

export type RestockLine = { slotId: string; add: number; seenResidueQty: number };

export type RecipeLineInput = {
  materialId: string;
  qty: number;
  waterQty: number;
  waterType: 1 | 2;
  kqty: number;
};

export type GoodInput = {
  no: string;
  name: string;
  nameEn: string;
  spec: string;
  priceInr: number;
  sort: number;
  modelId: string;
  image: { url: string } | null;
  recipe: RecipeLineInput[];
  tagline: string;
  nutrition: { name: string; value: string }[];
  ingredients: string[];
  serveTemp: ServeTemp | null;
  comingSoon: boolean;
  media: { url: string }[];
};

export type ServeTemp = "chilled" | "hot";

export type MaterialInput = {
  name: string;
  position: string;
  unit: string;
  capacity: number;
  warnCapacity: number;
  expendRate: number;
  enabled: boolean;
};

export type OrderFilters = {
  orderId?: string;
  machine?: string;
  sn?: string;
  goodsName?: string;
  payMethod?: "free" | "redeem" | "qr";
  status?: "created" | "unknown" | "made" | "failed";
  from?: string;
  to?: string;
} & OwnerFilters;

export type EquipmentLogFilters = {
  machine?: string;
  sn?: string;
  status?: "normal" | "exception";
  code?: string;
  from?: string;
  to?: string;
};

export type OperationsLogFilters = {
  machine?: string;
  sn?: string;
  operateType?: "1" | "2" | "3";
  from?: string;
  to?: string;
};

export type UploadKind = "goods" | "goodsMedia" | "ad" | "voice" | "logo" | "qr";

export type FileRef = { url: string } | null;

export type AdInput = { name: string; description: string; file: { url: string } };

export type AdScheduleInput = {
  id?: string;
  allMachines: boolean;
  sns: string[];
  start: string;
  end: string;
  sort: number;
};

export type VoicePositionsInput = Record<"1" | "2" | "3" | "4" | "5", FileRef>;

export type QrInput = {
  logo: FileRef;
  memberQr: FileRef;
  memberTip: string;
  exchangeQr: FileRef;
  exchangeTip: string;
  memberLink: string;
  exchangeLink: string;
  instagramLink: string;
};

export type MachineScopeInput = { allMachines: boolean; sns: string[] };

export type PromotionInput = MachineScopeInput & {
  name: string;
  start: string;
  end: string;
  items: { goodsId: string; priceInr?: number }[];
};

export type PromotionFilters = { name?: string; status?: string; hideEnded?: boolean };

export type RedeemCodeInput = MachineScopeInput & {
  theme: string;
  goodsIds: string[];
  usesAllowed: number;
  validFrom: string | null;
  validTo: string | null;
};

export type RedeemCodeFilters = { q?: string; status?: string; source?: string };

export type StatFilters = {
  period: "day" | "month" | "year";
  from: string;
  to: string;
  machine?: string;
  payMethod?: "free" | "redeem" | "qr";
  goodsName?: string;
  ad?: string;
} & OwnerFilters;

export type MachineFileKind = "logs" | "crashes";
