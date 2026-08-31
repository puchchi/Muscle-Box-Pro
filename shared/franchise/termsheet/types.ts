/**
 * The per-franchise values substituted into the Franchise Term Sheet.
 *
 * The gym agreement's `AgreementFields` is the model for this, including the rule that
 * every value is a **preformatted string**: "₹25,00,000" and "5", not 2500000 and 5. The
 * document is data and cannot call a function, so a figure has to be formatted before it
 * reaches here, at the one place that knows the number.
 *
 * Two things are specific to this document and worth stating.
 *
 * `territory` and `territoryBoundary` are the **approved** territory from the approval
 * record, never the territory the franchisee proposed in step 2. Exclusivity attaches to
 * what these two strings say (docs/franchise-onboarding.md §3), so rendering the request
 * would grant whatever was asked for.
 *
 * Everything on the money rows is deliberately a plain string rather than an optional
 * number. The City tier's payment schedule and capital recovery threshold are deferred by
 * the program document (§6, §21) and are set per franchise by an admin, so a City term
 * sheet whose terms record has not been completed simply leaves those fields out. An
 * absent field is an unresolved token, and `canIssue()` refuses to issue on one. That is
 * the mechanism that stops a half-priced term sheet reaching a signature, and it needs no
 * separate check.
 */

export type FranchiseTermSheetFields = {
  franchiseeLegalName: string;
  /** The human label for `EntityType`, e.g. "Private Limited Company". */
  franchiseeEntityType: string;
  franchiseePan: string;
  registeredAddress: string;
  signatoryName: string;
  signatoryDesignation: string;

  /** "01 September 2026". `formatAgreementDate`'s output, not an ISO string. */
  effectiveDate: string;
  /**
   * The date this term sheet lapses if the definitive agreement has not been executed.
   *
   * A binding term sheet with no expiry is a binding offer forever, and territory
   * availability moves. Derived at issuance from `effectiveDate`, so it is fixed in the
   * hashed text rather than computed by whatever reads the record later.
   */
  validUntil: string;

  /** "MuscleBox Pro Territory Franchise" — `FranchiseTier.name`. */
  tierName: string;
  territory: string;
  territoryBoundary: string;
  /** The number of machines, as a string. */
  machineAllocation: string;

  investment: string;
  /** The same amount in words, from `rupeesInWords`, for the same reason the gym deposit has one. */
  investmentInWords: string;
  firstInstalment: string;
  firstInstalmentTrigger: string;
  secondInstalment: string;
  secondInstalmentTrigger: string;
  capitalRecoveryThreshold: string;

  /** "100%", "50%", "25%", "75%" — with the sign, formatted at source. */
  proteinShareDuringRecovery: string;
  proteinShareAfterRecoveryFranchisee: string;
  proteinShareAfterRecoveryMbp: string;
  advertisingShareFranchisee: string;
  advertisingShareMbp: string;

  warehouseAddress: string;
  operationsContactName: string;
  operationsContactPhone: string;

  mbpNotices: { address: string; email: string; phone: string };
  franchiseeNotices: { address: string; email: string; phone: string };
};
