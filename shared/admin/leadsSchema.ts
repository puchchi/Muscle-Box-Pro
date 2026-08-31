/**
 * Runtime validation of `GET /admin/leads/{kind}`.
 *
 * The reason this exists at all is that the rows are assembled by hand on the other side. Two mappings
 * in mbp-backend flatten differently-shaped records into this one row: `providers/supabaseLeads.ts` for
 * `demo` and `campaign`, and `domain/leads.ts` for `investor` since it moved to DynamoDB. A field
 * renamed in either lands here as `null`, and `null` is a legitimate value for seven of the ten fields,
 * so the failure this file catches is the coarser one: a row that is not a row.
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
  /**
   * Required-but-nullable rather than optional, which means **mbp-backend deploys before this app does.**
   *
   * Both Supabase kinds send an explicit `null`, so every backend that has this field sends it for all
   * three kinds, and an API older than this schema fails every tab rather than just the investor one.
   * That is the deliberate half of the trade: `.optional()` would survive the skew but would also make a
   * later rename of `reference` show blank forever, which is the silent drift this whole file exists to
   * catch. The loud version is diagnosable — `ErrorPanel` prints the field path — and the same backend
   * commit carries `POST /investor/enquiries`, so a skew breaks the public form either way.
   */
  reference: z.string().nullable(),
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
