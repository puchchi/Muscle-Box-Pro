"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  PackageSearch,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IS_MOCK_ONBOARDING, previewAdvanceInstallation } from "@/lib/onboardingApi";
import { formatAgreementDate } from "@shared/onboarding/agreementFields";
import { formatInr } from "@shared/partnership/summary";
import type { MachineSummary } from "@shared/onboarding/types";
import type { StepViewProps } from "../types";

/**
 * Step 6 — Installation.
 *
 * The one step the gym does not do. Every other step in the flow asks for something;
 * this one answers the question a gym asks the day after signing — which machine, when,
 * and what happens when the technician arrives — and it is a step rather than a
 * dashboard panel because the emailed link is where they will go looking for it.
 *
 * **It exists because these particulars left the agreement.** Up to v2.2 the signature
 * page carried a Machine ID, a serial number and an installation date as blanks: fields
 * inside a document being signed electronically, describing a unit nobody had allocated
 * yet. They are now recorded on the Installation Certificate under §17 and described in
 * Schedule A, and this screen is the gym's view of that record as it fills in. See
 * `shared/agreement/v2_3.ts` and `AGREEMENT_V2_3_CHANGES`.
 *
 * **Read-only, with no control that completes it.** `machine.deviceNo` arrives when we
 * allocate a unit and `machine.installationDate` when Schedule A is signed on site, both
 * from our side. So the three renderings below are not progressive disclosure of one
 * form — they are three states of a record, and the empty one is the honest answer for
 * the first few days rather than something to hide behind a spinner.
 */
export default function StepInstallation({ token, state, goToStep }: StepViewProps) {
  /**
   * Preview only. `previewAdvanceInstallation` mutates the mock's store, and holding what
   * it returns locally is what makes the allocated and installed renderings reachable
   * without a way for a step to re-read state — which steps deliberately do not have.
   */
  const [previewMachine, setPreviewMachine] = useState<MachineSummary | null>(null);
  const machine = previewMachine ?? state.machine;

  const isAllocated = machine.deviceNo !== null;
  const isInstalled = machine.installationDate !== null;
  const address = state.details.installationAddress.trim();

  return (
    <div className="space-y-6">
      <StatusCard
        isAllocated={isAllocated}
        installationDate={machine.installationDate}
        termMonths={state.terms.termMonths}
        signedAt={state.timestamps.signedAt}
      />

      {isAllocated && (
        <section
          className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
          data-testid="installation-unit"
        >
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <PackageSearch className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            The unit allocated to you
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <Fact label="Model" value={machine.model} />
            <Fact label="Machine ID" value={machine.deviceNo ?? "—"} mono />
            <Fact label="Serial number" value={machine.serialNumber ?? "To be verified on site"} mono />
            <Fact label="Machine value" value={formatInr(machine.valueInr)} />
            {machine.accessories && (
              <Fact label="Accessories" value={machine.accessories} className="col-span-2" />
            )}
            {isInstalled && machine.installationDate && (
              <Fact
                label="Installed on"
                value={formatAgreementDate(machine.installationDate)}
                className="col-span-2"
              />
            )}
          </dl>
          {/*
            The serial number is the value both parties verify on the day, so it is shown
            even before it is verified — a gym that finds a different number on the unit in
            front of it is the reason clause 17 has a verification step at all.
          */}
          <p className="text-xs text-gray-700 leading-relaxed mt-4 pt-3 border-t border-gray-200">
            These are the particulars that go onto your Installation Certificate. Check the serial
            number against the plate on the machine before you sign it — that is what the check is
            for.
          </p>
        </section>
      )}

      {address && (
        <section
          className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
          data-testid="installation-address"
        >
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            Where it goes
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed mt-1">{address}</p>
          <p className="text-xs text-gray-700 leading-relaxed mt-2">
            From the details you gave us at step 1. Moving the machine anywhere else needs our
            written approval first (§21), so tell us now if this address has changed.
          </p>
        </section>
      )}

      <ChecksCard onOpenAgreement={() => goToStep(3)} />

      {state.depositStatus !== "paid" && (
        <section
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5"
          data-testid="installation-deposit-note"
        >
          <h2 className="text-base font-bold text-amber-900 flex items-center gap-2">
            <Wallet className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            Installation waits for the deposit
          </h2>
          <p className="text-sm text-amber-900 leading-relaxed mt-1">
            The site survey can go ahead without it, but the machine does not go in until the{" "}
            {formatInr(state.terms.securityDepositInr)} refundable deposit has cleared. Step 4 has
            your payment link, and it is in your email too.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => goToStep(4)}
            className="min-h-11 rounded-xl text-sm font-semibold mt-3 w-full sm:w-auto cursor-pointer"
            data-testid="button-go-to-deposit"
          >
            Go to the deposit
          </Button>
        </section>
      )}

      {state.status === "active" && (
        <section
          className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
          data-testid="installation-dashboard"
        >
          <h2 className="text-base font-bold text-foreground">Your dashboard is ready</h2>
          <p className="text-sm text-gray-700 leading-relaxed mt-1">
            Sign in with{" "}
            <strong className="text-foreground">{state.details.noticesEmail || "your email"}</strong>{" "}
            and the password you chose. Everything on this page is in there too, under Machine.
          </p>
          <Button
            asChild
            className="h-11 px-6 rounded-xl font-bold text-sm mt-4 w-full sm:w-auto cursor-pointer"
          >
            <Link href="/gym/dashboard" data-testid="link-dashboard">
              Open my dashboard
            </Link>
          </Button>
        </section>
      )}

      {IS_MOCK_ONBOARDING && !isInstalled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-900 leading-relaxed">
            Preview mode: nothing on this step moves by itself, because on a real record we move it.
            This button stands in for us.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPreviewMachine(previewAdvanceInstallation(token))}
            className="min-h-11 rounded-xl text-xs font-semibold mt-2 cursor-pointer"
            data-testid="button-preview-advance-installation"
          >
            {isAllocated ? "Pretend it was installed" : "Pretend a unit was allocated"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Local pieces ────────────────────────────────────────────────────────────

/**
 * Where the record has got to, in the one sentence that answers "so when do I get it".
 *
 * Three states, and the middle one is the one to get right: a unit with a serial number
 * and no date yet is where a gym sits for most of the fortnight, and "allocated" on its
 * own reads like nothing has happened.
 */
function StatusCard({
  isAllocated,
  installationDate,
  termMonths,
  signedAt,
}: {
  isAllocated: boolean;
  installationDate: string | null;
  termMonths: number;
  signedAt: string | null;
}) {
  if (installationDate) {
    return (
      <section
        className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5"
        data-testid="installation-status"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">
              Installed on {formatAgreementDate(installationDate)}
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed mt-1">
              Your machine is in and your {termMonths}-month term runs from that date. The
              Installation Certificate you and our technician signed is with your agreement in your
              dashboard.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5"
      data-testid="installation-status"
    >
      <div className="flex items-start gap-3">
        <CalendarClock
          className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">
            {isAllocated ? "Booking your installation date" : "Allocating your machine"}
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed mt-1">
            {isAllocated
              ? "A unit is yours and the particulars below are on your record. We'll call to fix a date that suits your quiet hours, and it appears here as soon as it is agreed."
              : "Your agreement is signed. Next on our side: the site survey, then picking the unit that goes to you. We'll email you when it has a serial number, and it shows up here."}
          </p>
          {/*
            §4.1 makes the term start the later of signing and installation, which is the
            one commercial consequence of this step and the thing a gym is most likely to
            have assumed the other way round.
          */}
          <p className="text-xs text-gray-700 leading-relaxed mt-2">
            Your {termMonths}-month term runs from the installation date, not from
            {signedAt ? ` ${formatAgreementDate(signedAt)}` : " the day you signed"} (§4.1). Nothing
            is counting down while you wait.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Schedule A, as the six things that happen in the gym rather than as a list of clauses.
 *
 * Worth its own card because it is the only part of installation the gym has to be
 * present for: someone has to be there with authority to sign, and a technician arriving
 * to find the duty manager alone is a wasted visit for both of us.
 */
function ChecksCard({ onOpenAgreement }: { onOpenAgreement(): void }) {
  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
      data-testid="installation-checks"
    >
      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
        What happens on the day
      </h2>
      <p className="text-sm text-gray-700 leading-relaxed mt-1">
        Allow about two hours, and have someone there who can sign for the gym.
      </p>
      <ol role="list" className="mt-4 space-y-3">
        {ON_THE_DAY.map((item, index) => (
          <li key={item} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="w-6 h-6 rounded-full bg-primary/10 text-primary-ink text-xs font-bold flex items-center justify-center flex-shrink-0 tabular-nums"
            >
              {index + 1}
            </span>
            <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
          </li>
        ))}
      </ol>
      <p className="text-xs text-gray-700 leading-relaxed mt-4 pt-3 border-t border-gray-200">
        That certificate is Schedule A of your agreement, and signing it is a second signature —
        separate from the one you have already given.{" "}
        <button
          type="button"
          onClick={onOpenAgreement}
          className="font-semibold text-primary-ink hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
          data-testid="button-open-agreement"
        >
          Read Schedule A
        </button>
        .
      </p>
    </section>
  );
}

/**
 * The certificate's checklist, in the order a technician actually does it.
 *
 * Kept in step with Schedule A in `shared/agreement/v2_3.ts` — the agreement is what
 * binds, and these six lines are the same eight items said in the gym's words.
 */
const ON_THE_DAY = [
  "We place the machine where you agreed at the survey, and connect power and water.",
  "You check the serial number on the unit against the one on your record, and its physical condition.",
  "We test power, the touchscreen, the payment system and dispensing, together.",
  "We photograph the machine as it stands at handover.",
  "We show your staff how to run it, restock it and clean it.",
  "You and our technician sign the Installation Certificate. Your term starts from that date.",
] as const;

function Fact({
  label,
  value,
  mono,
  className = "",
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">{label}</dt>
      {/*
        `title` with the `truncate`, as on step 4's receipt: two columns at 375px is about
        150px a cell, and a serial number a gym cannot read in full is the one value here
        that has to be checkable against the plate on the machine.
      */}
      <dd
        title={value}
        className={`text-sm text-foreground mt-0.5 truncate ${mono ? "font-mono" : "font-semibold"}`}
      >
        {value}
      </dd>
    </div>
  );
}
