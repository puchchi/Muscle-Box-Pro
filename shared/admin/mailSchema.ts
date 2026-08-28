/**
 * Runtime validation of the three `/admin/mail/*` reads.
 *
 * Same argument as [gymsSchema.ts](./gymsSchema.ts), with one addition that is specific to mail: **most
 * of what arrives here was written by a stranger.** A subject, a display name and a body come off an
 * IMAP envelope somebody else composed, so this is the layer that decides a `subject` is a string before
 * a component puts it in a heading. `mailparser` is well behaved about that, but nothing in the chain
 * from a sender's mail client to this function is ours.
 *
 * On strictness: plain `z.object()` throughout, which strips unknown keys rather than refusing them, so
 * the backend adding a field cannot take the inbox down. What is guarded is the opposite direction, a
 * field the panel renders going missing or changing type.
 *
 * ## What this does not do
 *
 * It does not sanitise `html`. It could not usefully: a schema can say "string or null" and nothing
 * more, and a half-sanitised string is more dangerous than an obviously untrusted one because it looks
 * handled. The isolation is the sandboxed iframe in `AdminInbox.tsx`, and it is the only defence.
 */

import * as z from "zod";
import { toParse, type AdminParse } from "./parse";
import type { AdminInbox, AdminMailMessage, MailPreview, MailSendResult } from "./mail";

/** A subject may legitimately be empty. `mailparser` gives `""` for a message that has no `Subject`. */
const text = z.string();

/** ISO 8601, or null where the message carried no parseable date. Format-checked, not parsed. */
const instant = z.string().datetime({ offset: true }).nullable();

const mailAddress = z.object({
  name: z.string(),
  address: z.string(),
});

/**
 * A UID is positive because IMAP UIDs start at 1, and it is the only field here the panel *acts* on:
 * it goes into the path of `GET /admin/mail/messages/{uid}`. A zero or a float would be a request for
 * a message that cannot exist.
 */
const uid = z.number().int().positive();

const inboxSummary = z.object({
  uid,
  messageId: z.string().nullable(),
  subject: text,
  from: mailAddress.nullable(),
  to: z.array(mailAddress),
  date: instant,
  seen: z.boolean(),
  answered: z.boolean(),
});

const inboxMessage = inboxSummary.extend({
  cc: z.array(mailAddress),
  inReplyTo: z.string().nullable(),
  references: z.array(z.string()),
  text,
  html: z.string().nullable(),
});

const templateField = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["line", "text"]),
});

const replyTemplate = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  fields: z.array(templateField),
});

/**
 * At least one template, because a picker with nothing in it is a composer with no way to write
 * anything. The registry is a constant in mbp-backend, so an empty list means the response is not the
 * one this panel thinks it is asking for.
 */
export const adminInboxSchema = z.object({
  from: z.string().min(1),
  templates: z.array(replyTemplate).min(1),
  messages: z.array(inboxSummary),
});

const replyPrefill = z.object({
  subject: text,
  to: z.array(z.string()),
  inReplyTo: z.string().nullable(),
  references: z.array(z.string()),
  defaults: z.record(z.string(), z.record(z.string(), z.string())),
});

export const adminMailMessageSchema = z.object({
  message: inboxMessage,
  reply: replyPrefill,
});

/**
 * A preview with an empty `html` is a preview of nothing, and the whole point of the route is to be
 * the message that will be sent. `min(1)` so a rendering bug shows up as a failed preview rather than
 * as a blank panel an admin might read as "short email".
 */
export const mailPreviewSchema = z.object({
  subject: z.string().min(1),
  text: z.string().min(1),
  html: z.string().min(1),
});

export const mailSendResultSchema = z.object({
  messageId: z.string(),
  response: z.string(),
  accepted: z.array(z.string()),
  rejected: z.array(z.string()),
  filedToSent: z.boolean(),
  filedFolder: z.string().nullable(),
});

export const _inboxTypeCheck = adminInboxSchema satisfies z.ZodType<AdminInbox>;
export const _messageTypeCheck = adminMailMessageSchema satisfies z.ZodType<AdminMailMessage>;
export const _previewTypeCheck = mailPreviewSchema satisfies z.ZodType<MailPreview>;
export const _sendTypeCheck = mailSendResultSchema satisfies z.ZodType<MailSendResult>;

export function parseAdminInbox(value: unknown): AdminParse<AdminInbox> {
  return toParse(adminInboxSchema.safeParse(value));
}

export function parseAdminMailMessage(value: unknown): AdminParse<AdminMailMessage> {
  return toParse(adminMailMessageSchema.safeParse(value));
}

export function parseMailPreview(value: unknown): AdminParse<MailPreview> {
  return toParse(mailPreviewSchema.safeParse(value));
}

export function parseMailSendResult(value: unknown): AdminParse<MailSendResult> {
  return toParse(mailSendResultSchema.safeParse(value));
}
