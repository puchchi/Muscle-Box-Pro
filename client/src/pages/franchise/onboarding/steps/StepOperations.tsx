"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { operationsReadinessSchema } from "@shared/franchise/onboarding/schema";
import type { OperationsReadiness } from "@shared/franchise/onboarding/types";
import {
  AreaField,
  ErrorSummary,
  Field,
  Form,
  Row,
  Section,
  SelectField,
  SubmitBar,
  useServerFieldErrors,
} from "../formKit";
import { useFranchiseDraftAutosave } from "../useFranchiseDraftAutosave";
import type { FranchiseStepViewProps } from "../types";

/**
 * Step 6 — Operations readiness.
 *
 * §24, §27 and §28 of the programme, collected before the term sheet is issued rather than
 * after. Protein is delivered to the franchisee's warehouse and stored there, so a signature
 * over a supply obligation with no answer to "where does it go" is a signature over a gap.
 *
 * **Temperature control is `"yes" | "no"`, not a checkbox.** An unticked box records "no" from
 * somebody who was never asked, and storage conditions are load-bearing under §24. The select
 * opens with no answer selected for exactly that reason.
 *
 * **Logistics may be undecided, and that is not a blocker.** A franchisee who has not contracted
 * transport before signing is normal. One who cannot say where the protein will be stored is a
 * §24 problem, which is why the warehouse fields are required and this one is not.
 */

const FIELD_LABELS: Record<keyof OperationsReadiness, string> = {
  warehouseAddress: "Warehouse address",
  warehouseAreaSqft: "Warehouse area",
  temperatureControl: "Temperature control",
  operationsContactName: "Operations contact",
  operationsContactPhone: "Operations phone",
  deploymentPlan: "Deployment plan",
  logisticsArrangement: "Logistics",
};

const TEMPERATURE_OPTIONS = [
  { value: "yes", label: "Yes, it is temperature controlled" },
  { value: "no", label: "No, it is ambient storage" },
] as const;

const LOGISTICS_OPTIONS = [
  { value: "own_vehicle", label: "Our own vehicle" },
  { value: "contracted", label: "A contracted logistics provider" },
  { value: "undecided", label: "Not decided yet" },
] as const;

export default function StepOperations({
  handle,
  state,
  readOnly,
  isSubmitting,
  fieldErrors,
  actions,
}: FranchiseStepViewProps) {
  const form = useForm<OperationsReadiness>({
    resolver: zodResolver(operationsReadinessSchema),
    defaultValues: {
      ...(state.operations ?? {}),
      ...(state.drafts.operations ?? {}),
    } as OperationsReadiness,
    mode: "onBlur",
  });

  const values = form.watch();
  const draft = useFranchiseDraftAutosave(handle, "operations", values, { enabled: !readOnly });

  useServerFieldErrors(form, fieldErrors, (field) => field in FIELD_LABELS);

  async function onSubmit(operations: OperationsReadiness) {
    await draft.flush();
    await actions.submitOperations(operations);
  }

  const { errors, submitCount } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <ErrorSummary
          errors={errors}
          submitCount={submitCount}
          labels={FIELD_LABELS}
          onGoToField={(name) => form.setFocus(name)}
        />

        <Section title="Where the protein is stored">
          <AreaField
            form={form}
            name="warehouseAddress"
            label="Warehouse address"
            placeholder="Building, street, area, city, state, PIN"
            description="Where we deliver protein consignments. It can be the registered address if that is where you'll hold stock."
            disabled={readOnly}
          />
          <Row>
            <Field
              form={form}
              name="warehouseAreaSqft"
              label="Warehouse area"
              placeholder="1200"
              numeric
              description="In square feet, to the nearest foot."
              disabled={readOnly}
            />
            <SelectField
              form={form}
              name="temperatureControl"
              label="Temperature control"
              placeholder="Choose one"
              options={TEMPERATURE_OPTIONS}
              description="Either answer is fine. It changes how we schedule deliveries and what we can send at once."
              disabled={readOnly}
            />
          </Row>
        </Section>

        <Section title="Who runs the machines">
          <Row>
            <Field
              form={form}
              name="operationsContactName"
              label="Operations contact"
              placeholder="Sunil Kumar"
              description="Whoever actually refills machines and deals with a fault. Often not the signatory."
              autoComplete="name"
              disabled={readOnly}
            />
            <Field
              form={form}
              name="operationsContactPhone"
              label="Operations phone"
              type="tel"
              inputMode="tel"
              placeholder="+91 98450 12345"
              autoComplete="tel"
              disabled={readOnly}
            />
          </Row>
        </Section>

        <Section title="How you'll deploy">
          <AreaField
            form={form}
            name="deploymentPlan"
            label="Deployment plan"
            rows={4}
            placeholder="Three machines into the two Sector 62 chains within the first month, then two more once we see the volumes."
            description="Which gyms, roughly when, and in what order. This is a plan rather than a commitment, and it tells us how to sequence the build."
            disabled={readOnly}
          />
          <SelectField
            form={form}
            name="logisticsArrangement"
            label="Logistics"
            placeholder="Choose one"
            options={LOGISTICS_OPTIONS}
            description="How stock and machines move around your territory. Undecided is a perfectly normal answer at this stage."
            disabled={readOnly}
          />
        </Section>

        {!readOnly && (
          <SubmitBar
            nextHint="Next is your term sheet: the whole thing, in plain English, before anything is signed."
            draftStatus={draft.status}
            isSubmitting={isSubmitting}
          />
        )}
      </form>
    </Form>
  );
}
