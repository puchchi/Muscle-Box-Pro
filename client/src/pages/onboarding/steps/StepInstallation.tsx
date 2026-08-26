"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Mail,
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
          {/* One column until `sm`. Two cells at 375px is about 150px each, which is not
              enough for a serial number, and this card's whole purpose is a gym reading one
              off the screen and comparing it to the plate on the machine. */}
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Fact label="Model" value={machine.model} />
            <Fact label="Machine ID" value={machine.deviceNo ?? "—"} mono />
            <Fact
              label="Serial number"
              value={machine.serialNumber ?? "To be verified on site"}
              // Mono for a serial number, not for the sentence that stands in for one.
              mono={machine.serialNumber !== null}
            />
            <Fact label="Machine value" value={formatInr(machine.valueInr)} />
            {machine.accessories && (
              <Fact label="Accessories" value={machine.accessories} className="sm:col-span-2" />
            )}
            {isInstalled && machine.installationDate && (
              <Fact
                label="Installed on"
                value={formatAgreementDate(machine.installationDate)}
                className="sm:col-span-2"
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
            number against the plate on the machine before you sign it. That is what the check is
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
            written approval first (§21), so tell us before the survey if this address has changed.
          </p>
          {/*
            Step 1 is read-only once the agreement is signed (§32), so this card asked a gym to
            act and named no way of doing it. The address is on a signed agreement by the time
            anyone reads this, which makes changing it a conversation rather than a form.
          */}
          <a
            href="mailto:contact@muscleboxpro.com?subject=Installation%20address"
            className="inline-flex items-center gap-1.5 min-h-11 text-xs font-semibold text-primary-ink hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
            data-testid="link-address-changed"
          >
            <Mail className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            The address has changed
          </a>
        </section>
      )}

      <ChecksCard termMonths={state.terms.termMonths} onOpenAgreement={() => goToStep(3)} />

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

      {/* The account, not the activation. See the note in `StepDone`: `status` reaches `active`
          only through the admin route, and this card is about a login that already works. */}
      {!!state.timestamps.accountCreatedAt && (
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
 *
 * **Every line says whose move it is**, the same correction `StepPartnership`'s timeline
 * already carries and for the same reason. Six sentences of even weight left a gym to work
 * out which of them needed anything from it, and two of the six do: the serial-number check,
 * and the signature that starts the term. Those are now the two titles beginning with "You".
 *
 * The numbers stay, unlike step 5's (§33). This is a sequence inside one visit, told before
 * it happens, which is what `StepPartnership` numbers too — and a technician and a manager
 * standing at the machine have some use for "we're at four of six". Step 5's list was a
 * calendar of separate weeks, where the counting said nothing the dates did not.
 */
function ChecksCard({
  termMonths,
  onOpenAgreement,
}: {
  termMonths: number;
  onOpenAgreement(): void;
}) {
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
        {onTheDay(termMonths).map((item, index) => (
          <li key={item.title} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="w-6 h-6 rounded-full bg-primary/10 text-primary-ink text-xs font-bold flex items-center justify-center flex-shrink-0 tabular-nums"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-gray-700 leading-relaxed mt-4 pt-3 border-t border-gray-200">
        That certificate is Schedule A of your agreement. Signing it is a second signature,
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
 *
 * Item 1 says the gym accepts the placement, because the certificate records that it did
 * and because §21 makes that the last cheap moment to move it.
 */
function onTheDay(termMonths: number) {
  return [
    {
      title: "We place it, you accept the spot",
      body: "Where you agreed at the survey, with power and water connected. Say so on the day if that spot no longer works for you.",
    },
    {
      title: "You check the unit",
      body: "The serial number against the one on your record, and the machine's physical condition.",
    },
    {
      title: "We test it, with you there",
      body: "Power, the touchscreen, the payment system and dispensing.",
    },
    {
      title: "We photograph the handover",
      body: "The certificate is the record of what condition the machine was in on day one, and the photographs are part of it.",
    },
    {
      title: "We train your staff",
      body: "How to run the machine, restock it and clean it.",
    },
    {
      title: "You both sign the certificate",
      body: `You and our technician sign the Installation Certificate on site. Your ${termMonths}-month term starts from that date.`,
    },
  ];
}

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
        Wraps rather than truncating, the same correction step 4's receipt reference got: a
        cut-off value behind a `title` attribute is a value a touch screen has no way to
        read, and the two values here that matter are the ones a gym checks character by
        character against the machine in front of it.
      */}
      <dd
        className={`text-sm text-foreground mt-0.5 ${mono ? "font-mono break-all" : "font-semibold break-words"}`}
      >
        {value}
      </dd>
    </div>
  );
}
