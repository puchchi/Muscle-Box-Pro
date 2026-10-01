import * as z from "zod";

export const FEEDBACK_TYPES = ["query", "review", "complaint"] as const;
export const FEEDBACK_STATES = ["new", "replied", "closed"] as const;
export const FEEDBACK_REASONS = ["not_dispensed", "payment", "taste", "dirty", "other"] as const;
export const FEEDBACK_NOTE_MAX = 1000;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];
export type FeedbackState = (typeof FEEDBACK_STATES)[number];
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];

const text = z.string().nullable().optional().transform((v) => v ?? null);

export const feedbackSchema = z.object({
  id: z.string().min(1),
  sn: z.string(),
  shopName: z.string().nullable().optional().transform((v) => v ?? ""),
  type: z.enum(FEEDBACK_TYPES),
  goodsId: text,
  goodsName: text,
  rating: z.number().int().min(1).max(5).nullable().optional().transform((v) => v ?? null),
  reason: z.enum(FEEDBACK_REASONS).nullable().optional().transform((v) => v ?? null),
  message: text,
  email: text,
  phone: text,
  orderId: text,
  orderLinked: z.boolean().optional().transform((v) => v ?? false),
  state: z.enum(FEEDBACK_STATES),
  note: text,
  receivedAt: z.string(),
  updatedAt: text,
  updatedBy: text,
});

const typeCounts = z
  .object({ query: z.number().int().min(0), review: z.number().int().min(0), complaint: z.number().int().min(0) })
  .nullable()
  .optional()
  .transform((v) => v ?? null);

export const feedbackListSchema = z.object({
  items: z.array(feedbackSchema),
  nextCursor: z.string().nullable(),
  newCount: z.number().int().min(0).optional().transform((v) => v ?? 0),
  counts: typeCounts,
});

export type Feedback = z.infer<typeof feedbackSchema>;
export type FeedbackList = z.infer<typeof feedbackListSchema>;

export type FeedbackFilters = { type?: FeedbackType; sn?: string; state?: FeedbackState };
export type FeedbackPatch = { state?: FeedbackState; note?: string };
