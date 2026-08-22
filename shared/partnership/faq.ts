/**
 * The /gym-partnership FAQ, in one place because it is rendered twice: as visible
 * accordion copy in the page, and as FAQPage JSON-LD in the route shell. Google
 * treats a mismatch between the two as structured-data spam, so they must come
 * from the same array rather than being kept in sync by hand.
 *
 * Answers interpolate PARTNERSHIP so a change to the commercials can't leave a
 * stale rupee figure buried in prose.
 */
import { PARTNERSHIP, formatInr } from "./summary";

export type FaqEntry = { question: string; answer: string };

export const PARTNERSHIP_FAQ: FaqEntry[] = [
  {
    question: "What does the machine cost the gym?",
    answer:
      `Nothing. MuscleBoxPro buys, delivers, installs, stocks, cleans and services the machine at its own cost. ` +
      `The only money that leaves your account is a refundable security deposit of ${formatInr(PARTNERSHIP.securityDepositInr)}, ` +
      `which is returned at the end of the partnership less any amounts properly due.`,
  },
  {
    question: "Why is there a security deposit if the machine is free?",
    answer:
      `The machine stays MuscleBoxPro's property and sits unattended on your floor. The deposit covers loss or ` +
      `avoidable damage while it is in your custody. It is refundable, it is not a fee, and it is not deducted ` +
      `from your monthly payouts.`,
  },
  {
    question: "How is my share actually calculated?",
    answer:
      `On net profit, not gross sales. Gross shake revenue less the direct cost of the ingredients, cup and ` +
      `consumables gives net profit. Your share of that starts at ${PARTNERSHIP.gymNetProfitSharePct.beforeMilestone}% ` +
      `and rises to ${PARTNERSHIP.gymNetProfitSharePct.afterMilestone}% once the machine passes its performance ` +
      `milestone — whichever comes first of ${PARTNERSHIP.milestone.cups.toLocaleString("en-IN")} paid cups or ` +
      `${formatInr(PARTNERSHIP.milestone.cumulativeNetProfitInr)} of cumulative net profit. On typical margins the ` +
      `profit figure is reached first; on thinner ones the cup count is.`,
  },
  {
    question: "When do I get paid?",
    answer:
      `Within ${PARTNERSHIP.settlementDaysAfterMonthEnd} days of the end of each month, against a statement showing ` +
      `cups sold, gross revenue, direct costs and your share. Your partner dashboard shows live figures during the ` +
      `month, but those are provisional — the statement is the settled amount.`,
  },
  {
    question: "Who pays for the electricity the machine uses?",
    answer:
      `You are reimbursed for it. MuscleBoxPro pays ${formatInr(PARTNERSHIP.electricity.inrPerBlock)} for every ` +
      `completed block of ${PARTNERSHIP.electricity.cupsPerBlock.toLocaleString("en-IN")} paid cups, assessed over a ` +
      `${PARTNERSHIP.electricity.reviewWindowMonths}-month review window, with a minimum of ` +
      `${formatInr(PARTNERSHIP.electricity.floorInrPerWindow)} per window even if the machine sells very little. ` +
      `Part-completed blocks do not carry into the next window.`,
  },
  {
    question: "Do I earn anything from the advertising screen?",
    answer:
      `Yes — ${PARTNERSHIP.advertisingGymSharePct}% of the advertising revenue the machine in your gym generates. ` +
      `Unlike the shake share, this percentage stays flat for the life of the agreement; it does not step up at the ` +
      `performance milestone.`,
  },
  {
    question: "How much space and power does it need?",
    answer:
      `About 3 ft by 3 ft of floor space near where members finish their workout, and a standard power point. ` +
      `No plumbing and no drainage are required.`,
  },
  {
    question: "What am I responsible for?",
    answer:
      `Keeping the space available and the power on, giving our team reasonable access to restock and service the ` +
      `machine, not moving or opening it, and not placing a competing protein shake vending machine in the same ` +
      `premises during the term. You are never responsible for stock, hygiene of the machine internals, repairs, ` +
      `or handling customer payments.`,
  },
  {
    question: "How long is the commitment, and can I get out of it?",
    answer:
      `The initial term is ${PARTNERSHIP.initialTermMonths} months, and you can end it for convenience on ` +
      `${PARTNERSHIP.noticeDays.gymExit} days' written notice. MuscleBoxPro may also remove a persistently ` +
      `underperforming machine on ${PARTNERSHIP.noticeDays.mbpUnderperformance} days' notice. Either way the ` +
      `machine is collected at our cost and your deposit is returned.`,
  },
  {
    question: "Is my gym eligible?",
    answer:
      `Placement is invite-only, because a machine that does not sell helps neither of us. We look at daily ` +
      `footfall, member mix, the space available and the city. Request a demo and we will tell you honestly ` +
      `whether your gym is a fit.`,
  },
];
