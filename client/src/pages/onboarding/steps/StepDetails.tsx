"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ENTITY_TYPE_LABELS, gymDetailsSchema } from "@shared/onboarding/schema";
import type { GymDetails } from "@shared/onboarding/types";
import { useDraftAutosave } from "../useDraftAutosave";
import DraftIndicator from "../DraftIndicator";
import OnboardingIntro from "../OnboardingIntro";
import type { StepViewProps } from "../types";

/**
 * Step 1 — Confirm your details.
 *
 * Details come first so the data is captured before anyone can drop off, and so
 * every screen after this can address the gym by its own name with its own terms.
 *
 * The one field worth being careful about is the legal entity name. It is rendered
 * into the agreement, and the signature hash covers that rendering — so a typo
 * caught here is free, and the same typo caught after signing needs an amendment.
 * That is what the preview panel is for.
 */
export default function StepDetails({ token, state, readOnly, isSubmitting, fieldErrors, actions }: StepViewProps) {
  const form = useForm<GymDetails>({
    resolver: zodResolver(gymDetailsSchema),
    // The draft wins over the submitted values: if there is a draft, it is by
    // definition more recent than whatever was last submitted.
    defaultValues: { ...state.details, ...(state.drafts.details ?? {}) },
    mode: "onBlur",
  });

  const values = form.watch();
  const draft = useDraftAutosave(token, "details", values, { enabled: !readOnly });

  // Server-side validation messages land on the same inputs as client-side ones.
  // Without this, a rule the client doesn't know about shows only in the summary
  // banner and the gym has to guess which field it meant.
  useEffect(() => {
    if (!fieldErrors) return;
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (field in state.details) form.setError(field as keyof GymDetails, { message });
    }
  }, [fieldErrors, form, state.details]);

  async function onSubmit(details: GymDetails) {
    // Flush before submitting so a rejected submit still leaves the typing saved.
    await draft.flush();
    await actions.submitDetails(details);
  }

  const legalName = form.watch("legalEntityName");

  return (
    <Form {...form}>
      {/*
        The frame goes outside the form, and only while step 1 is still live. On a
        second visit the gym is checking a field, not being introduced.
      */}
      {!readOnly && (
        <OnboardingIntro
          invitedByName={state.invitedByName}
          gymDisplayName={state.gymDisplayName}
        />
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/*
          The live preview. Seeing their own legal name land in the contract is what
          turns a form into a contract negotiation, and it catches typos in the one
          field that is hardest to fix afterwards.
        */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4" data-testid="agreement-preview">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
            In your agreement
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            This Agreement is between <strong>BlendBox Innovations LLP</strong> and{" "}
            {legalName?.trim() ? (
              <strong data-testid="preview-legal-name">{legalName.trim()}</strong>
            ) : (
              <span className="text-muted-foreground italic">your legal entity name</span>
            )}
            .
          </p>
        </div>

        <Section title="The entity signing">
          <Field
            form={form}
            name="legalEntityName"
            label="Legal entity name"
            placeholder="Iron Temple Fitness Private Limited"
            description="Exactly as registered. This goes into the agreement."
            disabled={readOnly}
          />

          <FormField
            control={form.control}
            name="entityType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 text-sm font-semibold">Entity type</FormLabel>
                <FormControl>
                  {/*
                    A native select rather than the Radix one: it is a five-option
                    list, and the native control is what a phone renders best.
                  */}
                  <select
                    {...field}
                    disabled={readOnly}
                    data-testid="select-entity-type"
                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-foreground focus:border-primary focus:bg-white transition-colors disabled:opacity-60"
                  >
                    {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Field
            form={form}
            name="tradeName"
            label="Trade name"
            placeholder="Iron Temple Fitness"
            description="The name on the door, if it differs. Leave blank if it's the same."
            disabled={readOnly}
          />
          <Field
            form={form}
            name="gstin"
            label="GSTIN"
            placeholder="29AABCU9603R1ZM"
            disabled={readOnly}
          />
          <Field
            form={form}
            name="fssaiLicenceNumber"
            label="FSSAI licence number"
            placeholder="12345678901234"
            // §24.5 and Schedule F make each party responsible for its own
            // registrations, so this is a day-one question, not an inspection-day one.
            description="If your gym holds one. Optional — we handle the food-safety side of the machine itself."
            disabled={readOnly}
          />
        </Section>

        <Section title="Addresses">
          <AreaField
            form={form}
            name="registeredAddress"
            label="Registered address"
            description="Where formal notices should be served (§41 of the agreement)."
            disabled={readOnly}
          />
          <AreaField
            form={form}
            name="installationAddress"
            label="Installation address"
            description="Where the machine will actually stand."
            disabled={readOnly}
          />
        </Section>

        <Section title="Who signs, and where we write">
          <Field form={form} name="signatoryName" label="Signatory name" disabled={readOnly} />
          <Field
            form={form}
            name="signatoryDesignation"
            label="Designation"
            placeholder="Director"
            disabled={readOnly}
          />
          <Field
            form={form}
            name="noticesEmail"
            label="Notices email"
            type="email"
            disabled={readOnly}
          />
          <Field form={form} name="noticesPhone" label="Notices phone" disabled={readOnly} />
        </Section>

        {!readOnly && (
          <div className="space-y-3 pt-2">
            {/* Says what the button does *not* do. Nobody fills in a GSTIN happily
                if they think Continue might be the thing that commits them. */}
            <p className="text-xs text-muted-foreground">
              Next you'll see your terms. There is nothing to sign until step 3.
            </p>
            <div className="flex items-center justify-between gap-4">
              <DraftIndicator status={draft.status} />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 px-6 rounded-xl font-bold text-sm"
                data-testid="button-continue"
              >
                {isSubmitting ? "Saving..." : "Continue"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}

// ── Local helpers ───────────────────────────────────────────────────────────

const inputClass =
  "bg-gray-50 border-gray-200 text-foreground placeholder:text-gray-400 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl disabled:opacity-60";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4">
      <legend className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-1">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

type FieldProps = {
  // Concretely typed to this one form rather than generic over any form: these
  // helpers exist only inside this file, so `name` gets checked against the real
  // field list without threading react-hook-form's generics through them.
  form: ReturnType<typeof useForm<GymDetails>>;
  name: keyof GymDetails;
  label: string;
  placeholder?: string;
  description?: string;
  type?: string;
  disabled?: boolean;
};

function Field({ form, name, label, placeholder, description, type, disabled }: FieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-gray-700 text-sm font-semibold">{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              className={inputClass}
              data-testid={`input-${name}`}
            />
          </FormControl>
          {description && <FormDescription className="text-xs">{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function AreaField({ form, name, label, description, disabled }: Omit<FieldProps, "type" | "placeholder">) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-gray-700 text-sm font-semibold">{label}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              rows={3}
              disabled={disabled}
              className="bg-gray-50 border-gray-200 text-foreground placeholder:text-gray-400 focus:border-primary focus:bg-white transition-colors rounded-xl resize-none disabled:opacity-60"
              data-testid={`input-${name}`}
            />
          </FormControl>
          {description && <FormDescription className="text-xs">{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
