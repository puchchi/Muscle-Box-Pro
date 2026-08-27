"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  GYM_PAYOUT_ACCOUNT_QUERY_KEY,
  PayoutAccountRequestError,
  fetchPayoutAccount,
  payoutAccountErrorMessage,
  removePayoutAccount,
  savePayoutAccount,
} from "@/lib/gymPayoutAccountApi";
import {
  PAYOUT_ACCOUNT_TYPE_LABELS,
  payoutAccountFormSchema,
  payoutAccountTypeSchema,
  type PayoutAccountFormValues,
} from "@shared/gym/payoutAccountSchema";
import type { PayoutAccount } from "@shared/gym/payoutAccount";
import { Card, Row, RowGroup } from "./portalCards";
import { formatIstDate } from "./istDates";

/**
 * The account we transfer a gym's payout to.
 *
 * The screen this sits on is otherwise read-only, and the two rules that follow from being
 * the one thing on it that writes:
 *
 * 1. **A change is a re-entry, not an edit.** We are never sent the account number back
 *    (see `shared/gym/payoutAccount.ts`), so there is nothing to prefill it with and nothing
 *    to merge a partial edit into. The form asks for the whole set every time, which also
 *    means the type-it-twice check runs on a change and not only on the first save. The
 *    holder name and IFSC *are* prefilled, because those we do hold and re-typing them is
 *    where a fresh typo would come from.
 *
 * 2. **Removing says what stops working.** An account is deleted by a person who has just
 *    closed one at their bank, and the consequence they need is "we then have nowhere to
 *    send your payout" — not a generic "are you sure?". What it explicitly does not affect
 *    is what is owed, so the confirmation says that too.
 *
 * The form lives in a dialog whose open state belongs to the *dashboard*, so the prompt
 * shown to a gym with no account on file can switch tabs and open it in one click. `Dialog`
 * unmounts its content when closed, which is what lets the form take its defaults from
 * whatever is on file at the moment it opens rather than resetting on every render.
 */
export default function PayoutAccountCard({
  formOpen,
  onFormOpenChange,
}: {
  formOpen: boolean;
  onFormOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  const account = useQuery({
    queryKey: GYM_PAYOUT_ACCOUNT_QUERY_KEY,
    queryFn: fetchPayoutAccount,
  });

  const removal = useMutation({
    mutationFn: removePayoutAccount,
    onSuccess: async () => {
      setConfirmingRemoval(false);
      await queryClient.invalidateQueries({ queryKey: GYM_PAYOUT_ACCOUNT_QUERY_KEY });
    },
  });

  const onFile = account.data ?? null;

  return (
    <Card icon={Landmark} label="Bank account" testId="card-payout-account">
      {account.isPending ? (
        <div className="space-y-2.5" data-testid="payout-account-loading" aria-busy="true">
          <div className="h-4 w-40 animate-pulse rounded bg-secondary" />
          <div className="h-4 w-28 animate-pulse rounded bg-secondary/60" />
        </div>
      ) : account.isError ? (
        <div data-testid="payout-account-error">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            We could not load your bank details just now.
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => account.refetch()}
            className="mt-3 h-9 cursor-pointer rounded-xl border-border bg-secondary/50 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            data-testid="button-retry-payout-account"
          >
            Try again
          </Button>
        </div>
      ) : onFile ? (
        <AccountOnFile
          account={onFile}
          onChange={() => onFormOpenChange(true)}
          onRemove={() => setConfirmingRemoval(true)}
        />
      ) : (
        <div data-testid="payout-account-empty">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            No account on file. We need one to transfer your payout.
          </p>
          <Button
            type="button"
            onClick={() => onFormOpenChange(true)}
            className="mt-3 h-10 cursor-pointer rounded-xl px-4 text-sm font-bold"
            data-testid="button-add-payout-account"
          >
            Add bank account
          </Button>
        </div>
      )}

      {/* Rendered whatever the card is showing, so the dashboard's prompt can open it
          without waiting for the query it also depends on. */}
      <Dialog open={formOpen} onOpenChange={onFormOpenChange}>
        {/* `dark` on the content itself, not inherited: a Radix portal mounts on
            `document.body`, outside the `dark` root the portal page scopes to itself, so
            without this the dialog renders in light tokens over a dark page. */}
        <DialogContent className="dark border-border bg-card sm:max-w-[480px]">
          <PayoutAccountForm
            existing={onFile}
            onSaved={async () => {
              onFormOpenChange(false);
              await queryClient.invalidateQueries({ queryKey: GYM_PAYOUT_ACCOUNT_QUERY_KEY });
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmingRemoval}
        onOpenChange={(open) => {
          setConfirmingRemoval(open);
          if (!open) removal.reset();
        }}
      >
        <AlertDialogContent className="dark border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this bank account?</AlertDialogTitle>
            <AlertDialogDescription>
              We will have nowhere to transfer your payout until you add another account.
              Anything already owed to you is unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {removal.isError && (
            <FormAlert message={payoutAccountErrorMessage(removal.error)} testId="payout-removal-error" />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 cursor-pointer rounded-xl border-border bg-secondary/50 text-sm font-semibold">
              Keep it
            </AlertDialogCancel>
            {/* Not `AlertDialogAction`'s default close-on-click: the dialog stays open until
                the request succeeds, so a failed removal is reported here rather than behind
                a card that still shows the account. */}
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                removal.mutate();
              }}
              disabled={removal.isPending}
              className="h-10 cursor-pointer rounded-xl bg-rose-500 text-sm font-bold text-white hover:bg-rose-400"
              data-testid="button-confirm-remove-payout-account"
            >
              {removal.isPending ? "Removing..." : "Remove account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/**
 * What we hold, in the four lines a gym needs to recognise it.
 *
 * The masked number is the point of the card. It is four characters because that is what a
 * gym can check against its own passbook, and because holding more of it here would put a
 * full bank credential in a response body for no gain.
 */
function AccountOnFile({
  account,
  onChange,
  onRemove,
}: {
  account: PayoutAccount;
  onChange: () => void;
  onRemove: () => void;
}) {
  return (
    <div data-testid="payout-account-summary">
      {account.bankName && (
        <p className="text-sm font-semibold text-foreground">{account.bankName}</p>
      )}
      <RowGroup className={account.bankName ? "mt-3" : undefined}>
        <Row label="Account holder" value={account.accountHolderName} />
        <Row label="Account" value={`••••${account.accountNumberLast4}`} />
        <Row label="IFSC" value={account.ifsc} />
        <Row label="Type" value={PAYOUT_ACCOUNT_TYPE_LABELS[account.accountType]} />
      </RowGroup>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
        Your payout is transferred here. Updated {formatIstDate(account.updatedAt)}.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onChange}
          className="h-9 cursor-pointer rounded-xl border-border bg-secondary/50 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          data-testid="button-change-payout-account"
        >
          Change
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onRemove}
          className="h-9 cursor-pointer rounded-xl px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-300"
          data-testid="button-remove-payout-account"
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

/**
 * The form, mounted fresh each time the dialog opens.
 *
 * `existing` decides the copy and the prefill, not a separate mode flag: an account on file
 * *is* what makes this a change, and one source for that means the two cannot disagree.
 */
function PayoutAccountForm({
  existing,
  onSaved,
}: {
  existing: PayoutAccount | null;
  onSaved: () => void;
}) {
  const form = useForm<PayoutAccountFormValues>({
    resolver: zodResolver(payoutAccountFormSchema),
    defaultValues: {
      accountHolderName: existing?.accountHolderName ?? "",
      // Blank on a change, and it cannot be otherwise: we hold four characters of the
      // number, so there is nothing here to prefill with.
      accountNumber: "",
      confirmAccountNumber: "",
      ifsc: existing?.ifsc ?? "",
      accountType: existing?.accountType ?? payoutAccountTypeSchema.options[0],
    },
    mode: "onBlur",
  });

  const save = useMutation({
    mutationFn: savePayoutAccount,
    onSuccess: onSaved,
  });

  // A rule the server enforces and this form does not know about would otherwise show only
  // in the banner, leaving the gym to guess which of five fields it meant.
  const fieldErrors =
    save.error instanceof PayoutAccountRequestError ? save.error.fieldErrors : null;
  useEffect(() => {
    if (!fieldErrors) return;
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (field in form.getValues()) {
        form.setError(field as keyof PayoutAccountFormValues, { message });
      }
    }
  }, [fieldErrors, form]);

  const hasFieldErrors = fieldErrors !== null && Object.keys(fieldErrors).length > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate>
        <DialogHeader>
          <DialogTitle>{existing ? "Change bank account" : "Add bank account"}</DialogTitle>
          <DialogDescription>
            {existing
              ? "These details replace the account we hold. Enter them in full."
              : "Your monthly payout is transferred to this account."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          {save.isError && !hasFieldErrors && (
            <FormAlert message={payoutAccountErrorMessage(save.error)} testId="payout-form-error" />
          )}

          <FormField
            control={form.control}
            name="accountHolderName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account holder</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Iron Temple Fitness Pvt Ltd"
                    autoComplete="off"
                    className="h-11 rounded-xl bg-secondary/40"
                    data-testid="input-account-holder"
                  />
                </FormControl>
                <FormDescription>As your bank has it, not your trading name.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    // Off, not "on": a browser offering a remembered account number here
                    // would be offering it on any machine the owner has ever signed in on.
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="h-11 rounded-xl bg-secondary/40 font-mono tabular-nums"
                    data-testid="input-account-number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmAccountNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm account number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="h-11 rounded-xl bg-secondary/40 font-mono tabular-nums"
                    data-testid="input-confirm-account-number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ifsc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IFSC</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="HDFC0001234"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className="h-11 rounded-xl bg-secondary/40 font-mono uppercase"
                    data-testid="input-ifsc"
                  />
                </FormControl>
                <FormDescription>Eleven characters, on your cheque book or passbook.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountType"
            render={({ field }) => (
              <FormItem>
                {/* A fieldset, because two radios without one are two unrelated controls to
                    a screen reader. */}
                <fieldset>
                  <legend className="text-sm font-medium leading-none">Account type</legend>
                  <div className="mt-2 flex gap-2">
                    {payoutAccountTypeSchema.options.map((option) => (
                      <label
                        key={option}
                        // 44px tall including the border, so the whole chip is the target
                        // rather than the 16px dot inside it.
                        className={`flex h-11 flex-1 cursor-pointer items-center gap-2.5 rounded-xl border px-4 text-sm font-semibold transition-colors ${
                          field.value === option
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        <input
                          type="radio"
                          name={field.name}
                          value={option}
                          checked={field.value === option}
                          onChange={() => field.onChange(option)}
                          className="h-4 w-4 flex-shrink-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          data-testid={`radio-account-type-${option}`}
                        />
                        {PAYOUT_ACCOUNT_TYPE_LABELS[option]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="submit"
            disabled={save.isPending}
            className="h-11 w-full cursor-pointer rounded-xl text-sm font-bold sm:w-auto"
            data-testid="button-save-payout-account"
          >
            {save.isPending ? "Saving..." : existing ? "Replace account" : "Save account"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

/** One failed request, said once, where the thing that failed was pressed. */
function FormAlert({ message, testId }: { message: string; testId: string }) {
  return (
    <p
      // `assertive`, not `polite`: the gym has just pressed a button and is waiting on the
      // answer, so this interrupts rather than queueing behind whatever else is speaking.
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] leading-relaxed text-rose-100"
      data-testid={testId}
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-300" aria-hidden="true" />
      {message}
    </p>
  );
}
