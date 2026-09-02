# Franchise Onboarding

Status: **being built.** Written 2026-08-31. Phases 1 to 3 of §11 are done: the renderer is generic,
and the Franchise Term Sheet exists with its bytes pinned. Everything else here is still a plan.

Scope: an invite-only franchise onboarding flow on the web surface, plus the backend that serves it.
The commercial substance is `docs/MuscleBox_Pro_Franchise_Program.md`, which is the program
description and says of itself that it is *not* the definitive franchise agreement (§56). What the
flow captures, and what it does not, follows from that.

**Read `docs/gym-onboarding.md` first.** This flow is deliberately the same machine as the gym
wizard — server-owned step, one token, drafts on debounce, a hashed document, a webhook as the only
thing that may mark money or a signature real — and the § references below point into it. Where this
document says "gym doc §4" it means that file. Where it says "backend design §5" it means
`~/github/mbp-backend/docs/gym-onboarding-api-design.md`.

Four things were decided before this was written, and each one shapes a whole section:

| Decision | Section |
|---|---|
| Signatures go through **Leegality**, not a typed name in a box | §6 |
| The first instalment is a **bank transfer we verify**, not a payment gateway | §7 |
| What gets signed now is a **binding term sheet**, not the definitive agreement | §5 |
| The flow also captures **KYC, territory and operations readiness** | §3 |

---

## 1. Why this is not the gym wizard with the nouns changed

Four structural differences, and each one is a thing the gym flow has no code for.

**1. There is an approval gate in the middle.** A gym gets invited because we already decided to
place a machine. A franchisee gets invited to *apply*, and the program's own journey (§52) puts
market evaluation and franchise approval between the application and the agreement. So the flow has
a step the franchisee cannot complete, in the middle rather than at the end, and a real possibility
of being **declined**. The gym flow's only non-franchisee step is step 6, Installation, and it sits
after everything and cannot fail. Nothing in `OnboardingStatus` can express "we said no".

**2. Two parties act on the same step.** The first instalment is submitted by the franchisee (a UTR)
and verified by us (against a bank statement). That is neither the gym flow's franchisee-commits
pattern nor its completed-on-read pattern. §7.4 names it and gives it rules.

**3. The signature is affixed by someone else.** The gym signature is a typed name, two checkboxes
and a hash we computed — the whole record is ours. A Leegality signature is affixed to a PDF by
Leegality, after an Aadhaar OTP or a DSC, and the artifact that carries legal weight is a file we did not
produce the last version of. That reverses the direction of the hash discipline and requires a PDF
renderer this repo does not have. §6 is the longest section here for that reason.

**4. The money is 25 to 50 times larger and the wizard must not touch it.** ₹12,50,000 is not a
₹50,000 deposit with more zeros. Razorpay's fee on it is around ₹25,000, per instalment, and the
reconciliation question changes from "did the webhook fire" to "did the amount in our bank match the
amount claimed". §7 removes the gateway from this path entirely, which also removes every line of
money-moving code from it.

Everything else — the token, the drafts, the derived `currentStep`, the freeze on signing, the
forward-only status ladder, the conditional write on the signing record — is copied deliberately,
including the reasoning. Where this document is silent, gym doc §4 is the rule.

---

## 2. What already exists, and the one gap in it

| Piece | State |
|---|---|
| `/franchise` public page, `client/src/pages/Franchise.tsx` | built, indexed, 2162 lines |
| `shared/franchise/program.ts` | built — every figure the program publishes, as data |
| `shared/franchise/faq.ts` | built |
| `shared/validation/franchise.ts` + `client/src/lib/franchiseApi.ts` | built |
| `POST /franchise/applications` | **live** on prod and sandbox — stores the enquiry, mails us and the applicant |
| An admin surface for those applications | **missing** |

That last row is the gap. Franchise enquiries have been landing in DynamoDB and in an inbox since
2026-08-31 with no queue, no status, and no way to turn one into an invite. `POST /admin/gyms` does
exactly that job for demo requests (backend design §2.7). The franchise equivalent does not exist, so
§8 builds it first: without it there is no way to *start* an onboarding, and the wizard would be a
flow nobody can be invited into.

**`docs/FranchiseOnboardingPlan.md` was not a plan — deleted 2026-08-31.** It was an earlier copy of
the program document under a name suggesting otherwise, and it was the file
`shared/franchise/program.ts` cited in its section references. It was missing §28 (Franchisee
Operational Responsibilities), so **every section number above 27 was off by one** in `program.ts`
and `Franchise.tsx` — including the disclaimer reference, which pointed at §55 (Commercial
Principles) rather than §56 (Important Commercial Notice), the one clause rule 2 of `program.ts`
calls load-bearing.

Both files now cite `MuscleBox_Pro_Franchise_Program.md` and the numbers were shifted with it. One
reference improved rather than moved: `MACHINE_UPKEEP` cited §38, Franchisee Responsibilities, when
its list is verbatim the §28 that was missing — the section written for exactly that list. It cites
§28 now.

---

## 3. The flow

Nine steps, grouped into four phases. The phases are `JOURNEY_PHASES` from
`shared/franchise/program.ts`, so the rail a franchisee sees while onboarding uses the same names as
the journey they read on the public page.

| # | Step | Phase | Who completes it |
|---:|---|---|---|
| 1 | Your details | Apply | franchisee |
| 2 | Your territory | Apply | franchisee (proposes) |
| 3 | KYC and documents | Apply | franchisee |
| 4 | Approval | Approval | **us** — completed on read |
| 5 | Your franchise | Agree | franchisee (acknowledges) |
| 6 | Operations readiness | Agree | franchisee |
| 7 | Review and sign | Agree | franchisee, via Leegality |
| 8 | First instalment | Fund | **both** — franchisee claims, we verify |
| 9 | You're set up | Fund | franchisee |

Nine is more steps than the gym flow's six, and the rail is what stops that reading as a longer
ladder. Grouped into four phases it reads as four things with a couple of parts each, and the phase
a franchisee is in is the answer to "how far through am I" — which is the question the count was
being asked to answer and answers badly at nine.

### Step 1 — Your details

The same shape as the gym flow's step 1, with the fields a ₹25 lakh counterparty needs and a gym
does not.

| Field | Note |
|---|---|
| `legalEntityName`, `entityType` | `EntityType` is reusable verbatim from `shared/onboarding/types.ts`, including `unregistered` |
| `tradeName` | the name the territory trades under, and the source of the URL slug |
| `pan` | **new.** Mandatory. A franchise agreement identifies its counterparty by PAN, and it is required on the DSC path |
| `gstin` | |
| `cin` / `llpin` | **new**, conditional on `entityType` being `pvt_ltd` or `llp` |
| `registeredAddress` | |
| `signatoryName`, `signatoryDesignation` | |
| `signatoryPan`, `signatoryAadhaarLast4` | **new.** §6.5 — Aadhaar eSign binds a signature to an identity, and the last four digits are sent to Leegality as a check the provider enforces against the signing certificate |
| `noticesEmail`, `noticesPhone` | the notices block, same role as the gym agreement's §41 |

PAN is validated for shape (`[A-Z]{5}[0-9]{4}[A-Z]`) and no further. The fourth character is the
holder's category — `P` for an individual, `C` for a company, `F` for a firm — and it is deliberately
**not** checked against `entityType`: plenty of applicants apply on their own PAN because the company
they will trade through does not exist yet, and refusing that is refusing the application. `cin` is
optional for the same reason. The signatory's PAN is still required to be a `P`, because a signatory
is a person and a company's number cannot be bound to an Aadhaar identity.

**Not collected: bank details.** The franchisee's payout account is a portal setting after
activation, exactly as `GET /gym/payout-account` is for gyms, and there is nothing to pay out during
onboarding. Asking for it here would put a bank account behind a URL-borne handle for no reason.

### Step 2 — Your territory

The franchisee names the market they want. This is the step the program document's §55 makes
load-bearing: *"the exact territory will be mutually defined and documented before the franchise
becomes operational"*, and exclusivity attaches to whatever this ends up saying.

- `tier` — prefilled from the application, changeable here, constrained to `FRANCHISE_TIERS`
- `proposedState` — one of the 36 names in `shared/geo/india.ts`
- `proposedDistricts` — at least one, all within `proposedState`. Changing the state clears them
- `proposedPincodes` — optional, six digits each, for somebody who wants half a metro rather than
  all of it. Shape only: India Post is the authority on whether a pin code exists, and validating
  against the real directory would mean shipping 150,000 rows to a browser
- `proposedBoundary` — optional prose, for whatever the two lists above could not say
- `existingRelationships` — gyms they already have a relationship with, which is the single most
  useful input to a market evaluation and the one thing a franchisee volunteers freely

**Districts, not prose.** This step used to require a paragraph describing where the territory
started and stopped, with a 20-character floor, and that was the wrong question. An applicant who
answers "Bangalore" has told us everything they usefully can; the rest is a contract clause an admin
writes at approval. Districts are the unit because they are official, enumerable and do not overlap,
so two franchises cannot be granted the same ground by accident, and pin codes are the next official
unit down. Selections are stored as **names, not codes**, so a district renamed or split three years
from now does not change what an existing record says was asked for.

**The list is a convenience, not an authority.** Nothing contractual is derived from it, and a
missing district is not a blocked application: `proposedBoundary` is still there for the applicant
the list fails, and an admin writes the boundary that counts. `shared/geo/india.ts` has the full
argument, including why the vocabulary is checked in rather than fetched from a places API — a term
sheet's territory is covered by a signature hash, and "North Bangalore" is not a place with a
boundary in anybody's dataset.

**No map, and no polygon.** A drawn boundary looks precise and is not: it would have to be
authoritative for exclusivity, which means a dispute two years out turns on whether a gym is inside
a shape somebody dragged in a browser. Prose that a human approves is what the definitive agreement
will carry anyway. If a map is added later it is a rendering of the approved text, not the record.

**The approved territory is not the proposed one.** Step 2 stores what the franchisee asked for;
`POST /admin/franchises/{id}/approval` stores what we granted, as a separate field. They are usually
the same and must stay separately representable, because the case that matters is the one where we
approve three suburbs of five, and a record that overwrote the request would lose the fact that
anything was cut. The grant stays free prose on the admin side for the same reason the proposal
stopped being prose: an admin is writing the clause, not filling in a form.
`franchiseTerritoryGrantDraft` in `shared/franchise/onboarding/schema.ts` turns the districts into
the sentence the approve form offers behind a copy button, which is a decision rather than a default.

### Step 3 — KYC and documents

Uploads, and the metadata that says what each one is. See §9 for the storage rules, which are the
substance of this step.

| Document | Required |
|---|---|
| PAN card | yes |
| Entity proof — incorporation certificate, LLP agreement, GST certificate, or partnership deed | yes, except `unregistered` |
| Address proof for the registered address | yes |
| Signatory photo ID | yes |

**Four rows, and every one of them required.** Net worth or bank statement evidence used to sit
below them as an optional fifth, on the `background` field's argument from
`shared/validation/franchise.ts`: financial evidence is the field a serious applicant supplies and a
hesitant one abandons the form over. That argument settled the question the other way in the end.
Asking for it by hand during evaluation loses nothing, because evaluation is a conversation
regardless, and an optional row on a KYC screen still reads as a fifth demand to the person looking
at it. So the document type is gone from both repos rather than merely hidden, and a screen with no
optional row is a screen with nothing on it for a franchisee to decide about.

### Step 4 — Approval

Ours. Read-only for the franchisee, and the model is the gym flow's step 6: **no commit route, and
it must not get one.** The server completes it on read from an `APPROVAL` item, the way
`withInstallationComplete` completes step 6 from a machine's `installationDate` (backend design §5).

Three outcomes, not one:

| Outcome | What the franchisee sees | Where the flow goes |
|---|---|---|
| `approved` | the tier, the granted territory, the machine allocation | step 5 |
| `on_hold` | what we still need, and who is in touch | stays on step 4 |
| `declined` | that the application was not taken forward, and nothing else | terminal |

`declined` is the outcome the gym flow cannot express and the one worth designing for. It is
terminal: the handle stops authorising the wizard and the screen carries no retry, because "apply
again" is a commercial conversation and a button that restarts a rejected application is a promise
we did not make. It must not, however, look like an error — a `declined` franchisee reading
"something went wrong" will email support, and the answer will be worse coming from support than
from the screen.

**What the decline screen does not say is why.** The reason is recorded on the `APPROVAL` item for us
and is not sent to the client. A generated sentence explaining a commercial judgment is the kind of
text that gets quoted back, and territory availability is often the real reason and is not ours to
publish.

**Nobody lands on this step, so the granted-versus-requested comparison cannot live only here.**
Completing on read is what does it: the moment an approval arrives, `completedStepsOnRead` adds 4,
`deriveCurrentStep` returns 5, and a franchisee opening their link goes to the commercials. If we
granted three districts of five, the screen that says so is one the reader reaches only by pressing
back on the rail. So the comparison is `TerritoryCutNotice`, rendered by step 4 *and* step 5, which
is the last screen before a signature that can carry it. It renders nothing when the grant matches
the request, and step 5's copy of it offers a way back to the granted boundary.

### Step 5 — Your franchise

The commercials, read-only, acknowledged by continuing — the gym flow's step 2 exactly, including
that continuing *is* the evidence they were shown.

Everything on it reads from that franchise's own terms record, never from
`shared/franchise/program.ts`. This is gym doc's `OnboardingTerms` argument transplanted, and it
matters more here: the program document leaves the City Franchise's capital recovery threshold and
payment schedule to the definitive agreement (§21, §6), so a page that rendered the published figures
would show a Territory number to a City franchisee. `program.ts` supplies the **defaults** a new
franchise record starts from, the way `shared/partnership/summary.ts` does for `gym_terms`.

What it shows: investment, machine allocation, the payment schedule, the capital recovery threshold
and what counts toward it, the protein split before and after recovery, the advertising split, and
the one paragraph the program document's §17 and §18 exist to make unmissable — that advertising
income does not reduce the recovery balance. `recoveryExample()` already computes that illustration
and is already tested; reuse it rather than restating the arithmetic.

### Step 6 — Operations readiness

§24, §27 and §28 of the program document make a specific set of things the franchisee's obligation,
and the term sheet is going to reference them. So they get collected before it is issued rather than
discovered after.

- `warehouseAddress`, `warehouseAreaSqft`, `hasTemperatureControl`
- `operationsContactName`, `operationsContactPhone` — the person who actually refills machines,
  which is frequently not the signatory
- `deploymentPlan` — how they intend to place their allocation, and by when
- `logisticsArrangement` — own vehicle, contracted, or undecided

**"Undecided" is an allowed answer and is not a blocker.** A franchisee who has not contracted
logistics before signing is normal; one who cannot say where the protein will be stored is a §24
problem. So the warehouse fields are required and the logistics field is not.

### Step 7 — Review and sign

The term sheet on screen, then off to Leegality and back. §5 is the document and §6 is the mechanism.

### Step 8 — First instalment

Bank details, a payment reference, a UTR box, and a wait. §7.

### Step 9 — You're set up

The portal password, the signed term sheet, and what happens next — the gym flow's step 5, with one
difference worth stating: **the "what happens next" list here runs for months, not a fortnight.** OEM
procurement, machine readiness, the second instalment, delivery, deployment. Gym doc §33's rule
applies with more force at this length: a schedule says *when*, and a list of five things with no
dates against them is where a franchisee's expectation of the next quarter gets set wrong.

The second instalment is **not a step in this flow** and the record is built to carry it anyway. §7.6.

---

## 4. State, and the two freeze points

`FranchiseOnboardingState` mirrors `OnboardingState` field for field where it can. The parts that
differ:

```
type FranchiseOnboardingStep = 1|2|3|4|5|6|7|8|9;

type FranchiseOnboardingStatus =
  | "invited" | "opened"
  | "details_submitted" | "territory_submitted" | "kyc_submitted"
  | "under_review"
  | "approved" | "on_hold" | "declined"
  | "franchise_ack" | "operations_submitted"
  | "termsheet_viewed" | "esign_requested" | "signed"
  | "payment_claimed" | "payment_verified"
  | "active";
```

The ladder is forward-only, per backend design §3, with one deliberate exception: `on_hold` and
`under_review` are mutually reachable in both directions, because a hold is a state we put an
application into and take it out of. That is the only cycle, it is admin-only, and it is written down
here so nobody generalises the ladder into something that permits a client-driven one.

`declined` is terminal and absorbing. Nothing writes past it.

**`currentStep` is derived, never incremented.** The lowest step not in `completedSteps`, exactly as
the gym flow does it, and for the same reason: `+1` breaks the moment somebody re-submits an earlier
step. Steps 4 and 8 are the two that are not simply "franchisee submitted", and both are handled by
completing them on read (§7.4) rather than by making the derivation clever.

### Two freeze points, not one

The gym flow has one: `signedAt` freezes steps 1 and 2. This flow has two, and conflating them is
the mistake that is easy to make.

| Freeze | Set by | Freezes | Why |
|---|---|---|---|
| `approvedAt` | admin approval | step 2, the territory | Exclusivity attaches to the approved territory. A franchisee who could edit it after approval could silently widen what we granted |
| `signedAt` | the Leegality webhook | steps 1, 2, 3, 5, 6 | Every one of them supplies values rendered into the signed term sheet |

Both enforced server-side. The UI mirrors the window so a field is read-only exactly when the server
would refuse it — gym doc §4's `DETAILS_EDITABLE_FROM` reasoning, which exists because offering an
edit that round-trips as a refusal is worse than not offering it.

Step 1 stays editable until step 3 is submitted, on the same argument as the gym flow: the legal
entity name is the field most likely to be wrong and the most expensive to fix once a document is
hashed against it.

---

## 5. The document: a term sheet, and why not the agreement

The program document says of itself that it does not constitute a franchise agreement (§56) and
defers roughly a dozen substantive terms to the definitive agreement — the City recovery threshold,
the contractual term, governing law and jurisdiction, the arbitration provisions, the performance
SLAs, the deployment deadlines, the treatment of death and insolvency. Those are not gaps a renderer
can fill.

So the wizard issues and executes a **Franchise Term Sheet**, carrying only what the program document
actually fixes, and the definitive agreement is a **second signing event on the same machinery**.
That is not a workaround; it is precisely what gym doc §6 already established for Schedule A: *"make
the signature component and the token flow generic enough to serve all three moments. Building it
specific to the agreement means writing it twice."* This is the fourth moment, and the instruction
was written for it.

### What the term sheet binds

Tier and investment. The approved territory, verbatim from the approval record. Machine allocation,
and that the machines remain MuscleBox Pro property (§8 — the single most important thing for a
franchisee to have signed, because it is the one most likely to be misremembered). The payment
schedule. The capital recovery model and its threshold. The protein and advertising splits, before
and after recovery. Product and pricing control. The operational responsibilities from §28,
including that they cannot be delegated to the gym. Confidentiality. That the definitive agreement
follows and prevails.

### What it says about itself

That it is binding as to the commercial terms it states, that it is subject to execution of the
definitive franchise agreement, and that in any conflict the definitive agreement prevails. The
program document's §56 already says the last part; the term sheet has to say it in the first person.

### Reuse, and the one change to shared code

`shared/agreement/types.ts` and `render.ts` are reused **unchanged in behaviour**: the `Block` model,
the `{{token}}` substitution, the `todo` block with its `blocks-send` severity, `renderPlainText`,
`sha256Hex`. That is a tested renderer with a pinned golden vector, and rebuilding it for a second
document is how the two renderings drift.

One change is needed. `lookup()` and `renderText()` are typed against `AgreementFields`, which is
gym-shaped (`machineModel`, `securityDeposit`, `installationDate`). The term sheet's fields are a
different set. Make the renderer generic over its field record:

```ts
export function renderText<F extends object>(
  template: string, fields: Partial<F>, options?: RenderOptions
): string
```

`lookup` already walks dotted paths against an unknown object and already returns only strings, so
this is a signature change, not a logic change. The gym golden vector test is what makes it safe —
if the refactor alters a single byte of v2.3's rendering, `agreement-v2-3.test.ts` fails on the
pinned hash. Do the refactor first, watch that test stay green, then add the second document.

New files, mirroring the gym set:

| File | What it is |
|---|---|
| `shared/franchise/termsheet/types.ts` | `FranchiseTermSheetFields` |
| `shared/franchise/termsheet/v1.ts` | the document, as `Agreement` data |
| `shared/franchise/termsheet/fields.ts` | `FranchiseOnboardingState` → fields |
| `shared/franchise/termsheet/goldenVector.ts` | fixed fields → pinned hash and length |

**Rule 1 from `shared/agreement/types.ts` applies from the first commit: never edit a version that
has signatures against it.** Add a version.

---

## 6. Signing through Leegality

This is the section with the most new machinery in it, and the reason is that a provider-affixed
signature inverts the gym flow's central invariant.

**Leegality is the chosen provider** for all three signature paths: ordinary electronic signing,
Aadhaar eSign, and e-stamping (stamping in the franchise flow only). Everything below the capability
list was read from `knowledge.leegality.com` on 2026-09-02 and encoded in
`services/onboarding/src/providers/leegality.ts` with a test per surprise. Nothing has yet run
against the sandbox, so the shapes are documented rather than proven, and the module's header says so
in the same words.

### 6.1 What the gym flow's hash discipline was protecting, and what changes

The gym rule is: the server renders the plain text, hashes it, stores the hash at issuance, re-renders
at signing and compares. The client never computes the hash that gets stored (`shared/onboarding/
types.ts` on `IssuedAgreement` is emphatic about this, and gym doc §21 and §22 record two bugs that
came from getting it wrong).

Under Leegality, the artifact that carries legal weight is a **PDF**, and the last version of it is
produced by Leegality, not by us. The plain-text hash no longer answers "what was signed". It still
answers something worth keeping, so we end up with three hashes, each with one job:

| Hash | Computed by | Answers |
|---|---|---|
| `contentHash` — SHA-256 of the plain-text rendering | us, at issuance | is the document on screen the document on the record? Catches a re-priced term sheet between reader load and sign, exactly as it does for gyms |
| `pdfHash` — SHA-256 of the PDF bytes we hand Leegality | us, at issuance | is the file Leegality signed the file we generated? |
| `signedPdfHash` — SHA-256 of the PDF Leegality returns | us, on webhook | what exactly is in our custody as the executed document? |

All three are stored. `pdfHash` is the one that makes the other two meaningful: without it there is
no link between the text we rendered and the file that came back signed, and the chain from "these
commercials" to "this executed PDF" has a gap in the middle where the interesting failure lives.

### 6.2 We now need a PDF renderer, and we did not before

Gym doc's §8 in the backend design lists "agreement PDF generation" as out of scope. It is in scope
here — Leegality signs a file, so a file must exist.

Recommendation: **`pdf-lib`, in the Lambda, from the `Agreement` block tree.** Pure JavaScript, no
native binaries, no headless browser, and it bundles into a Lambda without a layer. The alternative
worth naming and rejecting is HTML-to-PDF via headless Chromium: better typography, and it puts a
120 MB browser and a rendering engine whose output changes between versions inside the path of a
document we are about to hash. A hash over bytes that shift when a font substitutes differently is a
hash that stops verifying for reasons nobody can reproduce.

One renderer, in the backend, per the same one-renderer-not-two rule as §2.9 of the backend design.
The React reader in step 7 walks the same `Agreement` tree for display and does not generate a PDF.

**Written to be shared with the gym flow, not franchise-specific.** The franchise flow is where
Leegality lands first, because none of it is deployed and so nothing live is at risk. The gym flow
keeps its typed-name signature for now and moves to Leegality as a second phase, and it will want the
same renderer over its own `Agreement` tree. A renderer that takes a block tree and returns bytes is
that; one that takes a `FranchiseTermSheet` is a rewrite later.

The file also has a size ceiling worth knowing before it is a support ticket: Leegality accepts the
PDF as **base64 inside the JSON body, up to 15 MB**. A term sheet is nowhere near that, and an
executed definitive agreement with scanned annexures could be.

**The PDF must be deterministic.** No timestamp in the document metadata, no creation date, no
producer string that carries a library version. `pdf-lib` writes a `CreationDate` by default; set it
explicitly to the term sheet's `effectiveDate` and set `Producer` to a fixed string. Otherwise
`pdfHash` changes every time the same document is generated and answers nothing. This is the single
easiest thing on this list to get wrong and the hardest to notice, because everything works — the
hashes just stop matching each other a week later.

### 6.3 The provider seam

`services/onboarding/src/providers/leegality.ts`, over plain `fetch`, no SDK — the pattern
`razorpayLinks.ts` already sets. It exists, with 59 tests. No route calls it yet.

```
interface EsignProvider {
  createRequest(input: CreateEsignInput): Promise<CreatedEsign>;
  getDocument(providerDocumentId: string): Promise<EsignDocumentState>;
  download(providerDocumentId: string, type: "DOCUMENT" | "AUDIT_TRAIL"): Promise<Uint8Array>;
  findByIrn(irn: string): Promise<{ providerDocumentId: string; providerStatus: string } | null>;
}
```

An interface with one implementation, for the reason `OnboardingApi` was one before the backend
existed: it is what makes a mock possible, and the mock is what lets the nine-step wizard be walked
end to end by anyone without Leegality credentials.

Two of those four methods are not in the shape this section originally guessed at, and each is there
for a reason the API forced:

- **`findByIrn`, not `parseWebhook`.** Webhook parsing moved to a free function because the webhook
  body is not evidence (§6.4). `findByIrn` is new because **Leegality's create endpoint has no
  idempotency key.** The reference we send (`irn`) is searchable but not deduplicated: the only error
  it can return is `irn.length.invalid`, so a create we did not hear the answer to, retried, produces
  a *second real document with a second live signing URL in the same person's name*. Recovery is to
  search for the reference, never to try again. This is `isDuplicateReference` → re-read by reference
  in `razorpayLinks.ts`, with the difference that Razorpay refuses the duplicate for us and Leegality
  does not.
- **`getDocument`, not `getStatus`.** The status alone cannot answer whether the document was
  refused, because rejection is a property of the *invitation*, not the document: a document whose
  only signer declined still reads `SENT`. So the seam returns the invitees too, and
  `toEsignStatus(providerStatus, invitees)` derives ours from both.

| Capability | Shape, read from the vendor's docs on 2026-09-02 |
|---|---|
| Auth | `X-Auth-Token: <token>`. **Not** `Authorization: Bearer`, which selects the v4 API, and sending both fails |
| Environments | separated by **host**: sandbox `https://sandbox.leegality.com`, prod `https://app1.leegality.com`. Separate auth token *and* separate private salt per environment |
| Create | `POST /api/v3.0/sign/request` — `profileId`, `file: { name, file: <base64 PDF> }`, `invitees[]`, `irn`, and the stamp fields when stamping |
| Status | `GET /api/v3.3/document/details?documentId=…`, plus ~100 opt-in boolean query params for anything beyond `id`/`name`/`irn`/`status` |
| Download | `GET /api/v3.3/document/fetchDocument?documentId=…&documentDownloadType=DOCUMENT\|AUDIT_TRAIL` returns a **CDN URL that expires in 15 seconds** |
| Recovery search | `GET /api/v3.0/sign/request/list?q=…` — matches name, documentId *and* irn, so the caller must filter on exact `irn` |
| Signing handoff | `signUrl` per invitee in the create response |
| Sign types | `AADHAAR`, `VIRTUAL_SIGN` (OTP to email or phone), `DSC`, and others. **Not a field on the create request** |
| Webhook | dashboard config per invitee, `mac` = HMAC-SHA1 over `documentId` alone |

Five of those need spelling out, because each is a place where the obvious-looking implementation is
wrong:

**There is no `signType` field.** Sign type is workflow configuration, not a request parameter, which
means **two sign types are two Leegality workflows** and our `signType` selects a `profileId`. That is
why the credentials include `leegality/workflow-ids` as one JSON parameter (§8.1) rather than one
parameter per type: split apart, "Aadhaar points at last month's workflow while electronic points at
this month's" is reachable one `put-parameter` at a time. `resolveWorkflowId` refuses rather than
falling back to whichever id happens to be configured.

**`"electronic"` maps to Virtual Sign, never Quick Sign.** Virtual Sign verifies the signatory with an
OTP. Quick Sign is three clicks with no OTP at all, which would reproduce the weakness the gym flow's
typed name already has while looking, on the same screen, like a provider-backed signature.

**Failures arrive as HTTP 200.** The body is `{ status, data, messages }`, and a refusal is
`status: 0` with codes in `messages[]`. Warnings arrive *inside* a success — `status: 1` carrying
`workflow.stamp.warning` is how an unstamped document comes back looking fine. So `createRequest`
returns its warnings, and the caller is expected to record them: a silently unstamped agreement is
exactly the failure that is invisible until it matters. Switch on `status` and `messages[].code`,
never on message text; the vendor's own sample shows `status: 0` beside a success-sounding message.

**Document status is at `data.document.status`.** Not `data.status`, which is `undefined`. Reading the
wrong one maps a completed document to `requested`, and a signed term sheet shows as pending forever.
This was written the wrong way first and caught against the vendor's sample response, which is why
there is a test named after it.

**Timestamps are `DD-MM-YYYY HH:MM:SS` with no timezone**, day-first, and they are IST. The one ISO
example in the docs is a docs inconsistency. `parseLeegalityTimestamp` round-trips the date before
trusting it, because `Date.UTC` rolls `31-02` into March rather than rejecting it. And
**`expiryDate: null` means 45 minutes, not never.**

One more, on vocabulary. Leegality has **four names for one idea**: the details endpoint returns
`DRAFT|SENT|COMPLETED`, the list endpoint adds `RECEIVED|SIGNED|EXPIRED`, the webhook sends title-case
`Draft|Sent|Completed`, and the verification block is called `nameVerification`/`titleVerification` in
one response and `name`/`title` in the other. All four are normalised once, in the provider, into the
`EsignStatus` this document already uses. A caller reading `verification.name` off a raw details
response gets `undefined` and records "no mismatch" for a signature that had one.

Confirm each of these against the sandbox and correct this table in place, along with the provider
module's header, which carries the same date and the same caveat.

### 6.4 The webhook is the only thing that may mark it signed

Verbatim the deposit rule from gym doc §5, and it transfers without amendment: *"polls our own
record, never a client callback."*

The heading is about **who is allowed to assert it**, not about which request happens to arrive first.
The webhook and the reconciler §6.4b makes mandatory are both the server reading the provider, and they
take the same conditional write; a franchisee's browser takes neither, on any path, ever.

- `POST /webhook/leegality/esign` verifies the `mac` before parsing anything else. Leegality's
  dashboard configures a **second** URL for failures, so this is two routes or one route with a flag,
  and the error webhook is the only place a "signature attempt failed" ever arrives
- **Then re-fetches from the details API and writes what that says, not what the body said.** This is
  a departure from the Razorpay webhook, and §6.4a is the reason
- The write is **conditional on `signedAt is null`**, so a redelivered webhook cannot produce a
  second signature record. Leegality, like every webhook sender, will redeliver
- A cheap idempotency marker, `ESIGNEVENT#<documentId>#<STATUS>`, short-circuits the common
  redelivery. It is *coarser* than one row per event, because Leegality's webhook carries no event id
  to key on — so unlike `RZPPAY#<paymentId>` it is an optimisation, and the conditional write above is
  the actual safety property. `esignEventPk` in `domain/ids.ts` says so where somebody would otherwise
  read the marker as sufficient
- The return redirect from Leegality sets **nothing**. It lands on `/franchise/esign-return`, which
  re-reads our own record and shows what our record says

`client/src/lib/depositReturn.ts` and gym doc §25 and §26 are the pattern for the return trip,
including the part that took two attempts to get right for deposits: the tab comes back, polls, and
shows an outcome without a button in between. The two-cadence poll — fast for a few seconds, slow as
a safety net — is already written and already reasoned about. Reuse it.

**One thing not to copy from the deposit flow:** the deposit link is forwardable by design, because
the signatory frequently is not the payer. A signing link is the opposite. It authorises an Aadhaar
eSign in a named person's identity, and it must not be treated as forwardable — the URL is generated
per request, expires in 45 minutes when Leegality reports no expiry at all, and the screen must not
invite anyone to send it on.

### 6.4a The MAC covers one field, so the body is a notification and not evidence

`mac` is **HMAC-SHA1 of `documentId` alone**, keyed with the environment's private salt. Everything
else in the body — the status, the signer's name, the verification results, the timestamps — is
outside the signature. Two consequences, both of which the handler has to be built around rather than
noticing later:

1. **A valid MAC proves only that somebody knows the id and the salt.** It does not authenticate a
   single claim in the payload. So the handler treats the webhook as "document `X` changed, go look",
   verifies the MAC, and then reads the truth from `getDocument`. The payload never carries the signed
   PDF or the audit trail anyway, so a fetch was always required; this makes it the only source.
2. **It is a permanent replay token.** No timestamp, no nonce, so the same body replays forever. The
   conditional write is what makes that harmless, which is the second reason it is the real guard and
   not the marker.

The proper compensation is Leegality's **Custom Webhook Headers**, which are not self-serve: they
require emailing support@leegality.com, receiving a **Webhook Profile ID**, and entering it per invitee
under "Add custom URLs and webhooks". Worth requesting before this goes to production. Until then a
shared-secret query parameter on the webhook URL is the available substitute, and it is weaker than it
looks because the URL is stored in a vendor dashboard.

### 6.4b Three retries, so a poller is not optional

Leegality retries a failed webhook **three times — immediately, at +1 hour, at +3 hours — and then
gives up permanently.** Razorpay's retries run for a day. Three attempts against a Lambda cold start,
a throttle, or a deploy window is a franchise agreement that is signed at Leegality and unsigned in our
record, with nothing left to correct it.

So the reconciler is a correctness requirement here, not a safety net: a scheduled sweep over
`ESIGN#` rows still in `requested`, calling `getDocument` on each, taking the same conditional-write
path as the webhook. The webhook makes it fast; the poller makes it true.

Two more operational facts that belong here because they are invisible in code:

- **Webhook and return URLs cannot be set through the API.** They are dashboard configuration, per
  invitee, at Webhook Version **v2.5**, with a separate **Error Webhook URL** beside the success one.
  They freeze onto the document when it is sent, so changing them does not affect documents already
  out. `ESIGN_RETURN_PATH` in `client/src/lib/esignReturn.ts` is a value somebody types into that
  dashboard, and a mismatch is a franchisee landing on a 404 after signing, which no test on either
  side can catch.
- **Localhost can never receive one.** Local development sees the poller path, not the webhook path,
  which is an argument for the two sharing one function rather than being written twice.

### 6.5 Identity, and what we are entitled to store

Aadhaar eSign binds a signature to an Aadhaar identity. We pass Leegality the signer's name, email and
phone; Leegality runs the OTP against UIDAI and returns a signing certificate.

**Store the last four digits of the Aadhaar number and nothing more.** Not the full number, not the
XML, not the e-KYC response. The full number is a regulated identifier with storage obligations we
have no reason to take on, the last four is enough to answer "which identity did we ask to sign", and
Leegality holds the audit trail that is the actual evidence. The audit trail is also downloadable and
should be stored alongside the signed PDF, in the same bucket, under the same access rules (§9).

**Revision, 2026-09-02: the last four digits now leave our record, and that is an improvement.** This
section previously said `signatoryAadhaarLast4` was "collected for reconciliation, not for
verification" and "never leaves our record". Leegality's `aadhaarConfig` reverses that. It accepts
per-request checks the provider enforces against the signing certificate itself:

| `aadhaarConfig` field | Checked against |
|---|---|
| `verifyName`, `verifySmartName` | the name on the Aadhaar record, exact and fuzzy |
| **`verifyTitle`** | **the last four digits of the Aadhaar UID** |
| `verifyPincode`, `verifyState`, `verifyYob`, `verifyGender` | the corresponding certificate fields |

Sending `verifyTitle` turns a bookkeeping note into an actual control: the person who completes the
OTP must hold the Aadhaar number the authorised signatory declared in step 1, not merely *an* Aadhaar
number. Without it, any Aadhaar holder with the link can sign as the signatory, and our four digits sit
in the record proving nothing. That is the field worth sending, and `SignerIdentity.aadhaarLast4`
carries it.

Two constraints on it:

- Leegality calls the same value `title` on the way back, in `certificateData` — so the field that
  arrives is not named after what it contains. `certificateData` also exposes `uid`, which we do
  **not** request; the details endpoint requires a separate opt-in parameter for it, and there is a
  test asserting we never ask.
- **Whether a mismatch hard-fails or soft-fails is a dashboard setting**, under Department →
  eSignature, not an API parameter. No code on our side can read it or assert on it. It has to be set
  to hard-fail by hand and recorded in the runbook, because a soft-fail configuration makes
  `verifyTitle` a note in a report rather than a control, and everything above stops being true without
  a single line changing.

### 6.6 Stamp duty, named rather than assumed

A definitive franchise agreement in India attracts state stamp duty, and Leegality can e-stamp. A term
sheet's position depends on the state and on how binding its language is, and it is a question for
counsel, not for this document.

**The decision taken: e-stamp the definitive agreement, and sign the term sheet unstamped.** The seam
carries stamping either way — `createRequest` takes an optional `{ seriesGroup, valueRupees }`, and
turning it on for the term sheet later is a config change, not a redesign — but it is switched off
there, for an operational reason rather than a legal one:

**Stamp inventory is pre-purchased per state.** A series is bought for a state before it can be drawn
on, an empty series **fails the request**, and a term sheet is issued the moment a territory is granted
in whichever state that turns out to be. Turning stamping on for the term sheet would mean holding
paid-up inventory in every state we might grant, and the failure when we did not is not a warning on a
report — it is a franchisee at step 7 who cannot sign. The definitive agreement is negotiated with a
known state and a known date, which is when buying a series is a task somebody can actually do.

The mechanics, for whoever executes that agreement:

- Stamping must happen **before** signing. The stamp becomes part of the PDF and therefore part of
  `pdfHash`, which is the ordering §6.1 depends on.
- Value-based stamping is a **Stamp Group**: `seriesGroup` plus `stampValue`, with Leegality choosing
  the denominations. Naming explicit series instead means all of them share one state, at most 15, each
  with quantity 1 to 99.
- Revenue stamps are state-agnostic at ₹1 each, which is a different instrument from stamp duty and
  not a substitute for it.
- An unstamped document can come back looking successful. `workflow.stamp.warning` arrives inside
  `status: 1` (§6.3), so the handler must record `CreatedEsign.warnings` rather than discarding them on
  the success path.

### 6.7 What does not change: the CSP

Leegality is a **redirect**, not an embedded widget. `next.config.mjs` sets `frame-src 'none'`
site-wide, and gym doc §5's second reason for choosing Payment Links over an in-page checkout applies
unaltered: a redirect needs no CSP change at all, and `form-action 'self'` does not restrict the trip
back.

Leegality also ships an embeddable signing experience. **Do not use it.** It would require `frame-src`
and `script-src` entries site-wide, on every page, for one screen in one flow — which is the exact
trade gym doc §5 already refused once.

---

## 7. The first instalment

### 7.1 No gateway on this path

₹12,50,000 through Razorpay is roughly ₹25,000 in fees per instalment, twice per Territory franchise,
and Payment Links are not built for that ticket — per-link caps need raising by hand and the
franchisee's own bank will likely intervene. Franchise investments are paid by RTGS. So this flow
shows bank details and verifies a transfer.

The consequence worth stating plainly: **no code on this path moves money, and none of it can.** No
gateway credentials, no webhook that can mark a payment received, no refund capability. That is the
same property backend design §11.4 claims for offboarding, and it is the strongest thing that can be
said about a screen handling ₹12.5 lakh.

### 7.2 The payment reference is the whole mechanism

The screen shows our account details and a **payment reference** derived deterministically from the
franchise id — something like `MBPF-<8 chars>` — with the instruction to put it in the transfer
narration.

That reference is what turns reconciliation from a judgment into a lookup. Without it, a bank
statement line reading `RTGS 1250000 SHARMA ENTERPRISES` has to be matched by name against a list of
franchisees, and the failure mode is quiet: two similarly-named applicants, and a payment credited to
the wrong franchise. Derived rather than random so it can be recomputed from the id and never needs
its own row.

### 7.3 What the franchisee submits, and what we record

The franchisee submits a **claim**: UTR, amount, date, and optionally a screenshot of the transfer
(§9's upload path). That claim is stored as a claim. It advances `status` to `payment_claimed` and it
does **not** complete step 8.

An admin verifies against the bank statement and records `receivedPaise` — **the amount in our
account, not the amount the franchisee typed.** This is `RZPPAY#`'s discipline from backend design §5,
where the webhook marker is the only record of what the gateway actually captured, applied to a human
verifier.

`expectedPaise` and `receivedPaise` are separate fields because under- and over-payment must be
representable. A franchisee whose bank deducted charges sends ₹12,49,500, and a record that stored
one number would either reject a real payment or record a full one. Whether a shortfall blocks
progression is a commercial call per franchise; the record's job is to make the shortfall visible.

Rejection is an outcome too — a UTR that does not exist, or a transfer that never arrived — and it
returns the franchisee to the claim form with what we could not find. It does not move the status
backwards; `payment_claimed` stays and a `verification` sub-state carries the refusal, because a
ladder that can go backwards is a ladder a bug can walk down.

### 7.4 Two-party steps, as a rule

Step 8 is the flow's only step where both parties act, and it is worth stating as a general rule
because step 4 is a degenerate case of it and a future procurement step will be another.

> A step is complete when the **server's own record** says so. A franchisee's submission may set a
> status and may store a claim. It may never complete a step whose completion is our assertion.

Concretely: `completedSteps` gains 8 when a `PAYMENT#1` item has `verifiedAt`, computed on read the
way `withInstallationComplete` computes step 6. There is no commit route that completes step 8, in
the same way there is no commit route for step 4. If someone later adds one, this whole section stops
being true.

### 7.5 What the franchisee sees while waiting

Bank verification is not instant and is not automated, so the screen has to be honest about a wait
measured in working hours rather than seconds. It says the claim was received, quotes the UTR back,
says what happens next and roughly when, and offers no refresh button that implies a poll would help.
Gym doc §28's pending-card trimming is the precedent: a card about waiting should not be busy.

### 7.6 The second instalment is out of scope, and the record is not

The ₹12,50,000 due at OEM machine readiness is weeks or months after signing, and it is not a step in
this flow. But the storage is `PAYMENT#<n>` from the first commit, not `PAYMENT#1`, and
`paymentSchedule` in the terms record already carries both instalments as percentages
(`shared/franchise/program.ts` stores them that way so a change to `investmentInr` cannot leave a
stale instalment behind).

So the second instalment, when it is built, is a step and a screen — not a migration. Same for
procurement tracking. Writing `PAYMENT#1` today would guarantee a migration; the cost of the `<n>` is
nothing.

---

## 8. Backend surface

### 8.1 One stack, one new table

**Extend `services/onboarding`. Do not create a fourth stack.**

This trades against this repo's rule that one stack per service is deliberate, so here is the
argument. That rule's stated purpose, quoted in backend design §1, is that *"a mistake in an admin
login handler cannot take a vending machine offline"* — it separates **payments** from everything
else, and it still does. Franchise onboarding shares the admin identity store, the admin session
secret, the session and cookie modules, `lib/route.ts`, `providers/ses.ts` and the whole `auth/`
directory with gym onboarding. A separate stack would need either its own admin table, meaning two
places to create an admin, or a shared session secret across stacks, which is the coupling the rule
exists to prevent. Splitting buys nothing and costs a shared secret.

**A separate table, though.** `mbp-franchises-<env>`, composite `pk`/`sk`, matching the existing
single-table design. A franchise bug cannot corrupt a gym's onboarding row, PITR and retention are
set independently, and the GSI design does not have to accommodate two unrelated access patterns on
one partition space.

Separate SSM SecureStrings for the Leegality credentials, per the §7.1 bounding-rotation argument:

```
/mbp/<env>/onboarding/leegality/auth-token
/mbp/<env>/onboarding/leegality/private-salt
/mbp/<env>/onboarding/leegality/workflow-ids
```

All three are in `onboardingSsmPaths` and **granted to no role**, in any of the four stacks, with a
test in each asserting the synthesized template never names them. The stacks share one path list
because a franchise Lambda and an onboarding Lambda would otherwise drift; sharing the list is not
sharing the grant.

Three things differ from the Razorpay precedent, and each is a decision rather than an oversight:

- **There is no cold-start prefix assertion, because there is nothing to assert on.** Leegality's
  auth token carries no environment marker the way a Razorpay key's `rzp_test_` prefix does; the
  environments are separated by **host**. So `providers/leegality.ts` takes `baseUrl` as a required
  field with no default, and pairing the right host to the right token is a runbook step rather than a
  check the code can make. A sandbox token reachable from a prod role is a franchise agreement that
  looks executed and is not.
- **`private-salt` is a much weaker secret than its Razorpay counterpart**, because the MAC it keys
  covers only `documentId` (§6.4a). It authenticates the webhook's *existence*, not its contents.
- **`workflow-ids` is one JSON parameter, not one per sign type.** Sign type is workflow
  configuration at Leegality (§6.3), so each type needs its own workflow id, and the ids have to
  change *together* — the `franchiseBankAccount` argument. Split across parameters, "Aadhaar points at
  last month's workflow while electronic points at this month's" is reachable one `put-parameter` at a
  time, and both halves would look fine in the console.

**One stack does not fit, and this is the blocker (found 2026-08-31).** The argument above is about
identity and secrets, and it still holds. The resource budget defeats it anyway. `services/onboarding`
synthesizes 484 resources in sandbox and 482 in prod against CloudFormation's hard limit of 500; the
first five admin routes cost 47. `aws-cdk-lib` throws `TooManyResourcesInStack` at synth, so this is
not a deploy that gets rejected, it is a stack that cannot be built. Measured alternatives: moving the
Lambdas to a nested stack still leaves 22 in the parent, one Lambda behind all five methods is 27, and
`stackResourceLimit` is a CDK knob rather than a CloudFormation one, so raising it converts a synth
error into a rollback. The routes need their **own `RestApi`**, which collides with the admin cookie
being host-scoped with no `Domain` attribute (`src/auth/cookie.ts`), and a base-path mapping that
exists only in prod. Open question 10.

The table, its three GSIs and the documents bucket are in the stack and synthesize. Only the five
admin routes are unroutable, and `UNROUTED_HANDLERS` names them so a sixth added silently fails the
suite.

### 8.2 Items

| pk | sk | Holds |
|---|---|---|
| `FRANCHISE#<id>` | `PROFILE` | legal entity, entity type, PAN, GSTIN, CIN/LLPIN, `slug` (stored, not derived), addresses, signatory, notices, status |
| `FRANCHISE#<id>` | `TERMS` | tier, `investmentPaise`, machine allocation, payment schedule, recovery threshold paise, protein and advertising splits |
| `FRANCHISE#<id>` | `ONBOARDING` | derived step, `completedSteps`, `drafts`, status, one timestamp per transition, first-open IP and UA |
| `FRANCHISE#<id>` | `TERRITORY` | proposed *and* approved, separately (§3) |
| `FRANCHISE#<id>` | `APPROVAL` | decision, `approvedAt`, internal reason, who decided |
| `FRANCHISE#<id>` | `OPERATIONS` | warehouse, contacts, deployment plan |
| `FRANCHISE#<id>` | `DOCUMENT#<docId>` | doc type, S3 key, size, content type, `uploadedAt`, `sha256` |
| `FRANCHISE#<id>` | `TERMSHEET#<version>` | field values, `effectiveDate`, `contentHash`, `length`, `pdfHash`, S3 key, pinned/viewed timestamps |
| `FRANCHISE#<id>` | `ESIGN#<providerDocumentId>` | provider, sign type, requested/completed timestamps, signer identity, `signedPdfHash`, signed-PDF and audit-trail S3 keys |
| `FRANCHISE#<id>` | `PAYMENT#<n>` | `expectedPaise`, the claim (UTR, amount, date), `receivedPaise`, `verifiedAt`, who verified, refusal |
| `FRANCHISEUSER#<emailLower>` | `PROFILE` | scrypt hash, `franchiseId`, role, status |
| `TOKEN#<sha256(handle)>` | `META` | keyed on the **hash**, never the handle. `franchiseId`, `typ`, `invitedByName`, revocation markers |
| `ESIGNEVENT#<documentId>#<STATUS>` | `META` | webhook redelivery short-circuit, not the safety property (§6.4) |
| `FRANCHISEAPP#<applicationId>` | `META` | the existing public applications, plus the status the queue in §8.4 needs |

GSIs: a list index for the admin table (constant partition, `createdAt` sort — with the same
explicitly-stated scale bound as `gsi4-gymlist`, and franchise counts are lower still), a sparse
review-queue index carrying only applications and franchises awaiting a decision, and a sparse
payment-verification-queue index whose keys are **removed** on verify so the index holds outstanding
work rather than lifetime volume. `REMOVE`, never a stored `null` — writing null to an indexed key
attribute fails the whole write.

### 8.3 The wizard's routes

Handle-authenticated. `auth/require.ts` gains `requireFranchiseHandle`, and the reason it is a new
wrapper rather than a parameter on the existing one is backend design §6's: a handler that forgets
its authorisation check should not compile, and it does not compile because the wrapper is what
supplies the typed `franchiseId` the body needs. A `requireHandle` that could return either kind of
id would compile in both directions.

| Step | Route | Note |
|---|---|---|
| all | `GET /franchise/onboarding` | the whole state in one response. Records first open |
| all | `PUT /franchise/onboarding/draft` | never touches `completedSteps` or `status` |
| 1 | `POST /franchise/onboarding/details` | refused once step 3 is submitted |
| 2 | `POST /franchise/onboarding/territory` | refused once approved |
| 3 | `POST /franchise/onboarding/documents/upload-url` | presigned PUT, key chosen by us (§9) |
| 3 | `POST /franchise/onboarding/kyc` | commits the metadata once uploads are in |
| 4 | — | **no route.** Completed on read from `APPROVAL` |
| 5 | `POST /franchise/onboarding/ack` | |
| 6 | `POST /franchise/onboarding/operations` | |
| 7a | `POST /franchise/onboarding/termsheet/view` | pins the version, renders text and PDF, stores `contentHash`, `length`, `pdfHash` |
| 7b | `POST /franchise/onboarding/esign` | creates the Leegality request, returns a signing URL. Idempotent on **our** side, because Leegality's create is not (§6.3) |
| 7b | `GET /franchise/onboarding/esign/status` | reads **our** record |
| 8 | `GET /franchise/onboarding/payment` | bank details, reference, expected amount, state |
| 8 | `POST /franchise/onboarding/payment/claim` | the UTR claim. Does not complete the step |
| 9 | `POST /franchise/account` | creates the login, sets the session cookie |

### 8.4 Admin routes

| Route | Purpose |
|---|---|
| `GET /admin/franchise-applications` | **the missing queue** (§2). Newest first, filterable by status |
| `PATCH /admin/franchise-applications/{id}` | triage: mark reviewed, rejected, or converted |
| `POST /admin/franchises` | create from an application and mint the onboarding link |
| `GET /admin/franchises` | the list |
| `GET /admin/franchises/{id}` | one in full: profile, terms, territory, KYC, term sheet, e-sign, payments |
| `POST` / `DELETE /admin/franchises/{id}/invite` | resend, superseding the previous handle; and void |
| `PATCH /admin/franchises/{id}/terms` | **refused once signed** |
| `POST /admin/franchises/{id}/approval` | approve, hold or decline, and record the **granted** territory |
| `POST /admin/franchises/{id}/payments/{n}/verify` | records `receivedPaise`. The write that completes step 8 |
| `GET /admin/franchises/{id}/documents/{docId}/url` | short-lived presigned GET (§9) |
| `POST /admin/franchises/{id}/activate` | `payment_verified` → `active`. The only route that ends onboarding |

`onboardingBaseUrl` builds the invite URL, and the reason it is config rather than a request field is
verbatim backend design §7's: a base URL from an admin's request body lets a compromised admin client
mint a real handle pointing at a host we do not own.

### 8.5 Modules

```
services/onboarding/src/
  domain/
    franchise/
      termsheet/        the Agreement tree, renderer port, fields, golden vector (§5)
      status.ts         the forward-only ladder, the on_hold cycle, derived step, reachability
      details.ts        PAN shape + entity-type character, CIN/LLPIN, addresses → fieldErrors
      territory.ts      what a territory submission must contain
      approval.ts       the three outcomes, and what each permits next
      payment.ts        the claim, the verification, expected vs received
      documents.ts      allowed types, size bounds, key construction
      pdf.ts            Agreement tree → deterministic PDF bytes (§6.2)
  providers/
    leegality.ts        EsignProvider over fetch. One implementation, mockable (§6.3)
  repo/
    franchises.ts franchiseOnboarding.ts franchiseTermsheets.ts franchiseEsign.ts
    franchisePayments.ts franchiseDocuments.ts franchiseUsers.ts
  handlers/             one Lambda per route
```

`domain/` stays pure and takes `now` as a parameter. Every guard here is time-dependent — handle TTL,
signing-request expiry, session expiry — and a test belongs on the boundary rather than sleeping
through it.

Five properties get their own tests because these are the ones that fail silently:

1. the **term sheet golden vector** — fixed fields → pinned `contentHash` and `length`;
2. **the PDF is byte-identical across two generations** from the same fields (§6.2);
3. a franchise handle is refused by every gym verifier, and the reverse;
4. `PUT /franchise/onboarding/draft` cannot advance `completedSteps` or `status`;
5. neither `POST …/payment/claim` nor any franchisee route can complete step 4 or step 8.

---

## 9. Documents and the bucket

New, and there is precedent in the stack: `InvestorAssetsBucket` is already there, private, blocked
from public access, SSE, read by exactly one Lambda for exactly one key. This bucket is the opposite
direction of traffic and needs stricter rules.

`mbp-franchise-docs-<env>`: block all public access, SSE, **versioning on**, `RemovalPolicy.RETAIN`
in prod, no lifecycle expiry. Key shape `franchise/<franchiseId>/<docType>/<uuid>.<ext>`.

**The key is ours, never the client's.** `POST …/documents/upload-url` derives the whole key from the
authenticated `franchiseId` and a server-generated uuid. A client-supplied key or filename component
is a path-traversal write into another franchise's prefix.

The presigned PUT is bounded on **content type and length** in the policy itself, not checked after
the fact: PDF, JPEG or PNG, and a few megabytes. An unbounded presigned PUT is an open upload
endpoint for as long as it is valid.

**Two things outside the handler have to be right before a browser can spend that URL**, and both
fail in ways that say nothing about themselves. The bucket's CORS rule must name the frontend's
origin — it does, built from the same `allowedOrigins` the API's allow-list uses. And the frontend's
`connect-src` must name the bucket, which is `NEXT_PUBLIC_MBP_FRANCHISE_DOCS_ORIGIN` in
`next.config.mjs`. That variable is needed **in production too**, unlike the three API URLs beside
it: the bytes bypassing our Lambdas is the design, so there is no version of this upload that goes
through `api.muscleboxpro.com`. Without it the presign succeeds and the PUT never leaves the browser.

### The franchisee can write but never read

This is the rule worth arguing for. A franchisee uploads a PAN card and then sees "PAN card,
uploaded, 2.1 MB, today" — a filename and a timestamp. **Not a link.**

The onboarding handle travels in a URL. It is in browser history, in a forwarded email, in a
screenshot, possibly in a support ticket. A handle that authorises reading someone's identity
documents has a blast radius the same handle authorising a nine-step form does not. Nothing in the
flow requires a franchisee to re-read what they uploaded; showing that it arrived is the whole
requirement. Admin reads via `GET /admin/franchises/{id}/documents/{docId}/url`, behind the admin
session, presigned for minutes.

### Two gaps, named rather than left implied

**No virus scanning.** Uploads are attacker-controlled files stored in our bucket and later opened on
an admin's laptop. The fix is a scan on `ObjectCreated` with a quarantine prefix, and it is not in
this plan. If it stays unbuilt, admins must be told the bucket is untrusted input.

**No DPDP retention policy.** These are identity documents of identifiable people, and there is no
answer here for how long we keep a declined applicant's PAN card. Versioning-on plus
`RETAIN`-in-prod means the default is forever, which is the wrong default and is chosen here only
because losing evidence during a live onboarding is the worse failure. It needs a real answer before
prod, and the mechanism is a lifecycle rule keyed on the decline date.

---

## 10. Frontend

Front end first, mock second, per gym doc §8. The contract is defined now and the wizard talks to
nothing else.

| File | What it is |
|---|---|
| `shared/franchise/onboarding/types.ts` | `FranchiseOnboardingState`, `FranchiseOnboardingApi`, error codes |
| `shared/franchise/onboarding/steps.ts` | `STEP_META` with a `phase` per step, plus the phase list |
| `shared/franchise/onboarding/schema.ts` | zod, shared by the forms, the mock and the handlers |
| `shared/franchise/onboarding/mockApi.ts` | the state machine — the ladder, both freeze points, the approval gate, the payment claim, the conditional signing write |
| `client/src/lib/franchiseOnboardingApi.ts` | **the single swap point.** Nothing under `pages/franchise/onboarding/` imports an API directly |
| `client/src/lib/httpFranchiseOnboardingApi.ts` | the live implementation, through `apiClient` |
| `client/src/pages/franchise/onboarding/FranchiseOnboardingFlow.tsx` | the shell: chrome, rail, token-problem screens, step dispatch. No business logic |
| `client/src/pages/franchise/onboarding/PhaseRail.tsx` | nine steps in four phases (§3) |
| `client/src/pages/franchise/onboarding/steps/*` | one file per step |
| `client/src/pages/franchise/onboarding/TermSheetReader.tsx` | walks the `Agreement` tree. Does **not** hash — gym doc §22 removed that from the browser |
| `app/franchise/onboarding/[slug]/[handle]/page.tsx` | metadata-only shell, `noindex, nofollow` |
| `app/franchise/esign-return/page.tsx` | the Leegality return, registered in the dashboard as the return URL. Carries **no** handle |

**The mock is now a test double only.** `franchiseOnboardingApi.ts` re-exports
`httpFranchiseOnboardingApi` unconditionally, and no build serves the mock to a browser. It survives
because `client/src/__tests__/shared/franchise-onboarding-mock.test.ts` is where the ladder, both
freeze points, the approval gate and the payment claim are pinned as a specification, and that suite
imports it directly rather than through the swap point.

The preview escape hatches (`previewApprove`, `previewHold`, `previewDecline`,
`previewCompleteEsign`, `previewVerifyPayment`, `previewRefusePayment`) exist for the same reason:
two of the nine steps are completed by us, and a test cannot wait for a human. Their in-browser
counterpart, `PreviewControls`, is gone. The real way to move a franchise past step 4 and step 8 is
the admin panel's two writes, §8.4.

### Routes and headers

| Route | Note |
|---|---|
| `/franchise` | unchanged — public, indexed |
| `/franchise/onboarding/[slug]/[handle]` | `noindex, nofollow`, `Referrer-Policy: no-referrer` |
| `/franchise/esign-return` | `noindex, nofollow`. No handle in the URL |
| `/franchise/login`, `/franchise/dashboard` | later, and out of this plan's scope |

**Two things need editing that the gym flow got for free.**

`public/robots.txt` disallows `/gym/`, `/onboarding/`, `/auth/` and `/admin/`. It does **not** cover
`/franchise/onboarding/`, and `/franchise` is deliberately indexed, so the prefix cannot simply be
disallowed. Add `Disallow: /franchise/onboarding/` and `Disallow: /franchise/esign-return`.

`next.config.mjs` scopes `Referrer-Policy: no-referrer` to `/gym/onboarding/:path*` and
`/gym/set-password/:path*`. Add the two franchise routes — and note the comment already in that file:
these entries must stay **below** the global `strict-origin-when-cross-origin` block, because a later
`Referrer-Policy` wins and moving them up silently disables them.

Also confirm `app/sitemap.ts` does not enumerate anything under `/franchise/onboarding/`.

---

## 11. Build order

Each phase leaves the repo green and shippable.

**1. Housekeeping — done 2026-08-31.** `docs/FranchiseOnboardingPlan.md` deleted, and the section
references in `shared/franchise/program.ts` and `client/src/pages/Franchise.tsx` repointed at the
current program document with the off-by-one corrected (§2).

**2. The renderer refactor — done 2026-08-31.** `render.ts` is generic over its field record, and
`goldenVector.ts` with it, so both documents pin their bytes through one `verifyGoldenVector`. The
type parameter is wrapped in `NoInfer` on purpose: inferred from the argument, an object literal
with a misspelled field would infer *itself* as the record and the excess-property check that
catches the typo today would stop firing. Gym call sites are unchanged; the term sheet passes its
type argument explicitly. The gym golden vector held.

**3. The term sheet — done 2026-08-31.** `shared/franchise/termsheet/{types,v1,goldenVector}.ts`,
version 1.0, twenty sections and two schedules, pinned at 20,818 characters. 37 tests, which check
the figures in the vector against `shared/franchise/program.ts` so the document and the published
program cannot drift apart quietly. `fields.ts` moved to phase 4: it maps
`FranchiseOnboardingState` to the field record, and that type does not exist yet.

Two things about it differ from what this section said before it was built.

*Deferred terms are not `todo` markers.* They are not holes in a term sheet, they are what a term
sheet defers, and §17 of the document lists them so a reader is not left to notice by absence. The
mechanism that stops an *incomplete* one being issued is a different one and needs no marker: a
missing field is an unresolved token and `canIssue()` refuses on one. A City franchise whose payment
schedule and recovery threshold an admin has not set therefore cannot reach a signature.

*There is one `blocks-send` marker, and it is about the money.* Clause 5.6 states what happens to
the first instalment if the definitive agreement is never executed: applied against the investment,
non-refundable on the franchisee's default or on failure of due diligence, refunded without interest
less committed OEM procurement cost where we do not proceed for any other reason. The program
document nowhere addresses it, and a franchisee pays ₹12,50,000 under this instrument, so it could
not be left out. It was drafted in-house and nobody has approved it, hence `blocks-send`: **no term
sheet can be issued until that marker is deleted, and deleting it is the sign-off.** The preview
still walks, because the gym flow's precedent (`StepReviewSign`) shows the blocker list only under
the mock flag and does not gate signing in preview. This is open question 9.

One consequence outside this repo: `mbp-backend` holds a **verbatim copy** of `shared/agreement/`,
and `render.ts` and `goldenVector.ts` have both moved. That copy has to be re-taken along with the
new `shared/franchise/termsheet/` before the backend computes a `contentHash`, and the golden vector
tests on both sides are what will say so.

**4. The contract and the mock — done 2026-08-31.** `shared/franchise/onboarding/{types,steps,status,
schema,mockApi}.ts` and `shared/franchise/termsheet/{fields,issued}.ts`. 70 tests, which are the
specification phase 7 has to satisfy: `client/src/__tests__/shared/franchise-onboarding-mock.test.ts`
should keep passing against the HTTP implementation with only its constructor line changed. `GSTIN`
and `PHONE` are now exported from `shared/onboarding/schema.ts` and imported rather than re-declared.

Four things about it differ from what this document said before it was built.

*The wizard has its own four phases.* §3 said the rail groups the nine steps by `JOURNEY_PHASES`.
Applied literally that gives a 7-then-2 rail — steps 1 to 7 all fall inside `approve` and only 8 and
9 inside `fund` — which is exactly the long-ladder reading the grouping exists to prevent. So
`FRANCHISE_PHASES` in `steps.ts` is Apply / Approval / Agree / Fund, and each one names the journey
phase it sits inside, so the public vocabulary on `/franchise` is still the vocabulary in the wizard.

*Three steps complete on read, not two.* §7.4 named 4 and 8. Step 7 belongs with them for the same
reason: a signature is written by the Leegality webhook, so completing it from a franchisee's call would
be us asserting something we have not been told. `COMPLETED_ON_READ_STEPS` is `[4, 7, 8]`, and
`franchiseeCommits` is what a submission path checks — `commit()` throws rather than storing one.

*A hold reopens steps 1 to 3, and step 3 freezes with step 1.* §4 gave `kycSubmittedAt` as a freeze
point for step 1. Two corrections. It has to close step 3 as well, or the PAN card can be swapped
after the PAN it evidences is locked. And both have to reopen while `status === "on_hold"`, or a hold
asking for a correction is a dead end the flow refuses to accept — so `freezeReason` returns null for
the approval-stage freezes during a hold. The signature freeze is not reopened by anything.

*Open question 3 is answered: 45 days.* `TERM_SHEET_VALIDITY_DAYS`, which is what the golden vector's
`01 September 2026` → `16 October 2026` already assumed. Long enough for counsel to read it and a
bank transfer to clear, short enough that a territory is not held by somebody who stopped replying.

One deliberate divergence between the mock and the live flow, commented in both places:
`refreshEsignStatus` in the mock confirms a signature after two polls, standing in for the webhook's
travel time, because a mock that confirms instantly hides the state the return-trip screen exists
for. `refreshPaymentStatus` does **not** do the same, and that is the point of §7.5 — verification is
a person reading a bank statement, so a poll that eventually succeeded would teach the screen to
expect something that really takes working hours.

**5. The wizard — done 2026-08-31.** Nine steps against the mock, walked end to end in a browser:
`client/src/pages/franchise/onboarding/` (the shell, the rail, the intro, the preview controls, the
form kit, the two hooks, the term sheet reader and nine steps), `client/src/pages/franchise/
EsignReturn.tsx`, `client/src/lib/esignReturn.ts`, and the two routes in §10. `robots.txt` and the
scoped `Referrer-Policy` block in `next.config.mjs` cover both new paths; `app/sitemap.ts` needed
nothing, because it enumerates `PAGE_CHANGED_ON` and no credential-bearing path is in it.

Four things about it differ from what this document said before it was built.

*One reader serves both documents.* `AgreementReader` was generalised rather than copied: it takes
its field record as a type parameter and its `RenderOptions` as a prop. The options stay a separate
constant per document on purpose, so one document's placeholder cannot move the other's hash. Every
gym call site and its tests are unchanged.

*Step 7 cannot use `readOnly`.* `isReadOnly` is `!franchiseeCommits(viewStep) || frozen`, and step 7
completes on read, so `franchiseeCommits(7)` is false and `readOnly` is *always* true there. It
branches on `state.isSigned` and `state.esign.status` instead. Same for steps 4 and 8. Anyone
reaching for `readOnly` on one of those three steps has found this trap, not a bug.

*The signing URL is never stored.* `esignReturn.ts` is `depositReturn.ts` minus that one value. A
deposit link is forwardable by design; a signing link authorises an eSign in a named person's
identity, and `requestEsign` is idempotent and returns a fresh URL, so resuming re-asks the server.

*Money is converted in the control, not the handler.* `paymentClaimSchema` validates integer paise
and nobody types paise, so `Field` gained a `rupees` mode. Converting in the submit handler instead
would have renamed the field and broken both the server's `amountPaise` error key and the draft
shape.

**6. The admin queue.** `GET /admin/franchise-applications` and `POST /admin/franchises`. This is the
first backend work and it is deliberately first: it unblocks minting a real invite, and it is the gap
that already exists in production today (§2).

**7. The backend wizard.** The table, `requireFranchiseHandle`, the read, the drafts, the commits,
the ladder, both freeze points. Point `franchiseOnboardingApi.ts` at the live implementation with no
mode flag at all: the gym flow's switch has been deleted, because an opt-**in** live mode meant any
build that forgot the variable served fixtures to a real applicant.

**8. PDF generation.** `domain/franchise/pdf.ts`, with the determinism test (§6.2) written before the
renderer.

**9. Leegality.** The provider module exists (`providers/leegality.ts`, 59 tests) and no route calls
it. What is left is `POST /franchise/onboarding/esign`, the webhook pair (success and error), the
reconciler §6.4b makes mandatory, and the return trip. Against the sandbox first, and correct §6.3's
table and the module header with what the sandbox actually answers.

Three of these are **dashboard work, not code**, and nothing in either repo can verify them:

- two workflows, one per sign type, whose ids go into `leegality/workflow-ids`;
- per-invitee Webhook URL, Error Webhook URL and return URL at Webhook Version **v2.5**, matching
  `ESIGN_RETURN_PATH`;
- Aadhaar mismatch set to **hard-fail** under Department → eSignature (§6.5), without which
  `verifyTitle` is a note rather than a control.

Worth requesting from support@leegality.com at the same time: **Custom Webhook Headers**, which is the
proper answer to the one-field MAC (§6.4a) and arrives as a Webhook Profile ID entered per invitee.

**10. Documents.** The bucket, the presigned PUT, the admin presigned GET. Could move earlier;
placed here because step 3 can be built against the mock without a bucket and the bucket brings the
two gaps in §9 with it.

**11. Payments.** The claim, the verification route, the admin queue for it.

**12. Activation, and the franchise portal.** Out of scope here beyond `POST /admin/franchises/{id}/
activate` and `POST /franchise/account`. The franchise dashboard — the program document's §22 list,
including capital recovery progress — is its own piece of work and needs the settlement model that
backend design §9.4 says does not have data yet.

---

## 12. Open questions

Named rather than left implied, per gym doc §17.

1. **Does the term sheet need stamping?** Counsel. §6.6 makes the seam carry it either way.
2. **Does a shortfall on the first instalment block step 8?** §7.3 makes it visible and does not
   decide it.
3. ~~**What is the term sheet's own validity period?**~~ Answered: 45 days,
   `TERM_SHEET_VALIDITY_DAYS` in `shared/franchise/termsheet/fields.ts`. §11, phase 4.
4. **Can a declined applicant reapply, and through what?** §3 makes the screen silent on it, which is
   safe and is not an answer.
5. **DPDP retention for KYC documents of declined applicants.** §9. Needed before prod.
6. **Virus scanning on uploads.** §9. Currently absent.
7. **Who signs on our side, and is that a second Leegality invitee or a pre-signed counterpart?** The gym
   agreement's execution block prints our signatory as text. An e-signed document usually has both
   parties as signers, which makes the flow two-sided and adds a state where the franchisee has
   signed and we have not.
8. **Second instalment and procurement tracking.** Deliberately out of scope; §7.6 keeps the record
   shaped for it.
9. **Is clause 5.6 of the term sheet the right refund position?** Drafted in-house because a
   ₹12,50,000 instalment paid under a term sheet cannot leave the question unanswered, and the
   program document does not answer it. It carries the only `blocks-send` marker in the document, so
   nothing can be issued until it is approved. §11, phase 3.
10. **Where do the franchise admin routes live, given the 500-resource ceiling?** §8.1. Their own
    `RestApi` is the only option that fits, and it needs the admin cookie to carry a `Domain`
    attribute, which is an auth change affecting the gym dashboard. Blocks any franchise deploy.
11. **Rupees or paise on the admin wire?** `POST /admin/gyms` takes `securityDepositInr` and
    multiplies by 100; `POST /admin/franchises` takes `investmentPaise` directly. Two forms in one
    dashboard with two conventions is where a factor of 100 gets entered. The franchise side is the
    one that matches this repo's integer-paise rule, so the gym side is the one that is wrong, and
    changing it touches a deployed route.
12. **Is there a franchise invite email, or does an admin copy the link?** The create route returns
    `emailed: false` always. Gym onboarding sends one. §8.4 assumed a resend route, which implies a
    first send that does not exist.
