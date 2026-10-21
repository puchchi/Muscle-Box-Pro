import * as z from "zod";

export const OPERATOR_STATUSES = ["active", "disabled"] as const;
export type OperatorStatus = (typeof OPERATOR_STATUSES)[number];

export const OPERATOR_ID_PATTERN = /^[a-z][a-z0-9_]{2,31}$/;
export const OPERATOR_PASSWORD_MIN = 8;
export const OPERATOR_PASSWORD_MAX = 200;
export const OPERATOR_NAME_MAX = 80;
export const OPERATOR_MACHINES_MAX = 200;

const instant = z.string().nullable().optional().transform((v) => v ?? null);
const optionalText = z.string().nullable().optional().transform((v) => v || null);

export const operatorSchema = z.object({
  operatorId: z.string().min(1),
  name: z.string(),
  email: optionalText,
  phone: optionalText,
  status: z.enum(OPERATOR_STATUSES),
  franchiseId: z.string().nullable().optional().transform((v) => v ?? null),
  franchiseName: z.string().nullable().optional().transform((v) => v ?? null),
  machines: z.array(z.string()).optional().transform((v) => v ?? []),
  createdBy: z
    .object({ kind: z.enum(["admin", "franchise"]), email: z.string().optional() })
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  createdAt: instant,
  updatedAt: instant,
  passwordSetAt: instant,
  lastLoginAt: instant,
  disabledAt: instant,
  disabledReason: z.string().nullable().optional().transform((v) => v ?? null),
});

// Rows saved before operators had IDs (keyed by email) come back without operatorId and can't sign in or be edited.
const hasId = (row: unknown) => typeof row === "object" && row !== null && typeof (row as { operatorId?: unknown }).operatorId === "string";

export const operatorsSchema = z.object({
  operators: z.preprocess((rows) => (Array.isArray(rows) ? rows.filter(hasId) : rows), z.array(operatorSchema)),
});

export const operatorEnvelopeSchema = z.object({ operator: operatorSchema });

export const suggestedOperatorIdSchema = z.object({ operatorId: z.string().min(1) });

export type Operator = z.infer<typeof operatorSchema>;

export type OperatorCreateInput = {
  operatorId: string;
  password: string;
  name: string;
  email?: string;
  phone?: string;
  machines: string[];
  franchiseId?: string | null;
};
export type OperatorPatch = Partial<{ name: string; email: string | null; phone: string | null; machines: string[] }>;
