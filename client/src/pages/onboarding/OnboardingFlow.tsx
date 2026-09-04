"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, ArrowLeft, Lock, Pencil, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scrollIntoViewGently } from "@/lib/motion";
import { STEP_META, stepMeta } from "@shared/onboarding/steps";
import type { GymDetails, OnboardingError } from "@shared/onboarding/types";
import OnboardingIntro from "./OnboardingIntro";
import ProgressRail from "./ProgressRail";
import { useOnboarding } from "./useOnboarding";
import StepDetails from "./steps/StepDetails";
import StepPartnership from "./steps/StepPartnership";
import StepReviewSign from "./steps/StepReviewSign";
import StepDeposit from "./steps/StepDeposit";
import StepDone from "./steps/StepDone";
import StepInstallation from "./steps/StepInstallation";
import type { StepViewProps } from "./types";

/**
 * The onboarding wizard shell.
 *
 * One URL for the whole flow — `/onboarding/<token>` — because the step lives in
 * the database, not the path. A gym can close the tab mid-form, open the same
 * emailed link three days later on a phone, and land exactly where it left off.
 * See docs/gym-onboarding.md §3 and §4.
 *
 * This file deliberately contains no business logic. It resolves the token,
 * renders the step the server named, and owns the chrome around it. Everything
 * about *what a step does* belongs in `steps/`.
 *
 * The route is `noindex` and `Disallow: /onboarding/` in robots.txt — the token
 * grants access to a gym's legal and financial details.
 *
 * ## `theme-console`, and deliberately without `dark`
 *
 * The portal a gym lands in from here carries it, as do the login, the set-password screen and
 * `DepositReturn`, so this flow was the one surface left running coral into a magenta portal. The
 * class only retargets the `--primary*` tokens, which is what makes it safe to add over markup
 * this old: the surfaces here are hard-coded `bg-white` and `border-gray-200` rather than
 * `bg-card`, so none of them move with a theme.
 *
 * That is also why **`dark` must not be added beside it**. It would flip `--foreground` to white
 * while those cards stayed white, and every heading in the flow would go invisible. Making this
 * tree dark is a rewrite of ~250 hard-coded utilities, not a class. The console theme is
 * documented as signed-in surfaces only, and this is a form somebody fills in for twenty minutes.
 */

const STEP_COMPONENTS: Record<number, ComponentType<StepViewProps>> = {
  1: StepDetails,
  2: StepPartnership,
  3: StepReviewSign,
  4: StepDeposit,
  5: StepDone,
  6: StepInstallation,
};

/**
 * Does the step on screen put this field's error on the field itself?
 *
 * Step 1 is eleven fields, so it carries an error summary — which meant a rejected submit
 * printed two red boxes twenty pixels apart: the server's own sentence ("Please check the
 * highlighted fields.") stacked above the summary that actually highlights them. The
 * generic one is the one to drop. The specific one names each field, says what is wrong
 * with it, and focuses it on click; the sentence above it was an instruction to read the
 * next box.
 *
 * Step 5 has one field, and the rejection it gets is a password the server refuses for a
 * rule `portalPasswordSchema` cannot mirror — a denylist, a distinct-character count. That
 * belongs under the input, so the banner would be the second box there too.
 *
 * A function rather than a `viewStep === 1`, so that giving step 3 the same treatment is
 * one line here rather than a condition to rediscover. Anything not named keeps the banner:
 * for a field the step cannot mark, that banner is the only mention of it on the page, and
 * a server that starts validating something a step does not collect should degrade to it
 * rather than to silence.
 */
function stepMarksField(step: number, field: string, details: GymDetails): boolean {
  if (step === 1) return field in details;
  if (step === 5) return field === "password";
  return false;
}

/**
 * One measure for the header, the rail and the body.
 *
 * They were `max-w-4xl` / `max-w-4xl` / `max-w-3xl`, which put the rail's left edge
 * 48px outside the card stack it labels — visible as a misalignment on any screen
 * wider than 896px.
 */
const SHELL = "max-w-3xl mx-auto px-4 sm:px-6";

/**
 * The prose measure. **This shell is it. Screen copy carries no `max-w-[Nch]` of its own.**
 *
 * Every paragraph in the flow used to carry `max-w-[56ch]` — about 470px at `text-sm`.
 * Against a 768px shell that is a card roughly 630px wide inside its padding, and unboxed
 * notes about 720px, so each paragraph stopped a third of the way short of the edge the
 * reader can actually see and left a column of white beside itself. Five or six of those
 * down one screen is the whole page reading as a narrow strip pinned to the left, and
 * inside the cards it was worse: the bold label above each body never had the cap, so the
 * heading ran wider than the sentence explaining it.
 *
 * The frames on these screens — the card edge, the shell — are now what set line length,
 * and the card padding is the gutter. That buys around 95 characters a line at `text-sm`,
 * past the 65–75 the eye tracks best, and it is the deliberate trade: this copy is short
 * (one to three lines, under a heading that says what it is), and for short copy a visible
 * ragged gap costs more than a long line does.
 *
 * The one exception is `AgreementReader`'s `PROSE`, which keeps `56ch`. Forty-seven
 * sections of contract read top to bottom is the case the measure exists for — there the
 * reader is tracking back to the left margin hundreds of times, and its card is wide
 * enough that uncapped lines ran to about 130 characters.
 *
 * If a measure is ever reintroduced here, note that `ch` lies about this: it is the advance
 * width of a *zero*, and in Plus Jakarta Sans a zero is 0.6em while the average character
 * in running English is about 0.45–0.5em. `56ch` ≈ 33.6em ≈ 74 characters, not 56, and the
 * count has to be recounted rather than kept if the typeface changes.
 */

export default function OnboardingFlow({ token }: { token: string }) {
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
    actions,
  } = useOnboarding(token);

  // Before the early returns, so the hook order is the same on every path.
  const railRef = useRef<HTMLDivElement>(null);
  const chromeHeight = useStickyChromeHeight(railRef, !isLoading && !fatalError);
  const headingRef = useStepFocus(viewStep, isLoading);

  if (isLoading) return <LoadingScreen />;
  if (fatalError) return <TokenProblem error={fatalError} />;
  if (!state) return <TokenProblem error={{ code: "network", message: "Something went wrong." }} />;

  const meta = stepMeta(viewStep);
  const StepBody = STEP_COMPONENTS[viewStep];
  const isBehind = viewStep < currentStep;
  /*
    The introduction, and with it the page header, on the one pass where a gym has not
    seen this flow before. The condition lived in `StepDetails` when the card sat inside
    the form; it belongs here now that the card is the thing above the form and carries
    the `h1`.

    Keyed off `completedSteps` rather than off `isReadOnly`, which is what it used to read and
    which stopped meaning "first pass" the moment step 1 became editable on a revisit. A gym
    coming back to correct its GSTIN would otherwise be welcomed to the flow a second time,
    with "Let's get you set up" over a form it has already submitted.
  */
  const showIntro = viewStep === 1 && !state.completedSteps.includes(1);
  /*
    Is the step below already saying this, field by field? Then it says it better, and the
    banner is a second red box repeating it. *Every* named field has to be one the step can
    mark — see `stepMarksField`.
  */
  const stepOwnsFieldErrors =
    fieldErrors !== null &&
    Object.keys(fieldErrors).length > 0 &&
    Object.keys(fieldErrors).every((name) => stepMarksField(viewStep, name, state.details));

  return (
    <div
      className="theme-console min-h-screen bg-gray-50 flex flex-col"
      /*
        Read by anything that has to sit below the sticky rail — the agreement
        reader's own contents bar, and the `scroll-mt` on every clause anchor. Measured
        rather than hardcoded, because the rail is two different heights at two
        breakpoints and grows if a step title wraps.
      */
      style={{ "--onboarding-chrome": `${chromeHeight}px` } as React.CSSProperties}
    >
      {/*
        Seven focusable things (logo, six rail steps) sit between the top of the
        document and the form. On a keyboard that is seven tabs per step, every step.
      */}
      <a
        href="#onboarding-step"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to this step
      </a>

      <Header gymName={state.gymDisplayName} />

      {/*
        Sticky, because these steps are long — step 1 is eleven fields and step 3 is a
        contract. Losing "which one am I on, and can I go back" the moment you
        start scrolling is the difference between a wizard and a wall of forms.
      */}
      <div ref={railRef} className="sticky top-0 z-30">
        <ProgressRail
          currentStep={currentStep}
          viewStep={viewStep}
          completedSteps={state.completedSteps}
          canView={canView}
          onSelect={goToStep}
        />
      </div>

      {/*
        `tabIndex={-1}` is what makes the skip link above actually skip. Chrome and
        Firefox set a focus navigation starting point at a fragment target; Safari does
        not, so without this the next Tab after "Skip to this step" went back to the top
        of the document — on the browser most emailed links open in.
      */}
      <main id="onboarding-step" tabIndex={-1} className={`flex-1 w-full ${SHELL} py-8 sm:py-10 outline-none`}>
        {/*
          One header, not two. The introduction used to render inside the step body,
          below this heading, which put "Confirm your details" ahead of "somebody sent
          you this link" — the instruction before the introduction, and two uppercase
          display headlines competing on the first screen a gym ever sees.

          On that first pass the intro card *is* the header and carries the `h1`; from
          step 2 onwards, and on any return to a finished step 1, the step's own title
          is. Either way exactly one `h1` opens the document, and the section headings
          in the body are the `h2`s under it.
        */}
        {showIntro ? (
          <OnboardingIntro
            headingRef={headingRef}
            invitedByName={state.invitedByName}
            gymDisplayName={state.gymDisplayName}
          />
        ) : (
          <div className="mb-6">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-xl sm:text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1 outline-none"
            >
              {meta.title}
            </h1>
            <p className="text-muted-foreground text-sm">{meta.blurb}</p>
          </div>
        )}

        {/*
          Shown whenever the step on screen is not the step the server is on, so a
          gym reviewing an earlier answer always knows it is looking backwards and
          how to get back. Without this, a read-only form with a disabled button
          reads like a bug.

          `canEdit` is derived rather than passed down separately: behind the current step and
          *not* read-only is exactly the editable-revisit case, so there is one source for it
          instead of two conditions to keep agreeing with each other.
        */}
        {isBehind && (
          <ReviewingBanner
            isFrozen={state.isSigned && (viewStep === 1 || viewStep === 2)}
            canEdit={!isReadOnly}
            onReturn={() => goToStep(currentStep)}
          />
        )}

        {actionError && !stepOwnsFieldErrors && <ActionErrorNotice error={actionError} />}

        <StepBody
          token={token}
          state={state}
          readOnly={isReadOnly}
          isSubmitting={isSubmitting}
          fieldErrors={fieldErrors}
          goToStep={goToStep}
          actions={actions}
        />
      </main>

      <Footer />
    </div>
  );
}

// ── Shell behaviour ─────────────────────────────────────────────────────────

/**
 * The height of the sticky rail, in pixels, kept current across breakpoints.
 *
 * Published as a CSS variable rather than consumed in JS, so the things that need to
 * clear it — the reader's own sticky bar, `scroll-mt` on every clause anchor — can say
 * so in a class instead of being handed a prop. A `ResizeObserver` rather than a
 * `resize` listener: the rail also changes height when a step title wraps, which no
 * window event reports.
 */
function useStickyChromeHeight(ref: React.RefObject<HTMLElement | null>, ready: boolean): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = ref.current;
    // `ResizeObserver` is absent in jsdom; the fallback keeps the offset at 0 there,
    // which is the correct answer for a layout engine that has no sticky positioning.
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
 * Moves the page to the top of the new step and puts focus on its heading.
 *
 * Without this, finishing step 2 — a long page — leaves the viewport most of the way
 * down step 3 with no indication anything changed, and leaves a keyboard user's focus
 * on a button that no longer exists, which sends the next Tab back to the top of the
 * document. Focusing the heading is also what makes a screen reader announce the step
 * it just landed on.
 *
 * Skipped on the first paint: an arriving gym has not navigated anywhere, and stealing
 * focus on load is its own bug.
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

function Header({ gymName }: { gymName: string }) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className={`${SHELL} h-14 sm:h-16 flex items-center justify-between gap-4`}>
        <Link
          href="/"
          className="flex-shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {/*
            Intrinsic size given so the row does not reflow when the logo decodes —
            the rail and the whole form below it shift otherwise, on the one paint a
            gym is most likely to be looking at.

            `next/image`, which is what the site's own navbar already uses for this exact
            asset: the raw tag sent the full 71 KB PNG to render a 36px-tall logo. Marked
            `priority`, because it is in the fixed chrome above the fold and lazy-loading
            it would leave a hole in the header on the first paint of an emailed link.
          */}
          <Image
            src="/assets/logo.png"
            alt="MuscleBoxPro"
            width={140}
            height={36}
            priority
            className="h-8 sm:h-9 w-auto"
          />
        </Link>
        {gymName && (
          <p className="min-w-0 text-xs sm:text-sm text-muted-foreground truncate" data-testid="header-gym-name">
            <span className="sr-only">Onboarding for </span>
            {gymName}
          </p>
        )}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-5">
      <div className={`${SHELL} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
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
 * The wait while the token resolves.
 *
 * A skeleton of the shell rather than a line of centred text: the text version paints
 * a full-height empty page and then replaces it wholesale, which reads as a redirect
 * rather than as loading. This holds the same boxes the real page will fill, so the
 * layout does not jump when it arrives.
 *
 * `role="status"` and the visually-hidden sentence are what a screen reader gets —
 * pulsing rectangles announce nothing.
 */
function LoadingScreen() {
  return (
    <div
      className="theme-console min-h-screen bg-gray-50 flex flex-col"
      data-testid="onboarding-loading"
    >
      <div className="bg-white border-b border-gray-200">
        <div className={`${SHELL} h-14 sm:h-16 flex items-center`}>
          <div className="h-8 w-32 rounded-lg bg-gray-100 animate-pulse" />
        </div>
      </div>
      <div className="bg-white border-b border-gray-200">
        {/* The rail's own bar, at nothing, in the same place. */}
        <div className="h-1 bg-gray-100" aria-hidden="true" />
        <div className={`${SHELL} flex gap-2 py-4`} aria-hidden="true">
          {/* One placeholder per step, off the same list the rail draws, so the skeleton
              cannot end up a column short of the thing it is standing in for. */}
          {STEP_META.map((meta) => (
            <div key={meta.step} className="flex-1 space-y-2">
              <div className="h-6 w-6 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className={`flex-1 w-full ${SHELL} py-8 sm:py-10 space-y-4`} role="status">
        <p className="sr-only">Opening your onboarding…</p>
        <div className="h-7 w-2/3 rounded-lg bg-gray-200 animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-gray-100 animate-pulse" />
        <div className="h-32 rounded-2xl border border-gray-200 bg-white" />
        <div className="h-64 rounded-2xl border border-gray-200 bg-white" />
      </div>
    </div>
  );
}

/**
 * "You are not on the step the server is on" — in whichever of its three senses applies.
 *
 * The three are genuinely different situations and used to be two, which made one of them
 * inaccurate: an editable step 1 under the sentence "Nothing here can be changed from this view"
 * tells a gym not to bother trying the fields that are, in fact, waiting for it.
 *
 * `canEdit` wins over the plain backward-looking copy because it is the case with something to
 * do. The button stays in all three: getting back to the current step has to be one click
 * whether or not anything on the page can be typed into.
 */
function ReviewingBanner({
  isFrozen,
  canEdit,
  onReturn,
}: {
  isFrozen: boolean;
  canEdit: boolean;
  onReturn(): void;
}) {
  const { Icon, title, body } = isFrozen
    ? {
        Icon: Lock,
        title: "Locked after signing",
        body: "Your agreement is signed against these details, so they can't be edited here. Email us and we'll issue an amendment.",
      }
    : canEdit
      ? {
          Icon: Pencil,
          title: "You've come back to an earlier step",
          body: "Change whatever you need to and press Continue. That saves it and takes you back to where you were. Nothing you've already done is undone.",
        }
      : {
          Icon: ArrowLeft,
          title: "You're looking at an earlier step",
          body: "Nothing here can be changed from this view.",
        };

  return (
    <div
      className="mb-6 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 flex items-start gap-3"
      data-testid="reviewing-banner"
    >
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground mb-0.5">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
      </div>
      <Button
        variant="outline"
        onClick={onReturn}
        className="min-h-11 rounded-xl text-xs font-semibold flex-shrink-0 cursor-pointer"
        data-testid="button-return-to-current"
      >
        {/*
          The same words in all three cases, and deliberately not "discard and go back" in the
          editable one: step 1 autosaves a draft as it is typed, so leaving without pressing
          Continue does not throw the typing away — it leaves it uncommitted, and a later return
          to the step shows the draft. Offering to discard would promise something this button
          does not do.
        */}
        Back to where I was
      </Button>
    </div>
  );
}

/**
 * A rejected submit. Field-level messages render on the inputs; this is the summary.
 *
 * `role="alert"` and the scroll: on step 1 the submit button is a screen and a half
 * below this banner, so a server rejection used to appear somewhere the gym was not
 * looking and the button simply seemed not to work.
 */
function ActionErrorNotice({ error }: { error: OnboardingError }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Via the helper, which drops to an instant jump under `prefers-reduced-motion`.
    // The stylesheet's blanket override in index.css does not reach here: an explicit
    // `behavior: "smooth"` beats the computed `scroll-behavior` by spec.
    //
    // `start`, not `center` — which is what the `scroll-mt` below was written for and
    // never got. Centring puts the banner in the middle of the viewport, which on step 1
    // scrolled the card above it half under the sticky rail and pushed the fields the
    // banner is about below the fold. Aligning to the top lands it exactly one rem under
    // the rail with the form beneath it, and it is the alignment `scroll-margin-top`
    // actually governs.
    scrollIntoViewGently(ref.current, { block: "start" });
  }, [error]);

  return (
    <div
      ref={ref}
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3.5 scroll-mt-[calc(var(--onboarding-chrome,0px)_+_1rem)]"
      data-testid="action-error"
    >
      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
        <AlertCircle className="w-4 h-4 text-red-700" aria-hidden="true" />
      </div>
      <p className="text-sm text-red-800 leading-relaxed">{error.message}</p>
    </div>
  );
}

/**
 * The terminal screens: a link that is wrong, expired or superseded.
 *
 * Each gets its own copy because each has a different next action, and "invalid
 * link" for an expired one sends the gym to support instead of to the resend
 * button. A 30-day TTL means expiry is the common case, not the rare one (§7).
 */
function TokenProblem({ error }: { error: OnboardingError }) {
  const copy: Record<string, { title: string; body: string; cta: string | null }> = {
    expired_token: {
      title: "This link has expired",
      body: "Onboarding links are valid for 30 days. Ask us for a fresh one and you'll pick up where you left off. Nothing you filled in is lost.",
      cta: "Request a new link",
    },
    revoked_token: {
      title: "This link is no longer valid",
      body: "A newer onboarding link was sent to you. Check your inbox for the most recent email from us, or ask us to resend it.",
      cta: "Ask us to resend",
    },
    invalid_token: {
      title: "We couldn't find this link",
      body: "Check that you opened the full link from our email. Some mail apps break long URLs across lines.",
      cta: "Get in touch",
    },
    network: {
      title: "Something went wrong",
      body: "We couldn't load your onboarding just now. Try again in a moment.",
      cta: null,
    },
  };
  const { title, body, cta } = copy[error.code] ?? copy.network;

  return (
    <div className="theme-console min-h-screen bg-gray-50 flex flex-col">
      <Header gymName="" />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div
          role="alert"
          className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 sm:p-8"
          data-testid="token-problem"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-5 h-5 text-amber-700" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-display font-black text-foreground uppercase tracking-tight mb-2">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{body}</p>
          {cta && (
            /*
              `asChild`, so this is one anchor — not a `<button>` inside an `<a>`, which
              is invalid HTML and leaves the accessible object a button that does
              nothing. This is the screen a gym with a dead link *only* ever sees, so
              the one control on it has to work.
            */
            <Button
              asChild
              className="min-h-11 w-full rounded-xl font-bold text-sm cursor-pointer"
              data-testid="button-token-cta"
            >
              <a href="mailto:contact@muscleboxpro.com">{cta}</a>
            </Button>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Already a partner?{" "}
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
