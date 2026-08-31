"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";

import { FRANCHISE_TIERS, formatLakh, franchiseTier } from "@shared/franchise/program";
import { territoryProposalSchema } from "@shared/franchise/onboarding/schema";
import type { TerritoryProposal } from "@shared/franchise/onboarding/types";
import {
  AreaField,
  ErrorSummary,
  Field,
  Form,
  Section,
  SelectField,
  SubmitBar,
  useServerFieldErrors,
} from "../formKit";
import { useFranchiseDraftAutosave } from "../useFranchiseDraftAutosave";
import type { FranchiseStepViewProps } from "../types";

/**
 * Step 2 — Your territory.
 *
 * The step the gym flow has no equivalent of, and the one this whole application turns on:
 * exclusivity is the thing being sold, so the record has to say what was asked for in words a
 * lawyer can read back.
 *
 * **Free text, and no map.** A drawn boundary looks precise and is not, and exclusivity would
 * then turn on whether a gym falls inside a shape somebody dragged in a browser. The boundary
 * box has a 20-character floor for the same reason: "Noida" is a name, not a boundary.
 *
 * **What is asked for is not what is granted.** The granted territory lives on the approval
 * record as its own strings, and this form never sees them. The case that matters is the one
 * where we approve three suburbs of five, and a record that overwrote the request would lose
 * the fact that anything was cut.
 */

const FIELD_LABELS: Record<keyof TerritoryProposal, string> = {
  tier: "Franchise tier",
  proposedTerritory: "Territory",
  proposedBoundary: "Where it starts and stops",
  existingRelationships: "Gyms you already know",
};

const TIER_OPTIONS = FRANCHISE_TIERS.map((tier) => ({
  value: tier.id,
  label: `${tier.shortName} · ${formatLakh(tier.investmentInr)} · ${tier.initialMachines} machines`,
}));

export default function StepTerritory({
  handle,
  state,
  readOnly,
  isSubmitting,
  fieldErrors,
  actions,
}: FranchiseStepViewProps) {
  const form = useForm<TerritoryProposal>({
    resolver: zodResolver(territoryProposalSchema),
    defaultValues: { ...state.territory, ...(state.drafts.territory ?? {}) },
    mode: "onBlur",
  });

  const values = form.watch();
  const draft = useFranchiseDraftAutosave(handle, "territory", values, { enabled: !readOnly });

  useServerFieldErrors(form, fieldErrors, (field) => field in state.territory);

  async function onSubmit(territory: TerritoryProposal) {
    await draft.flush();
    await actions.submitTerritory(territory);
  }

  const { errors, submitCount } = form.formState;
  const tier = franchiseTier(form.watch("tier"));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <ErrorSummary
          errors={errors}
          submitCount={submitCount}
          labels={FIELD_LABELS}
          onGoToField={(name) => form.setFocus(name)}
        />

        <Section title="What you're applying for">
          <SelectField
            form={form}
            name="tier"
            label="Franchise tier"
            options={TIER_OPTIONS}
            description="Both tiers are the same programme at different scale. You can discuss a change with us before signing."
            disabled={readOnly}
          />

          {/* The consequence of the field above it, on the same screen, because the number the
              tier implies is the number this application is about. Off `FRANCHISE_TIERS` rather
              than the record's own `terms`: this is what the selected tier means, and `terms` is
              what an admin has actually set for this franchise. */}
          <div
            className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3"
            data-testid="tier-summary"
          >
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
              What that means
            </h3>
            <p className="text-sm text-foreground leading-relaxed">
              {formatLakh(tier.investmentInr)} for {tier.initialMachines} machines, and{" "}
              {tier.marketRights.toLowerCase()}. {tier.positioning}
            </p>
          </div>
        </Section>

        <Section title="The market you want">
          <Field
            form={form}
            name="proposedTerritory"
            label="Territory"
            placeholder="Noida and Greater Noida"
            description="The city, district or region you want to develop."
            disabled={readOnly}
          />

          <AreaField
            form={form}
            name="proposedBoundary"
            label="Where it starts and stops"
            rows={4}
            placeholder="Sectors 15 to 78 west of the Noida Expressway, plus Greater Noida West up to Bisrakh Road. Excludes Ghaziabad."
            description="Suburbs, pin codes, landmarks: whatever makes the edges unambiguous. This is what exclusivity is written against, so plain words beat a map."
            disabled={readOnly}
          />

          <AreaField
            form={form}
            name="existingRelationships"
            label="Gyms you already know"
            rows={3}
            placeholder="Two chains with four branches between them in Sector 62, both already stocking supplements."
            description="Existing relationships in the territory, if you have them. This helps us judge the market rather than the application."
            optional
            disabled={readOnly}
          />
        </Section>

        {/* Said here rather than at step 4, because it is the sentence that stops someone
            reading their own words back as a promise. The approval screen repeats it when it
            has an answer. */}
        <div className="flex items-start gap-2.5 rounded-2xl border border-gray-200 bg-white px-4 py-3.5">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            This is a request, not a grant. We check the territory against what is already
            allocated and what the market can carry, then confirm the exact boundary with you at
            step 4. If we can only approve part of it, you will see precisely which part before
            anything is signed.
          </p>
        </div>

        {!readOnly && (
          <SubmitBar
            nextHint="Next you'll upload your documents. Still nothing to sign."
            draftStatus={draft.status}
            isSubmitting={isSubmitting}
          />
        )}
      </form>
    </Form>
  );
}
