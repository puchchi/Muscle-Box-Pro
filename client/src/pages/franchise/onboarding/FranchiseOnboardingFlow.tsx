"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, ArrowLeft, Lock, Pencil, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { scrollIntoViewGently } from "@/lib/motion";
import {
  franchisePhaseOf,
  franchiseStepMeta,
  franchiseStepsInPhase,
} from "@shared/franchise/onboarding/steps";
import type { FranchisePhaseId } from "@shared/franchise/onboarding/steps";
import {
  OPERATIONS_FIELD_NAMES,
  paymentClaimSchema,
} from "@shared/franchise/onboarding/schema";
import type {
  FranchiseOnboardingError,
  FranchiseOnboardingState,
  FranchiseOnboardingStep,
} from "@shared/franchise/onboarding/types";
import FranchiseOnboardingIntro from "./FranchiseOnboardingIntro";
import { PhaseBar, PhaseRail } from "./PhaseNav";
import PhaseSteps from "./PhaseSteps";
import { useFranchiseOnboarding } from "./useFranchiseOnboarding";
import StepDetails from "./steps/StepDetails";
import StepTerritory from "./steps/StepTerritory";
import StepDocuments from "./steps/StepDocuments";
import StepApproval from "./steps/StepApproval";
import StepFranchise from "./steps/StepFranchise";
import StepOperations from "./steps/StepOperations";
import StepReviewSign from "./steps/StepReviewSign";
import StepInstalment from "./steps/StepInstalment";
import StepDone from "./steps/StepDone";
import { BODY_TEXT, COLUMN, HINT_TEXT, PAGE } from "./shell";
import type { FranchiseStepViewProps } from "./types";

/**
 * The franchise onboarding wizard shell.
 *
 * `OnboardingFlow` is the model and its decisions carry over without being re-argued: one URL
 * for the whole flow because the step lives in the database rather than the path, no business
 * logic in this file, a skip link because the chrome is full of focusable things, a measured
 * sticky-chrome height published as a CSS variable, and focus moved to the heading of each new
 * step.
 *
 * ## Four screens over nine steps
 *
 * The nine steps are the server's, and nothing here changes them: `currentStep` is still whatever
 * the record says, `completedSteps` still gates what may be opened, and every step still submits
 * its own call. What changed is that a franchisee is no longer shown a ladder of nine. A **stage**
 * is the screen, and the stage's other steps are one-line rows above and below (`PhaseSteps`).
 * Nine destinations became four, and the detail moved from the chrome of every screen to the one
 * place it is a choice.
 *
 * **The `h1` is the step, not the stage.** It was the other way round, and it read wrongly: the
 * stage name is constant across the three screens of `agree`, so 30px of "Your agreement" sat over
 * an 18px "Operations readiness", and the thing that had actually changed was the smaller of the
 * two. The stage is now a label above the heading, and it is dropped where the stage is one step,
 * because "Territory approval" over "Approval" is one heading too many. The stage's blurb appears
 * only on the stage's first step: it is the same sentence on all three otherwise.
 *
 * ## One difference from the gym flow worth naming
 *
 * *A declined application is not an error screen.* It is step 4's content. `declined` comes
 * back from every mutating call, and rendering it as a red banner over a form would leave a
 * franchisee to work out from an error message that the answer was no. Step 4 says it, once,
 * in its own words.
 *
 * The route is `noindex`, and `Disallow: /franchise/onboarding/` in robots.txt. The handle
 * grants access to a PAN, a registered address and a ₹25 lakh term sheet.
 */

const STEP_COMPONENTS: Record<
  FranchiseOnboardingStep,
  ComponentType<FranchiseStepViewProps>
> = {
  1: StepDetails,
  2: StepTerritory,
  3: StepDocuments,
  4: StepApproval,
  5: StepFranchise,
  6: StepOperations,
  7: StepReviewSign,
  8: StepInstalment,
  9: StepDone,
};

/**
 * What a stage is called on the screen it heads, and what it is for.
 *
 * Separate from `FRANCHISE_PHASES.title`, which is two words at most because it renders in a nav
 * beside three others. A page heading has room to say something, and "Apply" as an `h1` over a form
 * asking for a PAN is a label rather than a sentence. Kept here rather than in `shared/` because it
 * is this wizard's chrome: nothing else renders it, and the nav's titles are what the invitation
 * email lists.
 *
 * The blurb says why the stage exists, not what is in it. The steps are already listed twice on the
 * screen below it, as the collapsed rows and as the step's own blurb, and a stage that is one step
 * gets no blurb at all: approval's would restate step 4's card one line above it. It renders on the
 * stage's first step only, so it is read on the way in rather than repeated on every screen.
 */
const PHASE_COPY: Record<FranchisePhaseId, { heading: string; blurb?: string }> = {
  apply: {
    heading: "Your application",
    blurb: "Everything we need to assess the territory. None of it commits you to anything.",
  },
  approval: {
    heading: "Territory approval",
  },
  agree: {
    heading: "Your agreement",
    blurb: "What you are agreeing to, and then the signature that makes it binding.",
  },
  fund: {
    heading: "Funding and setup",
    blurb: "The transfer that gets your machines on order, and the login that comes with it.",
  },
};

/**
 * Does the step on screen put this field's error on the field itself?
 *
 * `OnboardingFlow.stepMarksField` makes the argument: a step that highlights each field does
 * not also need the server's "please check the highlighted fields" above it, and two red boxes
 * twenty pixels apart is worse than one. Here five of the nine steps submit a record, so this
 * is a lookup per step rather than a pair of special cases.
 *
 * The field lists come from the schemas and from the state rather than being typed out, so a
 * field added to a step does not need remembering here. Anything unlisted keeps the banner:
 * for a field the step cannot mark, the banner is the only mention of it on the page.
 */
function stepMarksField(
  step: FranchiseOnboardingStep,
  field: string,
  state: FranchiseOnboardingState,
): boolean {
  if (step === 1) return field in state.details;
  if (step === 2) return field in state.territory;
  if (step === 6) return OPERATIONS_FIELD_NAMES.includes(field);
  if (step === 8) return field in paymentClaimSchema.shape;
  if (step === 9) return field === "password";
  return false;
}

export default function FranchiseOnboardingFlow({ handle }: { handle: string }) {
  const {
    state,
    fatalError,
    actionError,
    fieldErrors,
    isLoading,
    isSubmitting,
    currentStep,
    viewStep,
    canView,
    goToStep,
    isReadOnly,
    frozenReason,
    actions,
  } = useFranchiseOnboarding(handle);

  // Before the early returns, so the hook order is the same on every path.
  const chromeRef = useRef<HTMLDivElement>(null);
  const chromeHeight = useStickyChromeHeight(chromeRef, !isLoading && !fatalError);
  const headingRef = useStepFocus(viewStep, isLoading);

  if (isLoading) return <LoadingScreen />;
  if (fatalError) return <HandleProblem error={fatalError} />;
  if (!state) {
    return <HandleProblem error={{ code: "network", message: "Something went wrong." }} />;
  }

  const meta = franchiseStepMeta(viewStep);
  const phase = franchisePhaseOf(viewStep);
  const phaseCopy = PHASE_COPY[phase.id];
  const phaseSteps = franchiseStepsInPhase(phase.id).map((m) => m.step);
  const before = phaseSteps.filter((step) => step < viewStep);
  const after = phaseSteps.filter((step) => step > viewStep);
  // A stage of one step has nothing to distinguish from the step, so it keeps the stage's own
  // heading and skips the label above it. See `PHASE_COPY`.
  const isOnlyStep = phaseSteps.length === 1;
  const StepBody = STEP_COMPONENTS[viewStep];
  const isBehind = viewStep < currentStep;
  const showIntro = viewStep === 1 && !state.completedSteps.includes(1);


  const stepOwnsFieldErrors =
    fieldErrors !== null &&
    Object.keys(fieldErrors).length > 0 &&
    Object.keys(fieldErrors).every((name) => stepMarksField(viewStep, name, state));

  // `declined` is step 4's content, not a banner. See this module's header.
  const showActionError =
    actionError !== null && actionError.code !== "declined" && !stepOwnsFieldErrors;

  const nav = {
    currentStep,
    viewStep,
    completedSteps: state.completedSteps,
    canView,
    onSelect: goToStep,
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col"
      style={{ "--onboarding-chrome": `${chromeHeight}px` } as React.CSSProperties}
    >
      <a
        href="#franchise-step"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to this step
      </a>

      <div ref={chromeRef} className="sticky top-0 z-30">
        <Header franchiseName={state.franchiseDisplayName} />
        <PhaseBar {...nav} />
      </div>

      <div
        className={`flex-1 ${PAGE} py-8 lg:py-12 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-12 xl:gap-16`}
      >
        <div
          className="hidden lg:block lg:sticky lg:self-start"
          style={{ top: "calc(var(--onboarding-chrome, 0px) + 3rem)" }}
        >
          <PhaseRail {...nav} />
        </div>

        {/* `tabIndex={-1}` is what makes the skip link skip in Safari, which is what emailed
            links open in on iOS. See `OnboardingFlow`. */}
        <main
          id="franchise-step"
          tabIndex={-1}
          className={`${COLUMN} w-full space-y-6 outline-none`}
        >
          {showIntro ? (
            <FranchiseOnboardingIntro
              headingRef={headingRef}
              invitedByName={state.invitedByName}
              franchiseDisplayName={state.franchiseDisplayName}
            />
          ) : (
            <>
              <div>
                {!isOnlyStep && (
                  <p className="text-xs font-semibold text-muted-foreground">{phaseCopy.heading}</p>
                )}
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground outline-none"
                >
                  {isOnlyStep ? phaseCopy.heading : meta.title}
                </h1>
                {!isOnlyStep && <p className={`${BODY_TEXT} mt-1.5`}>{meta.blurb}</p>}
                {before.length === 0 && phaseCopy.blurb && (
                  <p className={`${BODY_TEXT} mt-1`}>{phaseCopy.blurb}</p>
                )}
              </div>

              <PhaseSteps steps={before} state={state} canView={canView} onSelect={goToStep} />
            </>
          )}

          {isBehind && (
            <ReviewingBanner
              frozenReason={frozenReason}
              canEdit={!isReadOnly}
              onReturn={() => goToStep(currentStep)}
            />
          )}

          {showActionError && actionError && <ActionErrorNotice error={actionError} />}

          <StepBody
            handle={handle}
            state={state}
            readOnly={isReadOnly}
            frozenReason={frozenReason}
            isSubmitting={isSubmitting}
            fieldErrors={fieldErrors}
            goToStep={goToStep}
            actions={actions}
          />

          {/* On the intro screen too, and that is what pays for the intro being four sentences.
              "Your territory, 3 minutes" is a row against the step it describes, so the card at the
              top does not have to be a table of what the whole flow costs. */}
          <PhaseSteps steps={after} state={state} canView={canView} onSelect={goToStep} />
        </main>
      </div>

      <Footer />
    </div>
  );
}

// ── Shell behaviour ─────────────────────────────────────────────────────────

/**
 * The height of the sticky chrome, in pixels, kept current across breakpoints.
 *
 * Published as a CSS variable so the things that have to clear it — the term sheet reader's
 * own contents bar, the `scroll-mt` on every clause anchor, the stage rail's own sticky offset —
 * can say so in a class. A `ResizeObserver` rather than a `resize` listener, because the stage bar
 * is in the measured block below `lg` and out of it above, so the height changes without the
 * window doing so.
 */
function useStickyChromeHeight(ref: React.RefObject<HTMLElement | null>, ready: boolean): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = ref.current;
    // Absent in jsdom; 0 is the right answer for a layout engine with no sticky positioning.
    if (!element || !ready || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setHeight(Math.round(entry.contentRect.height));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, ready]);

  return height;
}

/**
 * Moves the page to the top of the new step and puts focus on its heading. Skipped on the
 * first paint: an arriving franchisee has not navigated anywhere. See `OnboardingFlow`.
 */
function useStepFocus(viewStep: number, isLoading: boolean) {
  const ref = useRef<HTMLHeadingElement>(null);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) return;
    const from = previous.current;
    previous.current = viewStep;
    if (from === null || from === viewStep) return;
    window.scrollTo?.({ top: 0, behavior: "auto" });
    ref.current?.focus({ preventScroll: true });
  }, [viewStep, isLoading]);

  return ref;
}

// ── Chrome ──────────────────────────────────────────────────────────────────

function Header({ franchiseName }: { franchiseName: string }) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className={`${PAGE} h-14 sm:h-16 flex items-center justify-between gap-4`}>
        <Link
          href="/"
          className="flex-shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Image
            src="/assets/logo.png"
            alt="MuscleBoxPro"
            width={140}
            height={36}
            priority
            className="h-8 sm:h-9 w-auto"
          />
        </Link>
        {franchiseName && (
          <p
            className="min-w-0 text-xs sm:text-sm text-muted-foreground truncate"
            data-testid="header-franchise-name"
          >
            <span className="sr-only">Franchise onboarding for </span>
            {franchiseName}
          </p>
        )}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-5">
      <div
        className={`${PAGE} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}
      >
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          Your progress saves automatically. You can close this and come back to the same link.
        </p>
        <a
          href="mailto:contact@muscleboxpro.com"
          className="text-xs text-primary-ink font-semibold hover:underline flex-shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Need help?
        </a>
      </div>
    </footer>
  );
}

/**
 * The wait while the handle resolves. A skeleton of the shell rather than a line of centred
 * text, for the reason `OnboardingFlow.LoadingScreen` gives. Four rail rows, because four is what
 * the nav draws.
 */
function LoadingScreen() {
  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col"
      data-testid="franchise-onboarding-loading"
    >
      <div className="bg-white border-b border-gray-200">
        <div className={`${PAGE} h-14 sm:h-16 flex items-center`}>
          <div className="h-8 w-32 rounded-md bg-gray-100 animate-pulse" />
        </div>
      </div>
      <div className="border-b border-gray-200 bg-white lg:hidden" aria-hidden="true">
        <div className="h-0.5 bg-gray-100" />
        <div className={`${PAGE} py-3 flex gap-1.5`}>
          {[0, 1, 2, 3].map((stage) => (
            <div key={stage} className="flex-1 h-11 rounded-md bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
      <div
        className={`flex-1 ${PAGE} py-8 lg:py-12 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-12 xl:gap-16`}
        role="status"
      >
        <div className="hidden lg:block space-y-5" aria-hidden="true">
          {[0, 1, 2, 3].map((stage) => (
            <div key={stage} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-3 flex-1 rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
        <div className={`${COLUMN} w-full space-y-4`}>
          <p className="sr-only">Opening your application…</p>
          <div className="h-8 w-2/3 rounded-md bg-gray-200 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-gray-100 animate-pulse" />
          <div className="h-28 rounded-xl border border-gray-200 bg-white" />
          <div className="h-64 rounded-xl border border-gray-200 bg-white" />
        </div>
      </div>
    </div>
  );
}

/**
 * "You are not on the step the server is on", in whichever of its three senses applies.
 *
 * The frozen case takes its sentence from `freezeReason`, which is the same function the
 * server calls to refuse the submit. The gym flow's version writes its own copy and has to
 * keep it agreeing with the backend's rules; this cannot drift, because there is one sentence
 * and both sides read it.
 */
function ReviewingBanner({
  frozenReason,
  canEdit,
  onReturn,
}: {
  frozenReason: string | null;
  canEdit: boolean;
  onReturn(): void;
}) {
  const { Icon, title, body } = frozenReason
    ? { Icon: Lock, title: "Locked", body: frozenReason }
    : canEdit
      ? {
          Icon: Pencil,
          title: "You've come back to an earlier step",
          body: "Change whatever you need to and press Continue. That takes you back to where you were.",
        }
      : {
          Icon: ArrowLeft,
          title: "You're looking at an earlier step",
          body: "Nothing here can be changed from this view.",
        };

  return (
    // Stacked on a phone. Beside a button this wide, `frozenReason` was a 100px-wide column of
    // ten lines.
    <div
      className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-start"
      data-testid="reviewing-banner"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground mb-0.5">{title}</p>
          <p className={HINT_TEXT}>{body}</p>
        </div>
      </div>
      <Button
        variant="outline"
        onClick={onReturn}
        className="min-h-11 rounded-lg text-xs font-semibold flex-shrink-0 self-start cursor-pointer"
        data-testid="button-return-to-current"
      >
        Back to where I was
      </Button>
    </div>
  );
}

/**
 * A rejected submit. Field-level messages render on the inputs; this is the summary.
 *
 * `role="alert"` and the scroll, because step 1 is fourteen fields and its submit button is a
 * screen and a half below this banner.
 */
function ActionErrorNotice({ error }: { error: FranchiseOnboardingError }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollIntoViewGently(ref.current, { block: "start" });
  }, [error]);

  return (
    <div
      ref={ref}
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 px-4 py-3.5 scroll-mt-[calc(var(--onboarding-chrome,0px)_+_1rem)]"
      data-testid="action-error"
    >
      <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm text-red-800 leading-relaxed">{error.message}</p>
    </div>
  );
}

/**
 * The terminal screens: a handle that is wrong, expired or superseded.
 *
 * Each gets its own copy because each has a different next action. Note what is *not* here: a
 * declined application. That is a decision about the applicant rather than a broken link, and
 * it renders as step 4.
 */
function HandleProblem({ error }: { error: FranchiseOnboardingError }) {
  const copy: Record<string, { title: string; body: string; cta: string | null }> = {
    expired_handle: {
      title: "This link has expired",
      body: "Franchise application links are valid for 30 days. Ask us for a fresh one and you'll pick up where you left off. Nothing you filled in is lost.",
      cta: "Request a new link",
    },
    revoked_handle: {
      title: "This link is no longer valid",
      body: "A newer link was sent to you. Check your inbox for the most recent email from us, or ask us to resend it.",
      cta: "Ask us to resend",
    },
    invalid_handle: {
      title: "We couldn't find this link",
      body: "Check that you opened the full link from our email. Some mail apps break long URLs across lines.",
      cta: "Get in touch",
    },
    network: {
      title: "Something went wrong",
      body: "We couldn't load your application just now. Try again in a moment.",
      cta: null,
    },
  };
  const { title, body, cta } = copy[error.code] ?? copy.network;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header franchiseName="" />
      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div
          role="alert"
          className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-6 sm:p-8"
          data-testid="handle-problem"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-5 h-5 text-amber-700" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground mb-2">{title}</h1>
          <p className={`${BODY_TEXT} mb-6`}>{body}</p>
          {cta && (
            /* `asChild`, so this is one anchor rather than a button inside an anchor. This is
               the only screen a franchisee with a dead link ever sees. */
            <Button
              asChild
              className="min-h-11 w-full rounded-lg font-semibold text-sm cursor-pointer"
              data-testid="button-handle-cta"
            >
              <a href="mailto:contact@muscleboxpro.com">{cta}</a>
            </Button>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Already a franchisee?{" "}
            <Link
              href="/gym/login"
              className="text-primary-ink font-semibold hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Sign in to your dashboard
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
