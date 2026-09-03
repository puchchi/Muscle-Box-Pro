/**
 * The /franchise FAQ, in one place because it is rendered twice: as visible accordion
 * copy in the page, and as FAQPage JSON-LD in the route shell. Google treats a
 * mismatch between the two as structured-data spam, so they come from one array rather
 * than being kept in sync by hand. Same arrangement as shared/partnership/faq.ts.
 *
 * Answers interpolate FRANCHISE and the tiers, so a change to the commercials cannot
 * leave a stale figure buried in prose.
 */
import type { FaqEntry } from "../partnership/faq";
import { FRANCHISE, formatInr, franchiseTier } from "./program";

const territory = franchiseTier("territory");
const city = franchiseTier("city");

export const FRANCHISE_FAQ: FaqEntry[] = [
  {
    question: "Am I buying the machines?",
    answer:
      `No. Every MuscleBox Pro machine remains the property of MuscleBox Pro. The franchise investment buys the ` +
      `contractual right to develop and operate the network in your territory, using machines we own, supply and ` +
      `support. You can move them between approved locations and replace an underperforming gym, but you cannot ` +
      `sell one, transfer it, or use it outside the MuscleBox Pro ecosystem. On exit or termination the machines ` +
      `normally come back to us. There is one narrow exception. If we end the franchise for our own business ` +
      `reasons, or decline to renew it for reasons unrelated to how you have run it, and you have not yet ` +
      `recovered your capital, then once you are past 24 months of operation we choose between transferring the ` +
      `machines to you and refunding your unrecovered amount with interest. It does not apply if you choose to ` +
      `exit, if we decline to renew because targets or payments were missed, or if we terminate on any of the ` +
      `grounds listed in the agreement, such as breach or non-payment.`,
  },
  {
    question: "What do the two franchise tiers cost?",
    answer:
      `The ${territory.shortName} is ${formatInr(territory.investmentInr)} with ${territory.initialMachines} machines ` +
      `and rights to a defined geographic territory. The ${city.shortName} is ${formatInr(city.investmentInr)} with ` +
      `${city.initialMachines} machines and city-level development rights. Larger regional structures may be ` +
      `introduced later.`,
  },
  {
    question: "When do I pay?",
    answer:
      `For the ${territory.shortName}, in two equal halves: ${formatInr(territory.investmentInr / 2)} at franchise ` +
      `registration and ${formatInr(territory.investmentInr / 2)} when your machines are ready at the OEM. The ` +
      `${city.shortName} follows the agreed commercial structure, generally linked to the same two milestones, with ` +
      `the exact schedule set in the definitive agreement.`,
  },
  {
    question: "How does capital recovery work?",
    answer:
      `Until you have received cumulative eligible protein-business profit equal to your ` +
      `${formatInr(territory.investmentInr)} investment plus GST, ` +
      `${FRANCHISE.proteinProfitSharePct.duringRecovery}% of the applicable ` +
      `MuscleBox Pro distributable protein-business profit from your machines goes to you. After that the split ` +
      `moves to ${FRANCHISE.proteinProfitSharePct.afterRecovery}:${FRANCHISE.proteinProfitSharePct.afterRecovery} ` +
      `and you keep participating for the life of the franchise. The ${city.shortName} threshold is set in its own ` +
      `agreement.`,
  },
  {
    question: "Does advertising income count toward my capital recovery?",
    answer:
      `No, and this is the term people most often read the other way. Advertising profit is shared ` +
      `${FRANCHISE.advertising.franchiseeSharePct}% to you and ${FRANCHISE.advertising.mbpSharePct}% to MuscleBox ` +
      `Pro from day one, it is calculated after applicable advertising costs, and it does not reduce your remaining ` +
      `recovery amount. It also does not stop when recovery completes. Protein and advertising are two separate ` +
      `streams throughout.`,
  },
  {
    question: "What costs come off before my share is calculated?",
    answer:
      `Franchise profit is worked out on the real economics of running a local network, so more than just the cup: ` +
      `${FRANCHISE.franchiseLevelCosts.map((c) => c.toLowerCase()).join(", ")}. That is deliberately a longer list ` +
      `than the one used for a gym's own profit share, which is limited to ` +
      `${FRANCHISE.gymLevelCosts.map((c) => c.toLowerCase()).join(" and ")}.`,
  },
  {
    question: "Is my territory genuinely exclusive?",
    answer:
      `Exclusivity is real but conditional. It depends on keeping the required number of machines active, meeting ` +
      `deployment timelines and performance requirements, maintaining operating standards and complying with the ` +
      `agreement. A franchisee cannot pay for a city, leave most of it undeveloped and block us from expanding. ` +
      `Certain strategic and national accounts are also reserved to MuscleBox Pro.`,
  },
  {
    question: "Who finds the gyms?",
    answer:
      `Both of us. We pass on leads, existing network opportunities and the standard gym commercial framework. You ` +
      `identify and approach gyms in your territory, build the local relationships and recommend new or replacement ` +
      `locations. Every location needs our approval before a machine is deployed.`,
  },
  {
    question: "Who sets the price of a shake, and the gym's cut?",
    answer:
      `MuscleBox Pro does. Consumer pricing, promotional pricing, formulations, product configuration and the gym ` +
      `profit-sharing model are all centrally controlled. Gym arrangements run at splits such as ` +
      `${FRANCHISE.gymProfitSharingExamples.join(" or ")} depending on the location. You maintain the relationship ` +
      `with the gym, but you cannot commit us to a different structure.`,
  },
  {
    question: "How do I know what I have actually earned?",
    answer:
      `Every customer payment runs through MuscleBox Pro's own payment and accounting infrastructure, which is what ` +
      `makes machine-level revenue tracking possible. Your dashboard shows machine-wise sales, revenue, consumption, ` +
      `gym share, operating costs, advertising income, distributable profit, payouts and how much of your capital ` +
      `recovery is left. You may also have reasonable audit and information-review rights over your own machines, as ` +
      `set out in the agreement.`,
  },
  {
    question: "What am I responsible for locally?",
    answer:
      `We deliver machines and protein to your warehouse and run the technology, supply chain and support. ` +
      `Everything after that is yours: storage, transport, moving machines between locations, gym relationships, ` +
      `your own team, and keeping every machine working and stocked. That last part is the daily job. You check ` +
      `the machines, top up protein, refill cups and approved supplies, clear expired stock, keep the machine and ` +
      `its area clean, act on platform alerts and report faults quickly. You cannot pass that work to the gym, ` +
      `its staff or anyone else without our written approval. Those local costs are yours to carry. They are not ` +
      `taken off the profit your share is worked out from.`,
  },
  {
    question: "Can I add machines later?",
    answer:
      `Yes, subject to approval. Expansion normally happens in blocks, based on the performance of your existing machines, your ` +
      `compliance, territory capacity and the availability of suitable gyms. The price for additional machines is ` +
      `set at the time of expansion and is not fixed at your initial per-machine investment, because OEM pricing, ` +
      `logistics and taxes move. Additional machines do not by themselves enlarge your territory.`,
  },
  {
    question: "Is technical support charged separately?",
    answer:
      `Not during your capital recovery period. Remote diagnostics, troubleshooting, software and firmware updates, ` +
      `technical guidance, OEM coordination and warranty handling are provided without a separate technical service ` +
      `fee while you are recovering your investment, subject to the definitive agreement. Machines are covered by ` +
      `applicable OEM warranty arrangements and issues are reported to us rather than to the OEM.`,
  },
  {
    question: "Can I transfer or exit the franchise?",
    answer:
      `Both are possible with our prior approval. A transferee has to meet our financial, operational, compliance, ` +
      `brand and territory requirements, and a transfer never carries machine ownership with it. On an approved exit ` +
      `we take the machines back, franchise rights may revert to us, protein inventory is handled per the agreement ` +
      `and outstanding obligations remain payable. Choosing to exit also means the capital protection described ` +
      `above does not apply, so anything you have not recovered by then stays unrecovered.`,
  },
  {
    question: "Are returns guaranteed?",
    answer:
      `No. Nothing in this page is a guarantee of returns, profitability or business performance, and it is not the ` +
      `franchise agreement. Actual results depend on machine utilisation, gym locations, customer demand, pricing, ` +
      `operating costs, local market conditions, advertising demand and your own performance. Take independent ` +
      `legal, tax and financial advice before signing anything.`,
  },
];
