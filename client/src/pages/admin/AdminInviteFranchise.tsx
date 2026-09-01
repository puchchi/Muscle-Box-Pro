"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Check, Copy } from "lucide-react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FRANCHISE_TIERS, franchiseTier, type FranchiseTierId } from "@shared/franchise/program";
import {
  adminFranchiseInviteFormSchema,
  inviteDefaults,
  INVITE_FIELD_FOR_WIRE,
  toAdminFranchiseInviteBody,
  type AdminFranchiseInviteFormInput,
  type AdminFranchiseInviteResult,
} from "@shared/admin/franchiseInvite";
import { createFranchise, IS_MOCK_ADMIN_FRANCHISE } from "@/lib/adminFranchiseApi";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { NumberField, SelectField, TextField } from "./adminFields";
import { Notice } from "./AdminUi";
import { formatInr, formatIstDateTime } from "./adminFormat";

/**
 * Invite a franchise — one form, nine fields, submitted once.
 *
 * ## Nine identity fields are not here, and they never were
 *
 * `AdminInviteGym.tsx` lost eleven fields to the same argument after the fact; this form was built
 * with them already gone. PAN, GSTIN, CIN, LLPIN, the registered address and the whole signatory
 * block are what the term sheet identifies its counterparty by and what Digio binds a signature
 * against, so they come from the franchisee at step 1 or from nowhere. `POST /admin/franchises`
 * agrees: it writes all nine as `""` and **ignores them if an admin sends values**.
 *
 * What stays is what nothing downstream supplies: the tier and its two commercial figures, the legal
 * entity name the record is created under, and the address the invite goes to.
 *
 * ## The tier's figures are prefilled and editable
 *
 * `shared/admin/franchiseInvite.ts` on why prefilled rather than behind a preset: nothing is hidden
 * behind a click, and the number an admin has to check is already the one on screen. Switching tier
 * rewrites both figures, which is stated on the form rather than left as a surprise.
 *
 * ## The link is shown exactly once
 *
 * Only `sha256(handle)` is stored, so this screen is the one place the URL exists after the call
 * returns. There is **no franchise invite sender** — `emailed` comes back `false` — so an admin is
 * the delivery mechanism (open question 12).
 */
export default function AdminInviteFranchise() {
  const guard = useAdminGuard();
  const [result, setResult] = useState<AdminFranchiseInviteResult | null>(null);

  if (guard.state !== "ready") return <AdminChecking />;

  return (
    <AdminShell session={guard.session}>
      <Link
        href="/admin/franchises"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        data-testid="link-back-to-franchises"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All franchises
      </Link>

      {result ? <InviteCreated result={result} /> : <InviteForm onCreated={setResult} />}
    </AdminShell>
  );
}

function InviteCreated({ result }: { result: AdminFranchiseInviteResult }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.onboardingUrl);
      setCopied(true);
    } catch {
      // No clipboard permission or no secure context. The URL is selectable text on screen, so this
      // button is a convenience rather than the only way to get the value out.
    }
  }

  return (
    <div className="max-w-lg" data-testid="franchise-invite-created">
      <h1 className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1">
        Franchise created
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Send this link to the franchisee yourself. There is no franchise invite email.
      </p>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
          Onboarding link
        </p>
        <div className="flex items-center gap-2">
          <code
            className="flex-1 text-xs bg-gray-50 rounded-lg px-3 py-2.5 break-all"
            data-testid="franchise-invite-url"
          >
            {result.onboardingUrl}
          </code>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="rounded-xl cursor-pointer flex-shrink-0"
            data-testid="button-copy-franchise-invite-url"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          This is the only time this link will be shown. Only its hash is stored.
        </p>
      </div>

      <dl className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 mb-4">
        <Row label="Expires" value={formatIstDateTime(result.expiresAt)} />
        <Row label="Emailed" value={result.emailed ? "Yes" : "No, send it yourself"} />
      </dl>

      {IS_MOCK_ADMIN_FRANCHISE && (
        <div className="mb-6">
          <Notice testId="franchise-invite-mock">
            Nothing was created. The franchise routes are not deployed, so no record of this
            exists. The link does open, on a fixture that starts over on every reload and shows
            the fixture's details rather than the ones you just typed. The seeded application is
            at{" "}
            <Link href="/franchise/onboarding/demo/demo" className="underline">
              /franchise/onboarding/demo/demo
            </Link>
            .
          </Notice>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button asChild className="rounded-xl cursor-pointer font-bold">
          <Link
            href={`/admin/franchises/${result.franchiseId}`}
            data-testid="link-view-franchise"
          >
            View this franchise
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl cursor-pointer">
          <Link href="/admin/franchises">Back to all franchises</Link>
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "Not sure yet. They will tell us at step 1." },
  { value: "pvt_ltd", label: "Private limited company" },
  { value: "llp", label: "LLP" },
  { value: "partnership", label: "Partnership firm" },
  { value: "proprietorship", label: "Proprietorship" },
  { value: "unregistered", label: "No registered entity" },
] as const;

function InviteForm({ onCreated }: { onCreated: (result: AdminFranchiseInviteResult) => void }) {
  const router = useRouter();
  const form = useForm<AdminFranchiseInviteFormInput>({
    resolver: zodResolver(adminFranchiseInviteFormSchema),
    defaultValues: inviteDefaults("territory"),
    mode: "onBlur",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const tier = form.watch("tier");

  /**
   * Switching tier rewrites both figures, including edited ones.
   *
   * The alternative — keeping an edited number across a tier change — leaves a City franchise
   * carrying a Territory investment, which is the one combination on this form that reads as
   * deliberate and is not. The form says it will do this.
   */
  function chooseTier(next: FranchiseTierId) {
    const published = franchiseTier(next);
    form.setValue("tier", next, { shouldValidate: true });
    form.setValue("investmentInr", published.investmentInr, { shouldValidate: true });
    form.setValue("machineAllocation", published.initialMachines, { shouldValidate: true });
  }

  async function onSubmit(values: AdminFranchiseInviteFormInput) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const parsed = adminFranchiseInviteFormSchema.parse(values);
      const response = await createFranchise(toAdminFranchiseInviteBody(parsed));
      if (!response.ok) {
        if (response.error.fieldErrors) {
          for (const [field, message] of Object.entries(response.error.fieldErrors)) {
            // The handler reports flat keys, and one of them (`investmentPaise`) names no field on
            // this form. Without the mapping it would be dropped and the admin would read a banner
            // about a field they cannot find.
            const target = INVITE_FIELD_FOR_WIRE[field] ?? field;
            form.setError(target as keyof AdminFranchiseInviteFormInput, { message });
          }
        }
        setServerError(response.error.message);
        return;
      }
      onCreated(response.data);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1
        className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1"
        data-testid="franchise-invite-heading"
      >
        Invite a franchise
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        One form, submitted once. There is no autosave. Finish it in one sitting.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {serverError && (
            <div
              className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5"
              data-testid="franchise-invite-error"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" aria-hidden />
              <p className="text-xs text-red-600 leading-relaxed">{serverError}</p>
            </div>
          )}

          <div
            className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"
            data-testid="franchise-deferred-note"
          >
            <p className="text-sm text-foreground leading-relaxed">
              PAN, GSTIN, CIN or LLPIN, the registered address and the signatory are collected from
              the franchisee at step 1. There is nothing to enter for them here, and the route
              ignores them if sent.
            </p>
          </div>

          <Section title="Tier">
            <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Franchise tier">
              {FRANCHISE_TIERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => chooseTier(option.id)}
                  aria-pressed={tier === option.id}
                  className={`rounded-xl border p-4 text-left cursor-pointer transition-colors ${
                    tier === option.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                  data-testid={`tier-${option.id}`}
                >
                  <p className="text-sm font-bold text-foreground">{option.shortName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{option.marketRights}</p>
                  <p className="mt-2 text-sm font-semibold tabular-nums text-foreground">
                    {formatInr(option.investmentInr)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {option.initialMachines} machines to start
                  </p>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Switching tier rewrites the two figures below to that tier's published numbers, even if
              they have been edited.
            </p>
          </Section>

          <Section
            title="Commercial terms"
            note="Prefilled from the published program. Check they are right for this franchise before creating it. The splits, the recovery threshold and the instalment schedule all come from the tier, and are editable on the franchise afterwards."
          >
            <NumberField
              control={form.control}
              name="investmentInr"
              label="Investment"
              prefix="₹"
              description="Whole rupees. Sent to the route in paise."
            />
            <NumberField
              control={form.control}
              name="machineAllocation"
              label="Machines to start"
            />
          </Section>

          <Section title="Franchisee">
            <TextField
              control={form.control}
              name="legalEntityName"
              label="Legal entity name"
              placeholder="Northline Ventures Private Limited"
              description="Required here, unlike the gym invite: the franchise record is created under this name and the term sheet identifies its counterparty by it."
            />
            <TextField
              control={form.control}
              name="tradeName"
              label="Trade name"
              placeholder="Northline Ventures"
              description="Optional. Used to build the onboarding link, and the name this franchise shows as in lists. Falls back to the legal entity name."
            />
            <SelectField
              control={form.control}
              name="entityType"
              label="Entity type"
              options={ENTITY_TYPE_OPTIONS}
              description="Optional. The franchisee sets this at step 1 regardless."
            />
          </Section>

          <Section title="Contact for notices">
            <TextField
              control={form.control}
              name="noticesEmail"
              label="Notices email"
              description="Where you will send the link. Nothing is sent automatically."
            />
            <TextField control={form.control} name="noticesPhone" label="Notices phone" />
          </Section>

          <Section
            title="Converting an application"
            note="Leave blank unless this franchise comes from a /franchise enquiry. Recorded on the franchise so the two are not counted twice."
          >
            <TextField
              control={form.control}
              name="sourceApplicationId"
              label="Application id"
              placeholder="fa_…"
              mono
            />
          </Section>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl font-bold text-sm cursor-pointer"
              data-testid="button-create-franchise"
            >
              {isSubmitting ? "Creating…" : "Create franchise and get link"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 px-6 rounded-xl cursor-pointer"
              onClick={() => router.push("/admin/franchises")}
              data-testid="button-cancel-franchise-invite"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4">
      <legend className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-1">
        {title}
      </legend>
      {note && <p className="text-xs text-muted-foreground -mt-2 leading-relaxed">{note}</p>}
      {children}
    </fieldset>
  );
}
