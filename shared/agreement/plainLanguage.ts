/**
 * The "In short" panels for the agreement versions.
 *
 * Clauses stated in one line each, in the second person. This is not
 * decoration and it is not marketing copy: it is what makes "I have read and agree"
 * a defensible statement from someone who is not a lawyer, and it is the part of the
 * signing flow a court would look at hardest. See docs/gym-onboarding.md §3.
 *
 * Three rules for editing it:
 *
 *   1. **Tied to one agreement version.** Each list is named for the version whose
 *      text it describes. A new version gets its own list; it does not inherit an
 *      older one, because a renumbered or reworded clause makes the summary a lie.
 *      `PLAIN_LANGUAGE_V2_1` therefore stays exactly as it is, describing v2.1's
 *      defects, even though the app now issues v2.3 — a gym that signed against 2.1
 *      relied on 2.1's panel, and that record has to keep reading true.
 *   2. **Quote the document, don't improve it.** Where the agreement is weak or
 *      self-contradictory — §36.1 grants a *request* to exit, not a right, and
 *      §36.2 points at a blank charge — the summary says so. A summary that reads
 *      better than the contract is worse than no summary, because it becomes the
 *      thing the gym relied on.
 *   3. **Figures are literals, matching that version's frozen text.** Deliberately
 *      not interpolated from `PARTNERSHIP`: v2.1's clauses transcribe "15,000" and
 *      "₹5,00,000" as content, so a later change to our standard commercials must
 *      not silently rewrite what this panel claims a signed document says. The
 *      `quotes` field exists so a test can assert each figure still appears in the
 *      rendered agreement.
 */

export type PlainLanguageItem = {
  /** Clause reference as displayed, e.g. `"5.6"`. */
  clause: string;
  /** Top-level section to link to, e.g. `"5"`. Sub-clauses have no anchor of their own. */
  section: string;
  /** One line, second person, no hedging. */
  short: string;
  /**
   * Figures quoted in `short` that must also appear in the rendered agreement.
   * Asserted by `client/src/__tests__/shared/agreement.test.ts`.
   */
  quotes?: string[];
};

export const PLAIN_LANGUAGE_V2_1: readonly PlainLanguageItem[] = [
  {
    clause: "3",
    section: "3",
    short:
      "The machine stays our property for the whole term. You host and look after it; you never own it, and you cannot pledge it or let anyone else claim it.",
  },
  {
    clause: "5.6",
    section: "5",
    short:
      "Your deposit is refundable, but we can deduct repair costs for accidental damage and forfeit all of it for damage that is deliberate, negligent or severe, and recover anything beyond it.",
  },
  {
    clause: "14",
    section: "14",
    short:
      "You cannot add, change, dilute or refill any ingredient, and only our supplied stock may go into the machine. This is the food-safety line, and breaking it is treated as a material breach.",
  },
  {
    clause: "21",
    section: "21",
    short:
      "You cannot move the machine, not to another wall and not to another branch, without our written approval.",
  },
  {
    clause: "12.4",
    section: "12",
    short:
      "If we decide the machine is commercially underperforming, we can remove it on 15 days' notice. You keep no claim on it, and outstanding amounts still settle.",
    quotes: ["15 days"],
  },
  {
    clause: "36.1",
    section: "36",
    short:
      "You can ask to exit early on 30 days' written notice. Read it as a request rather than an automatic right: §36.2 makes any early-termination amount whatever Schedule B says, and that figure is still blank.",
    quotes: ["30 days"],
  },
  {
    clause: "6",
    section: "6",
    short:
      "You get 20% of net profit until the milestone and 50% after it. §6.1 sets the milestone at 15,000 paid cups or ₹5,00,000 cumulative gross, whichever comes first, but Schedules B and C state the cup test alone, and the two do not agree.",
    quotes: ["15,000", "₹5,00,000"],
  },
  {
    clause: "9.4",
    section: "9",
    short:
      "Advertising revenue on the machine's screen is split 80:20 in our favour, so your share of it is 20%, and it stays 20% permanently, even after the shake profits step up to 50:50.",
    quotes: ["80:20"],
  },
] as const;

/**
 * The "In short" panel for agreement v2.2.
 *
 * Eleven items rather than 2.1's eight. Three of the additions are clauses 2.2 drafted
 * from scratch, two of which a gym would be entitled to be annoyed about finding later:
 * §34, where neither side's liability for direct loss is capped, and §46, which sends
 * any dispute to a court in the district where *we* are based. Rule 2 above cuts both
 * ways — a summary that lists only the favourable terms is as misleading as one that
 * papers over a blank.
 *
 * The two items 2.1 flagged as defective are rewritten rather than carried over:
 * §36.2's charge is Nil rather than blank, and §6's two milestone tests now agree
 * across the body and the schedules. Where 2.1's line said "and that figure is still
 * blank", 2.2's says what the figure is.
 *
 * §5.9's GST treatment is deliberately *not* in the panel. It is favourable, it is
 * administrative, and eleven lines is already at the edge of what somebody reads before
 * scrolling. The panel is for the terms that bind and bite.
 */
export const PLAIN_LANGUAGE_V2_2: readonly PlainLanguageItem[] = [
  {
    clause: "3",
    section: "3",
    short:
      "The machine stays our property for the whole term. You host and look after it; you never own it, and you cannot pledge it or let anyone else claim it.",
  },
  {
    clause: "6",
    section: "6",
    short:
      "You get 20% of net profit until the milestone and 50% after it. The milestone is 15,000 paid cups or ₹5,00,000 of cumulative net profit, whichever comes first, and once you reach it, 50% is yours for the rest of the term even if a later bad month drags the total back down.",
    quotes: ["15,000", "₹5,00,000"],
  },
  {
    clause: "9.4",
    section: "9",
    short:
      "Advertising revenue on the machine's screen is split 80:20 in our favour, so your share of it is 20%, and it stays 20% permanently, even after the shake profits step up to 50:50.",
    quotes: ["80:20"],
  },
  {
    clause: "5.6",
    section: "5",
    short:
      "Your deposit is refundable, but we can deduct repair costs for accidental damage and forfeit all of it for damage that is deliberate, negligent or severe, and recover anything beyond it.",
  },
  {
    clause: "14",
    section: "14",
    short:
      "You cannot add, change, dilute or refill any ingredient, and only our supplied stock may go into the machine. This is the food-safety line, and breaking it is treated as a material breach.",
  },
  {
    clause: "24.6",
    section: "24",
    short:
      "We are the FSSAI food business operator for what the machine dispenses and we hold that licence at our cost, so you do not need one for the machine, but you must not describe yourself as the operator of it either.",
  },
  {
    clause: "21",
    section: "21",
    short:
      "You cannot move the machine, not to another wall and not to another branch, without our written approval. Moving it does not restart your cup count or your profit total.",
  },
  {
    clause: "12.4",
    section: "12",
    short:
      "If we decide the machine is commercially underperforming, we can remove it on 15 days' notice. You keep no claim on it, and outstanding amounts still settle.",
    quotes: ["15 days"],
  },
  {
    clause: "36.1",
    section: "36",
    short:
      "You can end this early for any reason on 30 days' written notice, and there is no early-termination charge if you give that notice. Ask us to take the machine away without it and we can charge you what removal actually costs.",
    quotes: ["30 days"],
  },
  {
    clause: "34",
    section: "34",
    short:
      "Neither of us can claim lost profits or other knock-on losses from the other, and neither of us has a cap on liability for direct loss, so damage you cause is recoverable in full, not just up to your deposit.",
  },
  {
    clause: "46",
    section: "46",
    short:
      "Indian law applies, there is no arbitration, and any dispute we cannot settle in 30 days goes to the courts at Gautam Buddha Nagar, Uttar Pradesh, which is where we are, and may not be where you are.",
    quotes: ["Gautam Buddha Nagar"],
  },
] as const;

/**
 * The "In short" panel for agreement v2.3 — the version the flow issues.
 *
 * The eleven items 2.2 summarises are written out again rather than aliased, under rule 1
 * above. They read identically because 2.3 changes no term a gym is bound by: it removes
 * the blank forms for installation and machine return, and states in §47 how the Agreement
 * is executed. Aliasing would be shorter and would also mean an edit made for a future
 * version silently rewriting what a gym who signed 2.2 was shown, which is the failure
 * rule 1 exists to prevent — and 2.2's list is frozen, so the duplication never has to be
 * reconciled.
 *
 * The twelfth item is 2.3's own: how you sign, and what we keep as proof of it. It is not
 * a term that binds and bites, and it is here anyway, because the panel is what a
 * non-lawyer relies on when they click "I have read and agree" — and "clicking this is the
 * signature" is the one thing about the mechanics they need to have been told.
 */
export const PLAIN_LANGUAGE_V2_3: readonly PlainLanguageItem[] = [
  {
    clause: "3",
    section: "3",
    short:
      "The machine stays our property for the whole term. You host and look after it; you never own it, and you cannot pledge it or let anyone else claim it.",
  },
  {
    clause: "6",
    section: "6",
    short:
      "You get 20% of net profit until the milestone and 50% after it. The milestone is 15,000 paid cups or ₹5,00,000 of cumulative net profit, whichever comes first, and once you reach it, 50% is yours for the rest of the term even if a later bad month drags the total back down.",
    quotes: ["15,000", "₹5,00,000"],
  },
  {
    clause: "9.4",
    section: "9",
    short:
      "Advertising revenue on the machine's screen is split 80:20 in our favour, so your share of it is 20%, and it stays 20% permanently, even after the shake profits step up to 50:50.",
    quotes: ["80:20"],
  },
  {
    clause: "5.6",
    section: "5",
    short:
      "Your deposit is refundable, but we can deduct repair costs for accidental damage and forfeit all of it for damage that is deliberate, negligent or severe, and recover anything beyond it.",
  },
  {
    clause: "14",
    section: "14",
    short:
      "You cannot add, change, dilute or refill any ingredient, and only our supplied stock may go into the machine. This is the food-safety line, and breaking it is treated as a material breach.",
  },
  {
    clause: "24.6",
    section: "24",
    short:
      "We are the FSSAI food business operator for what the machine dispenses and we hold that licence at our cost, so you do not need one for the machine, but you must not describe yourself as the operator of it either.",
  },
  {
    clause: "21",
    section: "21",
    short:
      "You cannot move the machine, not to another wall and not to another branch, without our written approval. Moving it does not restart your cup count or your profit total.",
  },
  {
    clause: "12.4",
    section: "12",
    short:
      "If we decide the machine is commercially underperforming, we can remove it on 15 days' notice. You keep no claim on it, and outstanding amounts still settle.",
    quotes: ["15 days"],
  },
  {
    clause: "36.1",
    section: "36",
    short:
      "You can end this early for any reason on 30 days' written notice, and there is no early-termination charge if you give that notice. Ask us to take the machine away without it and we can charge you what removal actually costs.",
    quotes: ["30 days"],
  },
  {
    clause: "34",
    section: "34",
    short:
      "Neither of us can claim lost profits or other knock-on losses from the other, and neither of us has a cap on liability for direct loss, so damage you cause is recoverable in full, not just up to your deposit.",
  },
  {
    clause: "46",
    section: "46",
    short:
      "Indian law applies, there is no arbitration, and any dispute we cannot settle in 30 days goes to the courts at Gautam Buddha Nagar, Uttar Pradesh, which is where we are, and may not be where you are.",
    quotes: ["Gautam Buddha Nagar"],
  },
  {
    clause: "47",
    section: "47",
    short:
      "Confirming in this flow is your signature — there is nothing to print, sign by hand or stamp. We store the fingerprint of the exact text you agreed to and the moment you agreed to it, and you get both with your copy.",
  },
] as const;
