import type { RedeemCodeInput } from "@shared/admin/machines";
import type { CodeSource, CodeStatus, RedeemCode } from "@shared/admin/machinesSchema";
import { istInputValue } from "./adRules";

export const THEME_MAX = 40;
export const MAX_CODE_GOODS = 50;
export const MAX_USES = 100_000;
export const CODE_PATTERN = /^[A-Za-z0-9]{4,20}$/;

export const CODE_STATUS_LABEL: Record<CodeStatus, { text: string; className: string }> = {
  active: { text: "Active", className: "bg-emerald-400/15 text-emerald-200" },
  not_started: { text: "Not started", className: "bg-sky-400/15 text-sky-200" },
  used_up: { text: "Used up", className: "bg-secondary text-muted-foreground" },
  expired: { text: "Expired", className: "bg-secondary text-muted-foreground" },
  disabled: { text: "Disabled", className: "bg-rose-400/15 text-rose-200" },
};

export const CODE_SOURCE_LABEL: Record<CodeSource, { text: string; className: string }> = {
  admin: { text: "Admin", className: "bg-secondary text-muted-foreground" },
  shop_purchase: { text: "Shop purchase", className: "bg-violet-400/15 text-violet-200" },
  shop_reward: { text: "Shop reward", className: "bg-amber-400/15 text-amber-200" },
};

export const isShopCode = (c: Pick<RedeemCode, "source">) => c.source !== "admin";

export type CodeValues = {
  code: string;
  theme: string;
  goodsIds: string[];
  usesAllowed: string;
  validFrom: string;
  validTo: string;
  allMachines: boolean;
  sns: string[];
};

export function codeValuesOf(c: RedeemCode | null): CodeValues {
  if (!c) return { code: "", theme: "", goodsIds: [], usesAllowed: "1", validFrom: "", validTo: "", allMachines: true, sns: [] };
  return {
    code: c.code,
    theme: c.theme,
    goodsIds: c.goods.map((g) => g.goodsId),
    usesAllowed: String(c.usesAllowed),
    validFrom: istInputValue(c.validFrom),
    validTo: istInputValue(c.validTo),
    allMachines: c.allMachines,
    sns: c.sns,
  };
}

export function generateCode(random: (n: number) => number = (n) => crypto.getRandomValues(new Uint32Array(1))[0]! % n): string {
  return Array.from({ length: 8 }, () => String(random(10))).join("");
}

export function validateCode(
  v: CodeValues,
  opts: { isNew: boolean; usedCount: number },
): { errors: Record<string, string>; code: string; input: RedeemCodeInput | null } {
  const errors: Record<string, string> = {};
  const code = v.code.trim().toUpperCase();
  if (opts.isNew) {
    if (!code) errors.code = "Required.";
    else if (!CODE_PATTERN.test(code)) errors.code = "Use 4 to 20 letters or digits.";
  }
  const theme = v.theme.trim();
  if (!theme) errors.theme = "Required.";
  else if (theme.length > THEME_MAX) errors.theme = `Up to ${THEME_MAX} characters.`;
  if (v.goodsIds.length === 0) errors.goodsIds = "Choose at least one good.";
  else if (v.goodsIds.length > MAX_CODE_GOODS) errors.goodsIds = `Up to ${MAX_CODE_GOODS} goods.`;

  const uses = Number(v.usesAllowed.trim());
  if (v.usesAllowed.trim() === "" || !Number.isInteger(uses) || uses < 1 || uses > MAX_USES) {
    errors.usesAllowed = `A whole number from 1 to ${MAX_USES.toLocaleString("en-IN")}.`;
  } else if (uses < opts.usedCount) {
    errors.usesAllowed = `Can't be below ${opts.usedCount}, the uses already made.`;
  }
  if (v.validFrom && v.validTo && v.validFrom >= v.validTo) errors.validTo = "Must be after the start.";
  if (!v.allMachines && v.sns.length === 0) errors.sns = "Choose at least one machine, or all machines.";

  if (Object.keys(errors).length > 0) return { errors, code, input: null };
  return {
    errors,
    code,
    input: {
      theme,
      goodsIds: v.goodsIds,
      usesAllowed: uses,
      validFrom: v.validFrom || null,
      validTo: v.validTo || null,
      allMachines: v.allMachines,
      sns: v.allMachines ? [] : v.sns,
    },
  };
}

export function validWindow(c: Pick<RedeemCode, "validFrom" | "validTo">, format: (iso: string | null) => string): string {
  if (!c.validFrom && !c.validTo) return "Always";
  if (!c.validTo) return `From ${format(c.validFrom)}`;
  if (!c.validFrom) return `Until ${format(c.validTo)}`;
  return `${format(c.validFrom)} to ${format(c.validTo)}`;
}

export function codeSavedNotice(c: Pick<RedeemCode, "status">, lead: string): string {
  if (c.status === "active") return `${lead} Machines accept it straight away.`;
  if (c.status === "not_started") return `${lead} Machines accept it from the valid-from time.`;
  return lead;
}
