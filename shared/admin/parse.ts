/**
 * The one outcome type every admin-panel validator returns, and the adapter that builds it.
 *
 * Lifted out of `gymsSchema.ts` when the mail and leads routes needed the same two things. The reason
 * it is shared rather than copied is `issues`: the panel puts those strings on screen, and three copies
 * of this function would eventually format them three ways for the same failure.
 */

import type * as z from "zod";

export type AdminParse<T> = { ok: true; data: T } | { ok: false; issues: string[] };

/**
 * Turn a `safeParse` result into an `AdminParse`.
 *
 * `issues` are `path: message` strings for a developer-facing detail line. Unlike the gym dashboard,
 * the audience here *is* a developer or an operator, so the panel shows them rather than hiding them
 * behind "unavailable" — a field path is the fastest possible answer to "what changed on the backend?".
 */
export function toParse<T>(result: z.SafeParseReturnType<unknown, T>): AdminParse<T> {
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    }),
  };
}
