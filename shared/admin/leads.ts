/**
 * The shape `GET /admin/leads/{kind}` sends.
 *
 * These rows come out of Supabase, which is frozen: no migration will ever add a column, so the one
 * drift this has to survive is a rename on the mbp-backend side of `providers/supabaseLeads.ts`, where
 * the three tables' differing column names are flattened into one row type.
 *
 * Every field a table does not have arrives as `null` rather than being absent, which is why so many of
 * these are nullable. A campaign enquiry has no personal name and an investor enquiry has no phone
 * number; the panel renders those cells as blank rather than pretending the columns exist.
 */

export type LeadKind = "demo" | "campaign" | "investor";

export type Lead = {
  id: string;
  kind: LeadKind;
  /** Whoever wrote in. The brand name on a campaign enquiry, which has no personal name. */
  name: string;
  email: string;
  phone: string | null;
  /** ISO 8601. */
  createdAt: string;
  /** The gym on a demo request, the brand on a campaign, the firm on an investor enquiry. */
  organisation: string | null;
  location: string | null;
  investorType: string | null;
  message: string | null;
};

/**
 * One page of one kind.
 *
 * `kinds` is the server's own list, so the tabs are drawn from the whitelist the route validates
 * against rather than from a copy of it here. A kind the server stops serving stops being a tab.
 *
 * `total` is rows in the table, not rows in this page, and it is `null` when PostgREST answered without
 * a `Content-Range`. A count we did not get is not a count of zero, so the panel says how many it is
 * showing instead of inventing a total.
 */
export type LeadPage = {
  kind: LeadKind;
  kinds: LeadKind[];
  leads: Lead[];
  total: number | null;
};
