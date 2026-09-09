/**
 * The link that carries a demo enquiry into the invite-a-gym form, and the reading of it.
 *
 * Mirrors `franchiseInviteLink.ts`, with one difference: a demo request is a Supabase row, and
 * Supabase is frozen. There is no triage state to advance and nothing to write back the way a
 * franchise application's `sourceApplicationId` records a conversion, so this link only carries
 * what the gym already told us into the fields on this form that ask for it again. `name`,
 * `location` and `message` are here for the panel that shows what was written, not for any input.
 */

const PARAM = {
  email: "email",
  tradeName: "tradeName",
  phone: "phone",
  name: "name",
  location: "location",
  message: "message",
} as const;

export type ConvertibleLead = {
  name: string;
  email: string;
  phone: string | null;
  organisation: string | null;
  location: string | null;
  message: string | null;
};

export function inviteHrefForLead(row: ConvertibleLead): string {
  const params = new URLSearchParams({ [PARAM.email]: row.email, [PARAM.name]: row.name });
  if (row.organisation?.trim()) params.set(PARAM.tradeName, row.organisation.trim());
  if (row.phone?.trim()) params.set(PARAM.phone, row.phone.trim());
  if (row.location?.trim()) params.set(PARAM.location, row.location.trim());
  if (row.message?.trim()) params.set(PARAM.message, row.message.trim());
  return `/admin/gyms/new?${params.toString()}`;
}

/** What the enquirer told us, shown rather than filled in. `null` when this is a fresh invite. */
export type GymInviteSource = {
  writtenBy: string;
  location: string | null;
  message: string | null;
};

export type GymInvitePrefill = {
  tradeName: string;
  noticesEmail: string;
  noticesPhone: string;
  source: GymInviteSource | null;
};

/**
 * Read the link, falling back to a blank invite.
 *
 * Gated on `email` rather than an id: a demo lead has one, but nothing downstream can use it, so
 * carrying it across would be a value with no reader. Email is never blank on a real row, which is
 * the same anchoring role `application` plays for a franchise conversion.
 */
export function gymInvitePrefillFrom(params: URLSearchParams | null): GymInvitePrefill {
  const email = params?.get(PARAM.email)?.trim() ?? "";
  if (email === "") return { tradeName: "", noticesEmail: "", noticesPhone: "", source: null };

  return {
    tradeName: params?.get(PARAM.tradeName)?.trim() ?? "",
    noticesEmail: email,
    noticesPhone: params?.get(PARAM.phone)?.trim() ?? "",
    source: {
      writtenBy: params?.get(PARAM.name)?.trim() ?? "",
      location: params?.get(PARAM.location)?.trim() || null,
      message: params?.get(PARAM.message)?.trim() || null,
    },
  };
}
