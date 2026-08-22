"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Info, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IS_MOCK_ONBOARDING } from "@/lib/onboardingApi";
import { stepMeta } from "@shared/onboarding/steps";
import type { OnboardingError } from "@shared/onboarding/types";
import ProgressRail from "./ProgressRail";
import { useOnboarding } from "./useOnboarding";
import StepDetails from "./steps/StepDetails";
import StepPartnership from "./steps/StepPartnership";
import StepReviewSign from "./steps/StepReviewSign";
import StepDeposit from "./steps/StepDeposit";
import StepDone from "./steps/StepDone";
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
 */

const STEP_COMPONENTS: Record<number, ComponentType<StepViewProps>> = {
  1: StepDetails,
  2: StepPartnership,
  3: StepReviewSign,
  4: StepDeposit,
  5: StepDone,
};

export default function OnboardingFlow({ token }: { token: string }) {
  const {
    state,
    fatalError,
    actionError,
    fieldErrors,
    isLoading,
    isSubmitting,
    viewStep,
    canView,
    goToStep,
    isReadOnly,
    actions,
  } = useOnboarding(token);

  if (isLoading) return <LoadingScreen />;
  if (fatalError) return <TokenProblem error={fatalError} />;
  if (!state) return <TokenProblem error={{ code: "network", message: "Something went wrong." }} />;

  const meta = stepMeta(viewStep);
  const StepBody = STEP_COMPONENTS[viewStep];
  const isBehind = viewStep < state.currentStep;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header gymName={state.gymDisplayName} />

      <ProgressRail
        currentStep={state.currentStep}
        viewStep={viewStep}
        completedSteps={state.completedSteps}
        isSigned={state.isSigned}
        canView={canView}
        onSelect={goToStep}
      />

      {IS_MOCK_ONBOARDING && <MockBanner />}

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1">
            {meta.title}
          </h1>
          <p className="text-muted-foreground text-sm">{meta.blurb}</p>
        </div>

        {/*
          Shown whenever the step on screen is not the step the server is on, so a
          gym reviewing an earlier answer always knows it is looking backwards and
          how to get back. Without this, a read-only form with a disabled button
          reads like a bug.
        */}
        {isBehind && (
          <ReviewingBanner
            isFrozen={state.isSigned && (viewStep === 1 || viewStep === 2)}
            onReturn={() => goToStep(state.currentStep)}
          />
        )}

        {actionError && <ActionErrorNotice error={actionError} />}

        <StepBody
          token={token}
          state={state}
          readOnly={isReadOnly}
          isSubmitting={isSubmitting}
          fieldErrors={fieldErrors}
          actions={actions}
        />
      </main>

      <Footer />
    </div>
  );
}

// ── Chrome ──────────────────────────────────────────────────────────────────

function Header({ gymName }: { gymName: string }) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex-shrink-0">
          <img src="/assets/logo.png" alt="MuscleBoxPro" className="h-8 sm:h-9 w-auto" />
        </Link>
        <p className="text-xs sm:text-sm text-muted-foreground truncate" data-testid="header-gym-name">
          {gymName}
        </p>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-5">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
          Your progress saves automatically. You can close this and come back to the same link.
        </p>
        <a
          href="mailto:contact@muscleboxpro.com"
          className="text-xs text-primary font-semibold hover:underline flex-shrink-0"
        >
          Need help?
        </a>
      </div>
    </footer>
  );
}

/*
 * Visible on purpose while the wizard runs on the in-memory mock. Anything that
 * looks like a real onboarding but silently discards its data on reload has to say
 * so, or someone will demo it to a gym and lose their details.
 */
function MockBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <p className="max-w-3xl mx-auto text-[11px] text-amber-800 flex items-center gap-1.5">
        <Info className="w-3 h-3 flex-shrink-0" />
        Preview mode — nothing here is saved to the database yet, and reloading the page starts over.
      </p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center text-muted-foreground text-sm"
      data-testid="onboarding-loading"
    >
      Opening your onboarding...
    </div>
  );
}

function ReviewingBanner({ isFrozen, onReturn }: { isFrozen: boolean; onReturn(): void }) {
  return (
    <div
      className="mb-6 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 flex items-start gap-3"
      data-testid="reviewing-banner"
    >
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        {isFrozen ? (
          <Lock className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground mb-0.5">
          {isFrozen ? "Locked after signing" : "You're looking at an earlier step"}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isFrozen
            ? "Your agreement is signed against these details, so they can't be edited here. Email us and we'll issue an amendment."
            : "Nothing here can be changed from this view."}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={onReturn}
        className="h-9 rounded-xl text-xs font-semibold flex-shrink-0"
        data-testid="button-return-to-current"
      >
        Continue
      </Button>
    </div>
  );
}

/** A rejected submit. Field-level messages render on the inputs; this is the summary. */
function ActionErrorNotice({ error }: { error: OnboardingError }) {
  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5"
      data-testid="action-error"
    >
      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
        <AlertCircle className="w-4 h-4 text-red-500" />
      </div>
      <p className="text-sm text-red-700 leading-relaxed">{error.message}</p>
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
      body: "Onboarding links are valid for 30 days. Ask us for a fresh one and you'll pick up where you left off — nothing you filled in is lost.",
      cta: "Request a new link",
    },
    revoked_token: {
      title: "This link is no longer valid",
      body: "A newer onboarding link was sent to you. Check your inbox for the most recent email from us, or ask us to resend it.",
      cta: "Ask us to resend",
    },
    invalid_token: {
      title: "We couldn't find this link",
      body: "Check that you opened the full link from our email — some mail apps break long URLs across lines.",
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header gymName="" />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 sm:p-8"
          data-testid="token-problem"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <h1 className="text-lg font-display font-black text-foreground uppercase tracking-tight mb-2">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{body}</p>
          {cta && (
            <a href="mailto:contact@muscleboxpro.com">
              <Button className="h-11 rounded-xl font-bold text-sm w-full" data-testid="button-token-cta">
                {cta}
              </Button>
            </a>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Already a partner?{" "}
            <Link href="/gym/login" className="text-primary font-semibold hover:underline">
              Sign in to your dashboard
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
