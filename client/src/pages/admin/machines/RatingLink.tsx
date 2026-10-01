import Link from "next/link";
import type { GoodRating } from "@shared/admin/machinesSchema";

export function RatingLink({ rating, sn, testId }: { rating: GoodRating | null; sn?: string; testId: string }) {
  if (!rating) {
    return (
      <span className="text-muted-foreground" data-testid={testId}>
        —
      </span>
    );
  }
  const query = new URLSearchParams({ type: "review", ...(sn ? { sn } : {}) });
  const avg = rating.avg.toFixed(1);
  return (
    <Link
      href={`/machines/feedback?${query}`}
      className="whitespace-nowrap rounded-md tabular-nums text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Rated ${avg} out of 5 from ${rating.count} ${rating.count === 1 ? "review" : "reviews"}. Open reviews.`}
      data-testid={testId}
    >
      <span className="text-amber-300" aria-hidden>
        ★
      </span>{" "}
      {avg} <span className="text-muted-foreground">({rating.count})</span>
    </Link>
  );
}
