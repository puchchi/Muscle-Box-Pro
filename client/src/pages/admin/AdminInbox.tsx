"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, RefreshCw, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchInbox, fetchMailMessage } from "@/lib/adminMailApi";
import type { AdminInbox as Inbox, AdminMailMessage, InboxSummary, MailAddress } from "@shared/admin/mail";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { Card, ErrorPanel, Field, Fields, Notice } from "./AdminUi";
import { AdminReplyComposer } from "./AdminReplyComposer";
import { MessageHtml } from "./AdminMessageHtml";
import { formatIstDateTime } from "./adminFormat";

/**
 * The Inbox tab — the shared `contact@` mailbox, and replying to it.
 *
 * Replaces the mail half of `local_dashboard`, the throwaway Express app that ran on somebody's laptop
 * behind a shared password. What is different here, beyond living in the real panel: the reply is
 * awaited rather than fired and forgotten, a preview is required before sending, and a message body is
 * rendered in a sandboxed frame instead of being written into the page.
 *
 * ## What it costs, and why it is shaped that way
 *
 * `GET /admin/mail/inbox` opens an IMAP connection, so it is the most expensive read in the panel by an
 * order of magnitude. Three consequences, all deliberate:
 *
 * - **Nothing is fetched until this route is opened.** It is a route of its own rather than a section of
 *   `/admin`, so signing in costs nothing extra.
 * - **The list is envelopes only.** No body is fetched for a message nobody has opened.
 * - **An opened message is kept.** Selecting a row again is free; `Refresh` is the way to go back to the
 *   server, and it is a button rather than a timer.
 *
 * ## Opening a message does not mark it read
 *
 * Both IMAP opens in mbp-backend are `readOnly: true`, so nothing this panel does changes a flag in the
 * shared mailbox. Somebody reading `contact@` in a mail client sees exactly what they saw before. That
 * is stated on screen rather than left to be discovered, because an unread count that never goes down
 * looks like a bug.
 */

type Problem = { message: string; issues: string[] };

export default function AdminInbox() {
  const guard = useAdminGuard();
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<number | null>(null);
  const [opened, setOpened] = useState<Record<number, AdminMailMessage>>({});
  const [openProblem, setOpenProblem] = useState<Problem | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [view, setView] = useState<"html" | "text">("html");
  /**
   * Replied-to UIDs, held here rather than refetched.
   *
   * Setting the `\Answered` flag in the mailbox would need a writable IMAP open, which nothing in this
   * service does. So a reply sent in this session shows as answered in this session, and a reload goes
   * back to what the server says. Honest, and cheaper than an IMAP round trip to change one flag.
   */
  const [answered, setAnswered] = useState<ReadonlySet<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchInbox();
    setLoading(false);
    if (!result.ok) {
      setProblem({ message: result.error.message, issues: result.issues });
      return;
    }
    setProblem(null);
    setInbox(result.data);
  }, []);

  useEffect(() => {
    if (guard.state !== "ready") return;
    void load();
  }, [guard.state, load]);

  const open = useCallback(
    async (uid: number) => {
      setSelected(uid);
      setComposing(false);
      setOpenProblem(null);
      setView("html");
      if (opened[uid] !== undefined) return;
      setOpening(uid);
      const result = await fetchMailMessage(uid);
      setOpening((current) => (current === uid ? null : current));
      if (!result.ok) {
        setOpenProblem({ message: result.error.message, issues: result.issues });
        return;
      }
      setOpened((prev) => ({ ...prev, [uid]: result.data }));
    },
    [opened],
  );

  if (guard.state !== "ready") return <AdminChecking />;

  const messages = inbox?.messages ?? [];
  const current = selected === null ? null : (opened[selected] ?? null);

  return (
    <AdminShell session={guard.session}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1
            className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1"
            data-testid="admin-inbox-heading"
          >
            Inbox
          </h1>
          <p className="text-muted-foreground text-sm" data-testid="admin-inbox-subtitle">
            {loading && inbox === null
              ? "Opening the mailbox…"
              : inbox === null
                ? "Nothing loaded."
                : `${messages.length} newest in ${inbox.from}.`}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl cursor-pointer"
          data-testid="button-refresh-inbox"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </Button>
      </div>

      {problem && (
        <div className="mb-5">
          <ErrorPanel
            message={problem.message}
            issues={problem.issues}
            testId="admin-inbox-error"
            issuesTestId="admin-inbox-issues"
          />
        </div>
      )}

      {inbox !== null && messages.length === 0 && (
        <p className="text-sm text-muted-foreground" data-testid="admin-inbox-empty">
          The mailbox is empty.
        </p>
      )}

      {messages.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] items-start">
          <ul
            className="rounded-2xl border border-border bg-card divide-y divide-border/70 overflow-hidden"
            data-testid="inbox-list"
          >
            {messages.map((summary) => (
              <li key={summary.uid}>
                <button
                  type="button"
                  onClick={() => void open(summary.uid)}
                  aria-current={selected === summary.uid ? "true" : undefined}
                  className={`w-full text-left px-4 py-3 cursor-pointer transition-colors ${
                    selected === summary.uid ? "bg-secondary" : "hover:bg-secondary/50"
                  }`}
                  data-testid={`inbox-row-${summary.uid}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={`text-sm truncate ${
                        summary.seen ? "text-foreground" : "font-bold text-foreground"
                      }`}
                    >
                      {senderOf(summary.from)}
                    </span>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatIstDateTime(summary.date)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {summary.subject || "No subject"}
                  </p>
                  {(summary.answered || answered.has(summary.uid)) && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-200 mt-1"
                      data-testid={`inbox-answered-${summary.uid}`}
                    >
                      <Reply className="w-3 h-3" aria-hidden />
                      Replied
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="space-y-5">
            {selected === null && (
              <div
                className="rounded-2xl border border-border bg-card px-5 py-10 text-center"
                data-testid="inbox-nothing-selected"
              >
                <Mail className="w-5 h-5 text-muted-foreground/50 mx-auto mb-2" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  Pick a message. Its body is fetched when you open it, not before.
                </p>
              </div>
            )}

            {openProblem && (
              <ErrorPanel
                message={openProblem.message}
                issues={openProblem.issues}
                testId="inbox-open-error"
                issuesTestId="inbox-open-issues"
              />
            )}

            {opening !== null && current === null && (
              <p className="text-sm text-muted-foreground" data-testid="inbox-opening">
                Fetching the message…
              </p>
            )}

            {current && (
              <>
                <Card
                  title={current.message.subject || "No subject"}
                  testId="card-message"
                  action={
                    !composing && (
                      <Button
                        size="sm"
                        onClick={() => setComposing(true)}
                        className="rounded-xl cursor-pointer bg-primary-fill text-primary-foreground font-bold"
                        data-testid="button-open-reply"
                      >
                        <Reply className="w-4 h-4" aria-hidden />
                        Reply
                      </Button>
                    )
                  }
                >
                  <Fields>
                    <Field label="From" value={addressLine(current.message.from)} testId="message-from" />
                    <Field label="To" value={addressListLine(current.message.to)} testId="message-to" />
                    {current.message.cc.length > 0 && (
                      <Field label="Cc" value={addressListLine(current.message.cc)} testId="message-cc" />
                    )}
                    <Field
                      label="Received"
                      value={formatIstDateTime(current.message.date)}
                      testId="message-date"
                    />
                  </Fields>

                  <div className="border-t border-border/70 px-4 sm:px-5 py-4 space-y-3">
                    {current.message.html !== null && (
                      <div className="flex gap-1.5" role="group" aria-label="How to show the body">
                        <ViewTab active={view === "html"} onClick={() => setView("html")} testId="tab-html">
                          Formatted
                        </ViewTab>
                        <ViewTab active={view === "text"} onClick={() => setView("text")} testId="tab-text">
                          Plain text
                        </ViewTab>
                      </div>
                    )}
                    {/*
                      `MessageHtml` is the only renderer for this string, and the plain-text branch is a
                      `<pre>`, which React escapes. Nothing here reaches `dangerouslySetInnerHTML`.
                    */}
                    {current.message.html !== null && view === "html" ? (
                      <MessageHtml html={current.message.html} testId="message-html" />
                    ) : (
                      <pre
                        className="whitespace-pre-wrap break-words font-sans text-sm text-foreground max-h-[28rem] overflow-y-auto"
                        data-testid="message-text"
                      >
                        {current.message.text || "This message has no text body."}
                      </pre>
                    )}
                  </div>
                </Card>

                {composing && (
                  <AdminReplyComposer
                    // Keyed on the UID so switching messages gives a fresh composer rather than one
                    // holding the previous message's recipients and half-typed reply.
                    key={current.message.uid}
                    from={inbox?.from ?? ""}
                    templates={inbox?.templates ?? []}
                    message={current.message}
                    prefill={current.reply}
                    onSent={(uid) => setAnswered((prev) => new Set(prev).add(uid))}
                    onClose={() => setComposing(false)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="mt-5">
          <Notice testId="inbox-note">
            Opening a message here does not mark it read in the mailbox, and sending a reply does not
            flag the original as answered. Nothing this panel does writes to the mailbox, apart from
            saving a copy of a sent reply to the Sent folder.
          </Notice>
        </div>
      )}
    </AdminShell>
  );
}

/** The list's one line for a sender: a display name where there is one, the address otherwise. */
function senderOf(from: MailAddress | null): string {
  if (from === null) return "Unknown sender";
  return from.name.trim() || from.address || "Unknown sender";
}

/** `Name <address>` for the header, or just the address when the sender set no display name. */
function addressLine(address: MailAddress | null): string {
  if (address === null) return "";
  const name = address.name.trim();
  if (name === "") return address.address;
  return `${name} <${address.address}>`;
}

function addressListLine(addresses: MailAddress[]): string {
  return addresses.map((address) => addressLine(address)).join(", ");
}

function ViewTab({
  active,
  onClick,
  testId,
  children,
}: {
  active: boolean;
  onClick: () => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
      }`}
      data-testid={testId}
    >
      {children}
    </button>
  );
}
