/**
 * The shapes the four `/admin/mail/*` routes send and accept.
 *
 * Written by hand rather than inferred from a schema, the same division `shared/admin/gyms.ts` keeps:
 * this file is the statement of intent a reader consults, and
 * [mailSchema.ts](./mailSchema.ts) is what the panel will actually accept at runtime. The
 * `satisfies z.ZodType<T>` lines there are what stop the two drifting.
 *
 * The definitions mirror `services/onboarding/src/providers/imapInbox.ts` and
 * `domain/replyTemplates.ts` in mbp-backend. `readonly` arrays there are plain arrays here, because a
 * parsed response is ours and the panel sorts it.
 */

/** A name and an address off an IMAP envelope. Either may be `""`. */
export type MailAddress = {
  name: string;
  address: string;
};

/** One row of the inbox list. Envelope only, so no body has been fetched for it. */
export type InboxSummary = {
  uid: number;
  messageId: string | null;
  subject: string;
  from: MailAddress | null;
  to: MailAddress[];
  /** ISO 8601, or null when the message carries no parseable date. */
  date: string | null;
  seen: boolean;
  answered: boolean;
};

/**
 * One opened message.
 *
 * **`html` is markup a stranger sent us.** It goes in a sandboxed iframe and never through
 * `innerHTML` or `dangerouslySetInnerHTML`. `MessageBody` in
 * [AdminInbox.tsx](../../client/src/pages/admin/AdminInbox.tsx) is the only thing that renders it.
 */
export type InboxMessage = InboxSummary & {
  cc: MailAddress[];
  inReplyTo: string | null;
  references: string[];
  text: string;
  html: string | null;
};

export type TemplateField = {
  key: string;
  label: string;
  /** `line` is one input, `text` is a textarea. The server bounds their lengths differently. */
  kind: "line" | "text";
};

export type ReplyTemplate = {
  key: string;
  name: string;
  fields: TemplateField[];
};

/**
 * `GET /admin/mail/inbox`.
 *
 * The templates ride along with the messages because a second route for a constant list is a second
 * Lambda, a second alarm and a second cold start. `from` is the mailbox the reply will be sent as,
 * shown in the composer so nobody has to guess which address a recipient will see.
 */
export type AdminInbox = {
  from: string;
  templates: ReplyTemplate[];
  messages: InboxSummary[];
};

/**
 * Everything the composer needs to open prefilled, resolved server-side.
 *
 * `defaults` is keyed by template key and then by field key. The server resolves it from the message
 * being replied to, so the browser holds no second copy of the template registry. The local dashboard
 * held one, and the two had already drifted on a field label.
 */
export type ReplyPrefill = {
  subject: string;
  to: string[];
  inReplyTo: string | null;
  references: string[];
  defaults: Record<string, Record<string, string>>;
};

/** `GET /admin/mail/messages/{uid}`. */
export type AdminMailMessage = {
  message: InboxMessage;
  reply: ReplyPrefill;
};

/**
 * What goes to `POST /admin/mail/preview` and, with the envelope added, to `POST /admin/mail/reply`.
 *
 * `template` and `body` are the two mutually exclusive halves: with a template the server renders it
 * from `values`, without one it renders `body` in the branded card. Sending neither is a field error
 * on `body`, which is the picker's own recovery.
 */
export type ReplyDraft = {
  subject: string;
  template?: string;
  values?: Record<string, string>;
  body?: string;
};

export type ReplyEnvelope = {
  to: string[];
  cc?: string[];
  inReplyTo?: string;
  references?: string[];
};

/** `POST /admin/mail/preview` — the rendered message, from the same code path that sends it. */
export type MailPreview = {
  subject: string;
  text: string;
  html: string;
};

/**
 * `POST /admin/mail/reply`.
 *
 * `filedToSent: false` arrives in a 200: the message is delivered and there is no undo, so a failed
 * copy to the Sent folder is something to tell the admin about rather than a failed request.
 */
export type MailSendResult = {
  messageId: string;
  response: string;
  accepted: string[];
  rejected: string[];
  filedToSent: boolean;
  filedFolder: string | null;
};
