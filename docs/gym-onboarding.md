# Gym Onboarding

Design for the public partnership page, the gym-partner onboarding flow, the gym portal, and the
online Machine Placement & Profit Sharing Agreement. Written 2026-08-22, before implementation.

Two things change at once:

1. **Consumer login/signup is removed.** There are no customer accounts. Members buy a shake at
   the machine; they do not have profiles, wallets, or logins.
2. **Gyms are onboarded through a single emailed link** — a six-step flow that ends with a signed
   agreement, a paid security deposit, a working portal account, and a machine on the floor. The
   sixth step is the only one the gym does not do: see §20.

The agreement started from
`docs/MuscleBoxPro_Machine_Placement_Profit_Sharing_Agreement_v2_1.pdf` (Execution Draft v2.0 in its
own header). It was transcribed clause by clause as 2.1, **2.2** resolved every unfinished clause in it
— see §12 for the defect-by-defect mapping and the thirteen commercial decisions behind it — and **2.3**
took the blanks nobody could fill at signing out of the signed document (§20). 2.3 is what the flow
issues and, since 2026-08-25, the only version in the repository: see §22.

---

## 1. Why invite-only

A gym is never a self-serve signup. Every gym that gets a machine has already had a sales
conversation, a site discussion, and agreed commercials. By the time they see the onboarding flow,
we know their name, their address, and what machine they're getting.

So there is no public gym signup form. The public front doors are `/gym-partnership` (understand the
deal) and [/gym-demo](../app/gym-demo/page.tsx) (ask for a machine, writes to `demo_requests`).
Admin converts a demo request into a gym record, sets the machine and the commercial terms, and
sends one link.

This also means the onboarding flow *is* the signup form. It creates the account, as its last act,
only after the agreement is signed.

## 2. The public partnership page

`/gym-partnership` is a public, indexed, one-page explanation of the deal — the partnership
minified. No login, no token, nothing to fill in. A gym owner can read it, forward it to a business
partner, and decide whether to ask for a machine.

The site has no page like this today. [/gym-demo](../client/src/pages/GymDemo.tsx) asks for a form
before explaining the commercials, which asks for commitment before comprehension.

### Three renderings of one partnership

| Where | Audience | Fidelity | Terms shown |
|---|---|---|---|
| `/gym-partnership` | public, pre-sales | one page | **indicative** standard terms |
| Onboarding step 2 | invited gym | one screen | **their** `gym_terms` row |
| Onboarding step 3, `/gym/agreement` | invited gym | 47 sections | their terms, legally binding |

Same numbers, three levels of commitment. **They must come from one place or they will drift**, and
the failure mode is a gym quoting the marketing page at you during a settlement dispute.

So `shared/partnership/summary.ts` holds the standard commercials, and it feeds two consumers: the
public page, and the default values when admin creates a new `gym_terms` row. The sales page and the
default deal become the same object. Per-gym terms then diverge deliberately, in the database — not
because someone forgot to update a marketing page.

As built:

| File | Holds |
|---|---|
| [shared/partnership/summary.ts](../shared/partnership/summary.ts) | `PARTNERSHIP` commercials, `INDICATIVE_ECONOMICS`, `workedMonth()`, `bindingMilestone()`, `formatInr()` |
| [shared/partnership/faq.ts](../shared/partnership/faq.ts) | `PARTNERSHIP_FAQ`, interpolating `PARTNERSHIP` — rendered *both* as visible copy and as FAQPage JSON-LD, so it cannot be two lists |
| [client/src/pages/GymPartnership.tsx](../client/src/pages/GymPartnership.tsx) | the page; contains no rupee or percentage literals |
| [app/gym-partnership/page.tsx](../app/gym-partnership/page.tsx) | metadata, BreadcrumbList + FAQPage JSON-LD |

The worked example is derived, not typed: `workedMonth()` applies the same percentage the page prints
above it, and a test asserts the result stays inside the ₹3,000–₹12,000 band already published on
[BlogGymRetention.tsx](../client/src/pages/BlogGymRetention.tsx) and uses an ASP and cost inside the
ranges on [BlogWhyGymVending.tsx](../client/src/pages/BlogWhyGymVending.tsx). Two pages quoting
different economics is the same drift problem one level out.

### It is indicative, not an offer

Per-gym variation is real: the deposit and the ratios are negotiable in practice, and decision 4
makes the deposit settable per gym from the backend. So the page carries an explicit, visible line —
*"Indicative terms. Your signed agreement governs."* Not buried in a footer.

And **the full agreement text does not go on this page**, even now that v2.2 is issuable. A gym's
agreement is rendered from *its* terms row, so any copy published here is a different document from
the one that binds it — and publishing 47 sections invites reliance on the version that happened to
be current the day someone read it.

### What's on it

- **What you get, what it costs** — ₹0 for the machine, ₹50,000 refundable deposit
- **How the money works** — the 80:20 → 50:50 progression, with **one worked month**
- **What we handle / what you handle** — restocking, cleaning, maintenance, water vs. floor space
  and a power point
- **Your obligations, stated plainly** — don't move it (§21), don't touch the ingredients (§14)
- **Term and exit** — 24 months, 30 days' notice to leave (§36.1)
- **The five onboarding steps**, so the flow is not a surprise
- **FAQ**
- **CTA** → `/gym-demo`

The worked month is what makes the page land: *"1,000 cups at ₹X = ₹Y gross, less ₹Z ingredients =
₹A net profit, your 20% = ₹B, plus ₹1,000 electricity reimbursement."* One concrete month
communicates more than any percentage does. Derive it from `summary.ts` so it cannot contradict the
ratios printed above it.

**Include the uncomfortable clauses here too**, same reasoning as onboarding step 2. A gym that
learns about §14 on a public page self-selects out early and costs nothing. One that learns at month
three is a dispute.

### SEO

This is a real ranking opportunity and genuine mid-funnel content the site currently lacks: gym
vending machine profit sharing, protein vending machine partnership terms. Treat it as a
first-class page — `sitemap.xml`, `INDEXNOW_URLS` in [next.config.mjs](../next.config.mjs),
`FAQPage` JSON-LD in the route shell, internal links from `/gym-demo` and the machine and advertise
pages.

## 3. The onboarding flow

```
Admin (local_dashboard)                    Gym (one link, any device)
─────────────────────                     ──────────────────────────
demo_request comes in
      ↓
create gym + machine + terms
      ↓
"Send onboarding link" ──────email──────▶  /onboarding/<token>
                                                  │
                                    ┌─────────────┴──────────────┐
                                    │ 1  Confirm Your Details    │  form
                                    │ 2  Your Partnership        │  read
                                    │ 3  Review & Sign           │  agreement
                                    │ 4  Security Deposit        │  payment
                                    │ 5  You're Set Up           │  password
                                    │ 6  Installation            │  ours
                                    └─────────────┬──────────────┘
                                                  ↓
                                          /gym/dashboard
```

One URL for the whole flow. The step is decided by the server from persisted state, never by the
path or by the client — see §4.

### Step 1 — Confirm Your Details

Details come first for two reasons: the data is captured before anyone can drop off, and everything
after it can then be personalised with the gym's own name and terms.

Prefilled from the demo request wherever possible; the gym corrects and completes.

- Legal entity name
- Entity type — proprietorship / partnership / LLP / Pvt Ltd / not registered (added 2026-08-24,
  so a one-person gym is not made to claim a constitution it does not have; nothing contractual
  turns on it, since the agreement identifies the parties by name and never prints the type)
- Trade name (the name on the door, if different)
- GSTIN — optional since 2026-08-24
- Registered address
- Installation address
- Signatory name + designation
- Notices email + phone (§41)

Because this is now the cold open, it needs a compact "what this is" hero above the form — who sent
the link, what the steps are, how long it takes, and a link to `/gym-partnership` for anyone
who wants the deal restated. A form as the first thing a gym sees, with no frame around it, reads
like a data-harvesting page. The link arrives off the back of a sales call, so one short paragraph
is enough; it does not need to re-sell.

One detail worth building, one field since dropped, and one since made optional:

**A live preview panel.** As they type, show `This Agreement is between BlendBox Innovations LLP
and <legal name>`. Seeing their own legal name land in the contract is what turns a form into a
contract negotiation, and it catches typos in the one field that is hardest to fix afterwards.

**~~Ask for FSSAI.~~ Dropped 2026-08-24.** The reasoning was that §24.5 and Schedule F make each
party responsible for its own registrations, so whether the gym holds a licence is a question you
want answered on day one rather than at an inspection. It reads differently now that §24.6 is
resolved the other way: **MuscleBoxPro is the FBO** and holds the licence at its own cost (see the
clause table below), so the gym's own licence is not a fact this contract turns on — the agreement
does not print it either. `fssaiLicenceNumber` stays on `GymDetails`, in
`gymDetailsSchema` and in the stored item, so the values gyms did give still round-trip and still
render on the admin detail page. No screen collects it.

**GSTIN is optional, as of the same day.** The agreement never renders a GSTIN — see
`toAgreementFields` — so it is an invoicing detail, not a contractual one, and stopping step 1 over
a certificate someone has to go and find costs more than raising the first invoice late. A number
that *is* entered is still refused unless it is well-formed — shape on the client, shape plus the
mod-36 check digit on the server — because a transposed digit bills the wrong entity for the whole
term.

**As built (2026-08-22).** The live preview, the hero, autosave and server-side
field errors are in [StepDetails.tsx](../client/src/pages/onboarding/steps/StepDetails.tsx). The hero
is its own component, [OnboardingIntro.tsx](../client/src/pages/onboarding/OnboardingIntro.tsx), and
it renders **only while step 1 is still live** — a gym that comes back to check what it typed is not
introduced to the process a second time. Its duration estimate is summed from `STEP_META` rather
than typed in, so it moves when a step's scope does. The submit block carries one line of microcopy
saying what Continue does *not* do ("There is nothing to sign until step 3"), because nobody fills
in a GSTIN happily while suspecting the next button commits them.

### Step 2 — Your Partnership

No input. Its job is to establish what the deal is *before* showing anyone forty-seven clauses —
and, because step 1 has already run, it can address them by name with the terms actually on their
record rather than the indicative numbers on the public page.

Six cards drawn from that gym's `gym_terms` row:

| | |
|---|---|
| ₹0 | for the machine |
| ₹50,000 | refundable security deposit |
| 24 months | initial term |
| 20% → 50% | of net profit, rising at the milestone — 15,000 cups **or** ₹5,00,000 of cumulative net profit, whichever first (§14) |
| ₹1,000 | per 1,000 cups, electricity reimbursement, per 3-month window |
| Included | restocking, cleaning, maintenance, water |

Then a "what we need from you" block: floor space, a power point, don't move it, don't touch the
ingredients, protect it from damage.

**Put the uncomfortable parts here deliberately.** A gym owner surprised by §14 in month three is a
dispute. One who read it on this step is a partner. The temptation is to make this page pure sell;
resist it.

Ends with the machine they're getting (model, dimensions, render — reuse assets from
[MachineSpecs](../client/src/pages/MachineSpecs.tsx)) and a five-item timeline: sign → deposit →
site survey → installation → first payout.

Continuing records `partnership_ack_at`. Cheap, and it is evidence the commercials were shown
before the contract.

This screen shares components with `/gym-partnership` but is **not** the same page: this one reads
from the database and is authoritative for that gym; that one is indicative and public.

**As built (2026-08-22).**
[StepPartnership.tsx](../client/src/pages/onboarding/steps/StepPartnership.tsx) — six headline cards,
a four-row "The detail" block, the restrictions, both sides of the arrangement, the machine, and the
timeline. Four decisions in it worth not undoing:

**The restrictions block is the point of the screen, not an appendix.** Five items, each tagged with
the clause it comes from (§3, §14, §21, §12.4, §5.6) so a gym owner or their lawyer can check the
summary against the real text one step later. `OnboardingFlow.test.tsx` asserts all five clause refs
are present, which is the closest thing to a lock we can put on an editorial decision.

**The milestone leads with "whichever comes first", not the cup count.** At the indicative ₹55 of
margin a cup the ₹5,00,000 net-profit test fires at about 9,100 cups, so quoting 15,000 on its own
*understates* the deal — and a thinner-margin machine reaches the cup count first instead, so neither
figure can be quoted alone. The row states both tests and then the arithmetic at that gym's own
numbers, computed rather than typed. Advertising is stated as never re-ratioing, which is the other
thing gyms assume works like the profit share and doesn't.

**The machine comes from [shared/machine/spec.ts](../shared/machine/spec.ts).** Extracted in this
build item because `/specs`, this step and Schedule A all describe the same hardware and a gym that
reads two of them must not find two different heights. `MachineSpecs.tsx` now reads its key-stats row
from the same constant. Per-unit facts — serial, device number, installation date — stay on the
machine record; the copy says explicitly that they land in Schedule A at installation.

**Nothing here is hard-coded from `PARTNERSHIP`** except the electricity floor and the
underperformance notice period, which have no per-gym column yet. Everything a gym could negotiate
reads from `state.terms`. If a gym gets a different deposit or term, this screen already follows.

### Step 3 — Review & Sign

This step carries the legal weight, so it is the one to over-engineer.

**The "In short" panel is no longer on this step.** It was removed from
`StepReviewSign.tsx` on 2026-08-24; the data behind it (`plainLanguage.ts`) and its tests
are untouched, so re-siting it is an import and eleven lines of JSX. What follows is the
list it held and the reasoning for it, kept because that reasoning has not changed — step 2
is now the only screen that states the terms in plain words, and it does not carry all
eleven of these.

For v2.2, eleven items, each linking to the full clause:

| In short | Clause |
|---|---|
| The machine stays our property | §3 |
| Your share rises to 50% at the milestone — 15,000 cups or ₹5,00,000 of net profit, whichever first | §6 |
| Advertising stays 80/20 permanently | §9.4 |
| Your deposit can be forfeited for damage | §5.6 |
| You cannot add, change or refill ingredients | §14 |
| We hold the FSSAI licence, not you | §24.6 |
| You cannot relocate the machine | §21 |
| We can remove it on 15 days' notice if it underperforms | §12.4 |
| You can exit on 30 days' notice, at no charge | §36.1 |
| Neither of us has a cap on liability for direct loss | §34 |
| Disputes go to the courts at Gautam Buddha Nagar, not arbitration | §46 |

The last two are there because they bite, not because they are reassuring. A summary that lists only
the comfortable clauses is a sales page wearing a summary's clothes.

It was not decoration: it was part of what makes "I have read and agree" a true statement.
With it gone, the load on that statement is carried by the scroll gate, the server-pinned
content hash, and step 2's plain-English restrictions.

**Full document.** Sticky section index on desktop, collapsible accordions on mobile.
Assume a phone — a forty-seven-section contract on a 390px screen is the actual design problem
here, not the desktop layout.

**Scroll-tracked.** The sign panel stays disabled until they reach the end.

**Email OTP before signing.** The link proves email control right up until someone forwards it. A
six-digit code sent at the moment of signing proves the person signing controls the address the
agreement was sent to. One extra screen, materially stronger audit trail on a 24-month agreement
with a ₹50,000 deposit.

**The signature itself:** typed full name, designation, and two separate checkboxes —

- "I have read and agree to this Agreement"
- "I am authorised to bind `<legal entity name>`" (§32)

Two checkboxes rather than one because §32 is a distinct representation about authority, and
bundling it into a general "I agree" weakens it.

**Captured with the signature:** server timestamp, IP, user-agent, OTP verification record,
agreement version, and a **SHA-256 of the exact rendered text that was on screen**.

That hash is the load-bearing part of the whole design. It proves that a later edit to the
agreement content did not retroactively change what was signed. Without it, the stored signature
means only "someone agreed to whatever the version file says today".

**As built (2026-08-22).** Four files:
[plainLanguage.ts](../shared/agreement/plainLanguage.ts) (the summary as data — no longer
rendered, see §3 step 3),
[AgreementReader.tsx](../client/src/pages/onboarding/AgreementReader.tsx) (the document plus the
reading gate), [SignPanel.tsx](../client/src/pages/onboarding/SignPanel.tsx) (assent, then the code),
and [StepReviewSign.tsx](../client/src/pages/onboarding/steps/StepReviewSign.tsx), which composes
them and owns the hash. Five decisions worth not undoing:

**The summary quotes the document rather than improving it.** Each list is named for the version it
describes — `PLAIN_LANGUAGE_V2_3` is the only one left (§22) — and its figures are literals rather than
interpolations from `PARTNERSHIP`, because the agreement text transcribes "15,000" and "₹5,00,000" as
content and changing our standard commercials must not silently rewrite what this panel claims a
*signed* document says. A version's list belongs to its version for the same reason the text does.

Where the agreement was weak, the v2.1 line said so: §36.1 was written as the *request* it was, naming
§36.2's blank Schedule B charge, and §6 named its own contradiction with Schedules B and C. 2.2 and 2.3
have no such lines because they have no such gaps, and the tests now assert the panel contains no
"still blank" or "read it as a request" hedging — a line that says a clause is unfinished must
disappear when the clause is finished, or the panel starts lying in the reassuring direction.

A summary that reads better than the contract is worse than no summary, because it becomes the thing
the gym relied on. The tests assert each clause ref resolves to a real section, each dotted ref sits
inside the section it links to, every quoted figure still appears in the rendered text, and the panel
discloses §34 and §46.

**One renderer, one options object.** `AGREEMENT_RENDER_OPTIONS` is exported from the reader and
imported by the hash, so the text on screen and the text that is hashed cannot drift. `onMissing:
"placeholder"` rather than `throw`, because serial number and installation date are genuinely blank
until Schedule A is signed on site — and `canIssue()` still refuses to *sign* around a placeholder.

**The reading gate is a measured percentage, not an `IntersectionObserver` sentinel.** It yields a
"% read" number to show the reader, and it stays correct when sections are collapsed and the
document's height changes underneath it. It has an explicit `rect.height === 0 → progress = 1`
branch: happy-dom has no layout engine, and an unmeasurable document must not soft-lock the sign
panel. What the gate is honestly worth is delivery and opportunity to read, not reading — nothing in
a browser evidences reading. The load-bearing evidence is the hash, the OTP and the server
timestamps.

**Signing is refused in production while `canIssue()` is false**, with the gym seeing an "isn't ready
to sign" panel and no drafting notes. Preview builds override the refusal — otherwise the flow could
not be walked at all — and say on screen that this is why signing is enabled. The `todo` blocks and
the blocker list render only under `IS_MOCK_ONBOARDING`; a gym must never read our notes about its
own contract.

**Known gap for build item 9.** The effective date is rendered client-side into the hashed text. A
browser that renders at 23:59 UTC and a server that signs after midnight would disagree about the
hash. Item 9 must either submit the effective date alongside the signature or render the document
server-side; `openedAt` is already fixed at mount rather than read per render, so the value to submit
exists.

### Step 4 — Security Deposit

₹50,000 refundable, per §5.1 and Schedule B. See §5 for the gateway design.

**This step comes after signing, and it is skippable.** Both matter:

*After signing*, because the deposit is an obligation that arises **under** the agreement (§5.1).
Collecting ₹50,000 before there is an executed contract creates a refund liability with no
agreement governing it, and it is the wrong order commercially — you are asking for money before
the gym has committed to anything.

*Skippable*, because a failed or delayed ₹50,000 payment must never orphan a gym that has already
signed. The signed agreement is the milestone; the deposit is a receivable. "Pay later — we'll
email you the payment link" moves them straight to step 5 with the account created and a persistent
`Deposit pending` banner on the dashboard.

The screen shows the amount, that it is refundable, what it can be adjusted against (§5.4–5.7 in
plain language — this is the clause most likely to cause a later argument, so state it here too),
and one primary button.

**As built (2026-08-22).**
[StepDeposit.tsx](../client/src/pages/onboarding/steps/StepDeposit.tsx) plus
[_shared/razorpay.ts](../supabase/functions/_shared/razorpay.ts). Four decisions, and one honest
split of scope:

**The link is presented as forwardable, in those words.** The reason we use Payment Links rather than
a checkout is that the signatory usually cannot release ₹50,000 — so the screen says "you don't have
to be the one who pays" and explains that a forwarded link works from someone else's inbox. A feature
nobody is told about is a feature nobody uses, and this one is the difference between a deposit paid
today and a deposit paid next Friday.

**Nothing client-side can mark a deposit paid.** The screen polls our own record every five seconds
while a payment is settling, stops after ~5 minutes, and never inspects a redirect or a gateway
callback. That choice also removes work: the return trip from Razorpay needs **no special handling at
all**, and the same mechanism covers a gym that closes the tab, and a gym whose accountant paid from a
forwarded link and never had this page open. The poll goes through a separate
`actions.pollDepositStatus()` that deliberately does *not* touch `isSubmitting`, `actionError` or
`viewOverride` — a background timer must not spin the whole wizard's buttons or yank a gym reading
step 3 back to step 4.

**The waiting state is designed rather than defaulted.** After about fifteen seconds the copy stops
saying "checking" and starts explaining, the gym is told in as many words that it can close the tab,
and the manual "I've paid — check now" button reports its own result — a check that visibly changes
nothing reads as a broken button and gets clicked six more times. The mock now models this:
`refreshDepositStatus` reports the money as not yet seen on the first poll and confirmed on the
second, because a mock that confirms instantly hides the state the UI most needs.

**§5.6–5.7 is on the money screen.** Five rows off `DEPOSIT_FACTS`, including the two that are not in
the gym's favour: deliberate or reckless damage can forfeit the whole deposit, and cost beyond it is
still owed. Stated at the moment money changes hands, with the clause numbers, so a gym that later
hits §5.6 recognises it rather than discovering it.

**Paying stays possible after deferring.** Step 4 is read-only when revisited, with one exception:
a `deferred` deposit keeps its pay button, because that outstanding ₹50,000 is the only reason to come
back to the step. This surfaced a mock bug worth keeping fixed — confirming a payment for a gym that
had already created its account was writing `status = "deposit_paid"` over `active`, demoting a gym
that was already trading. The status now only moves forward.

**What is deferred to item 9, and why.** The Payment Link is created by the mock and the paid/unpaid
truth comes from the mock's record. The two Supabase functions — create-link and webhook — need the
`deposits` and `gym_onboarding` tables and live Razorpay credentials, neither of which exists yet, and
a handler written against absent tables cannot be run or tested. What *is* written and tested now is
the half where a mistake is silent: `_shared/razorpay.ts` does HMAC-SHA256 verification over the raw
body with a constant-time compare, fails closed on a missing signature *or* a missing secret, acts
only on `payment_link.paid`, reads the cumulative `payment_link.amount_paid` rather than
`payment.amount`, refuses a partial payment as a deposit, takes `paid_at` from Razorpay's epoch rather
than our clock, and returns a described outcome instead of throwing — because a handler that throws is
retried by Razorpay forever on a body that will never parse. 13 tests in
[razorpay-webhook.test.ts](../supabase/functions/__tests__/razorpay-webhook.test.ts).

**Also in `OnboardingState` now:** `depositReceipt` — receipt number, amount in paise, method and
paid-at, written only by the server from its own `deposits` row. Decision 11 settled what it is: a
**receipt, not a tax invoice**, with no GST line, because a refundable deposit is not consideration for
a supply (§5). The field is deliberately still free of tax characterisation in the type — the document
the server emails says it, one place, rather than every screen implying it.

### Step 5 — You're Set Up

- Signed PDF on screen, and emailed to the gym, `contact@muscleboxpro.com`, and the
  `*_REQUEST_CC` list
- Deposit receipt, if paid
- Set a portal password → step 6, which carries the dashboard link (it used to redirect straight
  into `/gym/dashboard`; see §20)
- "What happens next": site survey, installation date, Schedule A signing at install

Account creation lands after signing on purpose. No logins for gyms that never signed, and no
"log in to sign" friction in front of the thing we actually want them to do. It lands *before* the
deposit clears so that skipping step 4 still leaves a usable account.

**As built (2026-08-22).** [StepDone.tsx](../client/src/pages/onboarding/steps/StepDone.tsx) confirms
what was signed (date, signatory, agreement version, and the first twelve characters of the content
hash with the full value on the element's `title` — short enough to read out on a phone call, and the
whole hash is in the PDF), states the deposit outcome, takes the password, then lists what happens
next.

Three things it does deliberately:

**No download button yet.** The signature and its hash are real and stored, but the countersigned PDF
is build item 9 and its permanent home is build item 8. So the screen says the PDF is emailed once we
counter-sign and will live in the dashboard — a "Download" button that 404s would be worse than that
sentence. Replace the note, not the layout, when item 9 lands.

**A deferred deposit reads as owed.** `deposit_status` of `deferred` or `not_started` both render
"Deposit still to pay — ₹50,000" and say that the site survey can proceed but installation waits for
it. `pending` says a payment is in flight and there is nothing more to do. Only `paid` shows a
receipt line. Nobody should be able to say afterwards that they did not know it was outstanding.

**Schedule A is disclosed here, not discovered at installation.** The "what happens next" list names
the second signature explicitly and repeats that the term runs from the installation date (§4.1), not
from today — the single most common wrong assumption available at this point in the flow.

## 4. Persistence and resume

The whole flow is stored server-side, keyed by the token. A gym can close the tab at any point,
open the same emailed link days later on a different device, and land exactly where they left off —
including inside a half-filled form.

**As built (2026-08-22).** The rules below are enforced today by the mock and pinned by tests; the
edge functions in item 9 have to enforce the same set. The one difference is where the record lives —
an in-memory `Map` rather than `gym_onboarding`, so a hard reload starts over. Everything the wizard
does goes through `OnboardingApi`, so that is the only thing item 9 changes.

| File | What it is |
|---|---|
| [onboarding/types.ts](../shared/onboarding/types.ts) | the API contract — `OnboardingState`, `OnboardingApi`, the error codes |
| [onboarding/steps.ts](../shared/onboarding/steps.ts) | `STEP_META` — the titles, blurbs and time estimates, in one place |
| [onboarding/schema.ts](../shared/onboarding/schema.ts) | zod schemas shared by the form, the mock and later the edge function |
| [onboarding/mockApi.ts](../shared/onboarding/mockApi.ts) | the state machine, not a stub — step derivation, freezing, the conditional signing write |
| [onboarding/agreementFields.ts](../shared/onboarding/agreementFields.ts) | `OnboardingState` → `AgreementFields`, so §12's renderer has every token |
| [lib/onboardingApi.ts](../client/src/lib/onboardingApi.ts) | the single swap point for phase 2 |
| [onboarding/useOnboarding.ts](../client/src/pages/onboarding/useOnboarding.ts) | all server state for one token; no local step counter exists |
| [onboarding/useDraftAutosave.ts](../client/src/pages/onboarding/useDraftAutosave.ts) | 800 ms debounce, plus a `pagehide` flush |
| [onboarding/OnboardingFlow.tsx](../client/src/pages/onboarding/OnboardingFlow.tsx) | the shell — chrome, rail, token-problem screens, step dispatch |
| [onboarding/OnboardingIntro.tsx](../client/src/pages/onboarding/OnboardingIntro.tsx) | the step 1 cold open; shown on the first pass only |
| [shared/machine/spec.ts](../shared/machine/spec.ts) | the hardware, once — `/specs`, step 2 and later Schedule A read from it |
| [agreement/plainLanguage.ts](../shared/agreement/plainLanguage.ts) | the "In short" summary as data, one list per agreement version — 2.3's is the only one. No UI reads it since 2026-08-24 — see §3 step 3 |
| [onboarding/AgreementReader.tsx](../client/src/pages/onboarding/AgreementReader.tsx) | the document on screen, plus the reading gate and `AGREEMENT_RENDER_OPTIONS` |
| [onboarding/SignPanel.tsx](../client/src/pages/onboarding/SignPanel.tsx) | assent, then the emailed code; never recomputes the hash it is handed |
| [onboarding-mock-api.test.ts](../client/src/__tests__/shared/onboarding-mock-api.test.ts) | 31 tests — really the spec for item 9 |
| [onboarding/steps/StepDeposit.tsx](../client/src/pages/onboarding/steps/StepDeposit.tsx) | step 4 — the forwardable link, the background poll, the receipt |
| [_shared/razorpay.ts](../supabase/functions/_shared/razorpay.ts) | webhook signature, event parsing and the settlement check — pure, no DB |
| [OnboardingFlow.test.tsx](../client/src/__tests__/pages/OnboardingFlow.test.tsx) | 27 tests, including a full walk from step 1 to the dashboard hand-off |
| [agreement-render.test.ts](../client/src/__tests__/shared/agreement-render.test.ts) | the renderer and the issue gate, on synthetic documents |
| [agreement-v2-3.test.ts](../client/src/__tests__/shared/agreement-v2-3.test.ts) | the issued version: consistency, the surprising clauses, pinned hash |
| [settlement/compute.ts](../shared/settlement/compute.ts) | §§6–10 as one pure module — net profit, the milestone split, advertising, electricity |
| [gym/portal.ts](../shared/gym/portal.ts) | the reporting endpoint's response shape, written before the endpoint (§15) |
| [gym/fixtures.ts](../shared/gym/fixtures.ts) | raw inputs for the dashboard — cups and rupees, not one derived figure |
| [gym/GymDashboard.tsx](../client/src/pages/gym/GymDashboard.tsx) | the nine §13 cards, every number derived through `compute.ts` |
| [settlement.test.ts](../client/src/__tests__/shared/settlement.test.ts) | 31 tests — the maths, including the month the milestone splits |
| [GymDashboard.test.tsx](../client/src/__tests__/pages/GymDashboard.test.tsx) | 15 tests — that the cards render derived figures and not typed-in ones |

Two implementation notes worth keeping when the real backend lands:

**`current_step` is derived, never incremented.** It is the lowest step not in `completed_steps`.
`current_step + 1` looks equivalent until a gym goes back and re-submits an earlier step — then it
knocks them forward or back by one for no reason. The mock's `recomputeStep()` is the shape to copy.

**`viewStep` is a view, not a step.** The hook keeps an override so a gym can re-read a completed
step, and any successful action clears it. Submits are still validated against `current_step`
server-side, which is what makes the override safe to have at all.

**Step 1 is editable from that view, inside a window.** Added 2026-08-24, with a "Back to my
details" button on step 2, because the rail was the only way back and it landed on a step 1 whose
every input was disabled — so the answer to "the legal entity name is wrong" was to email us, on the
one field the signature hash makes expensive to fix later.

The window is the status ladder, not `is_signed`. A step 1 commit writes `details_submitted`, and
`forwardOnlyCondition` only writes onto a status at or behind that — so once step 2 is acknowledged
and the row reaches `partnership_ack`, the commit is refused and `classifyCommitRefusal` answers
`wrong_step`. `DETAILS_EDITABLE_FROM` in `useOnboarding.ts` mirrors that window so the form is
read-only exactly when the server would refuse it, rather than offering an edit that round-trips as
"Please complete the earlier steps first".

Two divergences to know about:

- **The paragraph above used to say a gym on step 3 can go back and correct step 1.** It cannot —
  the ladder refuses it, per the previous paragraph. Whether it *should* be able to is open: the
  agreement is issued at step 2's ack and re-issued on view, so a step 1 correction at step 3 would
  have to re-render and re-hash the document. Nobody has designed that, and until someone does,
  step 3 is the point of no return for these fields without an admin.
- **`shared/onboarding/mockApi.ts` is looser than the server.** `assertSubmittable` allows
  re-submitting any completed step until signing, with no ladder. Preview mode is therefore not
  what would catch `DETAILS_EDITABLE_FROM` going stale; the sandbox is.

**`gym_onboarding` holds one row per gym**, created when the link is sent:

| Column | Notes |
|---|---|
| `gym_id`, `token_id` | one active token per gym; superseded tokens are revoked, not deleted |
| `current_step` | authoritative — the **server** decides which step to render |
| `completed_steps` | which steps are genuinely done, distinct from drafted |
| `step_data` | `jsonb`, per-step draft payloads |
| `status` | `invited → opened → details_submitted → partnership_ack → agreement_viewed → signed → deposit_paid → active` |
| timestamps | one per transition: `invited_at`, `first_opened_at`, `details_submitted_at`, `partnership_ack_at`, `agreement_viewed_at`, `signed_at`, `deposit_initiated_at`, `deposit_paid_at`, `account_created_at` |
| `first_open_ip`, `first_open_ua` | audit |

Rules that are easy to get wrong:

**The server decides the step, always.** If the client picks the step from local state, a stale tab
or a hand-edited URL can jump past the agreement or re-enter signing. Every step render asks the
server "where am I", and every step submit is validated against `current_step` server-side.

**Drafts save on debounce, not on submit.** Saving only when a step completes means a gym that
types nine fields and closes the tab has typed nine fields for nothing. Draft writes go to
`step_data` under a per-step key so a partial step 1 can never overwrite a submitted step 1.

**Once `signed_at` is set, steps 1 and 2 are frozen.** The signature hash covers the rendered
agreement, which contains the legal entity name and addresses from step 1. Letting someone edit
those afterwards would silently invalidate the hash. Enforce it in the edge function, not by hiding
the back button — the UI is not a security boundary.

**Signing is a conditional write.** `signed_at is null` as a precondition, so two tabs cannot
produce two signatures.

**No PII in `localStorage`.** Drafts live server-side only. Gym owners use the front-desk computer;
a shared browser holding a cached GSTIN and signatory name is a leak with no upside, since the
server round-trip is what makes cross-device resume work anyway.

Because every transition is timestamped, the admin tab gets the funnel for free: who opened and
never submitted, who read the agreement and didn't sign, who signed and hasn't paid. That is
worth more than it costs to store.

## 5. Security deposit and the payment gateway

### Use Razorpay Payment Links, not an in-page checkout

Three reasons, in order of weight:

**1. The signatory is often not the payer.** The person authorised to sign a placement agreement
frequently has no access to the account that releases ₹50,000. A Payment Link can be forwarded to
whoever holds the bank access; a modal locked inside the signer's browser session cannot. This
alone decides it.

**2. It keeps the CSP intact.** [next.config.mjs](../next.config.mjs) currently sets
`frame-src 'none'`, and Razorpay's Checkout JS needs both a script origin and an iframe origin
allowed site-wide, on every page, for one screen in one flow. A Payment Link navigates off-site
instead and needs **no CSP change at all** — the return trip is a plain redirect back to
`/onboarding/<token>`, which `form-action 'self'` does not restrict. Status polling goes to our own
Supabase function, already in `connect-src`.

**3. One mechanism serves both paths.** The "pay later" email and the in-flow button are the same
link. No second integration for the deferred case.

Razorpay is also already the provider in `mbp-backend`, so credentials, dashboard and webhook
signature conventions are familiar.

### Where the integration lives

For now, on the Supabase side: an edge function to create the link, and a separate one for the
webhook. `mbp-backend` deliberately handles only machine payments, and the user-facing onboarding
flow shouldn't take a dependency on a service we've chosen to defer.

This does mean two Razorpay integrations exist for a while, which is a real cost — noted honestly.
It is tolerable because a deposit is a far simpler money flow than a machine order: one-off, no
dispense coupling, no auto-refund on hardware failure, no state machine. The refund is a manual
admin action 30 days after termination (§5.8). If deposits later move into `mbp-backend` as a
`deposits` capability, that is the correct long-term home.

### Rules that protect the money

- **Verify the amount server-side, in paise, against `gym_terms.security_deposit`.** Never trust
  an amount that came back from the browser.
- **The webhook is the source of truth, not the redirect.** A gym closing the tab after paying must
  still end up marked paid. The redirect updates the UI; the webhook updates the record.
- **Verify the Razorpay signature on every webhook** and reject unsigned calls.
- **Idempotent by `razorpay_payment_id`**, stored unique. Razorpay retries; a replayed webhook must
  not create a second deposit.
- **Never mark paid from a client callback.** Poll our own function, which reads our own record.

**As built (2026-08-22).** Every rule above except the two that need tables is enforced and tested in
[_shared/razorpay.ts](../supabase/functions/_shared/razorpay.ts) — signature verification, the
`payment_link.paid`-only filter, the partial-payment refusal, and `settlesDeposit()` for the paise
comparison against the terms row. The unique-`razorpay_payment_id` index and the record writes land
with the tables in item 9; `parseDepositWebhook` already surfaces `paymentId` as the key to write it
with. See §3 step 4 for why the split falls there.

`deposits` table: `gym_id`, `amount_paise`, `currency`, `razorpay_link_id`,
`razorpay_payment_id` (unique), `status` (`created → pending → paid → failed → refunded`), `method`,
`paid_at`, `receipt_no`, `refunded_at`, `refund_amount_paise`, `notes`.

### A dummy endpoint until the real backend exists

Decision 9: no live Razorpay credentials yet. The link-creation call stands in behind a dummy
endpoint with the same shape the real one will have, so step 4's UI, the pending→paid polling and
the receipt are all exercisable locally without touching a payment gateway. `mockApi.ts` already
produces every state the screen needs — `pending` on the first refresh and `paid` on the second,
because a gym clicking "check now" seconds after paying is the common case, not the edge one.

The pure rules in [_shared/razorpay.ts](../supabase/functions/_shared/razorpay.ts) are written
against the real webhook payload regardless, so swapping the dummy for the live call is a
credentials-and-handler change rather than a rewrite. Signature verification stays mandatory from
the first live call: a deposit endpoint that accepts unsigned webhooks is a way to mark a gym paid
for free.

### GST on the deposit — settled

Decision 11: we issue a **receipt, not a tax invoice**, and charge no GST at collection. A purely
refundable security deposit is not "consideration" for a supply of goods or services under CGST Act
§2(31), so there is nothing to levy GST on when it is taken. An invoice would force us to show a GST
line that should not exist.

The interesting half is the other end. If part of the deposit is later applied against unpaid dues
or forfeited under §5.7, that portion *does* become consideration and needs its own tax document at
that point. §5.9 of v2.2 states both halves, so the gym is not surprised by a tax invoice arriving
after a forfeiture. The `deposits` table's `refunded_at` / `refund_amount_paise` columns are what
make the applied amount computable when that document has to be raised.

Still worth a CA's eyes before the first live receipt — recorded as part of
`v2-2-not-reviewed-by-counsel` in §12 rather than as a separate open question, because it is the same
piece of work.

## 6. Schedule A is a second signing moment

§17.2 requires a Machine Installation & Acceptance Certificate completed **at installation**, and
Schedule A wants Machine ID, serial number, installation date, physical condition and photographs.

None of that exists when the agreement is signed. The machine hasn't shipped.

So Schedule A renders as *"To be completed at installation"* inside the signed agreement, and
becomes a separate signing event: same token mechanism, on a phone, on-site, gym representative and
technician both signing. Schedule H (Machine Return Certificate) works the same way at the other
end of the relationship.

**Revised in v2.3 (2026-08-25).** "Renders as *To be completed at installation*" turned out to mean,
in practice, a printed blank form with two placeholder cells and a ten-item checklist sitting inside
a document being executed electronically. v2.3 replaces the form with a description of what the
certificate records, and the gym's read-only view of that record as it fills in is **step 6**. Same
for Schedule H. See §20.

**Consequence for the build:** make the signature component and the token flow generic enough to
serve all three moments — agreement, installation certificate, return certificate. Building it
specific to the agreement means writing it twice.

Related: §4.1 says the term commences on the Effective Date *or* the installation date, whichever
is later. So `effective_date` (signing) and `commencement_date` (installation) are two different
fields, and the 24-month clock runs from the latter. Don't collapse them.

## 7. Token mechanics

- JWT signed with its own secret, reusing the pattern in
  [`_shared/verificationEmail.ts`](../supabase/functions/_shared/verificationEmail.ts)
- 30-day TTL, scoped to exactly one `gym_id`
- Resendable and voidable from the admin tab; resending supersedes the previous token
- `noindex` on the route, `Disallow: /onboarding/` in [robots.txt](../public/robots.txt)
- Rate-limited on the OTP endpoint

## 8. Front end first

The reporting API in `mbp-backend` comes after the front end. The one decision that stops that
being throwaway work: **define the API contract now.**

`shared/onboarding/types.ts` holds request/response types for every call, alongside a
`mockOnboardingApi` the wizard talks to during phase 1. Phase 2 swaps the implementation, not the
components. The mock must model persistence too — an in-memory session that survives step
navigation — or the resume behaviour goes untested until the real backend lands.

**As built.** Exactly one file binds the wizard to a backend:
[`client/src/lib/onboardingApi.ts`](../client/src/lib/onboardingApi.ts), which exports the singleton
`onboardingApi` and the `IS_MOCK_ONBOARDING` flag the preview banner reads. Nothing under
`pages/onboarding/` imports `mockApi` directly — including the fixed preview OTP, which is
re-exported as `PREVIEW_OTP` rather than imported from the mock at its use site. Keep it that way:
the moment a component reaches past this file, phase 2 stops being a one-file change.

The mock adds 300 ms of latency outside tests, deliberately. Against an instant API the saving
indicator never appears and the disabled-while-submitting states never get looked at, so both ship
broken.

The same applies to the dashboard: it renders against fixtures with honest "awaiting first
settlement" empty states, and the data-access module is the only file that changes when real
numbers arrive.

## 9. Routes

| Route | Page component | Notes |
|---|---|---|
| `/gym-partnership` | `GymPartnership.tsx` | **public, indexed** — the minified partnership |
| `/gym-demo` | [GymDemo.tsx](../client/src/pages/GymDemo.tsx) | unchanged — lead capture |
| `/gym/onboarding/[slug]/[handle]` | `onboarding/OnboardingFlow.tsx` | public, handle-scoped, `noindex, nofollow` + `Referrer-Policy: no-referrer` |
| `/gym/login` | `gym/GymLogin.tsx` | reworked from `Login.tsx`, no signup link; forwards an existing session to the dashboard |
| `/gym/forgot-password` | `gym/GymForgotPassword.tsx` | prose, not a form — there is no self-service reset |
| `/gym/set-password/[handle]` | `gym/GymSetPassword.tsx` | where a relayed reset link lands; `noindex, nofollow` + `Referrer-Policy: no-referrer` |
| `/gym/dashboard` | `gym/GymDashboard.tsx` | `noindex` |
| `/gym/agreement` | `gym/GymAgreement.tsx` | their signed copy, always available |
| `/gym/deposit` | `gym/GymDeposit.tsx` | `noindex` — the "pay later" landing spot |

Removed, with permanent redirects in [next.config.mjs](../next.config.mjs). Next emits **308**,
not 301, for `permanent: true`:

| Gone | Goes to | Why |
|---|---|---|
| `/login` | `/gym/login` | |
| `/account` | `/gym/dashboard` | |
| `/forgot-password` | `/gym/forgot-password` | |
| `/signup` | `/gym-demo` | there is no gym signup — §1. Lead capture is the honest successor. |

One **temporary** redirect (Next emits 307 for `permanent: false`):

| From | To | Why |
|---|---|---|
| `/onboarding/:handle` | `/gym/onboarding/link/:handle` | the flow moved under `/gym/` and gained a name segment. Not permanent: no invite was ever minted at the old shape, so this is a courtesy for a pasted dev link, and a 308 cached in a browser would outlive the reason for it. |

**Why two segments on the onboarding route.** `handle` is the credential; `slug` is the gym's trade
name, so the link a person receives reads as theirs — `…/gym/onboarding/iron-temple-fitness/3f7c…`
rather than a bare hex string after a path nobody recognises. A link that looks like phishing does
not get clicked, and this flow lives or dies on being clicked. The slug is **not** checked against
the handle: the server resolves the gym from `sha256(handle)` and nothing else, so comparing them
client-side would validate a credential against a hint handed over in the same URL — and if the
check ever failed for a gym whose trade name changed between invite and click, it would lock a
partner out over cosmetics.

**Why under `/gym/`.** `public/robots.txt` already carries `Disallow: /gym/`, so both
credential-bearing paths are covered by the existing rule rather than by one somebody has to
remember to add.

**Kept and reworked, not archived:** `ForgotPassword.tsx` and `AuthCallback.tsx`. Password reset is
still needed — gym owners forget passwords too — so these move under `/gym/*` rather than into
`_archive/`. What "reworked" means changed once the backend was designed: see §18.

Per repo convention, `app/` holds metadata-only shells and the components live in
`client/src/pages/`. See the note in the README about that split.

## 10. Removing consumer auth

Next only compiles what is reachable from `app/`, but **`npm run check` type-checks everything and
vitest runs every test file**, so deleting the routes is not enough to stop the old pages
compiling.

- Move [Login.tsx](../client/src/pages/Login.tsx), [Signup.tsx](../client/src/pages/Signup.tsx),
  [Account.tsx](../client/src/pages/Account.tsx) → `client/src/pages/_archive/`
- Move `Login.test.tsx`, `Signup.test.tsx`, `Account.test.tsx` → `client/src/__tests__/_archive/`.
  Tests live in `client/src/__tests__/pages/`, not beside the pages.
- Add both `_archive` paths to `exclude` in [tsconfig.json](../tsconfig.json) **and** to the vitest
  `exclude` in [vitest.config.ts](../vitest.config.ts). Note tsconfig currently excludes
  `**/*.test.ts` but **not** `**/*.test.tsx`, so the archived tests stay type-checked unless
  excluded explicitly.
- Delete `app/login/`, `app/signup/`, `app/account/`; add redirects in
  [next.config.mjs](../next.config.mjs)
- Update the nav links in [Navbar.tsx](../client/src/components/layout/Navbar.tsx) — "My Account"
  becomes "Gym Login"
- Undeploy the `auth-signup` edge function (consumer-only), and `send-email` along with it
  (TODO A3)

**This closes TODO A2.** The user-writable `wallet_balance` read at `Account.tsx:109-118` is the
vulnerability, and it leaves with the file. The replacement must not repeat the pattern: no
business state in `user_metadata`, which is writable by the user who owns the token. Gym financials
live in Postgres and are read through an authenticated endpoint. The token carries identity only.

## 11. Data model

New migration. **Every table gets `alter table ... enable row level security` in the same file** —
see [supabase-gotchas.md](supabase-gotchas.md) §1. No policies needed; every legitimate writer is
an edge function using `service_role`, which bypasses RLS.

| Table | Purpose |
|---|---|
| `gyms` | legal entity, entity type, trade name, GSTIN, FSSAI, addresses, notices block (§41), status |
| `gym_onboarding` | the resume state described in §4 |
| `gym_users` | `auth.users.id` → `gym_id`, role (`owner` / `manager`) |
| `machines` | `gym_id`, **`device_no`** ← the join key to `mbp-backend`, model, serial, value, install date, location, accessories, status |
| `gym_terms` | per-gym commercials: deposit, term, ratio before/after, milestone cups + **cumulative net profit**, ad ratio, electricity rate, early-termination charge |
| `agreements` | version, populated field values, content hash, token id, status, sent/viewed/signed timestamps |
| `agreement_signatures` | signatory name, designation, email, timestamp, IP, UA, OTP record, content hash, checkbox flags |
| `deposits` | the payment record described in §5 |

Deferred to the dashboard phase: `cost_schedule` (§7.3, effective-dated), `ad_revenue` (§9),
`settlements` (§8).

`gym_terms` exists as a table rather than constants because Schedule B carries per-gym variation: the
deposit and the ratios are negotiable in practice, and decision 4 makes the deposit explicitly
backend-settable while keeping ₹50,000 as the standard. Hardcoding ₹50,000 and 80:20 guarantees a
schema migration on the first exception, and the deposit amount is load-bearing in both a payment flow
and §5.1's own text — which is why `rupeesInWords()` derives the words from the same integer rather
than the clause carrying "Rupees Fifty Thousand Only" as fixed prose. Defaults come from
`shared/partnership/summary.ts` (§2) so the public page and a new gym's terms start identical.

## 12. The agreement content model — and what used to block it

**As built (2026-08-22), with the file list brought up to date on 2026-08-25 (§20, §22).**

| File | What it is |
|---|---|
| [types.ts](../shared/agreement/types.ts) | the document model — `Block` union, `Section`, `Agreement`, `AgreementFields`, `Blocker` |
| [v2_3.ts](../shared/agreement/v2_3.ts) | the version the flow issues, and the only one in the repository: 47 sections and Schedules A–H as data, plus `AGREEMENT_V2_3_CHANGES` |
| [issued.ts](../shared/agreement/issued.ts) | the one place that decides which version is issued, and pairs it with its summary panel and the missing-token policy |
| [render.ts](../shared/agreement/render.ts) | `renderText` / `renderPlainText` / `collectBlockers` / `canIssue` / `sha256Hex` / `fingerprint` |
| [goldenVector.ts](../shared/agreement/goldenVector.ts) | `GOLDEN_V2_3` — pinned fields, length and hash, copied verbatim by `mbp-backend` |
| [plainLanguage.ts](../shared/agreement/plainLanguage.ts) | `PLAIN_LANGUAGE_V2_3` (12 items) — the "In short" summary |
| [amountInWords.ts](../shared/agreement/amountInWords.ts) | `rupeesInWords()`, Indian numbering, so §5.1's figure and its words come from one integer |
| [agreement-v2-3.test.ts](../client/src/__tests__/shared/agreement-v2-3.test.ts) | the document: internal consistency, no blank form, the surprising clauses, the pinned hash |
| [agreement-render.test.ts](../client/src/__tests__/shared/agreement-render.test.ts) | the renderer on its own terms: substitution, the missing-token policies, determinism, marker ordering |
| [amount-in-words.test.ts](../client/src/__tests__/shared/amount-in-words.test.ts) | 40 tests, weighted to the teens and the empty-group cases where Indian grouping goes wrong |

`v2_1.ts`, `v2_2.ts` and their suites were deleted on 2026-08-25 (§22). Nothing has ever been signed
against either, and the machinery for rendering a record from a version other than the issued one went
with them. The transcription history below is kept because it is why the current text says what it says.

`collectBlockers()` **derives** the blocker list by walking the tree for `kind: "todo"` — there is no
hand-maintained checklist to go stale. `canIssue(agreement, fields)` returns `ok: false` while any
`blocks-send` marker or unfilled token remains; `needs-review` and `cosmetic` don't block. Callers
must treat `ok: false` as a hard stop, not a warning.

`todo` blocks are excluded from `renderPlainText`, so they never enter the hash. Otherwise clearing a
cosmetic transcription note would invalidate signatures on clauses that never changed.

Each version module holds all forty-seven sections and Schedules A–H as **structured data** —
headings, clauses, bullet lists, tables — not an HTML blob. Placeholders are typed:

```
gymLegalName, effectiveDate, machineModel, machineId, serialNumber, machineValue,
installationDate, installationAddress, accessories, securityDeposit,
securityDepositInWords, termMonths,
mbpNotices{address,email,phone}, gymNotices{address,email,phone},
signatoryName, signatoryDesignation
```

One module feeds three consumers: the React reader, the PDF builder, and a plain-text renderer
used for hashing. They must never diverge, which is why it is data and not markup.

A field stays on `AgreementFields` after the document stops using it. `mbpNotices.phone` is the live
example: §41 dropped the phone channel at 2.2 and the field stayed, because the type is the contract
between the state and the renderer, and removing a token's field the moment one clause stops printing
it turns a future re-add into a schema change.

The issued version's hash is pinned by a test against a fixed fixture in
[goldenVector.ts](../shared/agreement/goldenVector.ts), and that file says in terms that a failing
pin is never fixed by editing the expected value.

### Unfinished content in the source PDF — all resolved in v2.2

The PDF could not be transcribed as-is and could not be sent. Every row below had a marker in the 2.1
transcription; the **Resolved in v2.2** column says what closed it. The decisions behind those
resolutions were taken on 2026-08-22 and are recorded in full further down this section.

The table is the reason the current text reads as it does, and it is the surviving record of that
work: 2.1 and 2.2 were themselves deleted on 2026-08-25 (§22), so nothing in code now maps a marker
id to its fix. Read a row as history — the clause it names is settled in 2.3, and
[agreement-v2-3.test.ts](../client/src/__tests__/shared/agreement-v2-3.test.ts) asserts the
settlement (one milestone trigger, a named forum, a Nil exit charge) rather than the marker's absence.

| Location | `id` | Severity | Problem in v2.1 | Resolved in v2.2 |
|---|---|---|---|---|
| §4.4 | `s4-4-empty` | blocks-send | dangling clause number, no text | clause deleted; §4 stops at 4.3, nothing renumbers |
| §6.1 | `s6-1-no-heading` | blocks-send | no heading at all — the number is followed by a callout box titled "UPDATED COMMERCIAL MILESTONE", which reads as a change note left in the document | headed "Profit-Sharing Milestone" with real clause text; the change-note line is gone |
| §6.3 | `s6-3-empty` | blocks-send | "Milestone Interpretation" heading with an empty body | five sub-clauses 6.3.1–6.3.5 |
| §6, §6.2, §21.5, Sch B, Sch C | `s6-milestone-ambiguity` | blocks-send | **the document states two different triggers for the 50:50 step** — see below | one trigger: earlier of 15,000 cups or ₹5,00,000 cumulative **Net Profit** (§7), worded identically in all five places |
| Schedule C step 4 | `schedule-c-step4-conflicts-with-s6-1` | blocks-send | same conflict, marked where a reader of Schedule C alone would hit it | restates §6.1's earlier-of test and points at §6.3; worked example added |
| Schedule B | `schedule-b-unlabelled-ratio-rows` | blocks-send | profit-share rows `80:20` and `50:50` float without a "Cups 1–15,000 / Cup 15,001+" label column, and the ₹5,00,000 trigger is absent entirely | "Profit Share, before/after the Milestone" rows plus an explicit Milestone row; FBO and forum rows added |
| Schedule B | `schedule-b-early-termination-charge` | blocks-send | "Early Termination Charges: `[TO BE AGREED]`" — and §36.2 points at this row for the amount owed on early exit, so the exit price is undefined while §36.1 grants the right to exit | **Nil**, conditional on §36.1's 30 days' written notice; §36.2 states it directly instead of pointing at a schedule row |
| §46 | `s46-dispute-mechanism-missing` | blocks-send | refers disputes to "the dispute-resolution mechanism agreed by the Parties", a mechanism the Agreement never specifies, and defers arbitration/seat/venue/jurisdiction to counsel. As drafted there is **no forum** | Indian law, 30-day escalation, then the exclusive jurisdiction of the courts at Gautam Buddha Nagar; arbitration expressly not agreed |
| §21.5 | `s21-5-revenue-milestone-omitted` | needs-review | preserves "the cumulative cup count or the 15,000-cup milestone" across a relocation, silent on the ₹5,00,000 milestone — so read strictly, relocation resets the test that actually governs | preserves cups, cumulative Net Profit and the Milestone, cross-referring to §6.3.1 |
| §10.3 | `s10-3-table-truncated` | needs-review | the reimbursement table stops at 4,000–4,999 with no "and above" row, so it reads as a ₹4,000 cap even though §10.4 states the rule generally | lead-in says the table illustrates and does not cap; "5,000 and above" row added |
| §24.6 | `s24-6-fbo-unresolved` | needs-review | defers the FSSAI Food Business Operator allocation to a consultant "before execution", so neither party knows who holds the licence for the food being dispensed | **MuscleBoxPro is the FBO** and holds the licence at its own cost; the Gym must not hold itself out as the operator. Same in Schedule F |
| §33.3 | `s33-3-indemnity-not-final` | needs-review | "Final indemnity language shall be reviewed by legal counsel" — a clause advertising its own provisionality to the counterparty | deleted; §33.2 gained a food-safety indemnity in the Gym's favour |
| §34 | `s34-liability-cap-undetermined` | needs-review | describes a cap to be "determined by legal counsel" instead of setting one, which means it has none | rewritten in four clauses: consequential loss excluded, **no monetary cap** on direct loss, the Gym's profit share expressly outside the exclusion, non-excludable liability preserved |
| Cover | `cover-execution-note-unresolved` | needs-review | an execution note deferring stamp duty, tax, FBO, arbitration and jurisdiction to advisors | note removed; all five settled in the body. Replaced by one honest marker — see below |
| §6 callout | `s6-1-mojibake` | cosmetic | mojibake where `₹` should be: `? ?5,00,000`, and the bullet glyphs are `?` too. Transcribed with the intended characters restored | written as TypeScript source with real characters; a test greps for the corruption returning |
| §5.1 | `s5-1-amount-in-words` | cosmetic | "Rupees Fifty Thousand Only" is fixed text beside a tokenised figure, so a negotiated deposit would produce a clause whose figure and words disagree | `{{securityDepositInWords}}`, produced by `rupeesInWords()` from the same integer as the figure |
| Header | `cover-version-mismatch` | cosmetic | cover page and every page footer say "Version 2.0", filename says v2_1 | version string, cover and footer all read 2.2 |

Seventeen rows for eighteen markers. The eighteenth, `schedule-a-second-signing`, is **carried into
v2.2 unchanged** — it is not a defect in the drafting but a note that Schedule A cannot be completed
at signing time because the machine has not shipped, which is §6 of this document and build item 9's
work. A marker that describes a real-world sequencing fact should survive a redraft.

Two of the rows were worse than formatting gaps, and both drove decisions rather than edits:

**The milestone conflict.** §6.1 set the 50:50 step at *the earlier of* 15,000 completed paid cups
or ₹5,00,000 cumulative gross. §6.2's heading said "After 15,000 Cups". Schedule B and Schedule C
step 4 said "Cups 1–15,000 = 80:20, Cup 15,001 onward = 50:50" and never mentioned revenue. §43 makes
the Schedules part of the entire agreement, so this was a conflict on the face of the document, not
an inconsistency between a summary and the real thing. It was also material: at ₹120 a cup ₹5,00,000
of *gross* arrives at ~4,167 cups, so §6.1 stepped up roughly **3.6× sooner** than Schedule C did,
and the 15,000-cup figure was dead text at any selling price above ~₹33. Decision 1 moved the second
test to cumulative **Net Profit** as §7 defines it, which puts the crossover at ₹33.33 of *margin* a
cup — inside the real operating range, so both tests are live. See §14.

**§46 had no forum.** A 24-month agreement carrying a ₹50,000 deposit, with an operative dispute
clause pointing at a mechanism the document never defined. Decision 3 chose courts over arbitration:
for a deal this size the arbitration machinery costs more than the amounts in dispute, and an
arbitration clause with no institution, seat or appointment procedure is worse than none.

Beyond those: §5.7 and §20.5 hardcoded "₹50,000" as the damage threshold in the PDF. Both are
tokenised as `{{securityDeposit}}` in each version, and a test asserts that a gym with a ₹75,000
deposit gets ₹75,000 in both clauses and no stray ₹50,000 anywhere in the document.

**Our own notices block.** `MBP_NOTICES` in
[agreementFields.ts](../shared/onboarding/agreementFields.ts) now reads "BlendBox Innovations LLP,
Sector 75, Noida, Uttar Pradesh 201301, India", and `phone` is deliberately `""`. Decision 8: we do
not publish a number for notices, so §41 offers address and email only and says in terms that
telephone is not a channel for formal notice. A channel a gym cannot actually use is worse than one
the clause never offers, because a notice attempted down it and missed is still arguably served. The
gym's number stays in the clause labelled as an operational contact. `phone` stays on
`AgreementFields` for the reason given above.

What remains is the missing building/street line, carried as `s41-mbp-address-incomplete`
(needs-review, not blocking): post to the sector and PIN will plausibly arrive and email is the
primary channel, but it should be replaced with the registered office exactly as it reads on the LLP
incorporation certificate before the first agreement is executed. That is a data change, not a
content change, so it does not need a new version. The gym's side uses its **registered** address
rather than the installation address — a notice served at a gym floor is not a notice served on the
entity.

`todo` markers still show a visible warning banner in dev and still **block sending in production**
on `blocks-send`. 2.3 has none, so that path is dormant rather than dead: it is what stops the next
version being issued half-drafted.

### The thirteen decisions (2026-08-22)

Every one of v2.1's open items came down to a commercial choice rather than a coding problem. These
are the answers, and they are the reason v2.2 exists:

| # | Question | Decision |
|---|---|---|
| 1 | The milestone trigger for 50:50 | Earlier of 15,000 paid cups **or ₹5,00,000 cumulative Net Profit** — not cumulative gross |
| 2 | Schedule B's early-termination charge | Nil; the Gym's exit price is one month's notice, not a payment |
| 3 | Arbitration seat and venue for §46 | No arbitration. Indian law, courts at Gautam Buddha Nagar |
| 4 | Is the ₹50,000 deposit fixed or per-gym? | Fixed as standard, but settable per gym from the backend — hence `rupeesInWords()`, so §5.1 cannot state one amount as a figure and another in words |
| 5 | §10.3 — cap or continue? | Continues. ₹1,000 per completed 1,000 cups with no ceiling; the table is illustrative and the ₹4,000 row is not a maximum |
| 6 | §24.6 — who is the FSSAI FBO? | MuscleBoxPro. It follows from §§14, 15, 24.3 and 25.1 — we control every food-handling step |
| 7 | §34 liability cap | None. Consequential loss excluded both ways, direct loss uncapped both ways |
| 8 | Registered office and notices phone | Sector 75, Noida 201301; phone left blank and §41 rewritten to drop the channel |
| 9 | Razorpay live credentials | Not yet. A dummy endpoint stands in until the real backend API exists — see §5 |
| 10 | Authorisation for a production build | Withheld. Complete and test locally first. `IndexNowPlugin` POSTs 30 live URLs to `api.indexnow.org` on any production client build, so this is not a formality |
| 11 | GST on the refundable security deposit | A **receipt, not a tax invoice**. A refundable deposit is not "consideration" for a supply under CGST Act §2(31), so no GST at collection. §5.9 also covers the case where part is later applied or forfeited, which *is* consideration and needs its own tax document |
| 12 | Stamp duty | Removed from the document; agreements are issued unstamped |
| 13 | §33.3 / §4.4 / §6.1 heading / §6.3 | Drafted in-house. The PDF is for local reading and testing; the real document is generated by the website |

Two of these carry risk that is now **accepted rather than closed**, and both are recorded where
somebody will trip over them rather than only here.

**Unstamped instruments.** Deleting the stamp-duty section removed the reminder, not the liability.
An unstamped instrument can be inadmissible in evidence until stamped with penalty, which matters
precisely when the agreement is needed — in a dispute. Kept in the cover marker's `problem` text so
it surfaces in the internal banner on every preview.

**No outside review.** v2.1 could only be wrong by mis-transcription; v2.2 can be wrong by drafting.
§§5.9, 6.1/6.3, 24.6, 34, 36.2 and 46 were settled commercially and written in-house, with no Indian
legal counsel, CA or food-law consultant having read them. That is the standing
`v2-2-not-reviewed-by-counsel` marker on the cover — `needs-review`, so issuing v2.2 is a knowing
decision to carry the risk rather than an oversight. It clears when counsel reviews §§33, 34, 36 and
46, a CA confirms §5.9 and the stamp position for the state of execution, and a food-law consultant
confirms §24.6 and Schedule F. Either delete it then or issue v2_3 with their wording.

Click-to-accept with a typed name and an audit trail is a valid electronic record under India's
IT Act 2000 §10A for this contract type.

## 13. Gym dashboard

Built on fixtures in phase 1, wired in phase 4. The cards:

- **Machine** — model, serial, status, install date, last service
- **Cups sold** — this month, lifetime, and a **progress bar to the 15,000-cup / ₹5,00,000
  milestone** with "your share moves to 50% at…". Straight from §6 and the single most motivating
  number a gym owner can see.
- **Revenue collected** — gross, ex-GST
- **Net profit** and **current share %**
- **Your payout** — provisional this month, plus the last settled statement
- **Electricity reimbursement** — earned this review period, cups to the next ₹1,000 block
- **Advertising share** — separate card, labelled 80/20 regardless of the shake ratio (§9.4)
- **Statements** — settled months (§8.3: within 15 days of month-end), downloadable
- **Deposit status** — paid and held, or a persistent pending banner with the payment link

Two judgement calls:

**Label live figures "Provisional — settles by the 15th".** §8.3 makes the monthly statement the
thing that is owed. A gym treating a mid-month number as a debt is a support conversation you don't
want.

**Show direct variable costs as a single aggregate, not per-unit.** §40 confidentiality runs both
ways, and per-unit ingredient costs are commercially sensitive pricing. The gym needs the total to
verify net profit; it does not need your cost schedule.

### As built (2026-08-22)

Nine cards, all on [gym/fixtures.ts](../shared/gym/fixtures.ts), all deriving through
[compute.ts](../shared/settlement/compute.ts): cups (with the milestone bar), revenue, net profit
and share, payout, electricity, advertising, machine, statements and agreement, and the deposit.
`useSnapshot()` at the top of the file is the one line item 11 replaces.

Four things the screen says that a simpler version would not:

**The milestone bar tracks the test that binds, not the headline.** At the fixture's position —
3,460 cups and ₹4,15,200 of ₹5,00,000 — the bar reads **83%** and the caption says the step-up is
about **707 cups** away. A bar tracking the 15,000-cup figure would read 23% and imply years. The
caption also names which test is being tracked and why, because a gym owner who has read §6 will
otherwise assume the bar is wrong.

**A split month says so on the card.** When the milestone falls mid-month the profit card shows both
rates, the cup counts either side, and the blended effective percentage. Silently showing "50%" next
to a payout that is not 50% of net profit is the version of this screen that generates a support
ticket and a trust problem in the same afternoon.

**Electricity counts cups to the next *increase*, not to the next block.** Below two blocks those
differ, because §10.2's ₹1,000 minimum already pays what the first block would. "600 more cups earns
you another ₹1,000" is false at 400 cups in a window; 1,600 is true.

**An outstanding deposit is a banner, not a card.** A gym that deferred at step 4 is trading with a
receivable against it — a state we deliberately allow (§3, step 4) — and it should not be
discoverable only by scrolling. The banner carries the Payment Link, because the person reading the
dashboard is often not the person who releases payments.

The one number on the screen that is *not* recomputed is a settled month's payout: `Statement`
carries what was actually paid. A settled month is history, and recomputing it would let a later
`gym_terms` amendment silently rewrite what a gym has already been paid and shown.

## 14. Settlement maths

One tested pure module, `shared/settlement/compute.ts`. Derived from §§6–10:

- `net_profit = gross_ex_tax − direct_variable_costs` (§7)
- Ratio 80/20 until the earlier of **15,000 completed paid cups** or **₹5,00,000 cumulative Net
  Profit**; 50/50 after (§6.1, §6.3, Schedule B, Schedule C step 4 — all four now say the same thing)
- **The milestone can split a month.** Cups running 14,900 → 15,100 inside one month means two
  ratios in one settlement. Handle it, or you will under- or overpay on exactly one month per gym —
  and it will be the month they are paying closest attention.
- **Both tests are live, which is the point of decision 1.** The second test was ₹5,00,000 of
  cumulative *gross* in v2.1, reached at `500000 / ASP` cups — about **4,167 cups at ₹120** — so it
  fired first at any selling price above roughly **₹33 a cup** and the headline 15,000 figure was
  dead text. Against cumulative **Net Profit** the crossover is ₹33.33 of *margin* per cup, which
  sits inside the real operating range: a high-margin gym crosses on profit, a thin-margin one
  crosses on cups. `bindingMilestone()` in [summary.ts](../shared/partnership/summary.ts) computes
  which one binds at the gym's actual figures, so nothing in the UI assumes either;
  `/gym-partnership` says "whichever comes first" and prints the real cup count.
- **Cumulative net profit is not monotonic, so the milestone ratchets.** A loss month reduces the
  cumulative figure, and without a latch a gym could cross ₹5,00,000, drop back under it and be
  silently demoted from 50:50 to 80:20. `CumulativeAtPeriodStart.milestoneAlreadyReached` is a
  one-way flag: once set it is never cleared, and §6.3.4 says so in the contract. The cup test needs
  no equivalent because cup counts only rise.
- Advertising always 80/20, never re-ratioed (§9.4)
- Electricity: ₹1,000 per completed 1,000 paid cups **per three-month review window**, floor
  ₹1,000, no carry-forward (§10.4–10.6). Window-scoped, not monthly.
- Relocation does not reset the cup count (§21.5) — cumulative is per gym-machine relationship,
  not per installation
- Cup count excludes cancelled, refunded, failed payment, failed dispense, test and complimentary
  transactions (§6.4)

That last exclusion list maps exactly onto states the `mbp-backend` payment state machine already
distinguishes, so it is a projection over existing data, not new bookkeeping.

### As built (2026-08-22) — moved forward from item 11

`compute.ts` was scheduled with the reporting API in item 11 and was built in item 8 instead. The
reason is that every §13 card is a *derived* quantity — net profit, current share, payout,
electricity earned, cups to the next block, milestone progress — so a dashboard "on fixtures" either
derives them or has them typed into the fixture by hand. Hand-typed figures beside computed ones is
exactly the drift this module exists to prevent, and the fixture always wins the argument in a demo.
Item 11 now swaps the data source, not the maths. 31 tests in
[settlement.test.ts](../client/src/__tests__/shared/settlement.test.ts).

Two decisions the agreement does not make, both taken here and both flagged in the code:

**A loss period pays the gym nothing rather than billing it for a share of the loss.** The gym has no
cost exposure under this agreement — no machine cost, no ingredients, no processing fees — and
nothing in §§6–8 creates a claim against it, so a month where costs exceeded sales is MBP's loss
entirely. `gymShareInr` floors at zero and `mbpShareInr` carries the whole negative.

**§10.3's truncated rate table is extrapolated, not read as a cap** — and decision 5 confirmed it.
The table in the PDF stopped mid-row at "4,000-4,999", which read literally capped the reimbursement
at ₹4,000. §10.1's rule is the operative sentence and `computeElectricityWindow` follows it linearly,
so 10,000 cups in a window pays ₹10,000. v2.2 makes the code and the contract agree: the table gains
a "5,000 and above" row and a lead-in saying it illustrates the rule and does not cap it. No code
changed here — the decision retired a `needs-review` marker rather than a behaviour.

Three implementation notes:

**The milestone split pro-rates at the period's average selling price.** Exact only if price was flat
across the period. The function composes over any period length, so the fix if it ever matters is to
call it with daily buckets rather than to complicate it — and there is a test asserting that two
half-months give the same total as one whole month.

**A non-positive threshold in `gym_terms` means "not configured", never "already met".** A zero cup
count read the other way would hand every gym 50% from its first cup: a wrong answer that costs money
and looks like a feature. Same for a missing electricity rate, which pays nothing rather than
inventing a floor.

**Percentages and rupees are guarded at the boundary.** These inputs arrive over the network in item
11, and a `NaN` reaching the arithmetic renders as "₹NaN" on a partner's dashboard.

## 15. Reporting data — deferred

`mbp-backend` has no read API today, deliberately: its README states *"no browser ever calls this
API"* and *"No admin API"*. It is machine-facing, GS-header-authenticated, no CORS.

It does already carry `gsi2-device`, keyed `deviceNo` / `createdAt` and annotated *"dashboard
history"*, so the access pattern was anticipated.

When it is built, the shape that preserves that invariant is a **BFF**: browser → Supabase edge
function → `mbp-backend` reporting endpoint. The edge function authenticates the gym's JWT, resolves
its `device_no`s, calls the reporting endpoint with a service secret, joins against `cost_schedule`
/ `ad_revenue` / `settlements` / `gym_terms`, and runs `compute.ts`. The browser never touches AWS.

`mbp-backend` can answer cup counts and gross sales. It cannot answer "profit" — costs, advertising
revenue and settlement records live in Postgres, on this side.

**The response shape already exists.** [gym/portal.ts](../shared/gym/portal.ts) is
`GymPortalSnapshot`, written in item 8 from what §13's cards need, and the dashboard renders nothing
else. The split of work it fixes: the endpoint returns raw facts — cups net of §6.4's exclusions,
gross ex-GST, the cost total, the cumulative opening counters, the boundaries of the current
electricity review window — and the browser derives every rupee through `compute.ts`. Anything needing
a calendar, a device lookup or a join is the endpoint's; anything needing §§6–10 is not.

Note the window boundaries in particular. Which three-month electricity window a gym is in depends on
when *its* first window opened, which is a fact about that gym's record and not about today's date, so
the browser must not reconstruct it.

**~~When that endpoint lands, add its host to `connect-src`~~ — not needed, checked 2026-08-23.**
The BFF is the reason: the browser calls `supabase.functions.invoke`, which is the
`*.supabase.co` origin already on the allowlist, and the edge function calls `mbp-backend`
server-side. `connect-src` is now a named `CONNECT_SRC` array in
[next.config.mjs](../next.config.mjs) carrying that note, and the inverse warning with it — an
`execute-api.*.amazonaws.com` entry appearing there means something is calling AWS straight from
the browser, which would put a service secret in client code. The CSP is still an allowlist that
`next dev` does not apply the same way, so anything that genuinely does need adding fails **in
production only**.

**As built so far (2026-08-23).** Everything on this side of the missing endpoint, so that the
endpoint landing is a single function body and not a refactor:

- **[gym/portalSchema.ts](../shared/gym/portalSchema.ts)** — runtime validation of the response.
  `GymPortalSnapshot` is erased at build time, and the response crosses two trust boundaries
  (`mbp-backend` → edge function → browser). `compute.ts` clamps its own inputs, but not every
  rendered figure goes through it: `statementTotalInr` adds `gymPayoutInr + electricityInr`
  directly and `formatInr(NaN)` is the string "₹NaN". `documentUrl` and `deposit.paymentUrl` both
  reach an `href`, so `javascript:` in either is script execution on a page holding a Supabase
  session — the scheme is allowlisted rather than trusted. A `satisfies z.ZodType<...>` line makes
  drift a `tsc` failure in both directions, verified by breaking it each way. 38 tests.
  It found one defect immediately: the fixture's `contentHash` was 65 characters.
- **[lib/gymPortalApi.ts](../client/src/lib/gymPortalApi.ts)** — the seam, same shape as
  `onboardingApi.ts`. Async *now*, while it still returns a fixture, because a synchronous
  `return DEMO_GYM_PORTAL` means the dashboard has no pending or error path and both would get
  written for the first time on the day the network is introduced.
- **Dashboard states** — `useQuery` plus card-shaped placeholders and a failure panel, both inside
  the page frame so a gym whose figures will not load can still sign out. The failure panel is
  deliberately not zeros: `compute.ts` clamping to ₹0 is right as a guard and wrong as an answer,
  because a gym owed ₹5,870 and shown ₹0 cannot tell that from a bad month. No field names,
  validation issues or exception text on screen; those go to the console.

**Still blocked, and not faked:** the `mbp-backend` reporting endpoint itself (separate repo, no
AWS credentials configured, nothing deployed) and the edge function, which needs `gym_terms`,
`cost_schedule`, `ad_revenue` and `settlements` — the tables parked with item 9.

## 16. Build order

| | Work | Est. |
|---|---|---|
| 1 | Remove consumer auth (§10) — **done 2026-08-22** | ½ d |
| 2 | `shared/partnership/summary.ts` + `/gym-partnership` page (§2) — **done 2026-08-22** | 1½ d |
| 3 | `shared/agreement/{types,render}.ts` + the document (§12) — **done 2026-08-22**; 2.2 issued 2026-08-22, unblocked; 2.3 on 2026-08-24, sole version from 2026-08-25 (§22) | 1½ d |
| 4 | Wizard shell — token route, server-driven step, draft autosave, resume, mobile (§4) — **done 2026-08-22** | 2½ d |
| 5 | Steps 1, 2, 5 UI — **done 2026-08-22** | 2 d |
| 6 | Step 3 — reader, plain-language panel, scroll gate, sign panel — **done 2026-08-22** | 2 d |
| 7 | Step 4 — deposit UI, Razorpay Payment Link, webhook, receipt (§5) — **done 2026-08-22**, functions deferred to 9 | 2 d |
| 8 | `/gym/login`, `/gym/forgot-password` + dashboard on fixtures (§13) — **done 2026-08-22**, absorbed `compute.ts` | 2 d |
| | **front end** | **~14 d** |
| 9 | Tables + edge functions + OTP + PDF + email — **parked 2026-08-23**, no real customers yet | 5 d |
| 10 | `local_dashboard` Gyms tab — **skipped**; TODO A4's amount validation **done 2026-08-23** | 1½ d |
| 11 | Reporting API + real dashboard numbers — **client side done 2026-08-23**, endpoint blocked | 4 d |

Items 9–11 stopped being a sequence on 2026-08-23. Item 9 was parked because there are no real
customers to persist, which took the tables with it; item 10's Gyms tab was skipped because its core
action — *demo request → create gym + machine + terms → send onboarding link* — has nowhere to write
without them, and `demo_requests` has eight columns and no status field, so it cannot even record
that a link was sent. What did get done in item 10 was the other half: A4's server-side `totalAmount`
validation ([orderAmount.js](../local_dashboard/lib/orderAmount.js)), which was never blocked on
anything and was the load-bearing part, since the GS digest covers only the headers and never the
body. Item 11 then went as far as it can without a backend — see §15.

`/gym-partnership` comes early on purpose: it is publicly useful the day it ships, independent of
every backend decision, and it forces `summary.ts` into existence before three screens start
hardcoding ₹50,000.

Item 3 shipped as structure with the gaps marked rather than waiting on legal, which was the right
trade: items 4–6 could be built and demoed against the real document tree, and `canIssue()` guaranteed
nothing reached a gym until the eight `blocks-send` items cleared. All eight were cleared at 2.2, and
the marker machinery is what made that a mechanical exercise rather than a re-read — see §12.

Item 4 went slightly past a shell in one place and stopped well short in three. Step 1 is a **working
form** — all eleven fields, shared-schema validation, autosave, live agreement preview — because a
shell with five placeholder screens proves nothing about autosave, resume or server-side field
errors; one real form proves all three. Steps 2 to 5 are scaffolds with their plumbing wired and a
visible build note: step 2 renders that gym's own commercials, step 3 renders and hashes the real
agreement and shows the blocker list, step 4 prices the deposit off the terms row, step 5 sets a
password. What is missing is the copy, the layout and — in step 3 — the entire reading experience,
which is the actual work in items 5 to 7. The flow is walkable end to end at `/onboarding/demo`
today; `expired-demo` and `revoked-demo` show the terminal screens.

Item 5 finished steps 1, 2 and 5 and produced one thing that was not in its scope:
[shared/machine/spec.ts](../shared/machine/spec.ts). Step 2 needed the machine's dimensions, `/specs`
already had them inline, and typing "76×60×180" a second time is how two surfaces end up disagreeing
about the same hardware — so it was extracted and `MachineSpecs.tsx` repointed at it. Schedule A
should read from it too when item 9 renders the PDF.

Steps 3 and 4 remained scaffolds at the end of item 5. That was deliberate: step 3's real work is the
reading experience on a 390px screen and step 4's is the Razorpay round trip, and neither is a copy
pass. The test file grew from 15 to 20 cases, four of them asserting content rather than plumbing —
the five clause references on step 2, the machine panel, the milestone phrasing, and that a deferred
deposit still reads as owed on step 5. Those four are guarding editorial decisions that a future
redesign could quietly drop, and they are cheap insurance on the two screens where being honest
matters more than being tidy.

Item 6 split into three files rather than one big step component, because the reader and the sign
panel have nothing to do with each other: one renders a document and reports how far through it you
are, the other collects assent and a code. The step composes them and owns the single thing that
spans both — the hash. Two things it surfaced that are worth flagging rather than burying:

**The scroll gate cannot be an `IntersectionObserver` under test.** `client/src/test/setup.ts` stubs
both observers as no-ops that never fire, and happy-dom's `getBoundingClientRect()` returns zeros, so
a sentinel-based gate would have left the sign panel permanently locked in every test — the flow walk
included. The measured-percentage approach with an explicit zero-height branch is both testable and a
better experience, since it can show a "% read" figure a boolean cannot.

**The effective date is hashed client-side.** Recorded above under step 3 as a build-item-9 blocker;
it is a real correctness bug the moment the server starts producing the PDF, not a nitpick. (Fixed
2026-08-24: the record pins its own effective date and the server hashes at that date — §21, §22.)

The test count went 20 → 24 on the flow (four step-3 cases: the eight linked clauses, the whole
document rendering with a live hash, that one checkbox is not assent, and that a wrong code fails
visibly) and 31 → 37 on the agreement (six cases tying the plain-language panel to v2.1's real
clause numbers and figures). Step 4 is the last scaffold left in the wizard.

Item 7 finished it, and `StepScaffold.tsx` was deleted along with it — no callers left, and its own
docstring said it should go when the flow stopped being a demo. Two things about how it landed:

**Item 7's stated scope included the webhook, and half of it was genuinely not buildable.** The
create-link and webhook functions need the `deposits` and `gym_onboarding` tables and live Razorpay
credentials; a handler written against absent tables cannot be run, tested or reviewed. Rather than
either claim the item done with no webhook code or write something unverifiable, the split fell at
purity: `_shared/razorpay.ts` holds every rule that is decidable without a database — signature,
event filter, amount source, partial-payment refusal, settlement comparison — with 13 tests, and the
persistence lands in item 9. That is where a silent bug would otherwise have lived unexamined until a
gym's ₹50,000 went missing.

**Polling our own record turned out to remove work, not add it.** The obvious design is to handle
Razorpay's redirect back to `/onboarding/<token>`. But the redirect is neither trustworthy nor
guaranteed — a gym that pays and closes the tab, or whose accountant pays from a *forwarded* link on
another device, never comes back to the page at all. One poll against our own record covers every
path, so there is no return handler, no query-param state, and nothing to get wrong about a URL a
gateway controls.

Test counts after item 7: 27 on the flow, 31 on the mock API, 13 on the Razorpay module — 529 in the
suite, with the same 29 pre-existing failures in `home`, `ContactUs`, `Advertiser`, `GymDemo` and
`static-pages` that predate this work.

Item 8 turned out to be half already done and half bigger than billed. `/gym/login` and
`/gym/forgot-password` were built in item 1, when consumer auth came out — login has no signup link
by design, and there was nothing to add. What was left was the dashboard, and the honest version of
"a dashboard on fixtures" pulled `compute.ts` forward out of item 11; the reasoning is in §14 and the
short version is that a fixture full of hand-typed payouts proves nothing and drifts immediately.

The ordering that fell out of that is better than the one planned. The maths now exists **before** the
endpoint that feeds it, so §§6–10 were read as a specification with no schema to accommodate, and the
two places the agreement is silent — a loss period, and §10.3's truncated table — surfaced as
decisions to write down rather than as behaviour nobody chose. It also means the reporting endpoint in
item 11 has a target: `GymPortalSnapshot` in [gym/portal.ts](../shared/gym/portal.ts) is its response
shape, written from what the screen needs rather than from what a query happens to return.

One thing worth stating about what the fixture is *for*. It depicts a gym four months in, 83% of the
way to the milestone, with a part-finished electricity window and two settled statements — chosen
because those are the states where the screen has something difficult to say. A fixture of round
numbers and a paid-up, milestone-reached gym would have rendered beautifully and exercised none of the
logic that matters.

Test counts after item 8: 31 on the settlement maths, 15 on the dashboard (5 → 15) — 570 in the
suite, 541 passing, the same 29 pre-existing failures unchanged. `npx tsc --noEmit` clean.

### The 29 pre-existing failures, cleared (2026-08-22)

Referenced throughout the notes above as the failures that predate this work. **The suite is now
green: 37 files, 568 tests, `tsc` clean.** Two root causes, and neither was what the count implied.

**Seven test files each hand-maintained their own `vi.mock("framer-motion", …)`.** Every one listed a
different subset of tags — `ContactUs` stubbed `motion.div` only, `home` had six tags but no
`LazyMotion`, `GymPartnership` had `LazyMotion` but one tag. An unlisted tag resolves to `undefined`
and React throws "Element type is invalid", which fails the *whole file* with an error pointing at
React rather than at the mock. That is where 19 of the 29 came from: `ContactUs` had all eleven of its
tests failing because its stub omitted `AnimatePresence`.

Replaced with one [client/src/test/framerMotion.tsx](../client/src/test/framerMotion.tsx), imported by
all ten page-test files as `vi.mock("framer-motion", () => import("@/test/framerMotion"))`. `motion`
is a Proxy that manufactures a passthrough component for any tag asked of it, so there is no list to
fall behind a page. It also strips animation props instead of spreading them onto DOM nodes, and uses
plain functions rather than `vi.fn()` — `setup.ts` runs `vi.clearAllMocks()` before every test, which
would reduce a `vi.fn(() => true)` to returning `undefined`, the same trap that made the observers in
`setup.ts` classes.

**`Advertiser.test.tsx` had no framer-motion mock at all**, so it ran the real library, including
`<AnimatePresence mode="wait">` around the form-to-confirmation swap. `mode="wait"` holds the incoming
panel until the outgoing one finishes exiting, and under happy-dom that exit never finishes — so a
test waiting for the confirmation waited forever. `GymDemo` and `blog-pages` had the same exposure and
are now on the shared mock too.

The remaining ten were copy that had legitimately moved on and assertions that were never testing
what they claimed. Four of the latter are worth naming, because a green test that asserts nothing is
worse than a red one:

- `queryByText("CLASSIC")` for "the category filters are hidden" — the filters render title-case and
  are uppercased by CSS, so that string appears in no state of the component. The test passed whether
  the filters were there or not. Now `queryByRole("button", { name: "Classic" })`.
- `getByText(/wallet/i)` for "the FAQ accordion renders" matched the category tile *and* two
  questions, so it never reached the accordion. Now the question text.
- Advertiser's "shows success message" mocked a `data.message` and then asserted that message. The
  page discards `data.message` and renders its own copy, so the test was asserting the mock. Now it
  asserts the page's confirmation and that the function's message does *not* appear.
- Both "clears the form after submission" tests held a reference to an input, submitted, and asked
  whether that input was empty. Submission *unmounts* the form, so they were interrogating a detached
  node and would have failed however the page behaved. The clearing is only observable through "Send
  Another Message" / "Submit Another Inquiry", so that is what they now exercise — which is also the
  path where failing to clear would send us a duplicate inquiry.

No component was changed. Every failure was in the tests.

One more thing surfaced while verifying: with all 29 cleared, the suite still failed once in fifteen
runs and would not reproduce. Testing Library defaults `waitFor` to 1000ms, and the contact and
advertiser flows spend ~1.2s typing into three fields before they start waiting, so under load a
`waitFor` was losing a race it should never have been in. `setup.ts` now sets
`asyncUtilTimeout: 5000`. Twenty consecutive green runs since. A suite that fails one time in fifteen
teaches people to re-run it instead of reading it, which costs more than the flake does.

### Version 2.2 and the thirteen decisions (2026-08-22)

Not a build item. Every open question in §§12 and 14 was a commercial choice, and answering them
produced work in three places at once: the settlement maths (decision 1 changed the milestone's
second test from gross to Net Profit, which is a `gym_terms` field rename, a new opening counter and
the ratchet), the document (2.2, 47 sections, all eight `blocks-send` markers resolved), and the
copy on four surfaces that quote the milestone.

The order mattered. The maths went first, because §6.3's wording had to describe behaviour that
already existed and was tested — a contract clause drafted against intended behaviour and code
written against the clause tend to disagree in exactly the month a gym is watching. `PARTNERSHIP` in
[summary.ts](../shared/partnership/summary.ts) is the single source both the page copy and the
document's fixture read from, and a test asserts §6.1's rendered text, §21.5's, Schedule B's,
Schedule C's and `PARTNERSHIP.milestone` all state the same two numbers.

Two things worth naming about how v2.2 was built. **Neither survives** — 2.1 and 2.2 were deleted on
2026-08-25 because nothing had ever been signed against either (§22). They are recorded because both
become true again the first time a version is issued that a gym has actually signed.

**It is a new file, not an edit.** `v2_1.ts` stayed byte-frozen with its pinned hash, because the
version string is part of what gets hashed and a signature is only evidence while the text can be
re-rendered. Both versions were asserted to render with zero unresolved tokens from current onboarding
state, which is why `mbpNotices.phone` survives on `AgreementFields` after §41 stopped offering the
channel.

**Resolutions are data, checked in both directions.** `AGREEMENT_V2_2_RESOLUTIONS` mapped each v2.1
marker id to what v2.2 did about it, and the test suite asserted that no v2.1 marker may disappear
without an entry *and* that no entry may name a marker that was never raised. Without that, the
cheapest way to make `canIssue()` return true is to delete the marker, and it looks identical in a
diff to fixing the defect. The mapping now lives only in §12's table.

Test counts after v2.2: 47 on the new agreement suite, 40 on `rupeesInWords`, and the flow, fixture
and mock-API suites updated — **39 files, 664 tests, all passing, `npx tsc --noEmit` clean**. One
caveat carried forward: `tsconfig.json`'s `exclude` lists `**/*.test.ts` but not `**/*.test.tsx`, so
the five `.ts` test files — including the settlement and both agreement suites — are invisible to
`tsc`. They typecheck under vitest's transform, so a type error there fails the run rather than
passing silently, but the maths this project cares most about is the part `tsc` is not looking at.
Worth fixing.

No production build was made. Decision 10 withheld authorisation until local testing is complete, and
`IndexNowPlugin` in [next.config.mjs](../next.config.mjs) submits 30 live URLs to `api.indexnow.org`
on any production client build — a side effect on the public search index, from a command that reads
like a compile step.

## 17. Checklist for anything added here

- [ ] `enable row level security` in the same migration as the `create table`
- [ ] No business state in `user_metadata` — it is writable by the user
- [ ] The server decides the onboarding step; the client never asserts it
- [ ] A new step means `OnboardingStep`, `ONBOARDING_STEPS`, `STEP_META`, `asStep`, `gymsSchema`'s step
      union and `STEP_LABEL` — the last two fail silently, one by rejecting the whole admin view (§20)
- [ ] Payment amounts verified server-side in paise; webhook is the source of truth
- [ ] Webhook handlers idempotent on the provider's payment id
- [ ] No PII in `localStorage`
- [ ] Commercial numbers come from `summary.ts` or `gym_terms`, never inline literals
- [ ] `/gym-partnership` says "indicative terms" and never carries the full agreement text
- [ ] New API host added to `connect-src` in `next.config.mjs`
- [ ] `/gym/*` is `noindex` and `Disallow`ed in `robots.txt`
- [ ] A route carrying a credential in its URL puts it in a **path segment**, is `nofollow` as well as
      `noindex`, and gets a `Referrer-Policy: no-referrer` rule listed **below** the `/(.*)` block —
      Next applies every matching rule and the last one wins
- [ ] Browser talks to the API only through `apiClient.ts`; no second `fetch` to
      `api.muscleboxpro.com` anywhere
- [ ] Nothing asks synchronously whether a session exists — `HttpOnly` means there is no answer
- [ ] Signing out `removeQueries` on this gym's data; invalidating leaves it for the next person on a
      shared machine
- [ ] A `network` failure never signs anyone out, and never gets copy blaming their credentials
- [ ] Copy never promises a message the system cannot send
- [ ] Agreement content changes bump the version; never edit a version that has signatures
- [ ] A new agreement version pins its own golden length and hash, and does not share a fixture with
      an older one — a shared fixture lets one version's edit move another version's hash
- [ ] The issued document renders with zero unresolved tokens from current onboarding state; a field
      stays on `AgreementFields` while the document references it
- [ ] **There is one agreement version in the repository.** Shipping a new one means deciding what
      happens to records pinned to the old one *before* it ships — nothing in the code answers that
      question any more, and a record whose fingerprint describes text we can no longer render is a
      signature we cannot stand behind (§22)
- [ ] An unsigned record whose pin no longer describes what we would render is re-issued; a signed one
      never is (§21)
- [ ] The content hash is computed once, by the server, at issuance. The browser displays it and echoes
      it back; it does not re-render the document to check it (§22)
- [ ] A field read off an API response is `undefined` until `apiClient` validates bodies, whatever its
      type says — so nothing user-facing may be gated on one being present (§21)
- [ ] Clearing a `todo` marker means fixing the defect and recording the resolution, never deleting
      the marker
- [ ] A signed document never prints a blank for something nobody can know at signing; it names where
      that value is recorded instead (§20)
- [ ] Amounts stated twice in a clause — figure and words — derive from one integer
- [ ] The milestone reads identically in §6.1, §21.5, Schedule B, Schedule C and `PARTNERSHIP`
- [ ] `compute.ts` change comes with a test for the milestone-splitting month
- [ ] Milestone latches once reached; cumulative net profit can fall and must not demote a gym
- [ ] A test file rendering a page mocks framer-motion via `@/test/framerMotion` — never inline
- [ ] No `npm run build` without asking — `IndexNowPlugin` pings 30 live URLs on a production build

## 18. Wiring the frontend to the real backend (2026-08-23)

The API surface was settled in
[mbp-backend/docs/gym-onboarding-api-design.md](https://github.com/anuragsingh/mbp-backend). This
section is what the frontend now does about it. **Nothing is switched on yet** — see the flag below.

### One seam per kind of conversation

| File | Speaks | Notes |
|---|---|---|
| [apiClient.ts](../client/src/lib/apiClient.ts) | HTTP | The only place `fetch` reaches the API. Returns a result, never throws. |
| [httpOnboardingApi.ts](../client/src/lib/httpOnboardingApi.ts) | the wizard's 9 routes | Implements the existing `OnboardingApi` interface, so `useOnboarding` is unchanged. |
| [gymPortalApi.ts](../client/src/lib/gymPortalApi.ts) | `GET /gym/portal` | Validates through `portalSchema.ts` before anything renders. |
| [gymSession.ts](../client/src/lib/gymSession.ts) | login, logout, session, set-password | Dual-implemented: Supabase today, cookies when the flag flips. |

`NEXT_PUBLIC_MBP_API_MODE=live` is the single switch, and it is opt-**in** on purpose while the
endpoints are being built. **The day `GET /onboarding` is live the trigger reverses** and the default
should become live-with-an-opt-out: a production build that quietly fell back to the mock would take
a real gym's details into memory, tell it the agreement was signed, and lose all of it on refresh.

### Four rules `apiClient` exists to hold

1. **`credentials: "include"` on every request.** Sessions are `HttpOnly` cookies on
   `api.muscleboxpro.com`; without this the browser sends nothing and every authenticated route 401s.
2. **`Content-Type: application/json` on every mutating request.** This is a CSRF control, not a
   formality. A form-encoded body is a request a plain HTML form can make with no preflight; a JSON
   content type guarantees a preflight that a non-allowlisted origin fails. The server rejects
   form-encoded bodies for the same reason.
3. **The onboarding handle travels in `Authorization: Bearer`, never in a path or query.** API
   Gateway access logs archive URLs; they do not archive headers. §4.3.
4. **A failure is a value, not an exception.** `OnboardingResult` either way, so a caller cannot
   forget a `catch` and leave the wizard on a spinner.

`apiClient` maps status → `OnboardingErrorCode` and **uses our own copy for anything it does not
recognise**. Taking `message` from an unrecognised envelope would put "Internal server error" or a
proxy's boilerplate in front of a gym owner as if we had written it for them.

### What the backend must hold to

Recorded here because each of these is invisible until it breaks:

- **Every mutating route returns the whole `OnboardingState`.** The interface's invariant is that the
  server owns `currentStep`, and `useOnboarding` folds each response straight into React state. The
  design specifies 6 of 9 routes as partial; `commit()` falls back to a re-read, but that is a
  compatibility shim and not somewhere to settle — DynamoDB's read is eventually consistent, so a
  `GET /onboarding` issued immediately after `POST /onboarding/details` can legitimately answer with
  the item as it was *before* the write. The wizard then re-renders step 1 with an empty form,
  because committing the step cleared the draft.
- **`Access-Control-Allow-Origin` must name a specific origin from the allowlist, never `*`,** on
  every route including the handle-authenticated ones. `credentials: "include"` makes a wildcard a
  hard browser error.
- **`PUT /onboarding/draft`'s `step` field is a draft key name** (`"details"`, `"signature"`), not a
  step number.
- **`POST /gym/account` derives the email server-side** from the gym's §41 notices address. The
  interface signature has no email to send, and a client-supplied one would let a browser choose
  which address can later reset the account's password.

**Open, and the one place the two designs actually disagree (2026-08-24): step 2's acknowledgements.**
`POST /onboarding/ack` requires four affirmative booleans — `understandsRevenueShare`,
`understandsDeposit`, `understandsElectricity`, `understandsTerm`, each literally `true` — because on
that side step 2 *is* four checkboxes, and the row it writes (the four keys, the gym's IP, its
user-agent, a server timestamp) is the evidence the commercials were accepted. On this side step 2 is
"no input", so the client sent `{}` and every Continue came back `400 {"code":"validation","message":
"Please check the highlighted fields."}` — on a screen with no fields and nothing highlighted.
`PLACEHOLDER_ACKS` in [httpOnboardingApi.ts](../client/src/lib/httpOnboardingApi.ts) hard-codes the
four as `true` to unblock the flow, which overstates what the gym did and is **temporary by
agreement**. The resolution is four checkboxes on step 2, one per commercial fact the screen already
explains, passed in from `StepPartnership` — or a backend change making them optional, which trades
the evidence row for a bare timestamp. Whichever way it goes, the placeholder and the assertion
naming it in `httpOnboardingApi.test.ts` come out together.

Still open on our side: **there is no runtime schema for `OnboardingState`** — the symmetric gap to
`portalSchema.ts`. A renamed `terms` field would render "₹NaN" in the wizard rather than failing.

### The session is a cookie, and that removes a synchronous answer

`HttpOnly` means **script cannot read whether a session exists.** That is the point — the frontend's
CSP carries `'unsafe-inline'` and `'unsafe-eval'` on `script-src`, so a token in `localStorage` is
exfiltratable by anything that runs, and a cookie is not readable at all. It does not make XSS
harmless (a script can still *use* the ambient cookie) but it turns credential theft into session
riding, which ends when the session does.

Consequences, all of them shipped:

- `client/src/lib/auth.ts` is **deleted**. Its only non-test caller was `Navbar`.
- **`Navbar` no longer knows if anyone is signed in.** The button always reads "GYM LOGIN" and always
  points at `/gym/login`. The alternatives were worse: a session probe runs on every marketing page
  view to change one word, and a mirrored non-`HttpOnly` flag cookie is a second copy of the truth
  that goes stale exactly when a session is revoked server-side.
- **`/gym/login` forwards an existing session to the dashboard.** This is what makes the above
  correct — the label is conservative but the destination is right. The two changes are one change;
  removing the forwarding effect re-breaks a link on every page.
- `GymDashboard` distinguishes "sign in again" from "try again in a moment" by
  `GymPortalRequestError.code`, and does not retry a rejected session. `network` deliberately does
  **not** count as an expiry: a dropped connection must not sign a gym out of a live session.
- Signing out `removeQueries` rather than invalidating. The cached snapshot is one gym's revenue, and
  invalidating leaves it in the cache for whoever signs in next on a shared gym office machine.
- Sessions are 12 hours and **do not refresh** (§9.3), which is why the login form's "remember me for
  30 days" checkbox is gone. It was wired to nothing at all — the value never left the form.

### Password reset: the mechanism is real, the delivery is a person

§9.2 — the reset works and the email does not. `POST /admin/gyms/{gymId}/set-password-link` mints a
single-use handle and `POST /gym/account` spends it; there is no transactional sender wired up, so a
human relays the link until SES lands.

`/gym/forgot-password` **was actively harmful** and is now prose. It took an email address, called a
`forgot-password` edge function, and answered "if an account exists for this email, a password reset
link has been sent". Nothing was sent. The brand panel went further and promised those links expired
after an hour. A locked-out gym owner would read a confident confirmation and then wait for a message
that was never coming — and waiting instead of calling us is the worst outcome available. Its
`?token=` branch was broken a second way: it called `supabase.auth.updateUser({ password })`, which
changes the password of whatever session the browser already has and ignores the token entirely.

`/gym/set-password/[handle]` is the other half — where a relayed link lands. It sets a password and
**does not sign anyone in**: a link that opened a session would *be* a session, and a forwarded email
would hand someone a logged-in portal.

When SES lands this becomes a form again. The thing to keep is the neutral confirmation — the message
must not differ between an address we know and one we do not, or the page is an oracle for which gyms
are customers.

### Verified

`npx tsc --noEmit` clean. **44 test files, 847 tests passing** — up 61 net from 786 at the start of
the work, after removing `auth.test.ts` with its module. No production build (decision 10).

## 19. Switching it on against the sandbox (2026-08-23)

The endpoints are deployed. This section is what changed to actually talk to them, and the three
things that made it more than flipping a flag.

**Supabase is frozen from here on.** Nothing already deployed there gets changed and nothing new gets
added — the migration path is "stop calling it", not "clean it up". Frontend code may stop *reading*
Supabase freely; that is not a Supabase change. TODO A3 is closed as won't-do on this basis, and A1
(RLS on the lead tables) is the one deliberate exception, because it is a live data exposure rather
than a tidy-up.

### The portal contract was wrong on eight fields, and nothing would have told us

`GET /gym/portal` was returning `paidCups` and `settlements` where the dashboard reads `sales` and
`statements`, a flat deposit where it reads a nested one, no `asOf`, a `MachineStatus` enum with two
values that do not exist, and a date where `lastServiceAt` is a timestamp.

The reason this is worth a section: **`parseGymPortalSnapshot` returns a result rather than throwing.**
So a field name the backend gets wrong produces no type error on either side and no failing test
anywhere. It shows a gym owner "we cannot show your figures right now" while every backend test stays
green. That asymmetry is why the fix went into the backend projection rather than into a frontend
adapter — an adapter is a permanent second place for the names to drift, and it would have preserved
the property that nothing fails loudly.

Fixed in `mbp-backend`'s `toPortalSnapshot`, which now carries a docstring saying in terms that the
field names are *the frontend's `GymPortalSnapshot`, not that service's preference*. Redeployed to
sandbox after `cdk diff` confirmed 17 code-only Lambda updates and no IAM, route or table changes.

Two decisions inside that fix that went the backend's way on the merits:

- **`servicing`, not `service_due`,** and `replaced` added. "A service is due" is a derivation from
  `lastServiceAt` plus an interval nobody owns; "a service is happening" is a fact we store. And
  `replaced` is the state `replaceMachine` actually writes — it marks rather than deletes, because
  `installationDate` is a term boundary under §4.1.
- **The wire carries the instant; this side formats in IST.** Truncating server-side in UTC would
  show a unit serviced at 01:00 IST as the previous day. That forced `formatIstDate` to exist
  separately from `formatAgreementDate`, whose UTC behaviour is load-bearing because its output goes
  inside the hashed agreement text. `formatAgreementDate` now carries a warning saying so.

One money bug was caught while writing the projection. `liveDeposit` returns the `paid` row ahead of
everything else, and **a paid row still carries the `paymentUrl` of the link that paid it** — while
Razorpay Payment Links stay reusable. Passing it through would have put a live ₹50,000 link in front
of a gym that had already paid. The projection now withholds the link unless the deposit is `pending`
and the link has not lapsed, and two tests pin both halves.

### The sandbox bearer hatch, and why it cannot exist in production

A browser on `localhost:3000` talking to `execute-api.ap-south-1.amazonaws.com` can neither *read*
`Set-Cookie` — a forbidden response header the Fetch spec strips no matter what
`Access-Control-Expose-Headers` says — nor have a `SameSite=Lax` cookie *sent* back, because that
pairing is cross-site. So the sandbox stack sets `AllowBearerSessions=true` and its three
session-minting routes also return `sessionToken` in the body.

Three properties hold it in place, and the first is the one that matters:

1. **Gated on the API hostname, not on `NODE_ENV` or a flag of its own.** The condition that makes a
   bearer necessary *is* "the API is not on our registrable domain", so that is the thing tested.
   There is no environment variable anyone can set to enable this against `api.muscleboxpro.com`.
   Fail-closed: unset means production, and so does an unparseable value.
2. **In memory for the life of the tab.** Not `localStorage` — the CSP carries `'unsafe-inline'`, so
   a token any script can read is a token any injected script can exfiltrate, and a reloadable copy
   of a 12-hour admin session is worth more to an attacker than surviving F5 is worth to us.
3. **The header is conditional on the field being present.** Production omits `sessionToken`
   entirely, so nothing is ever stored there and the cookie does the work. A client that *required*
   the token would pass in sandbox and 401 everything in production — the worst available order in
   which to find that out, and the reason `mbp-backend/docs/onboarding-testing.md` §9.1 asks for a
   test asserting the hatch is off in prod. There is one.

An onboarding handle wins the `Authorization` header over a stored session. `POST /gym/account` is
reachable with both — an admin signed into the sandbox, and a relayed set-password link — and that
route reads the handle.

### `connect-src` follows the API host rather than listing it

The sandbox origin has to be reachable from a browser, and a static entry for it would have shipped
to production. So it is **derived** from `NEXT_PUBLIC_MBP_API_URL` at build time: production returns
`null` and its CSP contains no `amazonaws.com` entry at all, which is the property
`securityHeaders.test.ts` has always pinned and still does. The test gained the other half rather
than a carve-out — that the entry *does* appear when the build is pointed at the sandbox.

Loosening the CSP is not the dangerous part of pointing a build at `execute-api`; losing
`SameSite=Lax` is. Both are confined to the same condition on purpose.

### The admin login, kept basic

There was no admin UI at all — the thing it replaces is `local_dashboard/server.js`'s
`x-dashboard-password`: one shared plaintext password, defaulting to `"admin"`, compared with `===`.

- [adminSession.ts](../client/src/lib/adminSession.ts) — `POST /admin/login`, `GET /admin/me`,
  `POST /admin/logout`. **No Supabase branch**, unlike `gymSession.ts`: there is no history to
  migrate here, so the switch that would let it fall back to something weaker is simply absent.
- `/admin/login` — two fields, no brand panel. **No forgot-password link and no signup**: there is no
  self-service admin reset and no email sender (§9.2), so a link would lead somewhere that cannot
  help. Recovery is `seedAdmin` against the table, by someone with AWS access.
- `/admin` — renders what `GET /admin/me` says, and exists because **login succeeding only proves the
  password was right.** A cookie the browser refused to store and a sandbox token that never reached
  the header both look like a successful login and then fail on the first real request. It prints the
  API host it is talking to, because pointing a build at the wrong stage looks exactly like a code
  fault and the two sandbox gateways differ by six characters.

Two deliberate asymmetries with the partner login, both of which look like oversights:

- **The server's error message is passed through verbatim.** `POST /admin/login` already answers one
  fixed message for "no such admin", "wrong password" and "disabled account" alike, so there is no
  enumeration oracle for this page to suppress — and its 429 says something the client cannot
  reconstruct: *this password may well work in a minute*. Overwriting that with "incorrect email or
  password" would have a locked-out admin retyping a correct password until they gave up.
- **The password field validates `min(1)`, not `min(6)`.** This is a login: the password already
  exists and its rules were enforced when it was set. A length check here can only refuse a
  credential that would have worked, and it blames the admin for a disagreement between the form and
  the seeder.

`robots: { index: false, follow: false }` on both routes is the control that keeps them out of search
— **not** the `Disallow: /admin/` added to robots.txt, because several crawlers there are given a
blanket `Allow: /` in their own block that overrides the wildcard.

### Verified

`npx tsc --noEmit` clean. **46 test files, 888 tests passing.** In `mbp-backend`, 1,760 passing with
212 skipped for want of DynamoDB Local — worth noting because those 212 are the only tests proving the
conditional writes, so a green run without them is weaker than it looks.

Against the deployed sandbox, without credentials: `/health` 200; the CORS preflight for
`POST /admin/login` from `http://localhost:3000` answers 204 with a specific origin,
`Allow-Credentials: true` and `Authorization` in `Allow-Headers` (the hatch depends on that last
one); a bogus login answers 401 `{"code":"validation"}` with the generic message; `/admin/me` and
`/gym/portal` answer 401 `{"code":"invalid_token"}`. Every one of those codes is in `apiClient`'s
`RECOGNISED_CODES`, so each maps to real copy rather than to a status fallback.

The credentialed walk — sign in, create a gym, open the wizard link, sign, check the portal — is the
next thing, and it needs the sandbox admin password. One admin exists in `mbp-gyms-sandbox`
(`contact@muscleboxpro.com`, role `owner`).

Two things to know before running it: `next dev` reloads `.env.local` on its own but **does not
re-evaluate `next.config.mjs`**, so a server that was already running has the old CSP and the browser
will block the sandbox request with the env looking correct. Restart it. And the CORS allowlist names
`localhost:3000` — port 3001 fails with an opaque CORS error, which `apiClient` reports as
"couldn't reach us", indistinguishable from being offline.

## 20. Review & sign, simplified — agreement v2.3 and the sixth step (2026-08-25)

Step 3 read like a form both parties were filling in at the same time. It is not: it is one party
being shown a finished document and asked to agree to it. The work started by inventorying every value
anywhere in that step that somebody was being asked to supply, and asking of each one *who knows this,
and when*.

| Value | Where step 3 asked for it | Who knows it, and when |
| --- | --- | --- |
| Signatory name, designation | Two text inputs at the top of the sign panel, pre-filled from step 1 | The gym, at step 1. Already on the record. |
| "I have read and agree", "I am authorised to bind" | Two checkboxes | The gym, **now**. Genuinely collected here. |
| Machine ID, serial number, installation date | §2's table of particulars, rendering as "To be completed at installation" | Nobody at signing. Us, once a unit is allocated. |
| Installation condition, accessories, four on-site tests, photographs, two signatures | Schedule A, printed as a certificate: two placeholder cells, a ten-item checklist, three signature rules | A technician and a gym representative, on installation day. |
| Return date, condition, damage cost, deposit adjustment, refund balance, two signatures | Schedule H, printed as a certificate: eight `__________` cells, three signature rules | Both parties, at the end of a 24-month term at the earliest. |
| Name, designation, signature, date, seal — for each party | §47, ten blank rules | Nobody. The document is executed by clicking a button. |

Twenty-six blank rules. Exactly two of them held a value that was the gym's to give at signing, and
both were already on the record from step 1. The other twenty-four belonged to events months or years
away, or to a paper apparatus that does not apply.

### The document: v2.3

`v2_3.ts`, and 2.2 untouched — it has the same standing as 2.1 now. 2.3 changes no commercial term and
resolves no `todo` marker; the four differences are recorded in `AGREEMENT_V2_3_CHANGES`, keyed by
location rather than by marker id, because 2.2 did not think its blank forms were a defect and so
nothing in the tree flagged them:

- **§2** drops the Machine ID, Serial Number and Installation Date rows and gains a sentence saying
  they are recorded on the Installation Certificate under §17. The table now lists only particulars
  known at execution, rather than settled facts with three holes in the middle of them.
- **§47** is headed *Execution* rather than *Signatures* and says how execution works: electronically,
  by the gym's authorised signatory confirming in this flow (47.1), evidenced by the recorded SHA-256
  fingerprint and timestamp, both of which we give the gym with its copy (47.2), with Schedules A and
  H signed separately and affecting neither (47.3). The gym's party block prints `{{signatoryName}}`
  and `{{signatoryDesignation}}`.
- **Schedules A and H** describe what their certificates record and when they are signed, in place of
  printing them. That is what §17.2 and §37 always said the certificates were — separate documents
  completed on site.
- The plain-language panel gains a **twelfth item, for §47**. It is not a term that binds and bites,
  which is what the other eleven are, and it is there anyway: "clicking this is the signature" is the
  one thing about the mechanics a non-lawyer needs to have been told before they click.

**MuscleBoxPro's party block names the LLP and its authorised signatory with no personal name.** Which
of our people issued a given agreement is on our own record; a name printed into the hashed text is a
second copy of that fact, free to be wrong, and it would have needed a constant somewhere naming a
specific person as the signatory for every agreement we issue.

The type change this needed is small and worth knowing about: a `signatures` party may now carry
`lines` (statements printed as text) as well as `fields` (a label followed by a rule to write on), and
both are optional. **A party with no `lines` renders exactly what it rendered before they existed**,
which is what keeps 2.1's and 2.2's pinned hashes where they are — both suites still pass unedited,
and that is the evidence, not the intention.

`GOLDEN_V2_3` pins `085df8bf92f471792630691c2625057e05c898278ec74c3478bd70c611cb7b64` at 38,306
characters. Two things about that vector:

- `signatoryName` and `signatoryDesignation` are inputs to a pinned hash for the first time. Neither
  2.1 nor 2.2 referenced them by any token, so a step-1 typo could not reach the document. In 2.3 it
  can, which is the point — the name in the agreement is the name in the record, or the record is
  wrong.
- 2.3 is **longer** than 2.2, by about 2,000 characters. The instinct is the opposite. Removing
  twenty-six blank rules added length, because a described certificate is prose and a printed one is
  mostly empty cells. Length is not the measure of this change.

### The panel: shown, not asked

`SignPanel` no longer carries the two text inputs. Name and designation are displayed, with a way back
to the step that owns them and a line saying what to do if either is wrong. They collected nothing: the
values were already on the record, and now that §47 renders them *into the hashed text*, a name
retyped here to something else would describe a document the gym is not being shown. Both checkboxes
stay — those are representations being made at that moment, not data already held.

### Step 6, and the redirect that had to go

Installation is a sixth step in the rail rather than a card on the done screen or a panel on the
dashboard. It is the question every gym asks the day after signing, and the emailed link is where they
will look for the answer.

It is read-only, and **nothing completes it from the client.** The server marks it done when the
Installation Certificate exists (§17.2, Schedule A) — see §6, which is the same second-signing problem
seen from the other end.

Making it reachable meant deleting `StepDone`'s `router.push("/gym/dashboard")`. That redirect was
correct while step 5 was the last step; with a step behind it, it fired the moment the account existed
and meant the one screen a gym has a reason to come back to was the one screen it would never be
shown. The dashboard link now lives on step 6.

Six steps, still "about 20 minutes", because `StepMeta.estimate` is now `string | null` and step 6 is
null — installation is not the gym's time. `timedSteps()` is what the intro and the invitation email
list, and `totalEstimateMinutes()` skips the nulls. "Installation, 0 minutes" in a list of times is
worse than an absence.

For preview builds, `advanceMockInstallation(token)` walks the mock record forward one stage —
unallocated, allocated, installed — and is re-exported as `previewAdvanceInstallation` through
`onboardingApi.ts` so nothing imports `mockApi` directly. The date derives from `signedAt` plus 14
days rather than a clock, so the same walk always produces the same screen.

### Three silent failures adding a step would have caused

Worth listing, because none of them fails loudly and two of them are nowhere near the onboarding flow:

- `shared/admin/gymsSchema.ts` had `step` as a union of the literals 1 to 5. A gym on step 6 fails
  validation of **the whole admin gym view**, not just that field.
- `adminFormat.ts`'s `STEP_LABEL` had no entry for 6, so the admin list would have read "On step 6 —
  undefined".
- `apiClient`'s `asStep` rejects an out-of-range step from the wire, which is correct and meant its
  own fixture had to move to 7 to keep testing the range rather than testing step 6.

`/gym-partnership` deliberately does **not** gain an installation card. Its three-across grid would
leave a row of one, and the page's story ends with a working dashboard; the step list on it now says
"Step 1 of 6" and nothing else changed.

### For `mbp-backend`

Two things, and the first blocks a real gym reaching any of this:

1. **Re-copy `shared/agreement/`** — `types.ts`, `render.ts`, `v2_3.ts`, `goldenVector.ts`. The
   optional `lines` field is handled in the *renderer*, so a backend without it cannot compute 2.3's
   hash at all, and `issued.ts` here already points at 2.3.
2. **Accept `currentStep: 6`** and set it from the Installation Certificate. Its own step validation
   is the same 1-to-5 union this side had.

### Verified

`npx tsc --noEmit` clean. **55 test files, 1,098 tests passing.**

New: [agreement-v2-3.test.ts](../client/src/__tests__/shared/agreement-v2-3.test.ts), 50 tests. Three
of them are the ones worth having:

- Every section and schedule outside §2, §47, Schedule A and Schedule H is **byte-identical to 2.2**,
  and the four locations that moved are exactly the four keys in `AGREEMENT_V2_3_CHANGES`. That is
  2.3's whole claim as an assertion — a term edited in passing during a formatting change is precisely
  what no reviewer would catch by reading the diff.
- The document renders identically whatever `machineId`, `serialNumber` and `installationDate` say, so
  an issued 2.3 cannot be made to differ by a unit allocated after it was signed.
- No `blanks` or `checklist` block anywhere in the tree, and no `_{3,}` in the rendered text — checked
  against 2.2, which still matches, so the assertion cannot pass vacuously.

`OnboardingFlow.test.tsx` gained four step-6 tests and its whole-flow walk now ends on step 6,
asserting that no redirect fired and that the dashboard link is there.

## 21. The pin that went stale, and the deploy that would have staled every one (2026-08-25)

> **Half of this was reverted the same day — see §22.** The re-issue below stands and is still the
> behaviour. The version registry and the browser-side hash check described in parts two and three were
> deleted as over-built: there is one agreement version now, and the browser does not verify the
> fingerprint. The diagnosis is kept because the failures it describes are real and a future version
> will meet them again.

Step 3 showed the fingerprint and, underneath it, "This agreement isn't ready to sign — we can't
confirm this is the current version of your agreement. Reload this page to fetch a fresh copy."
Reloading did nothing, because there was nothing wrong with the page. Two separate defects produced
that screen, and both had the same shape: **the document a record names and the document we render
were allowed to drift apart, with no way back.**

### One: a pin nothing ever refreshed

`issueAgreement` returned early whenever `state.agreement` existed. Its reasoning was sound as far as
it went — re-issuing moves the effective date and the hash under a gym mid-read — and its own docstring
deferred "reissuing on a terms change" to the real backend. What it missed is that the pin can go stale
from the gym's side, in one click:

1. Step 2 issues the document and pins version, date, hash and length.
2. The gym reads step 3, notices the signatory is wrong, and follows the sign panel's own invitation
   back to step 1 — an invitation v2.3 added, because §47 now prints the signatory *into the hashed
   text*.
3. Step 1 accepts the correction. The pin is not touched.
4. Step 3 renders the corrected document, hashes it, and it no longer matches. Forever.

`['rendered 38385 characters, the record pins 38384', 'rendered hash de4be438…, the record pins
bef7456b…']` — an off-by-one from "Rohit" to "Priya". No error anywhere on our side, no way out on
theirs, and the copy told them to do the one thing that could not help.

So while nothing is signed, an existing pin is now *checked* and re-issued if it no longer describes
what we would render. Nothing is signed, so nothing moves underneath anybody: the cost is a reload,
which the mismatch copy already asks for and which now works. **Once `isSigned` is set the pin is
immutable, full stop** — it is the description of what a signature attests to.

Two details in that, both load-bearing:

- Whether the pin has drifted is asked at the **pinned** effective date, not today's. Asking at
  today's would make every view after midnight IST look like drift and walk the Effective Date — and
  the start of a 24-month term — forward a day at a time.
- A re-issue *does* take today's date, because a re-issued document is issued now. Keeping the old one
  would date a document to before the details printed inside it existed.
- `submitDetails` re-issues only `if (state.agreement)`. Step 1 must not bring a contract into
  existence; there is no agreement to pin until step 2 acknowledges the terms.

### Two: every record in flight, the moment a version ships

The deeper defect, and the one the user's report was actually about. `renderIssuedAgreementText`
reached for `ISSUED_AGREEMENT` unconditionally — the version we issue *now*. But §12 and `issued.ts`
both already stated the rule: **a stored agreement always renders from the version it names.** There
was no way to obey it. Nothing looked up a version string.

Which means the v2.3 deploy would have done to every unsigned record in flight exactly what the
signatory edit did to one: pinned to 2.2, re-rendered as 2.3, mismatch, reload, mismatch. And for a
signed 2.2 record, verification would have been impossible from the moment 2.3 shipped — the failure
that matters years later, in front of someone who wants to know what was signed.

The fix at the time was `shared/agreement/versions.ts` — a registry of every version ever issued, plus
`agreementForVersion(version)` returning **null rather than falling back**, because a fallback puts the
wrong document on screen under the right hash and calls it verified. Step 3 rendered the version the
record named, and a version this build did not carry produced a "this page is out of date" screen with a
reload button rather than a document.

**All of that is gone** (§22). It was the right shape for a problem we do not have: there has never been
a signed 2.1 or 2.2 record, and the whole apparatus existed to serve a browser-side check that has also
been removed. What survives is the rule, which now has to be honoured by hand: **a stored agreement can
only be verified while we can still render the version it names**, so shipping a new version means
deciding what happens to the records pinned to the old one before shipping it.

### Three: a diagnostic that was being treated as evidence

The live flow still locked, with a different report: `rendered 36341 characters, the record pins
undefined`. **No hash problem in that line** — the client's rendering and the server's agreed exactly.
The only thing wrong was that `agreement.length` was missing from the response, and the check failed on
it.

`IssuedAgreement.length` is typed `number`, and the type is a claim rather than a guarantee:
`apiClient` casts response bodies and validates nothing (its own docstring says so, and an
`OnboardingState` schema is still unwritten). So anything the API omits is `undefined` at runtime, and
here that turned a *verified* document into a locked panel for every live record.

So: **the hash decides, the length only explains.** Equal hashes are equal text; a length that
disagrees with a matching hash says the record's `length` field is wrong, not that the document is.
`length` is optional on the type from here on, and nothing user-facing is gated on it. The lesson
outlived the check that taught it — see the §17 item about fields read off an API response — and it is
the reason the mock's own drift check compares version and hash only: comparing length there could only
produce a spurious re-issue on a record whose length field was absent.

### For `mbp-backend`

1. **Re-issue an unsigned record whose pin has drifted**, at the pinned effective date for the check
   and today's for the new pin, and never re-issue a signed one. The mock's `issueAgreement` is the
   specification, and `onboarding-mock-api.test.ts`'s "re-issuing a pin that has drifted" is the set of
   assertions.
2. **Return `length` on `agreement`**, from `GET /onboarding` and `POST /onboarding/agreement/view`
   both — §2.5 already specifies it. Nothing on the frontend needs it, and it is what turns "the hashes
   disagree" into "a value was substituted" or "the structure moved" when one day they do.

(A third item here said to copy `versions.ts` and every `v2_*.ts`. There is one version module to copy
now — see §22.)

### Verified

`npx tsc --noEmit` clean. **57 test files, 1,119 tests passing** at the time of writing; §22 removed
some of them the same day.

- [onboarding-mock-api.test.ts](../client/src/__tests__/shared/onboarding-mock-api.test.ts) gained the
  reported bug as a regression test — correct the signatory after issuance, and the record re-pins to
  the corrected text — plus: the re-issued document is the one that can be signed and the hash first
  read is refused; a document that has not moved is not re-dated however late it is viewed; step 1
  issues nothing; and a signed record's pin survives being reopened.

## 22. One version, and the browser stops checking the hash (2026-08-25)

Called the same day §21 shipped: *"lets revert this multiple version document check. we should not
complicate it. lets just have one version, that is current one 2.3 and remove check of SHA of
document."* Two deletions, decided separately because they are separate things.

### One agreement version

2.1 and 2.2 are gone, with `versions.ts` and `agreementForVersion()`. 2.3 is the only `Agreement` in
the repository and `ISSUED_AGREEMENT` names it directly.

The registry was built for a real failure — a record pinned to a version this build cannot render is
a signature nobody can verify — but it was solving that failure for records that do not exist. Nothing
has ever been signed against 2.1 or 2.2, and there are no gyms in production. Two frozen transcriptions
kept alive on the chance of a signature that never happened cost a second golden vector, a second
plain-language list, two suites, a lookup that could return null, and a screen for when it did.

What was actually load-bearing about 2.1 and 2.2 has been kept, in the two places it belongs:

- **The renderer's own behaviour** moved to
  [agreement-render.test.ts](../client/src/__tests__/shared/agreement-render.test.ts) — substitution
  and dotted paths, throw-vs-placeholder, `collectTokens` / `findUnresolvedTokens`, byte-identical
  renders, `fingerprint` refusing a half-substituted document, todo markers staying out of the hash,
  `canIssue` refusing a `blocks-send` marker, blocker ordering. It uses three-line synthetic documents,
  because the cases worth testing are ones the issued document deliberately does not contain: 2.3 has
  no `blocks-send` marker and no printed blank, so testing that path against 2.3 tests nothing.
- **The transcription history** stayed in §12's table, which is now its only record — the marker → fix
  mapping no longer exists in code. Read it as the reason the current clauses say what they say.

The rule the registry enforced still holds and now has to be held by hand, which is why it is a §17
checklist item: **shipping a new version means deciding what happens to the records pinned to the old
one before shipping it.** Nothing in the code will ask.

### The browser no longer verifies the fingerprint

Step 3 used to re-render the whole agreement, hash it, compare against `state.agreement.contentHash`,
and refuse to open the sign panel on any disagreement. `checkIssuedAgreement`, `IssuedAgreementCheck`,
`recomputeRecordedAgreement`, the "isn't ready to sign" lock and `StalePageNotice` are all deleted.

What step 3 does now: renders 2.3 from the record's own effective date, prints
`issued.contentHash` under the document, and passes that same string to `SignPanel`, which puts it in
the signature payload. **The hash is computed once, by the server, at issuance.** The client displays
it and echoes it back.

The echo is deliberate rather than vestigial. It is not the browser's independent word for the text —
it cannot be, the browser no longer renders one — it names *which record* this payload was assembled
against, so a payload built from a stale page is refused with `content_mismatch` instead of signing
whatever the record says today. The API contract is unchanged.

**§47.2 is still honoured.** It promises the gym the SHA-256 fingerprint of what they signed, and the
server still renders, hashes, pins and emails it. Removing the browser's *duplicate* of that
computation is not a change to the document, which is why this needed no new version.

**What the check was worth, and why it still went.** It was the only automatic catch for one specific
failure: drift in the state → fields bridge (`issuedAgreement.ts`, `agreementFields.ts`) between our
copy and `mbp-backend`'s. `goldenVector.ts` pins `AgreementFields` directly, so it catches a drifted
renderer or a drifted document but not a drifted bridge — a backend formatting `₹ 50,000` where we
format `₹50,000` pins a well-formed hash of text no gym ever read, and nothing now notices. Against
that: in two days the check produced two false locks in front of a live user and zero true ones, both
from its own machinery rather than the document — a stale pin nothing cleared (§21), then a `length`
field the API omits (§21 part three). A guard that fires on its own bookkeeping and stops a gym signing
is worse than the drift it watches for, because the drift is caught by whoever compares the two
repositories and the false lock is caught by the gym.

So the bridge is now covered by review and by tests instead: `issuedAgreement.ts` says in its own
docstring that a change to it is a change to the document's identity, and
`onboarding-mock-api.test.ts` renders each issued record a second time and asserts the pinned hash
reproduces. That is a test rendering independently, which is still worth doing — it is the only thing
proving a stored fingerprint is reproducible at all — and it is precisely not what a browser in front
of a gym should be doing.

### Deleted

`shared/agreement/v2_1.ts`, `shared/agreement/v2_2.ts`, `shared/agreement/versions.ts`,
`PLAIN_LANGUAGE_V2_1` and `PLAIN_LANGUAGE_V2_2`, `checkIssuedAgreement`, `IssuedAgreementCheck`,
`recomputeRecordedAgreement`, `StalePageNotice`, and four test files — `agreement.test.ts`,
`agreement-v2-2.test.ts`, `agreement-versions.test.ts`, `StepReviewSign.test.tsx`. `IssuedAgreement.length`
stays, optional, server-side only.

### For `mbp-backend`

1. **Copy one version module**, not a registry: `shared/agreement/` plus `issuedAgreement.ts` and
   `agreementFields.ts`. All three, or the hash is of a different document.
2. **Verify the golden vector in CI.** It is the only automatic check left on the renderer, and the
   bridge it cannot cover is now review-only.
3. Everything in §21's list still stands — re-issue an unsigned drifted pin, never a signed one, and
   return `length` on `agreement`.

### Verified

`npx tsc --noEmit` clean. **54 test files, 1,031 tests passing** — three files and 88 tests fewer than
before, for coverage that is narrower only where it was covering a version nobody signed.
