"use client";

import { useEffect, useRef } from "react";

/**
 * Asks our own server, on a timer, while something we do not control settles.
 *
 * Two steps need this and neither can be a redirect handler. Step 7's signature is written by
 * Digio's webhook and step 8's payment by an admin reading a bank statement, so the event that
 * moves the wizard arrives at our server with this tab doing nothing. A franchisee who signs and
 * closes the tab, or signs on a phone and watches on a laptop, never comes back through the
 * redirect at all; polling our own record covers every one of those paths with one mechanism.
 *
 * It stops on unmount and after `maxPolls`, and running out calls back, so the screen can say so.
 * A poll that expires quietly leaves somebody reading "this page updates by itself" beside a page
 * that stopped asking twenty minutes ago.
 *
 * The first read is immediate. Straight back from a signing session the webhook has usually
 * already landed, and waiting one interval to ask is one interval of nothing.
 *
 * Extracted rather than shared with `useBackgroundPoll` in the gym flow's `StepDeposit`, which is
 * file-local there. Identical mechanism, and if either changes it should be because that flow's
 * wait changed.
 */
export function useBackgroundPoll(
  active: boolean,
  poll: () => Promise<void>,
  {
    intervalMs,
    maxPolls,
    onExhausted,
  }: { intervalMs: number; maxPolls: number; onExhausted: () => void },
) {
  const pollRef = useRef(poll);
  const exhaustedRef = useRef(onExhausted);
  pollRef.current = poll;
  exhaustedRef.current = onExhausted;

  useEffect(() => {
    if (!active) return;
    let polls = 1;
    // Not awaited and its result not inspected: the answer arrives as new state through the
    // hook, which is the only place the truth lives.
    void pollRef.current();

    const timer = setInterval(() => {
      polls += 1;
      if (polls > maxPolls) {
        clearInterval(timer);
        exhaustedRef.current();
        return;
      }
      void pollRef.current();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [active, intervalMs, maxPolls]);
}
