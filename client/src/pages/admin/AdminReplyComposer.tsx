"use client";

import { useMemo, useState } from "react";
import { Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { previewReply, sendReply } from "@/lib/adminMailApi";
import type {
  InboxMessage,
  MailPreview,
  MailSendResult,
  ReplyDraft,
  ReplyEnvelope,
  ReplyPrefill,
  ReplyTemplate,
} from "@shared/admin/mail";
import { Card, ErrorPanel, Notice, SuccessPanel } from "./AdminUi";
import { MessageHtml } from "./AdminMessageHtml";

/**
 * Compose and send one reply from the shared mailbox.
 *
 * ## A preview is required, and it has to be a preview of *this* draft
 *
 * Send stays disabled until the rendered preview on screen was produced from exactly the draft and
 * recipients now in the form. Editing anything invalidates it. That is the whole safety design of this
 * screen, and it is worth the extra click for two reasons: sending is irreversible, and the preview
 * route is free in every sense that matters — it holds no credential, opens no connection and renders
 * through the same function the send uses, so what is on screen is the message that will go out.
 *
 * The staleness key covers the recipients as well as the content. A confirmation of the right letter to
 * the wrong person is not a confirmation.
 *
 * ## The form is generated from the server's template registry
 *
 * `templates` comes from `GET /admin/mail/inbox` and the defaults come from
 * `GET /admin/mail/messages/{uid}`, both resolved server-side. Nothing here knows what a template
 * contains or what a blank field falls back to. The dashboard this replaces kept a second copy of the
 * registry in the browser and the two had drifted on a field label, which is the failure this shape
 * makes impossible rather than unlikely.
 *
 * So these are plain controlled inputs rather than the react-hook-form helpers in `adminFields.tsx`:
 * the field set is not known until a response arrives, and the validator is the server.
 */

const inputClass =
  "bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:bg-card transition-colors h-11 rounded-xl";

const areaClass =
  "bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:bg-card transition-colors rounded-xl";

/** The freeform option's value in the template picker. Not a template key, so it cannot collide. */
const FREEFORM = "";

type Problem = { message: string; issues: string[]; fieldErrors: Record<string, string> };

export function AdminReplyComposer({
  from,
  templates,
  message,
  prefill,
  onSent,
  onClose,
}: {
  /** The mailbox this will be sent as, shown because nobody should have to guess. */
  from: string;
  templates: ReplyTemplate[];
  message: InboxMessage;
  prefill: ReplyPrefill;
  /** Called once, after a reply has actually left, so the list can mark the row answered. */
  onSent: (uid: number) => void;
  onClose: () => void;
}) {
  const [templateKey, setTemplateKey] = useState<string>(templates[0]?.key ?? FREEFORM);
  /**
   * Held per template rather than reseeded on every switch, so an admin who looks at another template
   * and comes back has not lost what they typed. Seeded from the server's resolved defaults.
   */
  const [valuesByTemplate, setValuesByTemplate] = useState<Record<string, Record<string, string>>>(
    () => structuredCopy(prefill.defaults),
  );
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState(prefill.subject);
  const [to, setTo] = useState(prefill.to.join(", "));
  const [cc, setCc] = useState("");

  const [preview, setPreview] = useState<{ key: string; content: MailPreview } | null>(null);
  const [busy, setBusy] = useState<"preview" | "send" | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [sent, setSent] = useState<MailSendResult | null>(null);

  const template = templates.find((candidate) => candidate.key === templateKey) ?? null;
  const values = valuesByTemplate[templateKey] ?? {};

  const draft: ReplyDraft = useMemo(
    () =>
      template === null
        ? { subject, body }
        : {
            subject,
            template: template.key,
            // Only the fields this template declares. An undeclared key is ignored server-side too,
            // but sending one at all would mean the form and the registry disagree.
            values: Object.fromEntries(template.fields.map((field) => [field.key, values[field.key] ?? ""])),
          },
    [template, subject, body, values],
  );

  const envelope: ReplyEnvelope = useMemo(() => {
    const recipients = addressesFrom(to);
    const copies = addressesFrom(cc);
    return {
      to: recipients,
      ...(copies.length > 0 ? { cc: copies } : {}),
      ...(prefill.inReplyTo !== null ? { inReplyTo: prefill.inReplyTo } : {}),
      ...(prefill.references.length > 0 ? { references: prefill.references } : {}),
    };
  }, [to, cc, prefill.inReplyTo, prefill.references]);

  /**
   * What the preview has to have been taken of.
   *
   * The rendered content plus the recipients. Threading headers are excluded because they come from
   * the message being replied to and no field on this form can change them.
   */
  const key = JSON.stringify([draft, envelope.to, envelope.cc ?? []]);
  const fresh = preview !== null && preview.key === key;

  function setValue(fieldKey: string, value: string) {
    setValuesByTemplate((prev) => ({ ...prev, [templateKey]: { ...(prev[templateKey] ?? {}), [fieldKey]: value } }));
  }

  async function handlePreview() {
    setBusy("preview");
    const result = await previewReply(draft);
    setBusy(null);
    if (!result.ok) {
      setPreview(null);
      setProblem(toProblem(result.error.message, result.issues, result.error.fieldErrors));
      return;
    }
    setProblem(null);
    setPreview({ key, content: result.data });
  }

  async function handleSend() {
    // Belt and braces. The button is disabled without a fresh preview, and a disabled button is a
    // presentation detail: this is the check that survives a keyboard, a devtools poke or a refactor.
    if (!fresh) return;
    setBusy("send");
    const result = await sendReply(draft, envelope);
    setBusy(null);
    if (!result.ok) {
      setProblem(toProblem(result.error.message, result.issues, result.error.fieldErrors));
      return;
    }
    setProblem(null);
    setSent(result.data);
    onSent(message.uid);
  }

  if (sent) {
    return (
      <Card title="Reply sent" testId="card-reply-sent">
        <div className="px-4 sm:px-5 py-4 space-y-3">
          <SuccessPanel testId="reply-sent-panel">
            {sent.accepted.length > 0
              ? `Accepted for ${sent.accepted.join(", ")}.`
              : "The server accepted the message but named no recipient."}
            {sent.rejected.length > 0 && ` Refused for ${sent.rejected.join(", ")}.`}
          </SuccessPanel>
          {/*
            Reported rather than hidden. A reply that went out but is not in the shared Sent folder is
            invisible to whoever reads this mailbox in a mail client, and they need to know that before
            they answer the same enquiry again.
          */}
          {!sent.filedToSent && (
            <Notice testId="reply-not-filed">
              The reply was sent but a copy could not be saved to the mailbox Sent folder. Anyone
              reading this mailbox in a mail client will not see it there.
            </Notice>
          )}
          <p className="text-xs text-muted-foreground font-mono break-all" data-testid="reply-message-id">
            {sent.messageId}
          </p>
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl cursor-pointer"
            data-testid="button-close-composer"
          >
            Done
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Reply"
      note={`Sent as ${from}`}
      testId="card-reply"
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="rounded-xl cursor-pointer"
          data-testid="button-cancel-reply"
        >
          Cancel
        </Button>
      }
    >
      <div className="px-4 sm:px-5 py-4 space-y-4">
        {problem && (
          <ErrorPanel
            message={problem.message}
            issues={problem.issues}
            testId="reply-error"
            issuesTestId="reply-issues"
          />
        )}

        <Labelled label="To" hint="Separate several addresses with commas." error={problem?.fieldErrors.to}>
          <Input
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={inputClass}
            data-testid="input-reply-to"
          />
        </Labelled>

        <Labelled label="Cc (optional)" error={problem?.fieldErrors.cc}>
          <Input
            value={cc}
            onChange={(event) => setCc(event.target.value)}
            className={inputClass}
            data-testid="input-reply-cc"
          />
        </Labelled>

        <Labelled label="Subject" error={problem?.fieldErrors.subject}>
          <Input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className={inputClass}
            data-testid="input-reply-subject"
          />
        </Labelled>

        <Labelled label="Template" error={problem?.fieldErrors.template}>
          <select
            value={templateKey}
            onChange={(event) => setTemplateKey(event.target.value)}
            className={`${inputClass} w-full px-3 cursor-pointer`}
            data-testid="select-reply-template"
          >
            {templates.map((candidate) => (
              <option key={candidate.key} value={candidate.key}>
                {candidate.name}
              </option>
            ))}
            <option value={FREEFORM}>Write it myself</option>
          </select>
        </Labelled>

        {template === null ? (
          <Labelled
            label="Message"
            hint="Bold, italic, underline and lists survive. Links are stripped: a clickable link inside a message signed by our own domain is a phishing kit, not a formatting option."
            error={problem?.fieldErrors.body}
          >
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={10}
              placeholder="Your reply. Blank lines become paragraphs."
              className={areaClass}
              data-testid="input-reply-body"
            />
          </Labelled>
        ) : (
          template.fields.map((field) => (
            <Labelled
              key={field.key}
              label={field.label}
              error={problem?.fieldErrors[`values.${field.key}`]}
            >
              {field.kind === "text" ? (
                <Textarea
                  value={values[field.key] ?? ""}
                  onChange={(event) => setValue(field.key, event.target.value)}
                  rows={4}
                  className={areaClass}
                  data-testid={`input-reply-${field.key}`}
                />
              ) : (
                <Input
                  value={values[field.key] ?? ""}
                  onChange={(event) => setValue(field.key, event.target.value)}
                  className={inputClass}
                  data-testid={`input-reply-${field.key}`}
                />
              )}
            </Labelled>
          ))
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            variant="outline"
            onClick={() => void handlePreview()}
            disabled={busy !== null}
            className="rounded-xl cursor-pointer"
            data-testid="button-preview-reply"
          >
            <Eye className="w-4 h-4" aria-hidden />
            {busy === "preview" ? "Rendering…" : fresh ? "Previewed" : "Preview"}
          </Button>
          <Button
            onClick={() => void handleSend()}
            disabled={!fresh || busy !== null}
            className="rounded-xl cursor-pointer bg-primary-fill text-primary-foreground font-bold"
            data-testid="button-send-reply"
          >
            <Send className="w-4 h-4" aria-hidden />
            {busy === "send" ? "Sending…" : "Send"}
          </Button>
          <p className="text-xs text-muted-foreground" data-testid="reply-send-hint">
            {fresh
              ? "This is what will be sent. Editing anything below or above needs another preview."
              : "Preview first. Sending cannot be undone, so the button stays off until you have seen the message."}
          </p>
        </div>

        {preview && (
          <div className="pt-1 space-y-2">
            {!fresh && (
              <Notice testId="preview-stale">
                This preview is of an earlier draft. Press Preview again to see the current one.
              </Notice>
            )}
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Preview
            </p>
            <p className="text-sm font-semibold text-foreground" data-testid="preview-subject">
              {preview.content.subject}
            </p>
            {/*
              Our own markup, rendered in the same isolation as a stranger's. Not paranoia about our
              templates: the free-text body inside them is sanitised rather than escaped, and this is
              the one place a hole in `sanitiseBodyHtml` would show up as something executing.
            */}
            <MessageHtml html={preview.content.html} height="20rem" testId="preview-html" />
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * A label, its control, and the server's complaint about it.
 *
 * `error` comes from a `validation` response's `fieldErrors`, which is namespaced exactly as this
 * component's callers key into it (`values.region`, `to`, `subject`). The server reports every bad
 * field at once, so a form with two problems shows two.
 */
function Labelled({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-muted-foreground mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground mt-1.5">{hint}</span>}
      {error && (
        <span className="block text-xs font-semibold text-rose-200 mt-1.5" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

/**
 * `"a@b.com, c@d.com"` to a list.
 *
 * Empties are dropped so a trailing comma is not a recipient. Nothing else is checked here: the server
 * validates addresses and enforces the ceiling on how many a reply may go to, and a second regex in the
 * browser would only be a different opinion about which addresses are real.
 */
function addressesFrom(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function structuredCopy(defaults: Record<string, Record<string, string>>): Record<string, Record<string, string>> {
  return Object.fromEntries(Object.entries(defaults).map(([key, values]) => [key, { ...values }]));
}

function toProblem(
  message: string,
  issues: string[],
  fieldErrors: Record<string, string> | undefined,
): Problem {
  return { message, issues, fieldErrors: fieldErrors ?? {} };
}
