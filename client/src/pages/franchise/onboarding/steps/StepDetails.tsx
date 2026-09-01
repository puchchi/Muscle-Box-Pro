"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { ENTITY_TYPE_LABELS } from "@shared/onboarding/schema";
import { franchiseDetailsSchema } from "@shared/franchise/onboarding/schema";
import type { FranchiseDetails } from "@shared/franchise/onboarding/types";
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
 * Step 1 — Your details.
 *
 * The gym flow's step 1, with the fields a ₹25 lakh counterparty needs: a mandatory PAN, the
 * registration number for the entity type, and the signatory's own identity. Details come first
 * for the same reason, so every screen after this one can address the franchisee by their own
 * name with their own terms.
 *
 * *The legal entity name* is rendered into the term sheet and the signature hash covers that
 * rendering, so a typo caught here is free and the same typo caught after signing needs an
 * amendment. That is what the preview under the field is for.
 *
 * *The PAN* is format-checked and nothing more. An earlier version compared its fourth character
 * (the holder's class) against the entity type and refused a personal PAN for a company; that
 * refused applicants who have not incorporated yet, which is most of them.
 *
 * There is no installation address here, and no bank account. A franchisee's machines go to
 * gyms across a territory rather than to one address, the warehouse is step 6, and the payout
 * account is a portal setting after activation. Collecting a bank account behind a handle that
 * travels in a URL is the thing §3 rules out.
 */

const FIELD_LABELS: Record<keyof FranchiseDetails, string> = {
  legalEntityName: "Legal entity name",
  entityType: "Entity type",
  tradeName: "Trade name",
  pan: "PAN",
  gstin: "GSTIN",
  cin: "CIN",
  llpin: "LLPIN",
  registeredAddress: "Registered address",
  signatoryName: "Signatory name",
  signatoryDesignation: "Designation",
  signatoryPan: "Signatory's PAN",
  signatoryAadhaarLast4: "Aadhaar last four digits",
  noticesEmail: "Notices email",
  noticesPhone: "Notices phone",
};

const ENTITY_TYPE_OPTIONS = Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function StepDetails({
  handle,
  state,
  readOnly,
  isSubmitting,
  fieldErrors,
  actions,
}: FranchiseStepViewProps) {
  const form = useForm<FranchiseDetails>({
    resolver: zodResolver(franchiseDetailsSchema),
    // The draft wins over the submitted values: if there is a draft it is, by definition, more
    // recent than whatever was last submitted.
    defaultValues: { ...state.details, ...(state.drafts.details ?? {}) },
    mode: "onBlur",
  });

  const values = form.watch();
  const draft = useFranchiseDraftAutosave(handle, "details", values, { enabled: !readOnly });

  useServerFieldErrors(form, fieldErrors, (field) => field in state.details);

  const entityType = form.watch("entityType");
  const showsCin = entityType === "pvt_ltd";
  const needsLlpin = entityType === "llp";

  /*
    A registration number belonging to an entity type that is no longer selected is cleared
    rather than left in place. Otherwise switching from a company to an LLP hides the CIN field
    with a value still in it, and the record ends up holding a company number for an LLP that
    nothing on screen ever shows.
  */
  useEffect(() => {
    if (readOnly) return;
    if (!showsCin && form.getValues("cin")) form.setValue("cin", "", { shouldDirty: true });
    if (!needsLlpin && form.getValues("llpin")) form.setValue("llpin", "", { shouldDirty: true });
  }, [showsCin, needsLlpin, readOnly, form]);

  async function onSubmit(details: FranchiseDetails) {
    // Flushed first, so a rejected submit still leaves the typing saved.
    await draft.flush();
    await actions.submitDetails(details);
  }

  // Read here rather than in `ErrorSummary`: `formState` is a proxy that only registers a
  // re-render subscription for the component that called `useForm`.
  const { errors, submitCount } = form.formState;
  const legalName = form.watch("legalEntityName");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <ErrorSummary
          errors={errors}
          submitCount={submitCount}
          labels={FIELD_LABELS}
          onGoToField={(name) => form.setFocus(name)}
        />

        <Section title="The entity taking the franchise">
          <Field
            form={form}
            name="legalEntityName"
            label="Legal entity name"
            placeholder="Northline Ventures Private Limited"
            description="Exactly as registered. This goes into the term sheet."
            autoComplete="organization"
            disabled={readOnly}
          />

          <TermSheetPreview legalName={legalName} />

          <Row>
            <SelectField
              form={form}
              name="entityType"
              label="Entity type"
              options={ENTITY_TYPE_OPTIONS}
              disabled={readOnly}
            />

            <Field
              form={form}
              name="tradeName"
              label="Trade name"
              placeholder="Northline Ventures"
              description="The name your territory trades under, if it differs."
              optional
              disabled={readOnly}
            />
          </Row>

          <Row>
            <Field
              form={form}
              name="pan"
              label="PAN"
              placeholder="AABCU9603R"
              description="The term sheet identifies you by PAN, and the e-sign needs it."
              // Typed in lowercase more often than not, and the schema uppercases on parse, so
              // the box may as well show what will be stored.
              uppercase
              disabled={readOnly}
            />

            {/* Optional, and for the gym flow's reason: it is an invoicing field rather than a
                contractual one, so an applicant who is not registered or does not have the
                certificate to hand should not be stopped here. A number that is typed is still
                checked, because a transposed digit bills the wrong entity for the whole term. */}
            <Field
              form={form}
              name="gstin"
              label="GSTIN"
              placeholder="29AABCU9603R1ZM"
              uppercase
              optional
              disabled={readOnly}
            />
          </Row>

          {/* Not paired into a `Row`: only one of the two ever shows, so half a row would be half
              a row, and 21 characters of CIN wants the width. */}
          {showsCin && (
            <Field
              form={form}
              name="cin"
              label="CIN"
              placeholder="U74999DL2019PTC123456"
              description="21 characters, from your certificate of incorporation."
              optional
              uppercase
              disabled={readOnly}
            />
          )}

          {needsLlpin && (
            <Field
              form={form}
              name="llpin"
              label="LLPIN"
              placeholder="AAB-1234"
              description="From your LLP incorporation certificate."
              uppercase
              disabled={readOnly}
            />
          )}

          <AreaField
            form={form}
            name="registeredAddress"
            label="Registered address"
            placeholder="Building, street, area, city, state, PIN"
            description="Where formal notices under the term sheet will be served."
            disabled={readOnly}
          />
        </Section>

        <Section title="Who signs">
          <Row>
            <Field
              form={form}
              name="signatoryName"
              label="Signatory name"
              placeholder="Rajesh Mehta"
              description="Who signs the term sheet, and can bind the entity above."
              autoComplete="name"
              disabled={readOnly}
            />
            <Field
              form={form}
              name="signatoryDesignation"
              label="Designation"
              placeholder="Director"
              description="Director, Partner, Proprietor: their title in the entity above."
              autoComplete="organization-title"
              disabled={readOnly}
            />
          </Row>
          <Row>
            <Field
              form={form}
              name="signatoryPan"
              label="Signatory's PAN"
              placeholder="AAAPM1234A"
              description="Their own PAN, not the entity's. The e-sign is issued in their name."
              uppercase
              disabled={readOnly}
            />
            {/* Four digits and never more. Aadhaar eSign binds a signature to an Aadhaar
                identity, and this is how we know which identity we asked Digio to bind. The full
                number is a regulated identifier with storage obligations we have no reason to
                take on, and Digio holds the audit trail that is the actual evidence (§6.5). */}
            <Field
              form={form}
              name="signatoryAadhaarLast4"
              label="Aadhaar last four digits"
              placeholder="4321"
              inputMode="numeric"
              description="Only the last four. We never ask for the full number, and we don't store one."
              optional
              disabled={readOnly}
            />
          </Row>
        </Section>

        <Section title="Where we write">
          <Row>
            <Field
              form={form}
              name="noticesEmail"
              label="Notices email"
              type="email"
              inputMode="email"
              placeholder="r.mehta@northline.in"
              description="Formal notices go here, and your portal login is created under it."
              autoComplete="email"
              disabled={readOnly}
            />
            <Field
              form={form}
              name="noticesPhone"
              label="Notices phone"
              type="tel"
              inputMode="tel"
              placeholder="+91 98450 12345"
              autoComplete="tel"
              disabled={readOnly}
            />
          </Row>
        </Section>

        {!readOnly && (
          <SubmitBar
            nextHint="Next you'll describe the territory you want. There is nothing to sign until step 7."
            draftStatus={draft.status}
            isSubmitting={isSubmitting}
          />
        )}
      </form>
    </Form>
  );
}

/**
 * The live preview, directly under the field it previews.
 *
 * `AgreementPreview` in the gym flow makes the case and it applies harder here: the signature
 * hash covers the rendered term sheet text, and this name is in it. Sitting under the field
 * rather than above the form means cause and effect share a viewport on a phone, which is the
 * one moment the panel exists for.
 *
 * No live region: this rewrites on every keystroke of a company name, and `aria-live="polite"`
 * would queue an announcement per character. The field's own description carries the point.
 */
function TermSheetPreview({ legalName }: { legalName?: string }) {
  return (
    <div
      className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3"
      data-testid="termsheet-preview"
    >
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
        In your term sheet
      </h3>
      <p className="text-sm text-foreground leading-relaxed">
        This Term Sheet is between <strong>BlendBox Innovations LLP</strong> and{" "}
        {legalName?.trim() ? (
          <strong data-testid="preview-legal-name">{legalName.trim()}</strong>
        ) : (
          <span className="text-muted-foreground italic">your legal entity name</span>
        )}
        .
      </p>
    </div>
  );
}
