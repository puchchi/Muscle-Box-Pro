"use client";

import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Hourglass,
  LayoutDashboard,
  MapPin,
  PackageSearch,
  UserCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAgreementDate } from "@shared/onboarding/agreementFields";
import { formatInr } from "@shared/partnership/summary";
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
export default function StepInstallation({ state, goToStep }: StepViewProps) {
  const machine = state.machine;

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
        </section>
      )}

      <ChecksCard termMonths={state.terms.termMonths} />

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
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <LayoutDashboard
              className="w-4 h-4 text-muted-foreground flex-shrink-0"
              aria-hidden="true"
            />
            Your dashboard is ready
          </h2>
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
            {signedAt ? ` ${formatAgreementDate(signedAt)}` : " the day you signed"}. Nothing is
            counting down while you wait.
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
 * **What the gym has to arrange is not in the numbered list.** The two preparations were one
 * sentence under the heading, set exactly like the body copy either side of it, which put the
 * only thing on this step a gym must do in advance in the one position a reader skims — and the
 * cost of missing it is the wasted visit above. They are now a panel: what you arrange, then
 * what happens. The list below stays a description of our procedure, which is what it is.
 *
 * **Every line says whose move it is**, the same correction `StepPartnership`'s timeline
 * already carries and for the same reason. Six sentences of even weight left a gym to work
 * out which of them needed anything from it, and two of the six do: the serial-number check,
 * and the signature that starts the term. Those are the two titles beginning with "You", and
 * `yours` in `onTheDay` now tints their numerals to match — words alone put the distinction
 * in the one layer a reader skimming a list does not read.
 *
 * The numbers stay, unlike step 5's (§33). This is a sequence inside one visit, told before
 * it happens, which is what `StepPartnership` numbers too — and a technician and a manager
 * standing at the machine have some use for "we're at four of six". Step 5's list was a
 * calendar of separate weeks, where the counting said nothing the dates did not.
 */
function ChecksCard({ termMonths }: { termMonths: number }) {
  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
      data-testid="installation-checks"
    >
      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
        What happens on the day
      </h2>
      <div
        className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5"
        data-testid="installation-prep"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Before we arrive
        </p>
        <ul role="list" className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <li className="flex items-start gap-2 text-sm text-foreground leading-relaxed">
            {/* `Hourglass`, not `Clock`: this card's own status heading already uses
                `CalendarClock` for a date, and a duration two inches below it wants a glyph
                nobody can read as the same thing. */}
            <Hourglass className="w-4 h-4 text-primary-ink flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>Set aside about two hours</span>
          </li>
          <li className="flex items-start gap-2 text-sm text-foreground leading-relaxed">
            <UserCheck className="w-4 h-4 text-primary-ink flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>Have someone on site who can sign for the gym</span>
          </li>
        </ul>
      </div>
      <ol role="list" className="mt-4">
        {onTheDay(termMonths).map((item, index, all) => {
          const isLast = index === all.length - 1;
          return (
            <li key={item.title} className="flex gap-3">
              {/* The rule is step 5's, and for the reason its own note gives: `flex-1` inside a
                  column that stretches to the row reaches the next numeral whether the item
                  beside it runs to one line or three. Six even blocks read as six errands; this
                  is one visit. */}
              <div className="flex flex-col items-center" aria-hidden="true">
                <span
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 tabular-nums ${
                    item.yours ? "bg-primary/10 text-primary-ink" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {index + 1}
                </span>
                {!isLast && <span className="w-px flex-1 bg-gray-200 my-1.5" />}
              </div>
              <div className={`min-w-0 ${isLast ? "" : "pb-4"}`}>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-sm text-gray-700 leading-relaxed">{item.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
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
 *
 * `yours` marks the two the gym has to do something for, and it colours the numeral rather
 * than the row: the titles already begin with "You", so the tint is a second signal on a
 * 24px dot and not the only one. Brand ink on two of six, grey on the rest, which is less
 * colour on this card than the six tinted numerals it replaced.
 */
function onTheDay(termMonths: number) {
  return [
    {
      title: "We place it, you accept the spot",
      body: "Where you agreed at the survey, with power and water connected. Say so on the day if that spot no longer works for you.",
      yours: false,
    },
    {
      title: "You check the unit",
      body: "The serial number against the one on your record, and the machine's physical condition.",
      yours: true,
    },
    {
      title: "We test it, with you there",
      body: "Power, the touchscreen, the payment system and dispensing.",
      yours: false,
    },
    {
      title: "We photograph the handover",
      body: "The certificate is the record of what condition the machine was in on day one, and the photographs are part of it.",
      yours: false,
    },
    {
      title: "We train your staff",
      body: "How to run the machine, restock it and clean it.",
      yours: false,
    },
    {
      title: "You both sign the certificate",
      body: `You and our technician sign the Installation Certificate on site. Your ${termMonths}-month term starts from that date.`,
      yours: true,
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
