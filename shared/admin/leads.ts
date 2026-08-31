/**
 * The shape `GET /admin/leads/{kind}` sends.
 *
 * One route, two stores since 2026-08-31: `investor` is served from `mbp-investors-<env>` and
 * `demo`/`campaign` still come out of Supabase, which is frozen. Which store answers a kind is
 * deliberately not something this side knows, so the move needed no URL change here. The drift this
 * has to survive is a rename in either of mbp-backend's two mappings, `providers/supabaseLeads.ts`
 * and `domain/leads.ts`.
 *
 * Every field a source does not have arrives as `null` rather than being absent, which is why so many
 * of these are nullable. A campaign enquiry has no personal name and an investor enquiry has no phone
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
  /**
   * The `MBP-IN-…` the enquirer was given, on investor leads only.
   *
   * `null` on the two Supabase kinds, whose acknowledgements never carried one. Worth a column
   * because it is the string *they* have, so it is what they quote in a reply that has to be matched
   * back to a row.
   */
  reference: string | null;
};

/**
 * One page of one kind.
 *
 * `kinds` is the server's own list, so the tabs are drawn from the whitelist the route validates
 * against rather than from a copy of it here. A kind the server stops serving stops being a tab.
 *
 * `total` is rows in the collection, not rows in this page, and it is `null` when the source could not
 * tell us: Supabase answering without a `Content-Range`, or DynamoDB returning a full page, where the
 * length is a fact about the request rather than about the table. A count we did not get is not a count
 * of zero, so the panel says how many it is showing instead of inventing a total.
 */
export type LeadPage = {
  kind: LeadKind;
  kinds: LeadKind[];
  leads: Lead[];
  total: number | null;
};
