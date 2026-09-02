"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";

import { INDIA_PINCODE, INDIA_STATE_NAMES, districtsOf } from "@shared/geo/india";
import { FRANCHISE_TIERS, formatLakh } from "@shared/franchise/program";
import {
  franchiseTerritoryLabel,
  territoryProposalSchema,
} from "@shared/franchise/onboarding/schema";
import type { TerritoryProposal } from "@shared/franchise/onboarding/types";
import {
  AreaField,
  CardChoiceField,
  CheckListField,
  CodeListField,
  ComboField,
  ErrorSummary,
  Form,
  Section,
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
 * **Pick districts. Do not draft a boundary.** This screen used to require a description of where
 * the territory started and stopped, 20 characters minimum, and it was the wrong question: an
 * applicant who answers "Bangalore" is telling us everything they can usefully tell us, and the
 * rest is a contract clause that an admin writes at approval. So the required answer is now a state
 * and its districts, the pin codes are there for somebody who wants half a metro rather than all of
 * it, and the prose box survives as an optional place to put what the list could not say.
 *
 * **Still no map, and no polygon.** `shared/geo/india.ts` has the argument, and the short version is
 * that districts are official and enumerable where a shape dragged in a browser is neither.
 *
 * **What is asked for is not what is granted.** The granted territory lives on the approval
 * record as its own strings, and this form never sees them. The case that matters is the one
 * where we approve three suburbs of five, and a record that overwrote the request would lose
 * the fact that anything was cut.
 */

const FIELD_LABELS: Record<keyof TerritoryProposal, string> = {
  tier: "Franchise tier",
  proposedState: "State",
  proposedDistricts: "Districts",
  proposedPincodes: "Pin codes",
  proposedBoundary: "Anything else about the area",
  existingRelationships: "Gyms you already know",
};

const STATE_OPTIONS = INDIA_STATE_NAMES.map((name) => ({ value: name, label: name }));

/**
 * Both tiers, with the number each one implies on the card rather than behind a click.
 *
 * Off `FRANCHISE_TIERS` rather than the record's own `terms`: this is what the tier means, where
 * `terms` is what an admin has actually set for this franchise. `positioning` carries the body on its
 * own, because `marketRights` for the territory tier is the same sentence with fewer words in it.
 */
const TIER_OPTIONS = FRANCHISE_TIERS.map((tier) => ({
  value: tier.id,
  title: tier.shortName,
  headline: `${formatLakh(tier.investmentInr)} · ${tier.initialMachines} machines`,
  body: tier.positioning,
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

  const selectedState = form.watch("proposedState");
  const districts = form.watch("proposedDistricts");

  /*
    Districts belong to the state above them, so changing the state has to clear them. Skipped on
    the first render: mounting with a saved selection would otherwise wipe it, which is the read-only
    view of a submitted step showing an empty list.
  */
  const knownState = useRef(selectedState);
  useEffect(() => {
    if (readOnly) return;
    if (knownState.current === selectedState) return;
    knownState.current = selectedState;
    form.setValue("proposedDistricts", [], { shouldDirty: true });
  }, [selectedState, readOnly, form]);

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
          <CardChoiceField
            form={form}
            name="tier"
            label="Franchise tier"
            options={TIER_OPTIONS}
            description="The same programme at two scales. You can discuss a change with us before signing."
            disabled={readOnly}
          />
        </Section>

        <Section title="The market you want">
          <ComboField
            form={form}
            name="proposedState"
            label="State"
            options={STATE_OPTIONS}
            placeholder="Choose a state or union territory"
            searchPlaceholder="Search states"
            description="Changing this clears the districts below."
            disabled={readOnly}
          />

          <CheckListField
            form={form}
            name="proposedDistricts"
            label="Districts"
            options={districtsOf(selectedState)}
            searchPlaceholder="Search districts"
            emptyHint="Pick a state above and its districts appear here."
            description="Districts are how a territory gets written into the agreement, because they are official and they do not overlap. Tick every one you want to develop."
            disabled={readOnly}
          />

          {districts.length > 0 && <TerritoryPreview state={selectedState} districts={districts} />}

          <CodeListField
            form={form}
            name="proposedPincodes"
            label="Pin codes"
            placeholder="560001, 560034 …"
            pattern={INDIA_PINCODE}
            invalidMessage="A pin code is six digits, and cannot start with a zero."
            description="Only if you want part of a district rather than all of it. Type or paste them, separated by commas."
            optional
            disabled={readOnly}
          />

          <AreaField
            form={form}
            name="proposedBoundary"
            label="Anything else about the area"
            rows={3}
            placeholder="Excludes the airport side of Devanahalli. We would want Hosur added later if it becomes available."
            description="Only what the lists above could not say. Leave it empty if they said everything."
            optional
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
        <div className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3.5">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            This is a request, not a grant. We check the territory against what is already
            allocated and what the market can carry, then confirm the exact boundary with you at
            approval. If we can only approve part of it, you will see precisely which part before
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

/**
 * The selection read back as one sentence, under the list that produces it.
 *
 * `StepDetails`'s term sheet preview makes the case for previewing next to the field rather than
 * above the form. It applies for the same reason and one more: twelve ticked checkboxes are not
 * something anybody can check at a glance, and this is the string an admin will read when deciding
 * what to grant.
 */
function TerritoryPreview({ state, districts }: { state: string; districts: string[] }) {
  return (
    <div
      className="rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-3"
      data-testid="territory-preview"
    >
      <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">
        What you're asking for
      </h3>
      <p className="text-sm text-foreground leading-relaxed" data-testid="territory-label">
        {franchiseTerritoryLabel({ proposedState: state, proposedDistricts: districts })}
      </p>
    </div>
  );
}
