"use client";

import { ArrowRight, CheckCircle2, Clock, MapPin, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatIstDate } from "../../../gym/istDates";
import type { FranchiseStepViewProps } from "../types";

/**
 * Step 4 — Approval. Ours, not the franchisee's.
 *
 * There is no method that completes this step and there must not be: it completes on read from
 * the approval record, the way the gym flow's installation step does. So this screen has no
 * button that advances anything. It has four states, and each one is a different situation
 * rather than a different amount of the same one.
 *
 * *Waiting.* The application is in. What is on screen is what we have, and when it arrived.
 *
 * *Approved.* The granted territory, and the requested one beside it **whenever they differ**.
 * That comparison is the reason the two are stored separately: approving three suburbs of five
 * and showing only the three would hide the fact that anything was cut, and the first time a
 * franchisee should learn that is not after signing.
 *
 * *On hold.* What we still need, who is in touch, and the steps to go and fix. A hold reopens
 * steps 1 to 3, which is why the buttons are here rather than a sentence asking them to email.
 *
 * *Declined.* One screen, no reason, and no support address dressed up as an appeal. The reason
 * is on our own record deliberately: a generated sentence explaining a commercial judgment is
 * the kind of text that gets quoted back, and territory availability is often the real reason
 * and is not ours to publish. What this does give is the one honest thing left, which is that
 * the market can change and we will say so if it does.
 */
export default function StepApproval({ state, goToStep }: FranchiseStepViewProps) {
  const approval = state.approval;
  const requested = state.territory.proposedTerritory;

  if (!approval) {
    return (
      <Card
        icon={<Clock className="w-5 h-5 text-amber-700" aria-hidden="true" />}
        tint="amber"
        title="With us for review"
        testId="approval-waiting"
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your application arrived
          {state.timestamps.kycSubmittedAt
            ? ` on ${formatIstDate(state.timestamps.kycSubmittedAt)}`
            : ""}
          . We check the territory against what is already allocated and what the market can
          carry, which usually takes a few working days. You do not need to do anything, and we
          will email {state.details.noticesEmail || "you"} either way.
        </p>
        <Detail label="You asked for" value={requested} />
        <p className="text-xs text-muted-foreground leading-relaxed">
          If we can only approve part of the territory, you will see exactly which part here
          before there is anything to sign.
        </p>
      </Card>
    );
  }

  if (approval.outcome === "approved") {
    const trimmed = approval.territory.trim();
    const differs = trimmed !== requested.trim();

    return (
      <Card
        icon={<CheckCircle2 className="w-5 h-5 text-primary-ink" aria-hidden="true" />}
        tint="primary"
        title="Territory approved"
        testId="approval-approved"
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          Approved on {formatIstDate(approval.decidedAt)}. This is the territory your term sheet
          is written against, and the only place it is defined.
        </p>

        <div
          className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3 space-y-2"
          data-testid="granted-territory"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3 h-3" aria-hidden="true" />
            Granted
          </p>
          <p className="text-sm font-semibold text-foreground">{approval.territory}</p>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {approval.territoryBoundary}
          </p>
        </div>

        {/* Shown only when it changed. Repeating an unchanged request under the grant is two
            identical paragraphs, and the reader learns nothing from the second. */}
        {differs && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3" data-testid="territory-differs">
            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-900 mb-1">
              Not the same as your request
            </p>
            <p className="text-sm text-amber-900 leading-relaxed">
              You asked for {requested}. What is granted above is what the term sheet will say,
              so read the boundary before you sign. Talk to us if that is not what you expected.
            </p>
          </div>
        )}

        {state.currentStep > 4 && (
          <Button
            onClick={() => goToStep(state.currentStep)}
            className="min-h-11 rounded-xl font-bold text-sm cursor-pointer"
            data-testid="button-continue-from-approval"
          >
            Carry on
            <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
          </Button>
        )}
      </Card>
    );
  }

  if (approval.outcome === "on_hold") {
    return (
      <Card
        icon={<Pencil className="w-5 h-5 text-amber-700" aria-hidden="true" />}
        tint="amber"
        title="We need a bit more"
        testId="approval-on-hold"
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          {approval.contactName} is looking at your application and needs the following before we
          can decide. Your earlier steps are open again, so you can change them here.
        </p>

        <ul role="list" className="space-y-2" data-testid="approval-outstanding">
          {approval.outstanding.map((item) => (
            <li key={item} className="text-sm text-foreground flex items-start gap-2.5">
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5"
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2">
          {/* The three steps a hold reopens, as buttons, because "please update your
              application" with nothing to press is a dead end. `freezeReason` returns null for
              all three while the record is on hold, so these are genuinely editable. */}
          <Button
            variant="outline"
            onClick={() => goToStep(1)}
            className="min-h-11 rounded-xl text-xs font-semibold cursor-pointer"
            data-testid="button-hold-to-details"
          >
            Your details
          </Button>
          <Button
            variant="outline"
            onClick={() => goToStep(2)}
            className="min-h-11 rounded-xl text-xs font-semibold cursor-pointer"
            data-testid="button-hold-to-territory"
          >
            Your territory
          </Button>
          <Button
            variant="outline"
            onClick={() => goToStep(3)}
            className="min-h-11 rounded-xl text-xs font-semibold cursor-pointer"
            data-testid="button-hold-to-documents"
          >
            Documents
          </Button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Submit step 3 again when you have dealt with these and the review restarts. Nothing you
          have already given us is lost.
        </p>
      </Card>
    );
  }

  return (
    <Card
      icon={<Clock className="w-5 h-5 text-gray-600" aria-hidden="true" />}
      tint="gray"
      title="We're not able to take this forward"
      testId="approval-declined"
    >
      <p className="text-sm text-muted-foreground leading-relaxed">
        We reviewed your application on {formatIstDate(approval.decidedAt)} and cannot offer this
        territory. That is our decision on this application rather than a judgment about you, and
        it is final for now.
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Territories open up as the network grows. If you would like us to come back to you when
        this one does, reply to the email that brought you here and say so. Nothing further is
        needed from you, and nothing you gave us will be used for anything else.
      </p>
    </Card>
  );
}

const TINTS = {
  primary: "border-primary/20",
  amber: "border-amber-200",
  gray: "border-gray-200",
} as const;

const ICON_TINTS = {
  primary: "bg-primary/10",
  amber: "bg-amber-100",
  gray: "bg-gray-100",
} as const;

function Card({
  icon,
  tint,
  title,
  testId,
  children,
}: {
  icon: React.ReactNode;
  tint: keyof typeof TINTS;
  title: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border bg-white p-5 sm:p-6 space-y-4 ${TINTS[tint]}`}
      data-testid={testId}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ICON_TINTS[tint]}`}
        >
          {icon}
        </div>
        <h2 className="text-base font-display font-bold text-foreground pt-2">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
