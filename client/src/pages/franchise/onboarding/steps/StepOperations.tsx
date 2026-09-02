"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { operationsReadinessSchema } from "@shared/franchise/onboarding/schema";
import type { OperationsReadiness } from "@shared/franchise/onboarding/types";
import {
  AreaField,
  CheckField,
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
 * **Temperature control is `"yes" | "no" | ""`, not a checkbox.** An unticked box records "no" from
 * somebody who was never asked, and storage conditions are load-bearing under §24. The select
 * opens with no answer selected for exactly that reason.
 *
 * **The warehouse may not exist yet, and there is a box for saying so.** It governs all three
 * storage fields rather than sitting beside them, because a franchisee who has not found a
 * warehouse cannot answer any of the three and blank fields would read as an abandoned form. The
 * box is the answer, and Schedule 2 of the term sheet carries an undertaking to name the address
 * before the first consignment instead of the address itself.
 *
 * **Logistics may be undecided, and that is not a blocker either.** A franchisee who has not
 * contracted transport before signing is normal.
 */

const FIELD_LABELS: Record<keyof OperationsReadiness, string> = {
  warehouseNotIdentified: "Warehouse",
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
    // The three storage fields are listed explicitly because the schema now allows each to be
    // empty and `null`/`""` are values rather than the absence of one. Without them a legacy
    // record spreads in without the flag and `warehouseAreaSqft` starts as `undefined`, which
    // the number input renders as an uncontrolled box.
    defaultValues: {
      warehouseNotIdentified: false,
      warehouseAddress: "",
      warehouseAreaSqft: null,
      temperatureControl: "",
      ...(state.operations ?? {}),
      ...(state.drafts.operations ?? {}),
    } as OperationsReadiness,
    mode: "onBlur",
  });

  const values = form.watch();
  const draft = useFranchiseDraftAutosave(handle, "operations", values, { enabled: !readOnly });

  useServerFieldErrors(form, fieldErrors, (field) => field in FIELD_LABELS);

  // Ticked means the three fields below must be empty, and the schema refuses a stored address
  // under a ticked box. Clearing the errors too: `mode: "onBlur"` does not revalidate on change,
  // so "include the full address" would otherwise stay red over a hidden field.
  function onWarehouseNotIdentified(checked: boolean) {
    if (!checked) return;
    form.setValue("warehouseAddress", "");
    form.setValue("warehouseAreaSqft", null);
    form.setValue("temperatureControl", "");
    form.clearErrors(["warehouseAddress", "warehouseAreaSqft", "temperatureControl"]);
  }

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
          <CheckField
            form={form}
            name="warehouseNotIdentified"
            label="Not decided yet"
            // Dropped once it is ticked, where "tick this if" is an instruction about something
            // already done and the paragraph below it is the answer.
            description={
              values.warehouseNotIdentified
                ? undefined
                : "Tick this if you have not settled on a warehouse. It will not hold up your term sheet."
            }
            onCheckedChange={onWarehouseNotIdentified}
            disabled={readOnly}
          />

          {values.warehouseNotIdentified ? (
            <p className="text-sm text-gray-600">
              We will ask for the address, the area and the storage conditions before your first
              consignment leaves. Your term sheet says so in Schedule 2.
            </p>
          ) : (
            <>
              <AreaField
                form={form}
                name="warehouseAddress"
                label="Warehouse address"
                placeholder="Building, street, area, city, state, PIN"
                description="Where we deliver protein consignments. It can be the registered address."
                disabled={readOnly}
              />
              <Row>
                <Field
                  form={form}
                  name="warehouseAreaSqft"
                  label="Warehouse area"
                  placeholder="1200"
                  numeric
                  description="In square feet."
                  disabled={readOnly}
                />
                <SelectField
                  form={form}
                  name="temperatureControl"
                  label="Temperature control"
                  placeholder="Choose one"
                  options={TEMPERATURE_OPTIONS}
                  description="Either answer is fine. It changes how we schedule deliveries."
                  disabled={readOnly}
                />
              </Row>
            </>
          )}
        </Section>

        <Section title="Who runs the machines">
          <Row>
            <Field
              form={form}
              name="operationsContactName"
              label="Operations contact"
              placeholder="Sunil Kumar"
              description="Whoever refills machines and deals with a fault. Often not the signatory."
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
            description="Which gyms, roughly when, and in what order. A plan, not a commitment. Write NA if you have not worked it out yet."
            disabled={readOnly}
          />
          <SelectField
            form={form}
            name="logisticsArrangement"
            label="Logistics"
            placeholder="Choose one"
            options={LOGISTICS_OPTIONS}
            description="How stock and machines move around your territory."
            disabled={readOnly}
          />
        </Section>

        {!readOnly && (
          <SubmitBar
            nextHint="Next, your term sheet."
            draftStatus={draft.status}
            isSubmitting={isSubmitting}
          />
        )}
      </form>
    </Form>
  );
}
