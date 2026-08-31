/**
 * The trip out to Digio and back, for step 7 of franchise onboarding.
 *
 * `depositReturn.ts` is the pattern and its reasoning applies unchanged, with one deliberate
 * subtraction.
 *
 * **What survives the journey:** where the wizard was, so `/franchise/esign-return` can put the
 * tab back inside it. That path contains the handle, a credential, which is why the redirect URL
 * we register with Digio is handle-free and the path is kept here instead. `Referrer-Policy:
 * no-referrer` on the onboarding route exists to stop that value leaking, and a return URL
 * carrying it would reopen the leak deliberately.
 *
 * **What deliberately does not:** the signing URL. The deposit module stores the payment link so
 * a gym that comes back unpaid has a way to the payment page, because a deposit link is
 * forwardable by design. A signing link is the opposite — it authorises an eSign in a named
 * person's identity, it is short-lived, and it is minted per request (docs/franchise-onboarding.md
 * §6.4). `requestEsign` is idempotent in the document and returns a fresh URL for the same Digio
 * request, so resuming needs a server call rather than a stored URL. That also means there is no
 * scoping problem to solve here: nothing is held that could be handed to the wrong franchise.
 *
 * `sessionStorage` for the deposit module's reason: one tab, gone when it closes, and carried
 * across a cross-origin navigation and back. Nothing stored here is evidence of anything. The
 * webhook is the only thing that may mark a term sheet signed, and a return trip is a navigation,
 * not a result.
 */

const RETURN_TO_KEY = "mbp.esign.return-to";
const RETURNED_KEY = "mbp.esign.returned";

/** Where Digio's redirect lands. Carries no handle, by design. */
export const ESIGN_RETURN_PATH = "/franchise/esign-return";

export function rememberSigningAttempt(returnTo: string): void {
  write(RETURN_TO_KEY, returnTo);
}

/**
 * Where the wizard was, read once and cleared.
 *
 * Null unless it is a franchise onboarding path. This value is read after a third-party
 * redirect and handed to `router.replace`, which makes it a redirect target: the check is what
 * keeps that redirect inside the flow it belongs to.
 */
export function takeEsignReturnTo(): string | null {
  const path = read(RETURN_TO_KEY);
  drop(RETURN_TO_KEY);
  return path && path.startsWith("/franchise/onboarding/") ? path : null;
}

export function markReturnedFromEsign(): void {
  write(RETURNED_KEY, "1");
}

/**
 * Did a signing session just send us back here? Read once and cleared.
 *
 * One-shot on purpose: left in storage it would make the next visit to step 7 — days later, on a
 * term sheet still unsigned — look like a return from a signature.
 */
export function takeReturnedFromEsign(): boolean {
  const value = read(RETURNED_KEY);
  drop(RETURNED_KEY);
  return value === "1";
}

export function forgetSigningAttempt(): void {
  drop(RETURN_TO_KEY);
  drop(RETURNED_KEY);
}

// ── Storage, which is allowed to not exist ──────────────────────────────────
//
// Safari in private mode and a browser with site data blocked throw on access rather than
// returning null. Swallowed, because every one of these is an optimisation of the journey:
// without storage the franchisee still signs, and still lands on a page that says what our
// record says — just the standalone one rather than back inside the wizard.

function read(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    return;
  }
}

function drop(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    return;
  }
}
