import * as z from "zod";

export const OPERATOR_STATUSES = ["invited", "active", "disabled"] as const;
export type OperatorStatus = (typeof OPERATOR_STATUSES)[number];

const instant = z.string().nullable().optional().transform((v) => v ?? null);

export const operatorSchema = z.object({
  email: z.string().min(1),
  name: z.string(),
  phone: z.string().nullable().optional().transform((v) => v ?? null),
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
  lastLoginAt: instant,
  disabledAt: instant,
  disabledReason: z.string().nullable().optional().transform((v) => v ?? null),
});

export const operatorsSchema = z.object({ operators: z.array(operatorSchema) });

export const operatorEnvelopeSchema = z.object({ operator: operatorSchema });

export const operatorInviteSchema = z.object({
  operator: operatorSchema,
  inviteUrl: z.string().min(1),
  inviteExpiresAt: instant,
  emailed: z.boolean(),
});

export type Operator = z.infer<typeof operatorSchema>;
export type OperatorInvite = z.infer<typeof operatorInviteSchema>;

export type OperatorCreateInput = { email: string; name: string; phone: string | null; machines: string[]; franchiseId?: string | null };
export type OperatorPatch = Partial<{ name: string; phone: string | null; machines: string[] }>;

export const OPERATOR_NAME_MAX = 80;
export const OPERATOR_MACHINES_MAX = 200;
