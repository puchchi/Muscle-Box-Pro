/**
 * The demo, campaign and investor enquiries that still live in Supabase.
 *
 * One route, `GET /admin/leads/{kind}`, read through mbp-backend rather than through the Supabase
 * client this repo already has. That is not a stylistic choice: the admin session is an `HttpOnly`
 * cookie with no `Domain` attribute, so it is host-scoped to `api.muscleboxpro.com` and a route handler
 * on `www` cannot tell an admin from a stranger. Reading these rows from the browser would mean either
 * shipping a key that can read them or building a second way to prove who is asking.
 *
 * The panel that fetches this is its own route, so nothing here runs until somebody opens it.
 */

import { apiRequest } from "./apiClient";
import type { AdminReadResult } from "./adminApi";
import { parseLeadPage } from "@shared/admin/leadsSchema";
import type { LeadKind, LeadPage } from "@shared/admin/leads";
import type { OnboardingError } from "@shared/onboarding/types";

/**
 * One page of one kind, newest first.
 *
 * `kind` is a path parameter checked against a whitelist server-side, so an unknown one is a 404 before
 * any credential is used. It is typed as `LeadKind` here so a caller cannot send anything else, and the
 * tabs are still drawn from the `kinds` the response carries rather than from this type: the server's
 * list is the one that decides what exists.
 */
export async function fetchLeads(kind: LeadKind, limit?: number): Promise<AdminReadResult<LeadPage>> {
  const suffix = limit === undefined ? "" : `?limit=${limit}`;
  const result = await apiRequest<unknown>("GET", `/admin/leads/${encodeURIComponent(kind)}${suffix}`);
  if (!result.ok) return { ok: false, error: result.error, issues: [] };

  const parsed = parseLeadPage(result.data);
  if (!parsed.ok) return { ok: false, error: MALFORMED_LEADS, issues: parsed.issues };
  return { ok: true, data: parsed.data };
}

const MALFORMED_LEADS: OnboardingError = {
  code: "network",
  message: "The enquiry list came back in a shape this page does not recognise.",
};
