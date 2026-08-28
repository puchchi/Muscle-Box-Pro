/**
 * The shared `contact@` mailbox, behind one seam.
 *
 * Four routes, and the same rule the rest of the panel follows: nothing under `app/admin/` or
 * `pages/admin/` calls `apiRequest` directly, and every response goes through
 * [mailSchema.ts](../../../shared/admin/mailSchema.ts) before a component sees it.
 *
 * ## Why the fetch is lazy, and stays lazy
 *
 * There is no module-level cache and no prefetch here on purpose. `GET /admin/mail/inbox` opens an IMAP
 * connection, which is a real second of billed Lambda time and a real login against a mailbox we do not
 * own the rate limits of. The Overview page must not pay for it, so the inbox is its own route and the
 * request happens when that route mounts. Same for the leads panel, for the same reason.
 *
 * ## `AdminReadResult` for the two writes as well
 *
 * Preview and reply are `POST`s, but they get the read result type rather than `OnboardingResult`,
 * because a malformed 200 is a real outcome for both and `issues` is where it goes. A `validation`
 * error's `fieldErrors` survives on `error.fieldErrors` either way, which is what the composer
 * highlights fields from.
 */

import { apiRequest } from "./apiClient";
import type { AdminReadResult } from "./adminApi";
import {
  parseAdminInbox,
  parseAdminMailMessage,
  parseMailPreview,
  parseMailSendResult,
} from "@shared/admin/mailSchema";
import type {
  AdminInbox,
  AdminMailMessage,
  MailPreview,
  MailSendResult,
  ReplyDraft,
  ReplyEnvelope,
} from "@shared/admin/mail";
import type { OnboardingError } from "@shared/onboarding/types";

/**
 * The inbox, newest first.
 *
 * `limit` is clamped server-side rather than refused, so a bad value costs the default page instead of
 * the page. Left as a number here so a caller cannot send anything else.
 */
export async function fetchInbox(limit?: number): Promise<AdminReadResult<AdminInbox>> {
  const suffix = limit === undefined ? "" : `?limit=${limit}`;
  const result = await apiRequest<unknown>("GET", `/admin/mail/inbox${suffix}`);
  if (!result.ok) return { ok: false, error: result.error, issues: [] };

  const parsed = parseAdminInbox(result.data);
  if (!parsed.ok) return { ok: false, error: MALFORMED_INBOX, issues: parsed.issues };
  return { ok: true, data: parsed.data };
}

/**
 * One message, with everything the composer needs to open prefilled.
 *
 * A 404 here is ordinary rather than exceptional: the list was drawn a minute ago and somebody may have
 * deleted the message from a mail client since. It arrives as `invalid_token`, because `codeForStatus`
 * in `apiClient` has no mapping for 404 — the same quirk `fetchAdminGymView` documents. The message text
 * the server sends is the part that is true, so the inbox shows that rather than inventing one.
 */
export async function fetchMailMessage(uid: number): Promise<AdminReadResult<AdminMailMessage>> {
  const result = await apiRequest<unknown>("GET", `/admin/mail/messages/${encodeURIComponent(String(uid))}`);
  if (!result.ok) return { ok: false, error: result.error, issues: [] };

  const parsed = parseAdminMailMessage(result.data);
  if (!parsed.ok) return { ok: false, error: MALFORMED_MESSAGE, issues: parsed.issues };
  return { ok: true, data: parsed.data };
}

/**
 * Render the draft without sending it.
 *
 * The route touches no mailbox and holds no credential, which is why it is a separate route rather than
 * a `dryRun` flag on the send: a flag defaulting to the wrong value, or dropped by a refactor, sends
 * mail to a stranger. The rendering is the same function `POST /admin/mail/reply` uses, so what comes
 * back here is the message that will go out and not an approximation of it.
 */
export async function previewReply(draft: ReplyDraft): Promise<AdminReadResult<MailPreview>> {
  const result = await apiRequest<unknown>("POST", "/admin/mail/preview", { body: draft });
  if (!result.ok) return { ok: false, error: result.error, issues: [] };

  const parsed = parseMailPreview(result.data);
  if (!parsed.ok) return { ok: false, error: MALFORMED_PREVIEW, issues: parsed.issues };
  return { ok: true, data: parsed.data };
}

/**
 * Send the reply. **The one call in this file with no undo.**
 *
 * The server awaits the SMTP hand-off, so a resolved `ok: true` means a mail server accepted the
 * message and `accepted`/`rejected` say for whom. Two failures the caller must not treat alike, and
 * both arrive as `code: "network"` with the distinction in the wording the server chose:
 *
 * - **"It was not sent."** An outright refusal. Safe to fix and retry.
 * - **"We could not confirm whether this reply was sent."** A timeout or a dropped connection after the
 *   message was handed over. Retrying here is how one reply becomes two, so the message says to check
 *   the Sent folder first and this function does not soften it.
 *
 * Nothing is retried automatically for that reason, here or in the composer.
 */
export async function sendReply(
  draft: ReplyDraft,
  envelope: ReplyEnvelope,
): Promise<AdminReadResult<MailSendResult>> {
  const result = await apiRequest<unknown>("POST", "/admin/mail/reply", {
    body: { ...draft, ...envelope },
  });
  if (!result.ok) return { ok: false, error: result.error, issues: [] };

  const parsed = parseMailSendResult(result.data);
  // The one place a schema failure is not "there is nothing to render": the mail has already gone. So
  // the message says the send probably worked, rather than the usual "this page cannot show it".
  if (!parsed.ok) return { ok: false, error: MALFORMED_SEND, issues: parsed.issues };
  return { ok: true, data: parsed.data };
}

const MALFORMED_INBOX: OnboardingError = {
  code: "network",
  message: "The inbox came back in a shape this page does not recognise.",
};

const MALFORMED_MESSAGE: OnboardingError = {
  code: "network",
  message: "That message came back in a shape this page does not recognise.",
};

const MALFORMED_PREVIEW: OnboardingError = {
  code: "network",
  message: "The preview came back in a shape this page does not recognise. Nothing was sent.",
};

const MALFORMED_SEND: OnboardingError = {
  code: "network",
  message:
    "The reply was probably sent, but the response did not say so in a shape this page recognises. Check the mailbox Sent folder before trying again.",
};
