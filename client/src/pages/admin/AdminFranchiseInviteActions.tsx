"use client";

import { useState } from "react";
import { AlertTriangle, Ban, Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminFranchiseInviteResendResult, AdminFranchiseView } from "@shared/admin/franchises";
import {
  adminFranchiseResendFormSchema,
  toAdminFranchiseResendBody,
} from "@shared/admin/franchiseWrites";
import { resendFranchiseInvite, voidFranchiseInvite } from "@/lib/adminFranchiseApi";
import { ErrorPanel, SuccessPanel } from "./AdminUi";
import { formatIstDateTime } from "./adminFormat";

/**
 * Send a fresh onboarding link, or kill the live one.
 *
 * Both writes sit under the read-only link card rather than in a section of their own, because both
 * are about the record above them: what they change is which token that card is describing.
 *
 * ## A resend is destructive, so it asks first
 *
 * It is spelled "supersede", not "resend again": the server mints a new handle and revokes the
 * previous one in the same transaction, so the link the franchisee is currently holding stops
 * working the moment this button is pressed. If they had it all along and had simply not looked, a
 * resend has just broken a working link — which is recoverable, because the new one is in the
 * response, but only if somebody reads it. Hence the confirmation and the panel below.
 *
 * ## The URL is shown exactly once, and this is that once
 *
 * The server stores `sha256(handle)` and no handle. There is no second place to read it, no
 * "show link" button that could ever work, and closing this panel loses it — the remedy then is
 * another resend, which invalidates this one in turn. So it renders in a selectable input with a
 * copy button, above a line saying it will not be shown again, and it renders whether or not the
 * email went.
 *
 * ## Voiding is offered even when we hold no token
 *
 * `franchise.invite` is null for every franchise invited before the server began recording the
 * pointer, and their links are still live. The button is still there, and `wasLive: false` is
 * reported as what it is: we could not address the link, so it keeps working until it expires. That
 * is the honest answer and it is the one that tells an admin the exposure is still open.
 */
export function FranchiseInviteActions({
  franchise,
  onChanged,
}: {
  franchise: AdminFranchiseView;
  onChanged: () => void;
}) {
  const [pending, setPending] = useState<"resend" | "void" | null>(null);
  const [busy, setBusy] = useState<"resend" | "void" | null>(null);
  const [problem, setProblem] = useState<{ message: string; issues: string[] } | null>(null);
  const [issued, setIssued] = useState<AdminFranchiseInviteResendResult | null>(null);
  const [voided, setVoided] = useState<{ wasLive: boolean; message: string } | null>(null);

  // The name on the token being superseded, offered as the prefill for the field below. Blank sends
  // nothing and lets the server inherit it, which is the same outcome by a different route: the
  // server reads the superseded token itself. The field exists for the case where the contact has
  // actually changed.
  const [invitedByName, setInvitedByName] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  // Expiry counts as not live, and it has to: telling an admin that "the link they are holding now
  // stops working immediately" about a link that stopped working of its own accord is the sentence
  // that makes them hesitate over a resend there is no reason to hesitate over. A missing
  // `expiresAt` is the other way round: we cannot say it has lapsed, so it is treated as live.
  const live =
    franchise.invite !== null &&
    franchise.invite.revokedAt === null &&
    (franchise.invite.expiresAt === null ||
      Date.parse(franchise.invite.expiresAt) > Date.now());

  function reset() {
    setPending(null);
    setProblem(null);
  }

  async function resend() {
    const form = adminFranchiseResendFormSchema.safeParse({
      invitedByName,
      sendInvite: sendEmail,
    });
    if (!form.success) {
      setProblem({
        message: form.error.issues[0]?.message ?? "That name cannot be used.",
        issues: [],
      });
      return;
    }

    setBusy("resend");
    setProblem(null);
    setVoided(null);
    try {
      const result = await resendFranchiseInvite(
        franchise.franchiseId,
        toAdminFranchiseResendBody(form.data),
      );
      if (!result.ok) {
        setProblem({ message: result.error.message, issues: result.issues });
        return;
      }
      setIssued(result.data);
      setPending(null);
      onChanged();
    } finally {
      setBusy(null);
    }
  }

  async function revoke() {
    setBusy("void");
    setProblem(null);
    try {
      const result = await voidFranchiseInvite(franchise.franchiseId);
      if (!result.ok) {
        setProblem({ message: result.error.message, issues: result.issues });
        return;
      }
      setVoided({
        wasLive: result.data.wasLive,
        message: result.data.wasLive
          ? "The link has been revoked. Anyone holding it now gets a dead page, and the record above says who voided it and when."
          : "Nothing was live to revoke. Either it was already void, or this franchise was invited before we began storing the link's fingerprint. In that second case their link keeps working until it expires and nothing can stop it. Send a new one to supersede it.",
      });
      setPending(null);
      setIssued(null);
      onChanged();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border-t border-border/70 px-4 sm:px-5 py-4 space-y-3">
      {problem && (
        <ErrorPanel
          message={problem.message}
          issues={problem.issues}
          testId="invite-action-error"
          issuesTestId="invite-action-issues"
        />
      )}

      {issued && <IssuedLink issued={issued} onDismiss={() => setIssued(null)} />}

      {/* Green only when something was actually revoked. `wasLive: false` is the outcome where the
          exposure is still open, and a success panel saying so is a panel nobody reads twice. */}
      {voided &&
        (voided.wasLive ? (
          <SuccessPanel testId="invite-voided">{voided.message}</SuccessPanel>
        ) : (
          <p
            className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-xs text-amber-200 leading-relaxed"
            data-testid="invite-voided"
          >
            {voided.message}
          </p>
        ))}

      {pending === "resend" ? (
        <Confirm
          heading="Send a new link?"
          body={
            live
              ? "The link they are holding now stops working immediately. If they had it all along and simply had not looked, this breaks it, and the replacement is shown here once and nowhere else."
              : "We hold no live link for this franchise, so nothing here is lost. The new link is shown once and nowhere else."
          }
          confirmLabel={sendEmail ? "Send it" : "Mint it"}
          busy={busy === "resend"}
          busyLabel="Sending…"
          onConfirm={resend}
          onCancel={reset}
          testId="resend"
        >
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">
              Invited by, as the email signs it
            </span>
            <Input
              value={invitedByName}
              onChange={(event) => setInvitedByName(event.target.value)}
              placeholder={franchise.invite?.invitedByName ?? "Leave blank to keep the same name"}
              className="mt-1 h-10 rounded-xl bg-card border-border"
              data-testid="input-invited-by-name"
            />
            {/* Why blank is the right default nine times out of ten. The name is the franchisee's
                named contact through a months-long onboarding, and the server carries it forward
                from the token being superseded rather than substituting whoever is logged in. */}
            <span className="mt-1 block text-xs text-muted-foreground">
              Blank keeps the name they already know. Only change it if their contact has changed.
            </span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(event) => setSendEmail(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
              data-testid="checkbox-send-invite"
            />
            <span className="text-sm text-foreground">
              Email it to {franchise.details.noticesEmail || "the notices address"}
              <span className="block text-xs text-muted-foreground">
                The email says outright that the earlier link has stopped working. Untick to mint the
                link without sending anything and relay it yourself.
              </span>
            </span>
          </label>
        </Confirm>
      ) : pending === "void" ? (
        <Confirm
          heading="Revoke this link?"
          body="Whoever holds it gets a dead page. Nothing is emailed, and the token is kept as a record of which link they had. The far end of this link is an Aadhaar signature, so revoking a link that has gone to the wrong person is the point of this button."
          confirmLabel="Revoke it"
          busy={busy === "void"}
          busyLabel="Revoking…"
          onConfirm={revoke}
          onCancel={reset}
          testId="void"
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setVoided(null);
              setPending("resend");
            }}
            className="rounded-xl cursor-pointer h-9"
            data-testid="button-resend-invite"
          >
            <Send className="w-3.5 h-3.5" aria-hidden />
            Send a new link
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPending("void")}
            className="rounded-xl cursor-pointer h-9 text-muted-foreground hover:text-destructive"
            data-testid="button-void-invite"
          >
            <Ban className="w-3.5 h-3.5" aria-hidden />
            Revoke it
          </Button>
          <span className="text-xs text-muted-foreground">
            {live
              ? "A new link revokes this one."
              : "No live link on record. A new one can still be sent."}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * The one time this URL is readable.
 *
 * A read-only `Input` rather than a `<p>`, because the thing an admin needs to do with it is select
 * all of it, and a 32-hex handle inside a wrapped paragraph is the case where a partial selection
 * looks complete. `onFocus` selects it for the same reason.
 */
function IssuedLink({
  issued,
  onDismiss,
}: {
  issued: AdminFranchiseInviteResendResult;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(issued.onboardingUrl);
      setCopied(true);
    } catch {
      // No clipboard permission, or an insecure origin. The input beside this is the fallback and it
      // is already selectable, so there is nothing to report and nothing to recover.
      setCopied(false);
    }
  }

  return (
    <div
      className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4"
      data-testid="invite-resent"
    >
      <p className="text-sm font-semibold text-emerald-200">
        {issued.emailed
          ? "Sent. Their new link is below."
          : "Minted, and not emailed. Copy the link and send it to them yourself."}
      </p>
      {!issued.emailed && (
        <p className="mt-1 text-xs text-amber-200" data-testid="invite-email-failed">
          {issued.emailReason
            ? `The email did not go: ${issued.emailReason}. The link itself is live.`
            : "No email was sent. The link itself is live."}
        </p>
      )}

      {/* Stacked below `sm`. Side by side at 390px the input shows "https://muscleboxpro.c", and a
          URL you can only read a fifth of is the one an admin retypes wrong. */}
      <div className="mt-2.5 flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
        <Input
          readOnly
          value={issued.onboardingUrl}
          onFocus={(event) => event.currentTarget.select()}
          className="h-10 rounded-xl bg-card border-emerald-400/25 font-mono text-xs"
          data-testid="input-onboarding-url"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copy}
          className="h-10 w-full sm:w-auto rounded-xl cursor-pointer flex-shrink-0 bg-card"
          data-testid="button-copy-onboarding-url"
        >
          <Copy className="w-3.5 h-3.5" aria-hidden />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <p className="mt-2 flex items-start gap-2 text-xs text-amber-200 leading-relaxed">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
        <span>
          This is the only time this link can be read. We store a fingerprint of it and not the link
          itself, so nothing can show it again. It expires {formatIstDateTime(issued.expiresAt)}.
        </span>
      </p>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="mt-1.5 h-8 rounded-xl cursor-pointer text-emerald-200"
        data-testid="button-dismiss-invite-url"
      >
        I have it
      </Button>
    </div>
  );
}

function Confirm({
  heading,
  body,
  confirmLabel,
  busy,
  busyLabel,
  onConfirm,
  onCancel,
  testId,
  children,
}: {
  heading: string;
  body: string;
  confirmLabel: string;
  busy: boolean;
  busyLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  testId: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 space-y-3"
      data-testid={`confirm-${testId}`}
    >
      <div>
        <p className="text-sm font-semibold text-amber-100">{heading}</p>
        <p className="mt-0.5 text-xs text-amber-200 leading-relaxed">{body}</p>
      </div>
      {children}
      <div className="flex items-center gap-2.5">
        <Button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="h-9 px-4 rounded-xl font-bold text-sm cursor-pointer"
          data-testid={`button-confirm-${testId}`}
        >
          {busy ? busyLabel : confirmLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-9 px-4 rounded-xl cursor-pointer bg-card"
          data-testid={`button-cancel-${testId}`}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
