/**
 * Runtime validation of `GET /admin/leads/{kind}`.
 *
 * The reason this exists at all is that the rows are not ours in the usual sense. They come from
 * Supabase through `providers/supabaseLeads.ts` in mbp-backend, which flattens three tables with three
 * different column layouts into one row shape by hand. A column renamed on one of those tables lands
 * here as `null`, and `null` is a legitimate value for six of the nine fields, so the failure this file
 * catches is the coarser one: a row that is not a row.
 *
 * `id` and `email` are the two fields required to be non-empty. `id` is the React key, and a list with
 * duplicate empty keys silently renders the wrong rows; `email` is the only field the panel exists to
 * hand back to a human, since a lead with no address is a lead nobody can answer.
 */

import * as z from "zod";
import { toParse, type AdminParse } from "./parse";
import type { LeadPage } from "./leads";

const leadKind = z.enum(["demo", "campaign", "investor"]);

const lead = z.object({
  id: z.string().min(1),
  kind: leadKind,
  name: z.string(),
  email: z.string().min(1),
  phone: z.string().nullable(),
  /**
   * A string, deliberately not `.datetime()`.
   *
   * `providers/supabaseLeads.ts` passes `created_at` through exactly as PostgREST serialised it, and
   * whether that carries an offset depends on whether the column is `timestamptz` or `timestamp` in a
   * project that is frozen and cannot be migrated to make them agree. A format assertion here would
   * take the whole list down over a display field; `formatIstDateTime` already renders an unparseable
   * value as itself, which is the honest failure.
   */
  createdAt: z.string(),
  organisation: z.string().nullable(),
  location: z.string().nullable(),
  investorType: z.string().nullable(),
  message: z.string().nullable(),
});

export const leadPageSchema = z.object({
  kind: leadKind,
  /** The server's whitelist, which the panel draws its tabs from. Empty would mean no tabs at all. */
  kinds: z.array(leadKind).min(1),
  leads: z.array(lead),
  /** Null when PostgREST answered without a `Content-Range`. See `LeadPage.total`. */
  total: z.number().int().min(0).nullable(),
});

export const _leadPageTypeCheck = leadPageSchema satisfies z.ZodType<LeadPage>;

export function parseLeadPage(value: unknown): AdminParse<LeadPage> {
  return toParse(leadPageSchema.safeParse(value));
}
