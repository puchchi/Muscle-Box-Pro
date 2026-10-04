import type { Feedback, FeedbackReason, FeedbackState, FeedbackType } from "@shared/admin/feedbackSchema";

export const TYPE_LABEL: Record<FeedbackType, string> = { query: "Query", review: "Review", complaint: "Complaint" };

export const TYPE_PILL_CLASS: Record<FeedbackType, string> = {
  query: "bg-secondary text-muted-foreground",
  review: "bg-emerald-400/10 text-emerald-200",
  complaint: "bg-rose-400/10 text-rose-200",
};

export const STATE_LABEL: Record<FeedbackState, string> = { new: "New", replied: "Replied", closed: "Closed" };

export const STATE_PILL_CLASS: Record<FeedbackState, string> = {
  new: "bg-amber-400/10 text-amber-200",
  replied: "bg-sky-400/10 text-sky-200",
  closed: "bg-secondary text-muted-foreground",
};

export const REASON_LABEL: Record<FeedbackReason, string> = {
  not_dispensed: "Didn't get my drink",
  payment: "Payment / refund",
  taste: "Taste",
  dirty: "Machine dirty",
  other: "Other",
};

export const ORDER_NOT_FOUND_HINT = "No order with this number on this machine.";

export function stars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export function firstLine(message: string | null, max = 80): string {
  const line = (message ?? "").split(/\r?\n/).find((l) => l.trim()) ?? "";
  const trimmed = line.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

export function countsTowardBadge(feedback: Pick<Feedback, "type" | "state">): boolean {
  return feedback.state === "new" && feedback.type !== "review";
}
