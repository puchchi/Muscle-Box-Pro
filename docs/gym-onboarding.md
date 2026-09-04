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

> **Both halves of that changed.** The name and designation are shown rather than typed (see below),
> and the §32 checkbox was removed on 2026-08-25 — the representation is a clause of the document
> being agreed to, so a second tick restated a term the first already accepts. §23.

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

**Signing is refused while `canIssue()` is false**, with the gym seeing a panel saying there are
unresolved items and no drafting notes. There is no override in any build. The `todo` blocks and the
blocker list are never rendered; a gym must never read our notes about its own contract.

**Known gap for build item 9.** The effective date is rendered client-side into the hashed text. A
browser that renders at 23:59 UTC and a server that signs after midnight would disagree about the
hash. Item 9 must either submit the effective date alongside the signature or render the document
server-side; `openedAt` is already fixed at mount rather than read per render, so the value to submit
exists.

### Step 4 — Security Deposit

₹50,000 refundable, per §5.1 and Schedule B. See §5 for the gateway design.

**This step comes after signing, and it was skippable.** Both mattered:

*After signing*, because the deposit is an obligation that arises **under** the agreement (§5.1).
Collecting ₹50,000 before there is an executed contract creates a refund liability with no
agreement governing it, and it is the wrong order commercially — you are asking for money before
the gym has committed to anything. This has not changed.

*Skippable*, because a failed or delayed ₹50,000 payment must never orphan a gym that has already
signed. The signed agreement is the milestone; the deposit is a receivable. "Pay later — we'll
email you the payment link" moved them straight to step 5 with the account created and a persistent
`Deposit pending` banner on the dashboard. **The button went on 2026-08-25 (§24): paying is now how
step 4 is completed.** Everything downstream of `deferred` stayed, because we still put records in
that state for a gym that asks — the reasoning above is why it is a state at all.

The screen shows the amount, that it is refundable, and one primary button. It used to restate
§5.4–5.7 in plain language beside them, on the argument that the clause most likely to cause a later
argument should be stated where the money changes hands; that came off on 2026-08-25 in favour of a
button back to the signed document (§24).

**As built (2026-08-22).**
[StepDeposit.tsx](../client/src/pages/onboarding/steps/StepDeposit.tsx) plus
[_shared/razorpay.ts](../supabase/functions/_shared/razorpay.ts). Four decisions, and one honest
split of scope:

**The link is presented as forwardable, in those words.** The reason we use Payment Links rather than
a checkout is that the signatory usually cannot release ₹50,000 — so the screen said "you don't have
to be the one who pays" and explained that a forwarded link works from someone else's inbox. A feature
nobody is told about is a feature nobody uses, and this one is the difference between a deposit paid
today and a deposit paid next Friday. **Both of those went on 2026-08-25.** The card that held the
link went with §25 — paying navigates this tab — and the paragraph about forwarding went with the
step-4 trim (§28), leaving one clause: we'll spot the payment *"including from the copy in your
email"*. Said once, in passing, on a screen the accountant is not the one reading.

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
and the manual "Check again" button reports its own result — a check that visibly changes
nothing reads as a broken button and gets clicked six more times. The mock now models this:
`refreshDepositStatus` reports the money as not yet seen on the first poll and confirmed on the
second, because a mock that confirms instantly hides the state the UI most needs.

**§5.6–5.7 is on the money screen.** Five rows off `DEPOSIT_FACTS`, including the two that are not in
the gym's favour: deliberate or reckless damage can forfeit the whole deposit, and cost beyond it is
still owed. Stated at the moment money changes hands, with the clause numbers, so a gym that later
hits §5.6 recognises it rather than discovering it. **`DEPOSIT_FACTS` was deleted on 2026-08-25
(§24).** The clauses are two screens away in the document the gym signed, and the screen now offers
that document instead of paraphrasing it.

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

**"Site-wide" was overstated — see §25.** A Razorpay-scoped CSP can be scoped to `/gym/onboarding/`
by a rule placed after the global one. Reason 2 is a cost, not the blocker it reads as here; reason 1
is the blocker.

**How the link is presented changed on 2026-08-25 (§25).** Paying navigates *this* tab rather than
opening a new one, and the link's `callback_url` returns the gym to the wizard through
`/gym/deposit-return`. The mechanism above is unchanged, including that nothing on the return trip is
trusted as evidence of payment.

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
`onboardingApi` and is now one line — the HTTP implementation, unconditionally. Nothing under
`pages/onboarding/` imports `mockApi` at all; the mock survives as a test double, injected by the
suites that want one, and no shipped component can reach it.

`createMockOnboardingApi` takes a `latencyMs` option, defaulting to 0. A test that wants to look at
the saving indicator or the disabled-while-submitting states has to ask for the delay, because
against an instant double neither state is ever on screen.

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
| `/gym/deposit-return` | `gym/DepositReturn.tsx` | `noindex, nofollow` — the `callback_url` on every deposit Payment Link. Carries **no** handle: the URL is registered with Razorpay, so the tab remembers where to go back to instead (§25) |

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
- [ ] Every representation the signature record stores is stated in what the gym ticked, or in the
      document they ticked it against — `authorisedToBind` is derived from one checkbox and relies on
      §32 being in the signed text (§23)
- [ ] A screen that paraphrases a clause instead of citing it keeps a way to the document itself
      reachable from that screen — step 4 discloses §5 by offering the agreement, and nothing else
      (§24)
- [ ] A URL we hand to a payment provider carries no credential and no gym identifier, and the page it
      returns to treats what arrives in the query string as a navigation rather than a result (§25)
- [ ] No control on a money screen asks the gym to assert, or to check, a fact only our record holds.
      One button pays; the screen states the outcome on its own, and a poll that gives up says so (§26)
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
| [gymSession.ts](../client/src/lib/gymSession.ts) | login, logout, session, set-password | Cookies, with a bearer copy for sandbox origins. |

**There is no mode switch any more.** `NEXT_PUBLIC_MBP_API_MODE` is gone, and with it every runtime
branch that chose a fixture over a request: each of these files talks to whichever stage
`NEXT_PUBLIC_MBP_API_URL` points at, and a build with no base URL fails loudly rather than serving a
mock. The flag was opt-**in**, so its absence is what used to select fixtures, and that is the hazard
this section used to warn about: a production build falling back to the mock would take a real gym's
details into memory, tell it the agreement was signed, and lose all of it on refresh. Walking a flow
now means pointing at the sandbox stage.

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
2. **`sessionStorage` for the life of the tab, mirrored in memory.** Not `localStorage`: the CSP
   carries `'unsafe-inline'`, so a token any script can read is a token any injected script can
   exfiltrate, and one that outlives the tab sits on a laptop overnight waiting to be found. It was
   memory-only at first, which signed you out of `/admin` on every reload and made the one
   environment the hatch exists to serve unusable to build against.
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
| "I have read and agree", "I am authorised to bind" | Two checkboxes | The gym, **now**. Genuinely collected here. (One checkbox from 2026-08-25 — §23.) |
| Machine ID, serial number, installation date | §2's table of particulars, rendering as "To be completed at installation" | Nobody at signing. Us, once a unit is allocated. |
| Installation condition, accessories, four on-site tests, photographs, two signatures | Schedule A, printed as a certificate: two placeholder cells, a ten-item checklist, three signature rules | A technician and a gym representative, on installation day. |
| Return date, condition, damage cost, deposit adjustment, refund balance, two signatures | Schedule H, printed as a certificate: eight `__________` cells, three signature rules | Both parties, at the end of a 24-month term at the earliest. |
| Name, designation, signature, date, seal — for each party | §47, ten blank rules | Nobody. The document is executed by clicking a button. |

Twenty-six blank rules. Exactly two of them held a value that was the gym's to give at signing, and
both were already on the record from step 1. The other twenty-four belonged to events months or years
away, or to a paper apparatus that does not apply.

### The document: v2.3

`v2_3.ts`, with 2.2 untouched beside it at the time and deleted the following day (§22). 2.3 changes no commercial term and
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

Nothing in the wizard completes step 6, so a test that wants either of the two renderings carrying
actual particulars calls `advanceMockInstallation(token)`, which walks the mock record forward one
stage — unallocated, allocated, installed. The date derives from `signedAt` plus 14 days rather than a
clock, so the same walk always produces the same screen.

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

## 23. One checkbox on the sign panel (2026-08-25)

The §32 authority checkbox — "I am authorised to bind `<legal entity name>` to it" — is gone. Step 3
asks for assent once:

> I have read and agree to this Agreement.

The reasoning for two, recorded in §3 step 3 and defended twice since, was that authority to bind is a
distinct representation and bundling it into a general "I agree" weakens it. What that argument misses
is where the representation actually lives: **§32 is a clause of the document being agreed to.** The
gym is not being asked to make a side representation next to the contract; the contract contains it, and
the signature block above the panel prints this person's name and designation as the signatory. So the
second tick restated a term the first tick already accepts — and a screen that asks twice for one thing
reads as a form, which is the exact impression §20's work went to remove.

The wire format is unchanged. `signatureSchema` still requires `agreedToAgreement` **and**
`authorisedToBind`, both `z.literal(true)`; `SignPanel` sets both from the one checkbox through a small
`assent()` helper, so the stored signature and the admin view
([AdminGymDetail.tsx](../client/src/pages/admin/AdminGymDetail.tsx) prints "Read and agreed, authorised
to bind") keep reading exactly as they did. That is deliberate rather than lazy: the field is what a
dispute would be resolved against, and its truth now rests on §32 inside the hashed text rather than on
a checkbox, which is a stronger place for it to rest. **The one thing that would make it false is copy
that no longer states it while the field still claims it** — so if the sentence above is ever
weakened to something that is not assent to the whole document, `authorisedToBind` has to stop being
derived from it.

`legalEntityName` came off `SignPanel`'s props with the sentence that used it; step 1 still labels the
signatory field "Who signs for the entity, and can bind it", which is now the only place the point is
made outside the document.

[OnboardingFlow.test.tsx](../client/src/__tests__/pages/OnboardingFlow.test.tsx) asserts the panel
holds exactly one checkbox, that its label is that sentence, and that the panel says nothing about
authority to bind — a test against the copy drifting back apart from the field it sets.

### Verified

`npx tsc --noEmit` clean. **54 test files, 1,032 tests passing.**

## 24. The deposit screen: one action, and the document instead of the clauses (2026-08-25)

> improve UI of Deposit page. Reduce text and consize it. also remove all bullets points, as we have
> shown them already. Also remove i will pay this later button.

> in this page, we can add a button to go back to check agreement. also lets remove mention like "§5"

### Paying is how the step is finished

The "I'll pay this later" button and the footnote under it are gone, and step 4's blurb no longer says
"you can pay it later". This is a policy change rather than a tidy-up, and it was confirmed as one
before it was made: step 5 unlocks when the server marks the deposit **paid or deferred**, so with no
defer button a signed gym reaches its portal password only once the ₹50,000 has cleared. The argument
recorded in §3 step 4 for making it skippable — a delayed transfer must not orphan a gym that has
already signed — has not stopped being true; it is now answered by us deferring a deposit for a gym
that asks rather than by a button every gym sees.

So `deferred` survives everywhere except the wizard: `DepositStatus` and `DepositChoice`, the mock's
`pay_later` branch, the outstanding-deposit card on step 5, the amber note on step 6, the dashboard
banner and the admin labels. Two pieces of copy changed with the button, because nobody chooses this
any more — the status pill reads "Still to pay" rather than "You chose to pay later", and step 4's
amber panel states what is outstanding instead of reminding the gym of a decision it was never
offered.

One consequence worth naming for whoever next edits the tests: the deferred rendering is no longer
reachable by clicking. The end-to-end walk pays instead (two polls, because the mock's first poll
reports the money as not yet seen), and the deferred state is driven through
`createMockOnboardingApi().chooseDeposit(token, "pay_later")` with the link reopened — the same route
support would take. Without that, the copy for a state we still put records into would have gone
untested.

### The clauses came off, and then the clause numbers

`DEPOSIT_FACTS` — five rows restating §5.3–5.8 in plain language — is deleted. The gym reads §5 in the
agreement one step earlier and signs it there, so the rows were a paraphrase of a document already
read, sitting between the amount and the button.

They were replaced first by a pointer ("§5 of your agreement covers what it can be adjusted
against"), and that came off too. A clause number is only useful to someone holding the document, and
from this screen nobody was: the reference named where the answer was without giving any way to get
there. What is there instead is the document — a **Read the agreement** button beside the pay button,
back to step 3, which renders the signed copy read-only.

The honest cost: §5.6–5.7, the harshest term in the agreement, is no longer stated at the moment money
changes hands. It is one click away, inside the hashed text this gym has signed, which is a better
place for it to be authoritative and a worse place for it to be noticed. That trade is the reason for
the new §17 item — the disclosure now depends entirely on step 3 staying reachable from step 4, so a
change that makes the reader unreachable, or the agreement not viewable once signed, silently removes
the only statement of §5 the payer ever sees.

### What the screen is

One card: the amount, the status pill, two lines (what the deposit is, and the refund), then a footer
rule with **Read the agreement** and **Pay ₹50,000 now**. Below it, unchanged apart from tighter copy,
the link panel with its forwardable-link line, the waiting panel with its live region and manual
check, and the receipt.

**The link panel was folded into the waiting panel later the same day (§25)**, when paying started
navigating this tab and there was no anchor left for a card of its own to hold.

### Verified

`npx tsc --noEmit` clean. **54 test files, 1,034 tests passing.**

## 25. The payment page in this tab, and the trip back (2026-08-25)

> "what's this workflow? rather giving url to other page, either we should open it in iframe or maybe
> in same page. and once payment is done, we should come back to original page with payment status"

Three requests, and they land in three different places: one is impossible, one was reconsidered and
still rejected, and one was already true but did not look it.

### An iframe is not available

Razorpay's hosted payment page refuses to render framed, and the bank's 3-D Secure step is a third
origin that refuses too. Our own `frame-src 'none'` in [next.config.mjs](../next.config.mjs) would
also have to go. Both halves have to agree for a frame to work and the gateway's half never will, so
this is not a configuration we are choosing — payment pages are not frameable, deliberately.

### An in-page checkout, reconsidered

Reason 1 in §5 stands and still decides it: the signatory usually cannot release ₹50,000, and a modal
lives in the signatory's browser session. A checkout would convert "forward this to whoever pays" into
"abandon this and pay from the email", which is the flow we already have with an extra dependency.

Reason 2 as written in §5 is weaker than it claimed, and worth correcting rather than leaning on.
Razorpay's Checkout would not need the CSP widened site-wide: Next applies every matching `headers()`
rule and the last one wins, so a Razorpay-scoped `script-src`/`frame-src` could be scoped to
`/gym/onboarding/` by a rule placed after the global block — the same ordering the `no-referrer` rules
already depend on. It is a cost, not a blocker. What remains a real cost is an Orders API `order_id`
per attempt and `razorpay_order_id|razorpay_payment_id` signature verification, which is a new
endpoint pair in `mbp-backend` — Supabase is frozen, so it cannot land where the webhook lives.

### The link stopped being a URL handed over

The mechanism did not change. Its presentation did:

- **Paying navigates this tab.** `window.location.assign(paymentUrl)` rather than an `_blank` anchor.
  A new tab left the page that owns the truth sitting behind the page taking the money, and the gym
  then had two of them and no way to know which one would report the result. The "Your payment link is
  ready" card that existed only to hold that anchor is gone with it.
- **The link's `callback_url` brings them back**, to `/gym/deposit-return`, which replaces itself with
  the wizard.
- **That route carries no handle, and this is the whole reason it is a separate route.**
  `callback_url` is registered with Razorpay at link creation, so anything in it is stored by a third
  party — and the onboarding path contains a 30-day credential. It is the leak
  `Referrer-Policy: no-referrer` on `/gym/onboarding/` exists to close, and a return URL with the
  handle in it would reopen it on purpose. So the tab remembers where to go back to, in
  `sessionStorage`, via [depositReturn.ts](../client/src/lib/depositReturn.ts): the onboarding path
  (read once, and only honoured if it is an onboarding path — it is a redirect target read off a
  third-party callback), the payment URL (kept, so a gym that comes back without paying has a way back
  to the payment page instead of re-issuing and minting a second live link for one obligation), and a
  one-shot flag saying a gateway sent us back.
- **The return route reads none of the query string.** Razorpay appends a payment id and a
  `razorpay_payment_link_status`; a page that believed either would be a way to mark a deposit paid by
  typing a URL. What arrives there is a person, not a result.
- **A browser that never held the path is a supported ending, not an error.** The accountant who paid
  from the forwarded link gets a card saying the payment is being confirmed from our own records and
  that the onboarding link is in the gym's email. It cannot be handed the wizard, because identifying
  the gym from there is exactly the thing the route is shaped to avoid.

### "Come back with the payment status" was already the behaviour

The wizard has always polled its own record and advanced by itself when the webhook landed, which is
strictly better than a redirect: it covers the closed tab and the forwarded link too. What was missing
was not a mechanism but a sentence — the gym left in a second tab and nothing in the first one
acknowledged the journey. So the pending card now splits on whether a payment is genuinely in flight:
**"Checking your payment"** when the gateway returned us or the gym pressed the button, and
**"Waiting for the payment"** otherwise, with the forwardable-link line attached only to the second
(after somebody has paid, advice to forward the link buys a second ₹50,000 and a refund conversation).

That split fixed a real defect. "We still can't see it" was driven by the poll counter alone, so it
appeared about fifteen seconds after the link was issued — telling a gym waiting on its accountant
that its ₹50,000 was missing before anyone had attempted to pay it. The redirect returns the person;
the webhook returns the truth; and now the copy only claims to be chasing something when something is
being chased.

Step 4 is two cards, down from three: the amount with its two actions, and the pending card holding
the payment button and whichever sentence applies. **The manual check went the same day (§26), and
"Checking your payment" became "Confirming your payment" — with a fourth state for the case where
confirming does not succeed.**

### For `mbp-backend`

One field, and a rule about where it comes from:

- `POST /gym/deposit` sets `callback_url` to `<configured site origin>/gym/deposit-return` and
  `callback_method=get` on the Payment Link.
- **Built from server configuration, never from anything in the request body.** A browser-supplied
  redirect target on a payment link is an open redirect wearing our brand, on the one page a gym is
  most primed to trust.
- It carries no handle, no gym id and no query string of ours. The frontend needs nothing back from
  it, which is what makes that possible.
- Nothing about the webhook changes. A callback is not a confirmation, and the client cannot mark a
  deposit paid whatever it is handed.

Until it ships, the same-tab navigation still works and browser Back returns to the wizard, which
resumes polling — the pre-§25 behaviour minus the orphaned second tab.

> **Shipped in `mbp-backend` on 2026-08-25** (its `onboarding-build-progress.md` §40), after a sandbox
> run stalled on Razorpay's "Payment Completed" card with the deposit already settled. Note that
> Razorpay fixes `callback_url` at link creation and cannot add it to a live link, so **links minted
> before that change never return** — seeing the redirect needs a new `depositId`, because a spent
> `reference_id` cannot be reissued.

### Verified

`npx tsc --noEmit` clean. **56 test files, 1,045 tests passing.**

---

## 26. Pay, then an outcome — no button in between (2026-08-25)

> "it should be either passed or failed. Not i have paid"

The pending card's own button read **"I've paid, check now"**. That is a question put to the one
party who cannot answer it. A gym knows it pressed buttons on a bank page; it does not know whether
₹50,000 reached us, and it certainly does not know whether the webhook has written the record. So the
button asked for an assertion, we would have had to ignore the assertion, and the screen had nowhere
to put the disagreement that followed — a gym whose card was declined pressed "I've paid" and got
"we still can't see it", which reads as an argument rather than a status.

The first fix relabelled it **"Check again"** and gave the card a verdict to print. That answered who
was speaking and left the wrong thing standing:

> "i am still seeing check again. So i want a simple workflow. user see a pay now button and after
> successfull payment we mark payment complete. or we mark it failure if payment failed, but we do
> that right away. Lets remove this check now related workflow"

Correct, and worth saying plainly: a button that asks us is better than one that speaks for the gym,
but the *asking* was never the gym's job either. The page already polls. A control that does by hand
what a timer does anyway is a control whose only real function is to make the wait feel like the
gym's problem.

### The flow

One press, then an outcome. **Pay the deposit** → Razorpay → back here → the tab confirms on its own
and step 5 opens. Nothing to press in between, and — while it is confirming — nothing pressable at
all, not even the way back to the gateway: offering that ten seconds after a payment is how one
₹50,000 becomes two.

`refreshDepositStatus` came off `OnboardingActions` with the button. `pollDepositStatus` is now the
only way step 4 learns that money arrived, which is what it always should have been.

### Four states, one of them a revisit

| | Heading | Says |
|---|---|---|
| Just back from the gateway | Confirming your payment | that we confirm from our own record, not from this page |
| Confirmed | *(step 5)* | the receipt number and the amount |
| Half a minute of asking, nothing | **We couldn't confirm your payment** | that nothing has reached us yet, how to tell us, and how to retry |
| Link issued, nobody back yet | Waiting for the payment | the amount, the methods, that the tab can be closed, that anyone can pay it |

**"Waiting for the payment" is a revisit, not a post-click state.** After the pay button this tab has
navigated away, so nobody sees that card by pressing anything. It is what a gym sees on reopening its
onboarding link while an accountant pays from the forwarded copy — which is also why the
forward-the-link advice hangs on this state alone.

### Why the failure side does not say "failed"

The user asked for failure marked right away. This tab cannot honestly produce it. **A Payment Link
only redirects to `callback_url` after a payment Razorpay considers successful** — a declined card
leaves the customer on Razorpay's own page to retry, so the tab that comes back here has, as far as
anyone outside our record knows, paid. The readings of "back, and our record is still empty" are a
late webhook, a payment still clearing, and a browser Back button. A decline is not among the likely
ones.

So the state is **"We couldn't confirm your payment"**, and the help button — *Tell us about this
payment* — comes before the retry. Saying "failed" here would invite a second ₹50,000 for one
obligation, which is the single mistake on this screen that costs real money to undo.

### Two cadences, and the slow one is the safety net

| | Interval | For | Ends |
|---|---|---|---|
| `CONFIRM` | 1.5s × 20 (~30s) | somebody is watching this screen right now | downgrades to `WATCH` |
| `WATCH` | 5s × 60 (~5min) | a link in flight, nobody necessarily here | stops, out loud |

The first poll of either fires immediately rather than one interval in. CONFIRM exhausting
**downgrades** rather than stopping, so a webhook that lands at ninety seconds still advances the
wizard with nobody touching it — the unconfirmed card is a statement about the last thirty seconds,
not a dead end.

When `WATCH` does run out the card says so: nothing has reached us, this page has stopped checking,
reload it to see where it stands. `MAX_POLLS` used to end the timer silently next to copy promising
*"this page keeps checking"*, so a gym could read a promise the page had stopped keeping half an hour
earlier.

### The reopened tab needs the link back

`sessionStorage` dies with the tab that left for Razorpay, so a gym returning to a pending deposit
from its email has no stashed payment URL. The button falls back to `payNow()`, which means
**`POST /gym/deposit` must return the *existing* open Payment Link for a deposit already `pending`,
not issue a second one.** Two live links against one obligation is a duplicate-payment bug with a
refund at the end of it. Until that is confirmed idempotent, the fallback is the risk on this screen
worth watching.

### Not covered by tests

The unconfirmed and stopped states need twenty consecutive polls, and the mock reports the deposit
paid on its second — so they are unreachable in the suite without fake timers, which this suite uses
nowhere, or a mock contorted into a shape the real API never takes. What is pinned instead: paying
reaches the receipt with no button in between, the returning tab confirms on what
`/gym/deposit-return` left in storage rather than on the query string, and the reopened tab still
gets a forwardable link.

### Would a real "failed" be better? Yes, and it is backend work

Razorpay knows. `payment.failed` fires on a declined attempt, and a Payment Link carries its own
`cancelled` / `expired` status. Neither reaches the client, because `GET /onboarding` returns exactly
four deposit states: `not_started`, `pending`, `paid`, `deferred`. Surfacing a fifth — a failed or
expired link, with the reason — is what would let step 4 say "your card was declined" in two seconds,
which is the request as asked. **Supabase is frozen, so that state would come from `mbp-backend`**,
alongside the idempotent re-issue above. (The `callback_url` owed from §25 has since shipped there —
see the note in that section — so the fifth state and the re-issue are what remain.)

### Verified

`npx tsc --noEmit` clean. **56 test files, 1,044 tests passing** — one fewer than §25, because the
four step-4 tests around the manual check became three around the outcome.

---

## 27. The receipt a gym comes back for, and the paid screen that had no way off it (2026-08-25)

> review and improve content and design of this [screenshot: step 4, deposit received]

### The reference is the reason to be on this screen, so it is built like one

Everything about the paid panel said the reference was incidental. It was one of four equal cells in
a 2×2 `dl` — an 11px label over a truncated value — level in weight with the word `card`, and on a
phone that cell is about 150px, so the one value on the screen that has to be legible in full was
the one being cut off. The recovery was a `title` attribute, which a touch screen has no way to open.

It is now a white surface inside the panel: the label, the whole reference in mono with `break-all`,
a **Copy** button beside it, and one line saying what the reference is for. The button is labelled
rather than `size="icon"`, because that variant is 36px and this is pressed on a phone by somebody
pasting a reference into an email to their accountant.

The other three cells became one sentence — *"₹50,000 paid by card on 25 August 2026"* — which also
removed the amount being stated twice, 300px apart, in a heading and a cell.

`method` reaches us as Razorpay named it, so *"paid by netbanking"* was a machine value dropped into
a sentence. `formatPaymentMethod` in `shared/onboarding/receipt.ts` is the mapping, shared rather than
local because step 4 and step 5 both print the receipt and must not disagree about what a method is
called.

Two smaller repeats went with it. *"A receipt is on its way"* is the wrong tense on the only path that
reaches this panel — a revisit, days later — so it says the receipt has been emailed. And the closing
*"keep the reference… two years and a change of front-desk staff from now"* hardcoded a term length
that comes from `state.terms`; the line under the reference says the same thing in one clause.

On the unpaid card, the eyebrow read "Refundable security deposit" directly under a page heading
saying "Security deposit" and a blurb saying "Refundable, and held for the whole term". It reads
"Amount to pay", and the sentence below no longer repeats "held for the whole term" either.

> remove "Refundable within 30 days of the machine being collected, less anything owing under the
> agreement."

And then the refund terms came off the paid panel entirely. That sentence was the fourth statement of
refundability on one screen — the page blurb, the unpaid card, the line under the reference, and this
— and it is the only one of the four that restates a clause the gym has already read and signed (§5.6
on the thirty days, §5.7 on the deductions). By the time this panel renders the money has moved; what
it needs to say is where the receipt is, which is now all it says. The mechanics stay one step back in
the agreement, which is the same call §24 made about the clause list.

### The green is one glyph

> i think we can make it slightly positive color

> doesnt go with theme. maybe just keep color to small part and make sure to follow theme

Both tinted panels were wrong at this size. `bg-primary/5` is the same orange as every *unpaid*
state on the screen, so an outcome and an outstanding obligation looked alike; `bg-emerald-50` put a
green field under an orange rail and an orange logo and read as a different product.

What ships is a white card with `border-gray-200`, like every other card in the wizard, and the
positive signal confined to the `CheckCircle2` in `text-emerald-600` — plus the tick the copy button
flashes. The nested receipt surface is `bg-gray-50`, the same treatment as the invite link on
`AdminInviteGym`. The settling spinner stays `text-primary`, because that one is progress rather than
an outcome, and step 5's `ShieldCheck` is emerald too so money received is not one colour on step 4
and another one screen later.

### Paid, and stuck

The screenshot that prompted this was a dead end: deposit `paid`, step 4 still the server's
`currentStep`, so no rail target for step 5, no reviewing banner (that needs `viewStep <
currentStep`), and nothing on the panel to press. A gym that has paid ₹50,000 and cannot move is the
worst version of this screen, and it is reachable — it is the same stall as the pre-`callback_url`
links in §25, seen from the wizard's side.

`settling` names it: `paid` **and** `currentStep === 4`. It keeps the `WATCH` poll running, so the
wizard advances by itself when the record catches up, and it says so in a live region — *"we're
opening your next step, nothing more is needed from you"* — rather than rendering a finished receipt
with no exit. When the poll runs out the line changes to what is true then: nothing has opened, the
payment is safe, reload. Same shape as the pending card's two states, for the same reason.

`watching` is derived from `phase !== "stopped"` rather than from `polling`, because `phase` is null
for the first render and a live region that opens on the pessimistic reading announces it before
correcting itself a tick later.

### Verified

`npx tsc --noEmit` clean. **56 test files, 1,045 tests passing** — one more than §26. The new one
walks the payment, returns to step 4 from the rail, and pins what the panel exists for: the whole
reference on screen, the copy button handing over exactly that string, the humanised method, and the
amount stated once. `settling` itself is not covered, for the reason §26 gives about the other
server-state combinations: the mock completes step 4 in the same call that marks the money paid, so
the state cannot be reached without contorting it into a shape the real API never takes.

---

## 28. The pending card, trimmed (2026-08-25)

> many things to change here
> move button to right and remove arrow from it.
> remvoe You don't have to be the one who pays. Forward the emailed link to whoever releases payments.
> It works from their inbox, and we match it to your gym either way.
>
> remove UPI, netbanking etc line

Three cuts to the card a gym looks at while it waits, all of them the same cut: the screen was
explaining itself where it only needed to hold still.

**The methods list.** *"₹50,000 on Razorpay: UPI, netbanking, card or NEFT"* stated the amount for the
third time on one screen — page blurb, the card above, this line — and then listed methods the gym is
about to be shown by Razorpay itself, on a card that appears *after* the choice of method is out of our
hands. The sentence now starts at the part that is ours to say: we'll spot it whenever it lands.

**The forwarding paragraph.** Two lines and an icon making the case for a feature, on the one screen
where the case has already been won: the link exists, it is in the gym's inbox, and forwarding it needs
no encouragement from us. What survives is the clause that carries the same fact without arguing for
it — *"including from the copy in your email"*. §5's note about presenting the link as forwardable is
amended rather than deleted, because the reasoning behind Payment Links has not changed; only the
number of times the screen says so.

**The arrow, and the button's place.** `ArrowUpRight` on *"Open the payment page"* was a leaving-the-site
glyph on a control that navigates this tab (§25) — true when the button was an `_blank` anchor, wrong
since. And the button sat left, hard against the paragraph, while every other primary action in the
wizard sits right; `sm:justify-end` puts it where the eye already goes. The unconfirmed state's pair
keeps its order — help, then retry — and moves right together.

> change open the payment page to pay deposit now

**And then the label.** *"Open the payment page"* named the mechanism; **"Pay deposit now"** names the
obligation, and matches the button on the card above it — the same action, offered again to a gym that
came back to a link already issued. Nothing on this screen should read as a detour to somewhere the
paying happens.

### Verified

`npx tsc --noEmit` clean. **56 test files, 1,045 tests passing.** The two step-4 tests that asserted
the forwarding paragraph now assert the clause that replaced it: present on the waiting card, and
absent on the confirming one — where anything implying a link somebody else can still pay is how one
₹50,000 becomes two.

---

## 29. The card that asks for the ₹50,000 (2026-08-25)

> review and improve UI UX of this

The unpaid state of step 4, screenshotted at desktop width. Three things, one of them worth more
than the other two.

**Where the button goes, said before it is pressed.** *"Pay ₹50,000 now"* replaces this tab with
Razorpay's page (§25), and the screen gave no notice of it. Every other departure in the wizard is
either inside the wizard or an obvious mail link; this one is a full-page navigation away from the
document a gym has just signed, triggered by the largest number on the screen. A gym that does not
expect it reads the Razorpay page as having lost the onboarding. One line under the divider now says
it, and says who takes the money while it is there: *"Razorpay takes the payment. This tab moves to
their page, and comes back here when it's done."* The `Lock` is the conventional glyph for that
sentence, and the claim behind it is true rather than decorative — the card details never reach us.

This is the one piece of copy §28 removed and this section adds back in a different shape. The
difference is the job: the methods list told a gym what it was about to be shown anyway, and the
forwarding paragraph argued for a feature. Neither said *the tab you are on is about to be replaced*,
which is not an explanation of the payment but a warning about the button.

**The status pill.** It sat at the far right of a `justify-between` header, which against a
`max-w-3xl` shell is about 500px from the only words that give it a subject, with the whole width of
the card empty in between. On a phone the same row put it beside the ₹50,000, competing with it. It
qualifies "Amount to pay", so it now sits next to "Amount to pay" — one label unit, with the amount
below both, and `flex-wrap` for the narrowest screens.

**The buttons.** Split to opposite edges of the card they read as two unrelated controls rather than
a choice; grouped at the end they read as secondary-then-primary, which is what the waiting card
below already does since §28. And the pay button now spins while the link is being issued: that call
is a round trip to Razorpay, and changed text alone on a disabled button reads as a button that
stopped working.

Line length is untouched, deliberately. These paragraphs run to about 95 characters against the card
edge, past the 65–75 the eye tracks best, and the `PROSE` note in `OnboardingFlow.tsx` is the standing
answer for why: for copy this short a visible ragged gap costs more than a long line does.

### Verified

`npx tsc --noEmit` clean. **56 test files, 1,045 tests passing** — the same count as §28. No new
test: the disclosure is an assertion on the step-4 test that already pins what this card says and
does not say, next to the one about clause numbers, because the failure mode is somebody trimming it
as duplicate copy.

## 30. One progress bar instead of three (2026-08-25)

> review and improve this design. maybe top progress bar

The rail drew overall progress three times over, which is the answer to "maybe top progress bar":
there was already one, then a second, then a third.

- On a phone: a bar under the step title.
- On a desktop: six bars, one under each label, filled or not.
- At both widths: the circles, which already carry a tick for done, a ring for the step on screen
  and a grey numeral for a step that is not open yet.

The six were the worst of the three. A progress bar cut into pieces and spaced apart reads as less
complete than the same fraction drawn continuously, and it sat directly under the row of circles
that had just said the same thing. They also fixed the rail's information at "four of six segments",
which is a coarser statement than the bar it was imitating.

**Now: one bar, above both renderings.** Full bleed and unrounded, because it is an edge of the
chrome rather than an object sitting inside it, and the rail is `sticky top-0` — so the moment the
page scrolls, the bar is at the top of the viewport, where a browser puts one. `aria-hidden`: the
list below it carries every state it draws, and a third announcement next to "Step 4 of 6" and six
labelled steps is noise.

The fill rule did not change. Still "done or on screen", so a gym looking back at step 1 sees the
bar retreat to match the circles rather than sit ahead of them, and still not `completedSteps.length`,
for the reason the note in `ProgressRail.tsx` records: that measurement disagreed with the circles
beside it at every step. The test that pins the rule moved with the `data-testid`, from
`mobile-progress-bar` to `onboarding-progress-bar`, and now asserts against the circles rather than
against a row of bars that no longer exists.

The phone loses about 14px of sticky chrome, on the layout with the least of it to spare. "Step 4 of
6" and "N done" stay: they are the numeric statement, and the bar is the glanceable one. The desktop
rail loses 12px and a row of decoration.

The loading skeleton follows the rail, as it has to or the layout jumps when the token resolves: a
bar at zero in the same place, and the per-step `h-1` placeholder is now label-shaped, because a
step no longer has a bar of its own to stand in for.

**Also, on the deposit screen.** The waiting card's row had one right-aligned button and a card's
width of nothing beside it. It now carries the same payment-handoff line the card above it got in
§29, which fills the row and makes the disclosure consistent: pressing "Pay deposit now" from the
waiting state navigates this tab away exactly like pressing "Pay ₹50,000 now" does. The sentence is
one component used by both rows rather than two copies, so they cannot end up describing the same
handoff differently. Not shown in the unconfirmed state, where the row already holds two controls
under a long paragraph.

### Not done, and why

The `ui-ux-pro-max` design-system tool was run and its recommendation ignored: dark mode OLED,
`#0F172A` backgrounds, IBM Plex and a purple CTA. This is an established light-mode flow in an
orange brand, six screens deep, and "avoid light backgrounds" is advice for a greenfield fintech
dashboard. Its pre-delivery checklist is the useful half of that tool here.

The lock glyphs beside steps 1 and 2 make those two rail columns taller than the other four. Left
alone: they mean something (§20), the alternative is a lock on every column, and the unevenness is
two 12px icons.

The lower half of the page is empty at desktop height in the pending state, which is what a screen
with two short cards and a footer pinned to the bottom looks like. Filling it would mean inventing
content on a screen that has deliberately been cut twice (§28, §29).

### Verified

`npx tsc --noEmit` clean. **56 test files, 1,045 tests passing** — the same count as §29; the rail
test moved rather than multiplied.

## 31. The last screen, and two places it disagreed with itself (2026-08-25)

> review and improve content and design of this

Step 5 with the deposit paid: the signed card, the receipt, the password field, and what happens
next. Four cards and a floating paragraph, and the review found two content faults rather than
layout ones. Both were the same shape: a sentence that had drifted out of step with another
sentence a screen away, because they live in different files.

### When the deposit comes back

The wizard said it three ways.

| Where | What it said |
| --- | --- |
| Step 4, unpaid card | Refunded within 30 days of the machine being collected |
| Step 4, receipt panel | Refunded at the end of the term |
| Step 5, deposit card | Refundable at the end of the term |

Clause 5.8 is the first one: *"After termination and return of the Machine, MuscleBoxPro shall
settle all outstanding amounts and refund the remaining security deposit, if any, within 30
days."* The refund turns on the machine coming back, not on a date in the calendar — a gym whose
term ended last month and whose machine is still bolted to its floor has not started the clock.
"At the end of the term" reads as a promise we would then have to walk back, on the one figure a
gym is most likely to remember. Both instances now say what 5.8 says.

This is not §28 being reversed. §28 removed a restatement of what the deposit can be *adjusted
against* — clause numbers a gym cannot check from a wizard. When the money comes back is a
different fact and it stays.

### One account of the signed copy

The signed card said *"A copy is on its way to <email>."* A paragraph immediately below it, outside
any card, said *"Your countersigned PDF is generated and emailed once we counter-sign, usually the
same working day."* Read in order, the second sentence takes the first one back: the copy is not on
its way, it is waiting on us to sign it. The two were written for different jobs — one to name the
notices address, one to be honest that build items 8 and 9 do not exist yet — and neither knew
about the other.

Merged into the card and then cut to two sentences: when the PDF arrives, and where it also lives.
The first merge kept a third sentence naming the notices address, which went the same day for being
a third thing to read on a screen whose only job is to get a password typed. Still no download
button, for the reason the old paragraph gave: a "Download" that 404s is worse than a sentence
saying "emailed".

**The tense is load-bearing.** "We have sent the agreement PDF" was asked for and is not true:
`grep` finds no PDF generation anywhere in the backend, and `sign.ts` is the one handler in that
service that imports no mailer, so signing sends nothing. SES itself is live — the invite, the
set-password link and the deposit receipt are all real mail, which is why the receipt card beside
this one may claim the past tense and this one may not. A test asserts the card never says "we've
sent" or "we have emailed"; when build items 8 and 9 land, that assertion is the thing to delete.

The design half of that change is that the page loses its only unboxed element. Everything else on
step 5 is a bordered card, so a bare icon and paragraph between two of them read as a stray note
rather than as part of the record.

### Version and fingerprint, next to each other

`grid grid-cols-2` inside a `max-w-3xl` card put `2.3` at the left edge and the fingerprint's label
at the halfway mark, with about 400px of nothing between a three-character value and its neighbour
— the same orphaning §29 fixed in the deposit header, from the same cause. Now `flex flex-wrap
gap-x-10`, so the two pairs sit together and wrap on a phone instead of holding a column open.
`truncate` came off the fingerprint at the same time: it is deliberately sliced to twelve
characters, so it never had anything to truncate, and the full hash stays in the `title` for a
mouse and in the PDF for everyone.

### The password can be looked at

One field, no confirmation box, and `type="password"`. What is behind a typo in it is not a reset
email: there is no transactional sender wired up, so
[GymForgotPassword](../client/src/pages/gym/GymForgotPassword.tsx) is prose explaining that a
person checks who you are and mints a set-password link by hand. The recovery screen asks for the
password twice; the screen that sets it in the first place asked once and showed nothing.

So a reveal toggle, 44px square and sitting on the field's own height, `aria-pressed` rather than a
changing label. A confirm box was the alternative and is worse here: it doubles the only input on
the screen to catch a class of error that seeing the characters catches outright.

### Not done, and why

The order of the blocks. The password is the only action on the screen and it is the fourth thing
on it, which at desktop height puts it under the fold. Reordering would mean putting the deposit
card below the action, and that card is not always a receipt — for a deferred gym it is an
outstanding obligation, which has to be read before somebody stops reading. A conditional block
order is a worse thing to own than a scroll. The two cuts above lift the field by a block and two
lines instead.

The design-system tool was run again and its recommendation ignored again, for the reason §29 gives:
navy, Plus Jakarta Sans and a blue CTA are advice for a greenfield B2B dashboard, not for the sixth
screen of a live orange flow. Its checklist is the half worth keeping, and the 44px toggle came
from it.

### Verified

`npx tsc --noEmit` clean. **56 test files, 1,046 tests passing.** The new assertions went into the
existing end-to-end walk rather than into tests of their own: that the signed card names the PDF
timing once, no longer says "on its way", and never claims to have sent anything; that the receipt
card carries 5.8's wording; and that the password field starts masked and unmasks when the toggle is
pressed.

## 32. The rail says where you are, not what you may edit (2026-08-25)

> these steps looks confusing, some has lock, while some only numbers, lets improve it

Screenshotted on step 5, where the rail read: four orange ticks, two of them with a padlock
alongside, a ringed "5", a grey "6". Four different marks across six columns for what is really
three states.

**The padlock is gone.** It appeared beside steps 1 and 2 once the agreement was signed, and it was
answering a question the rail is not asked. A gym reads the rail to find out where it is and what it
can go back to; the lock is about *editing*, and those two steps are still perfectly viewable, so the
glyph marked two columns as different in a rail whose whole job is to say which one is different.
It also made those two columns taller than the other four, which is why the row looked misaligned.

Nothing is lost. `ReviewingBanner` already says "Locked after signing" in a full sentence, with what
to do about it and a way back, on arrival at the step it applies to (§20) — the point at which the
fact is worth having. The sr-only ", locked after signing" came off with the glyph rather than
leaving screen reader users the only audience told in the rail. `isSigned` is no longer passed to
`ProgressRail` at all, which is the real measure of the change: the component now depends on three
facts instead of four.

**Three states, three label weights.** The labels claimed a distinction they were not drawing.
A completed step was `text-muted-foreground`, which this theme resolves to 44% grey, against
`text-gray-500`'s 46% for a step that cannot be opened yet: the same colour to any eye. So the
circle was carrying the entire rail and the labels were decoration. Now:

| State | Circle | Label |
| --- | --- | --- |
| Done | Orange, white tick | `gray-700 font-semibold`, darkens on hover (it is a button) |
| On screen | Orange ring, orange numeral | `foreground font-bold` |
| Not open yet | Grey, grey numeral | `gray-500 font-medium` |

### Still confusing, and not mine to rename

Step 5's rail label is "Done", and step 6 comes after it. That reads as the flow ending a step early.
It is defensible — the gym's work does end at step 5, and step 6 is us installing a machine, which
the intro says outright — but "Done" in the middle of a rail is a strange thing to look at. The fix
is a word in `shared/onboarding/steps.ts`, which also feeds the page heading and the invitation
email, so it is a copy decision rather than a UI one. Worth doing; not done here.

### Verified

`npx tsc --noEmit` clean. **56 test files, 1,046 tests passing** — one more than §30. The new one
asserts a signed step 1 announces "completed" and nothing about a lock, because the failure mode is
somebody restoring the padlock as a helpful hint.

## 33. "What happens next" is a schedule, so it says when (2026-08-25)

> lets improve what happend next

The last card on step 5. Four milestones, each a numbered orange circle beside a bold title and
two or three lines of body copy, screenshotted directly under the password form.

**The numerals were the least useful thing in the card.** Order is already carried by vertical
position and by the `ol`; a counter beside each item adds a second numbered sequence in brand
orange a few hundred pixels below a rail of numbered circles in brand orange. `StepPartnership`
had already recorded this exact problem when it deleted a "See step 5." pointer — "a panel of its
own numbered 1 to 5 and a rail numbered 1 to 5, three competing sequences for one reader" — and
step 5 was making it again in the same colour.

**What a gym wants from this card is the timing, and the timing was hidden.** "We call you within
two working days" put it in a title; "usually within two weeks of the survey" buried it mid-body;
Schedule A had none at all. So the dot column now leads each item with it, in one prepositional
shape four times over so it reads down the page:

| when | title |
| --- | --- |
| Within 2 working days | We call to book the site survey |
| Within 2 weeks of the survey | We confirm your installation date |
| On installation day | You sign Schedule A on site |
| In your first month | Your first shake, and your first statement |

`text-primary-ink` at 11px bold uppercase, which `index.css` documents as the brand colour for
*text* on a light surface and measures at 5.11:1 on white. The same quantity of orange as the four
counters it replaces, spent on words rather than on numbers nobody needed.

The circles became a dot and a connecting rule: `w-2 h-2` on `bg-primary`, then a `w-px` line with
`flex-1` inside a column that stretches to the row, so it reaches the next dot whether the item
above it runs to one line or three. Four separate badges became one continuous thing, which is
what a run of dated events is.

**Three copy fixes, of which one was a rule.** Item 2 contained an em dash ("show up on the next
step — come back to this same link"), against the standing instruction. It has also lost the
second half of that sentence entirely: "come back to this link any time" is a fact about *this
page*, not about the allocation of a unit, and it now sits once under all four items above a hairline
rule. Item 3 became active ("You sign Schedule A on site", not "Schedule A is signed on site") —
it is the one item on the list that needs the reader to do something, and the passive voice was
hiding who. Item 4 stopped saying "the first month-end", which wrapped as `month-` / `end` at the
measure this card renders at, and now quotes `terms.settlementDaysAfterMonthEnd` — the same number
step 2's timeline promises, from the same field, so the two screens cannot drift.

Net effect: the card lost roughly a quarter of its words and gained the four facts it was missing.

### Not done

The design-system tool was not consulted for this one. Its recommendation has been ignored twice
now for the reason §29 records, and nothing about a four-item schedule turns on a palette.

Step 5's rail label is still "Done", sitting immediately before step 6 "Installation", which still
reads as the flow ending a step early. Unchanged for the reason §32 gives: one word in
`shared/onboarding/steps.ts` that also feeds the page heading and the invitation email.

### Verified

`npx tsc --noEmit` clean. **56 test files, 1,046 tests passing** — the same count as §32. The
whole-flow test's single assertion on this card grew to four: the Schedule A title in its new
active voice, the sentence that decides when the 24 months start, and two of the four timings,
because the timings are the part of this card a future trim would think was decoration.

## 34. Back goes left (2026-08-25)

> should this "back to my details" button to left?

Step 2's footer, where "Back to my details" and "Continue to the agreement" were parked side by
side at the right edge of a `max-w-3xl` row, under a left-aligned sentence, with the whole left
half of the row empty.

Yes. `sm:justify-between` added to the row in `StepPartnership.tsx`. Two reasons:

- **The rail numbers left to right.** Step 1 is on the left of every screen in this flow and step 6
  is on the right, so on the screen below it backwards should be leftwards. Grouping both buttons
  at the right made "back" a rightward-sitting control.
- **It was touching the primary.** Same height, same radius, ghost fill, and its label begins with
  the word a reader scanning for "the way on" does not want. Mis-tapping it costs a gym the six
  panels it just finished reading. Step 4's row already spans the full width for the same reason
  (§29), with its handoff note on the left and the pay button on the right.

`justify-content` rather than a DOM reorder, so the tab order the row's comment argues for — the
primary first, the way back second — is unchanged, as is the mobile stack (primary on top, full
width, no `justify` in a column).

### Verified

`npx tsc --noEmit` clean. `OnboardingFlow.test.tsx`: **55 tests passing**, no change needed — the
suite asserts `button-back` goes to step 1 and says nothing about which edge it sits at, which is
the right level for it to care about.

## 35. "Please check the highlighted fields." with nothing highlighted (2026-08-25)

> why am i getting error "Please check the highlighted fields." when there are no highlight field in
> this page

Step 5, on `test-gym-5`, after typing `12345678` and pressing "Create my password". Reproduced
against the sandbox with the exact payload the client sends:

```
POST /gym/account  { "password": "12345678" }
400 {"code":"validation","message":"Please check the highlighted fields.",
     "fieldErrors":{"email":"That does not look like an email address.",
                    "password":"Use at least 12 characters. …"}}
```

Three faults, none of which the screen could show.

**1. No `email` in the body, and the route requires one.** `gymAccount.ts` reads `ctx.body.email`
and answers `fieldErrors.email` when it is missing. `httpOnboardingApi.createAccount` sent only the
password, on the argument written at length in that file's own header: the address is the gym's §41
notices email, already on the profile the handle is scoped to, and a browser naming it is a browser
choosing which address can later reset the password. That reasoning is better than what is deployed
and it was not what was deployed, so the effect of holding the line was that **no gym could finish
step 5 at all**.

Settled in favour of sending it, from `state.details.noticesEmail` — the state the server itself
returned, threaded through `useOnboarding`, not a field anyone types on step 5. The authorisation
argument is recorded in `httpOnboardingApi.ts` against the day the route is changed to derive it.

**2. The form's minimum was 8 and the server's is 12.** `portalPasswordSchema` said
`.min(8)`/`.max(72)`; `MIN_PASSWORD_LENGTH`/`MAX_PASSWORD_LENGTH` in the backend's
`domain/password.ts` are 12 and 200. So `12345678` passed the browser check, cost a round trip, and
came back as a field error. Both bounds now mirror the server, with the placeholder and
`GymSetPassword`'s copy moved to match. A number on this side that is looser than the server's is a
form that lies about what it will accept.

**3. `StepDone` read no `fieldErrors` at all.** It rendered only its own zod message, so anything
the server said about the password was dropped and the shell's generic sentence was the only thing
left on screen. That is not merely a symptom of fault 2: the server screens a denylist and a
distinct-character count that a schema on this side cannot mirror, so a password this form accepts
can still be refused, and `passwordpassword` would have produced the same empty banner after the
length fix. The input now shows `fieldErrors.password`, local message first.

With the message under the field, the banner above it became the second red box §26 already argued
about for step 1. `STEPS_WITH_FIELD_ERROR_SUMMARY` is now `stepMarksField(step, field, details)` —
step 1 marks any key on `GymDetails`, step 5 marks `password` — and the banner survives for
anything not named there, because for a field the step cannot mark it is the only mention on the
page.

### The mock was complicit

`mockApi.createAccount` ignored the email, so the live client's `{ password }` passed every test in
the suite and failed against the deployed route. The mock now applies `portalEmailSchema` first and
answers `fieldErrors.email`, which is the assertion that would have caught this before a gym did.
It remains looser than the server on the denylist and the character count, and says so.

### Still broken, and it is the same fault

`setPortalPassword` in `gymSession.ts` posts to the same route with `{ password }` and has no
address to send: `GymSetPassword` collects a password and a confirmation, and nothing about the gym
whose password it is. So the interim forgot-password path (§9.2) cannot succeed either. It is not
fixable from this side — putting an email box on that screen asks a person who has just lost their
password to guess which address the account is under, and it makes the route an enumeration oracle.
That one needs `gymAccount.ts` to take the address from `agg.profile.noticesEmail` on the `setpw`
branch, the way `depositCreate.ts` already reads it.

### Verified

`npx tsc --noEmit` clean. `npx vitest run`: **56 files, 1,048 tests passing** — two new
(`OnboardingFlow.test.tsx`: a server-refused password lands under the input with no banner and one
`role="alert"`; `onboarding-mock-api.test.ts`: no address, no account), three assertions moved from
8 characters to 12, and `httpOnboardingApi.test.ts`'s "sends only the password" inverted into "sends
the email as well".

Against the sandbox, `{"email":"singhanurag50@gmail.com","password":"short"}` now comes back with a
`password` error and no `email` error, which is the whole of what changed. Deliberately not sent
with a valid password: that would have created the account and this is `test-gym-5`'s only handle.

## 36. One tab, two gyms, one payment link (2026-08-25)

> for http://localhost:3000/gym/onboarding/test-gym-6/55143a71… i made a failed payment...and came
> back to this page...but when i clicked pay now button it opened already paid razorpay link
> https://razorpay.com/payment-link/plink_TU4RlJU441NJL3/test

The link that opened is `test-gym-5`'s. Razorpay's own page says so: *"Muscle Box Pro security
deposit — test gym 5"*, `Payment Completed`, `INR 50,000.00`. So `test-gym-6` was offered a link
belonging to another gym, which that other gym had already paid, on a page whose only button was
"Pay deposit now". Nothing on step 4 could recover from that.

**Not the server.** `depositCreate.ts` resolves a `gymId` from the credential and reads
`agg.deposit`; there is no path by which a `test-gym-6` request sees a `test-gym-5` row. The stale
link never came from an API call.

**`sessionStorage`, unscoped.** `lib/depositReturn.ts` stashed the payment URL under one global key,
`mbp.deposit.payment-url`, and `readPaymentUrl()` validated one thing about it: that it began with
`https://`. `sessionStorage` is per *tab*, not per page, and it survives navigation — so a tab that
had been through `test-gym-5`'s step 4 carried that gym's link into `test-gym-6`'s step 4, where the
pending card reads it on mount:

```tsx
onClick={() => (paymentUrl ? goToPayment(paymentUrl) : payNow())}
```

`paymentUrl` is `link?.paymentUrl ?? rememberedUrl`, and on a reopened page `link` is null. So the
button took the branch that never asks the server.

Two ways for the leftover to still be there. `forgetPaymentAttempt()` runs in a `StepDeposit` effect
on `status === "paid"` — but on the live path a confirmed deposit advances the wizard to step 5, so
step 4 usually never renders in the paid state and the cleanup usually never runs. And a *failed*
payment gets no `callback_url` redirect at all, so that tab comes back by hand and nothing in the
journey clears anything.

The URL is now stored with the onboarding path it was minted for, and handed back only to that path:

```ts
write(PAYMENT_KEY, JSON.stringify({ scope: attempt.returnTo, url: attempt.paymentUrl }));
```

`readPaymentUrl(scope)` takes the current path and answers null on a mismatch, which drops the
button into `payNow()` — the server, which answers per gym and returns that gym's existing live link
rather than minting a second one (§26). The return path and the scope are the same string written
twice on purpose: `takeReturnTo()` consumes the first, and the scope has to outlive it.

Both directions of the old failure are closed by that. A *spent* foreign link stranded a gym on
Razorpay's "Payment Completed" with no way to pay, which is what happened here. A *live* one would
have taken ₹50,000 against the wrong gym's deposit, which is the more expensive half.

### Not done

**A link the gym paid but our record has not caught up on.** Same gym, so the scope matches, and
"Pay deposit now" reopens a link Razorpay considers finished. That state means the webhook is lost
or late, and it is unreachable from the client: the only page that knows a link is spent is
Razorpay's. The screen's answer is the one it already gives after half a minute of asking — "we
couldn't confirm your payment", help offered before a second attempt (§26) — and the fix belongs in
the webhook path, not here.

**The em dash in the payment description.** `depositCreate.ts` builds `Muscle Box Pro security
deposit — ${tradeName}`, and that string is rendered to the gym on Razorpay's page. It is copy in
`mbp-backend`, so it is a deploy rather than an edit.

### Verified

`npx tsc --noEmit` clean. `npx vitest run`: **56 files, 1,050 tests passing** — two new in
`depositReturn.test.ts`: one gym's link is not handed to another gym's wizard, and a stash that is
not a record this module wrote offers nothing. The `javascript:alert(1)` test now writes the record
shape, so the scheme check is still covered.

## 36. Step 6 is this frontend's step, and nothing said so (2026-08-25)

> on setting password, we are not going to installation step

Straight after §35 was fixed. The password was accepted — the record proves it — and the screen
stayed on step 5 with the form still on it. The rail showed 1 to 5 ticked and Installation grey.

Two independent faults, and either one alone would have held the gym there.

### 1. The server has no step 6

Read off the sandbox for `test-gym-5` after the password was set:

```
completedSteps: [1,2,3,4,5]   currentStep: 5
status: "deposit_paid"        accountCreatedAt: set
```

`deriveCurrentStep` in the backend's `domain/onboardingStatus.ts` returns 5 when all five are
complete and says why in a comment: *"All five complete → 5, not 6. `OnboardingStep` has no 6."*
It is right about its own type. Step 6 was added on this side when installation tracking moved out
of step 5 (§7), and the backend was never told. So the rule this flow is built on — **the step is
whatever the server last said it was** — pointed at a step the gym had just finished.

`useOnboarding` now derives the sixth step, and it is the only place that adds to the server's
answer:

```ts
const serverStep = state?.currentStep ?? 1;
const currentStep: OnboardingStep =
  serverStep === 5 && state?.timestamps.accountCreatedAt ? 6 : serverStep;
```

Deriving a step client-side is exactly the thing §4 says not to do, so what makes it safe here is
worth stating: **nothing is submitted on step 6.** There is no action, no commit, no field. It
renders the machine record and the deposit state out of the same response, both of which the server
already sent. There is no step there to skip, so a client that reaches it early cannot skip
anything — which is not true of any other step in the flow, and this must not become a pattern.
Written to be idempotent: a response that ever says 6 stays 6.

The backend change that would retire it: `OnboardingStep` gains 6, `ONBOARDING_STEPS` gains 6,
`deriveCurrentStep` returns 6 once 1 to 5 are complete, `statusForStepCommit(6)` returns null.
Then the line above is dead code and can go.

### 2. Both "your dashboard is ready" cards were gated on activation

`StepDone` and `StepInstallation` each read `state.status === "active"`. Nothing in the wizard can
write that status: `statusForStepCommit(4)` and `(5)` both return null, `deposit_paid` comes from
the Razorpay webhook, and `active` comes from `POST /admin/gyms/{id}/activate` — a human at our end,
minutes or days later. So for every gym that had just created its password the gate read false,
`StepDone` put the password form back on screen, and pressing it again is a 409, because
`createGymUser` is conditional on `attribute_not_exists`.

Both now read `state.timestamps.accountCreatedAt`, which is the honest test of what the card
claims. `POST /gym/account` mints the `mbp_gym` session cookie itself and `gymLogin` gates on the
user row rather than on the onboarding status, so the dashboard is reachable the moment that
timestamp exists. Activation is about the machine, not the login.

This is why fault 1 was invisible in review: fixing the step alone would have landed the gym on
step 6 with a card saying nothing, and fixing the gate alone would have left them on step 5.

### The mock, again

Same class of lie as §35, in two places, and both are why the suite was green while the flow was
stuck.

`createAccount` set `status = "active"`. The real route cannot. Removed, and the two assertions
that expected it now assert `signed` plus `currentStep: 5` — the state the deployed API actually
returns.

`recomputeStep` walked `ONBOARDING_STEPS`, which has a 6 in it, so it answered 6 as soon as 1 to 5
were done. It now stops at 5, the way `deriveCurrentStep` does. The four step 6 tests and the
whole-flow walkthrough still pass, and they now pass **through the derivation** rather than around
it, which is the only version of those tests worth having.

### Verified

`npx tsc --noEmit` clean. `npx vitest run`: **56 files, 1,050 tests passing**, including
`OnboardingFlow.test.tsx`'s "walks sign, pay the deposit, and set a password" and the four step 6
tests, none of which reach step 6 by fiat any more.

Confirmed against the sandbox record rather than reasoned about: `currentStep: 5` with
`accountCreatedAt` set and `status: "deposit_paid"` is what the deployed API returns for a gym that
has finished the flow, and that combination is now what puts step 6 on screen.

## 37. The backend answers 6, and names the address itself (2026-08-25)

> Retiring the derivation-> lets make change in backend
>
> setPortalPassword / GymSetPassword still cannot succeed-> for this to succed, maybe we should get
> email from backend.

Both changes are in `/Users/anuragsingh/github/mbp-backend`. Nothing in this repo changed, and that
is deliberate: the two frontend workarounds §35 and §36 left behind are forward-compatible, so the
cleanup commit can follow the deploy instead of racing it.

### Step 6 is the server's answer now

`OnboardingStep` and `ONBOARDING_STEPS` gained 6. `deriveCurrentStep` returns 6 once the five the
gym does are complete, and 6 again when everything is complete — a finished gym lands on the
Installation record rather than falling off the end of the wizard.

Step 6 gets no route, and two guards say so rather than one comment:

- `statusForStepCommit(6)` returns null, for a stronger reason than 4 and 5 do. Those are null
  because only the webhook writes `deposit_paid` and only the activate route writes `active`. Six is
  null because nothing commits it at all.
- `isStepReachable` returns false for 6 unconditionally. A finished gym has `currentStep: 6`, so
  `step <= currentStep` alone would have called it reachable — and §36's whole argument for
  rendering step 6 early is that nothing can be submitted there.

Completion comes from the machine, on read: `withInstallationComplete(completedSteps,
machine.installationDate)` in `lib/gymState.ts`, in **both** `toOnboardingState` and
`toAdminGymView`. `installationDate` is the Installation Certificate of agreement §17.2 and lives on
the `MACHINE#` item, written by `PUT /admin/gyms/{gymId}/machine`. Deriving it means one write stays
one write and there is no second copy of the fact to go stale. Both builders because an admin
reading "step 5 of 6" for a gym whose machine went in last week would be reading a different record
from the gym's own.

### The address comes off our record, not the request

This is what makes `GymSetPassword` able to succeed at all, and §35 had only half of it. That page
posts `{ password }` and has no address to send — by design, because asking someone who has just
lost their password which address the account is under is asking them to guess, and answering the
guess is an enumeration oracle. `POST /gym/account` required `email`, so every relayed link 400'd
with `fieldErrors.email` and the page rendered "Please check the highlighted fields" over a form
with no such field.

`email` in the body is now **ignored**, and each branch names the account itself:

- `onboard` → `PROFILE.noticesEmail`, the §41 address given at step 1. That is the address this
  wizard was already sending.
- `setpw` → the gym's existing login, read through `gsi3-gymuser`. A reset sets the password on the
  account that exists.

Ignored rather than made optional or rejected: the deployed wizard still sends the field, and a 400
on a field we no longer read would break step 5 a second time to make a point.

It is also strictly tighter than what it replaced. An address the browser chooses is a browser
choosing which inbox can later reset the password — `attribute_not_exists` stops an onboarding
handle overwriting an existing account, but not a client deciding whose account gets created. And
`adminSetPasswordLink` already scopes its token to a gym rather than to one address, so naming the
address in the body granted nothing it did not already have.

Three refusals fall out of it, all 409 with a message and **no** `fieldErrors`: an unusable
`noticesEmail`, a `setpw` link for a gym with no login, and one for a gym with more than one. Each
is their data being wrong rather than the gym's, and there is no input on either screen a gym could
correct to get past it. A key with no field behind it is the §35 bug, and not repeating it is the
point.

### What this repo does after the deploy

Nothing until then. All three items are dead code rather than wrong code the moment the server
answers 6, so they come out in one commit afterwards:

1. `useOnboarding.ts` — drop `serverStep === 5 && accountCreatedAt ? 6 : serverStep`. Written to be
   a no-op once the server says 6, so it short-circuits itself.
2. `createAccount(token, password, email)` narrows back to two arguments across
   `shared/onboarding/types.ts`, `client/src/lib/httpOnboardingApi.ts`,
   `shared/onboarding/mockApi.ts`, `useOnboarding.ts` and the tests that call it.
3. `mockApi.ts`'s `recomputeStep` cap goes from 5 back to 6. It was lowered in §36 to match the
   deployed truth; leaving it at 5 after the deploy would make it a lie in the other direction.

The gate fix from §36 stays either way. `accountCreatedAt` is the honest test of what those two
cards claim, and `status === "active"` never was.

### Verified

Backend: `npm run check` clean, `npx vitest run` **74 files, 2,278 tests passing**. The three tests
worth naming are the ones that would have caught these: *"names the account from the notices address
on file, not from the request"* and *"resets the login this gym has, whatever address the request
names"* both post a different address than the one on file and assert the account still lands on
ours, and *"moves to 6 once the five the gym does are complete"* asserted 5 until today — that
assertion was the bug, and the suite was green over a wizard that could not finish.

Frontend untouched, so §36's `npx tsc --noEmit` clean and **56 files, 1,050 tests passing** still
stand.

## 37. Step 6 says whose move each part of the day is (2026-08-26)

> review and improve it

Step 6 on `test-gym-5`, installed and with an account: "Where it goes", "What happens on the day",
"Your dashboard is ready".

### The list was six sentences of even weight

`ON_THE_DAY` was six strings, each a numbered circle and a paragraph, and two of the six need the
gym: checking the serial number against the plate, and signing the certificate that starts the term.
Nothing distinguished them from the four we do while somebody watches. The card's own docstring says
what it is for — "the only part of installation the gym has to be present for" — and the list was the
one thing on it not saying so.

`StepPartnership`'s timeline had already been through this, and the note there is the argument:
"Every title names **whose move it is**, because that is the one thing a reader wants from a list
like this and the one thing it was not saying." Step 6 now has the same shape, title and body, and
the titles read down as We / You / We / We / We / You.

The bodies earn their place rather than restating the titles. Two carry something the old sentences
did not: item 1 says the gym accepts the placement on the day, which is what Schedule A records
("that the Gym accepted the location the Machine was placed in") and the last cheap moment to move
it before §21 needs written approval; item 4 says why the photographs are taken, which is the
condition record the deposit is later measured against.

**The numbers stay**, which is not the answer §33 gave step 5. Step 5's list was a calendar of
separate weeks, where counting said nothing the dates did not. This is a sequence inside one visit,
told before it happens, and it is numbered the same way `StepPartnership` numbers its timeline —
same `bg-primary/10` circle, same component shape. Two people standing at a machine have some use
for "we're at four of six".

### "Tell us if this address has changed" named no way to tell us

The card stated an obligation (§21: moving the machine needs written approval) and asked the gym to
act, on a screen where step 1 is read-only because the agreement is signed (§32). There was no
channel on the card and no editable field anywhere in the flow. It now carries a `mailto` with the
subject `Installation address`, styled as the same inline control the card below it uses for
"Read Schedule A", at a 44px target. Also "tell us now" → "tell us before the survey", which is the
deadline that actually matters.

### The unit's particulars were truncated behind a `title`

`Fact` cut every value with `truncate` and put the whole of it in a `title` attribute — on a
two-column grid with no breakpoint, so about 150px a cell at 375px. That is the same mistake step 4's
receipt reference had, corrected there earlier the same week for the same reason: a touch screen has
no way to open a `title`, and a serial number a gym cannot read in full is useless on the one screen
whose purpose is comparing it against the plate on the machine. The grid is now
`grid-cols-1 sm:grid-cols-2` and values wrap (`break-all` for the mono ones). The serial number's
placeholder also stopped rendering in monospace — "To be verified on site" is a sentence, and it was
being cut to "To be verifi…" in a typeface meant for a part number.

### Two em dashes in rendered copy

"signing it is a second signature — separate from the one you have already given" and "before you
sign it — that is what the check is for", both now two sentences. The `"—"` standing in for an
absent Machine ID is a glyph, not prose, and stays.

### Not done

**`(§21)` and `(§4.1)` on the screen.** §24 took clause numbers off step 4 as references nobody could
follow from where they were printed. These two survive because this screen does have a way into the
agreement, and §4.1 sits against the one commercial fact a gym is most likely to have assumed
backwards. Worth revisiting as a pair rather than one at a time.

### Verified

`npx tsc --noEmit` clean. `npx vitest run`: **56 files, 1,052 tests passing** — two new
(`OnboardingFlow.test.tsx`: the two items that need the gym lead with "You"; a gym whose address has
changed has somewhere to say so). The Schedule A test's `/sign the Installation Certificate/` still
holds: the certificate keeps its proper name, in item 6's body rather than its title.

---

## 38. The preparation stopped looking like preamble (2026-08-26)

A second pass over the same card, from "review and improve UI UX of this" against a wide-viewport
screenshot of §37's result.

### The one thing the gym must arrange was set as body copy

"Allow about two hours, and have someone there who can sign for the gym" sat directly under the
heading in `text-sm text-gray-700`, identical to the six bodies below it and to every other
paragraph on the step. Step 6 asks the gym for nothing else. That sentence is the whole of its
preparation, and `ChecksCard`'s own docstring already says what missing it costs: "a technician
arriving to find the duty manager alone is a wasted visit for both of us". It was rendered in the
one position and the one weight a reader skims.

It is now a panel above the list — the flow's existing inset idiom
(`rounded-xl border-gray-200 bg-gray-50 px-4 py-3.5`, as used by `SignPanel`'s "Signing as" and
`AgreementReader`'s callouts), with the eyebrow "Before we arrive" and the two preparations as
separate items: "Set aside about two hours", "Have someone on site who can sign for the gym". The
split is the point. What you arrange, then what happens. The numbered list stays a description of
our procedure, which is what it is, and a test now asserts the preparations are not inside it: a
preparation numbered among the things a technician does reads as ours to do.

`Hourglass` for the duration, not `Clock`. This card's status heading two inches above it is
`CalendarClock`, and `StepPartnership` already records the rule being followed here — one glyph
meaning two things on one page is worse than no glyph.

### `space-y-3` was tighter between items than inside one

`ChecksCard` and `StepPartnership`'s timeline share a component shape: numbered circle, semibold
title, wrapping body. At `space-y-3` the gap between two items is 12px while the line spacing inside
a body is about 20px, so once §37 gave every item a title and a body that usually wraps, the
grouping inverted — "are part of it. / We train your staff" read as one block. Both are now
`space-y-4`. Step 5's list has the same shape, already sits at 16px, and has a connector rule doing
the grouping as well, which is what settled the value.

### "Your dashboard is ready" had no glyph

The only card on either step 5 or step 6 whose title did not, against five neighbours that did
(`CalendarClock`, `PackageSearch`, `MapPin`, `ClipboardCheck`, `Wallet`, `CheckCircle2`, `Clock`,
`ShieldCheck`). `LayoutDashboard` in both files, unused elsewhere in the flow.

### Not done: the line length

The bodies wrap at roughly 95 characters, past the 65–75 the eye tracks best, and this is the second
review to notice it. It is not an oversight. `OnboardingFlow.tsx` documents `SHELL` as the prose
measure and records that every paragraph in the flow used to carry `max-w-[56ch]`: against a 768px
shell it stopped a third short of the visible edge, the bold labels never had the cap so headings ran
wider than the sentences under them, and five or six of those read as a narrow strip pinned left. The
uncapped measure is the deliberate trade, on the premise that the copy is short — one to three lines
under a heading that says what it is.

Worth writing down that §37 pushed against that premise: two-line bodies are now the common case in
this card where single sentences were. It still holds, and the fix if it stops holding is item
spacing, not a per-paragraph cap. `AgreementReader`'s `PROSE` at `56ch` remains the only exception,
because that document is read continuously rather than skimmed in cards.

### Verified

`npx tsc --noEmit` clean. `npx vitest run`: **56 files, 1,053 tests passing** — one new
(`OnboardingFlow.test.tsx`: the preparations are in their own panel and not among the numbered
steps).

### Both reverted, same day

Removed at the user's request: the "The address has changed" `mailto` on the address card (§37),
and the closing note on `ChecksCard` — "That certificate is Schedule A of your agreement. Signing
it is a second signature, separate from the one you have already given. Read Schedule A." The
address card keeps the sentence asking the gym to tell us before the survey; `ChecksCard` now ends
with the sixth numbered item, and `onOpenAgreement` is gone from its props.

Two tests went with them: "gives a gym whose address has changed somewhere to say so", and the
click-through half of the Schedule A test. What survives of the latter is the assertion that item 6
calls the document by its name, now as "calls the certificate by its name rather than paraphrasing
it". **56 files, 1,052 tests passing**, `npx tsc --noEmit` clean.

Worth knowing if either comes back: the `mailto` existed because step 1 is read-only after signing
(§32), so the sentence above it asks for something the flow gives no way to do. That gap is open
again by choice.

---

## 39. The blue box on step 1 was Chrome, and the tick belonged to nothing (2026-08-26)

From "improve UI of this" against a screenshot of step 1's Addresses card.

### The pale blue field was `:-webkit-autofill`

"Registered address" rendered with a `#E8F0FE` fill while "Installation address" directly under it
was grey. Nothing in this app is blue, and no class on the field is either: `areaClass` is
`bg-gray-50` going `focus:bg-white`. The tell is which field it was. `registeredAddress` is the one
carrying `autoComplete="street-address"`, and Chrome paints `:-webkit-autofill` from the UA
stylesheet, where a `background-color` utility cannot reach it. So one input in a form of eleven
looked like a different kind of control, for no reason the gym could see.

`client/src/index.css`, `@layer base`: the 1000px inset `-webkit-box-shadow` that is the only
override for it, plus `-webkit-text-fill-color` and `caret-color`, on `input`, `textarea` and
`select`. The colour is `--background`, which is the fill this app's inputs use at rest and the one
the onboarding form's use on focus, rather than a third colour of its own. Whether the browser
filled a box in is not a fact the gym needs pointed out. Global rather than scoped to this form,
because every input in the flow has an `autoComplete` and the admin forms do too.

### "The machine will stand at the registered address" sat between two fields, owned by neither

The tick governs the field below it and was a flat sibling in the section's `space-y-4`: 16px from
the address above, 16px from the label below. Proximity said nothing about which of the two it
belonged to. Its own `py-2.5 -my-2.5` — the negative margin there to stop the 44px target drawing
44px of white — then landed on the same `margin-top` the `space-y` utility sets, so which of the two
gaps got cancelled came down to stylesheet order. The result was ~26px above and ~11px below: right
by accident, and tight enough that the checkbox text and the next field's label nearly touched.

The tick and the installation field are now one wrapper with `space-y-1`, and the `-my-2.5` is gone.
16px plus the row's top padding above the group, 4px plus its bottom padding inside it. Same 44px
target, same DOM order, and the ownership is now structural rather than a spacing coincidence.

### Not done: the 3-row box that holds one line

Both address fields are `rows={3}` and a typical value is one line, so the card is largely empty
grey. It stays. The editable box is sized for the address the placeholder asks for
("Building, street, area, city, state, PIN"), and shrinking the mirrored one while the tick is on
would grow it again on untick and move everything below it. A fixed box is worth more than 30px of
reclaimed white.

### Verified

`npx tsc --noEmit` clean. `npx vitest run`: **56 files, 1,052 tests passing**, including the four
that drive this checkbox — the mirror, the untick, and the disabled state all read the same DOM.

---

## 40. A tick beside ₹50,000 you owe (2026-08-26)

From "improve UI of this" against two screenshots of step 2: the six headline figures with "The
detail", and the amber restrictions block with the "What we cover" / "What we need from you" pair.

### The same glyph for what we provide and what you owe

Both panels rendered every item behind a filled `CheckCircle2`. A check circle means "yes,
included" — true of all six things in "What we cover" and of nothing in "What we need from you",
most plainly on its last item, where a tick beside a ₹50,000 refundable deposit says that deposit
has been dealt with. It is the largest obligation on the screen.

The obligations are now a small `bg-primary` dot inside a 16px box, so both lists still share a text
left edge across the gap between the two panels. The colour stays `text-primary`: the note already
on that panel is about the *hue*, recording that these were `text-accent` and that a second brand
colour on the same glyph as its neighbour read as an accident. That reasoning survives intact. What
it did not cover is the glyph, and the glyph is what was making a claim.

The deposit item also stopped being a hand-written fifth `<li>` outside the `.map` that renders the
other three. Two assertions replaced a `toBeInTheDocument()` on that panel, one of them for the
deposit line, because a loose item folded into an array is exactly the kind of edit that drops one
silently.

### The label was the fact, and it was the faintest text on the step

"₹0", "20%", "24 months" mean nothing without "For the machine, ever", "Of advertising revenue",
"Initial term". The figure was `font-display font-black text-lg` in `--foreground`; the label under
it was `text-xs text-muted-foreground` — 5.13:1, so not a contrast failure, but the lightest ink on
the screen under the heaviest. Labels are now `text-gray-700`, which is what every other
explanatory sentence in the flow is set in. The figure still carries the emphasis through weight and
size; there was no need to drain the label as well.

### "ft)" on a line of its own

`PARTNERSHIP.gymProvides[0]` is "Floor space of roughly 90 × 90 cm (3 ft × 3 ft)", and in the
two-column layout it wrapped after the "×", orphaning "ft)". The parenthetical now uses ` `
between its words. Written as escapes rather than literal U+00A0, which is invisible in an editor
and gets tidied back to a space by the next person to touch the line.

### Verified

`npx tsc --noEmit` clean. `npx vitest run`: **56 files, 1,052 tests passing.**

---

## 40. Eight characters, on both sides at once (2026-08-26)

> lets reduce password length to min 8 character from 12

`portalPasswordSchema` and `MIN_PASSWORD_LENGTH` are now 8. §35 fault 2 is the reason this is two
commits in two repos and not one: that bug was the form saying 8 while the server said 12, and
loosening this side first would be the same bug with the numbers swapped. **The backend deploy goes
first.** Tightening this side is always safe; loosening it never is.

Eight is the floor NIST SP 800-63B sets for a user-chosen secret, and the maximum stays at 200 for
the reason `password.ts` gives — scrypt hashes whatever it is handed, so length is CPU an
unauthenticated caller gets to choose.

### The denylist was tuned to the old floor

`123456789012` is on the list because `12345678` could not be reached. Lowering the floor reached it,
and `12345678` is eight distinct characters, so neither the denylist nor the distinct-character rule
would have stopped it. The list grew by the 8-to-11-character entries off the top of any breach list
— `12345678`, `123456789`, `1234567890`, `password1`, `qwerty123`, `qwertyuiop`, `iloveyou`,
`welcome1`, `letmein1`, `admin123`, `musclebox` — with a test that names them. It is still a
nine-line array pretending to be nothing more than that.

### What moved

Backend `domain/password.ts` (the constant, its docstring, the denylist); frontend
`shared/onboarding/schema.ts`, both "At least 12 characters" placeholders in `StepDone` and
`GymSetPassword`, and the three tests that assert the number.

### Verified

Backend: `npm run check` clean, `npx vitest run` **75 files, 2,297 tests passing.**
Frontend: `npx tsc --noEmit` clean, `npx vitest run` **56 files, 1,052 tests passing.**

## 41. The gym login worked and signed nobody in (2026-08-26)

> trying to login using gym login/password, but its redirecting back to login page again

`POST /gym/login` answered 200 with a full session body. The next request, `GET /gym/session`, came
back `{"code":"invalid_token"}` — and it had no `Authorization` header on it at all. So the dashboard
sent the gym to `/gym/login`, whose own mount probe asked the same route, got the same 401, and left
them looking at the form they had just filled in.

**`signInToPortal` dropped the `sessionToken`.** `signInAsAdmin` has called
`rememberBearerSession(result.data?.sessionToken)` since the hatch was built; the gym half of the
same seam never did, and against the sandbox host that token is not an optimisation — it is the only
credential the browser has. The cookie the route also sets cannot come back from
`execute-api.ap-south-1.amazonaws.com`, which is the whole reason the hatch exists (see "The sandbox
bearer hatch" above).

Why no test caught it: the failure needs a real cross-site origin. `GymLogin.test.tsx` mocks
`gymSession` wholesale, `apiClient.test.ts` proves the token is *sent once stored*, and nothing
covered the seam in between. That seam now has `client/src/__tests__/lib/gymSession.test.ts`, written
against `apiRequest` the way `adminSession.test.ts` is — including the case that keeps this working
in production, where `sessionToken` is absent and passing `undefined` through must stay a no-op.

`signOutOfPortal` had the mirror-image gap and now calls `forgetBearerSession()` after the route,
like `signOutAsAdmin`. Without it, "sign out" on a shared gym office computer left the tab's only
credential live.

### The status field had a different name on each side

Second bug, found while reading the same response. The server sends `status`
(`"status": "deposit_paid"`); this module read `result.data.gymStatus`, so `GymSession.gymStatus` was
`null` for every gym. Nothing renders it today, which is why it was invisible — the first thing to
read it would have shown an empty portal to a gym mid-installation.

The rename now happens at the boundary, in one `asSession()` both routes share, with the reason
recorded: `session.status` on this side reads as the status *of the session*, live or expired, which
is the one thing it does not mean.

### Not touched

`POST /gym/account` mints a session too, and neither `setPortalPassword` nor the wizard's step 5
keeps it. That is deliberate and unchanged: the set-password page says in its own docstring that it
signs nobody in, and the wizard continues on its handle. It does mean a sandbox gym finishing step 5
is not signed in where a production one is, which is the divergence to remember rather than the bug
to fix.

### Verified

`npx tsc --noEmit` clean, `npx vitest run` **57 files, 1,063 tests passing** (the 11 new ones are the
seam's).

## 42. Two waits for one click (2026-08-27)

With the sandbox login fixed, signing in worked and then sat on a full-page "Loading your
portal..." for a second or two on a throttled connection:

> why are we showing loading your portal, rather we should only wait on login click event

Right, and the loading screen was the symptom of a wasted round trip rather than a slow one.
`POST /gym/login` answers with the session — email, gym, role, status. `GymLogin` then called
`invalidateQueries(GYM_SESSION_QUERY_KEY)`, which throws that answer away, and `GymDashboard`
fetched `GET /gym/session` from a `useEffect` on mount to learn what the login response had just
said. Worse, the two were serial: the figures request was gated behind the session check
(`enabled: !isChecking`), so on a 3G profile the gym waited for one round trip while looking at
centred grey text, and only then began waiting for the one that had the numbers in it.

Three changes, all of them the same idea — the session travels with the navigation:

1. **`GymLogin` writes it instead of discarding it.** `setQueryData(GYM_SESSION_QUERY_KEY,
   result.data)` before `router.push`. The mount probe that forwards an already-signed-in visitor
   does the same, for the same reason.
2. **`GymDashboard` reads that key through `useQuery`** rather than fetching in an effect. Arriving
   from the form, `data` is there on the first frame: the header renders with the gym's email and the
   figures request starts immediately. A cold entry — a bookmark, a refresh — has nothing cached and
   is the only path that still shows the gate, which is where it belongs: there is no email to put in
   the header and no meaningful Sign out until we know there is a session at all.
3. **The button holds "Signing in..." through the route change.** `isSubmitting` was cleared in a
   `finally` that ran the moment `push` was called, so the last leg of the wait had a live submit
   button over it. `isLeaving` is separate from `isSubmitting` on purpose: an unexpected throw still
   releases the form rather than locking a gym out of its own login page.

Using `useQuery` for the session also collapses the duplicate `GET /gym/session` that React's
development double-mount produced, which is the second pending request in the report's screenshot.

### Verified

`npx tsc --noEmit` clean, `npx vitest run` **57 files, 1,068 tests passing** (five new: two on the
dashboard for the cached and the cold path, three on the login page for the handoff and the button).

## 43. A self-service reset, and the one route it is waiting on (2026-08-29)

> what is this forget password? rather than this, we should have forget password workflow
>
> i want to have a proper forgot password workflow, which send the link to email and using that
> user can set the password

§9.2 removed the form because it lied (§18). What was left is prose: email us, a person confirms
you hold the account, and mints you a link by hand. That is honest and it is also a phone call
standing in for a route, so the workflow is now built end to end on this side, behind a flag,
with the one missing piece specified rather than faked.

### What already existed

| Piece | State |
|---|---|
| Mint a single-use handle — `POST /admin/gyms/{gymId}/set-password-link` | Deployed. No admin UI yet (`admin-panel-todo.md`) |
| Spend it — `POST /gym/account` | Deployed, wired through `setPortalPassword` |
| Where the link lands — `/gym/set-password/[handle]` | Built. Sets a password, opens no session |
| The email body — `getPasswordResetEmailTemplate` | Written, in the frozen Supabase functions |
| Email → account → mint → send, from the public side | **Missing. This is the whole gap** |

So the workflow needs one route, and it cannot be assembled from the client or from a Vercel
handler acting as an admin proxy. There is no email lookup to do it with: `GET /admin/gyms` has no
server-side filter or search — a documented scale bound, not a gap to work around by fetching
every page — and the `noticesEmail` on its rows is the §41 formal-notices address, not the portal
login. Probing `POST /gym/login` to find out whether an address exists would build the
enumeration oracle that route is deliberately built not to be. The lookup belongs in
`mbp-backend`, next to the account index that already resolves an email at login.

### `POST /gym/password-reset` — the contract this frontend is written against

Unauthenticated. Body `{ email: string }`.

1. **One response, always.** `200` with an empty body whether the address has an account, has
   none, or is a syntactically valid address nobody has ever used. The status, the body and the
   headers must not branch on the answer. Everything downstream of this page depends on it: a
   distinguishable response makes `/gym/forgot-password` a public list of which gyms are
   customers, which is commercially sensitive on its own and doubles as a target list.
2. **Mint the handle the admin route already mints.** Same generator, same store, same
   single-use semantics, so `POST /gym/account` spends it unchanged and the existing
   `expired_token` / `revoked_token` answers keep meaning what they mean. Issuing a new one
   revokes any outstanding reset handle for that account — the newest link wins, and a gym that
   clicks twice gets the failure that says "already used" rather than two live credentials.
3. **The link is `https://www.muscleboxpro.com/gym/set-password/{handle}`.** Path segment, not
   `?handle=`: that route's `Referrer-Policy` and `noindex, nofollow` are already scoped to it,
   and a credential in a query string is archived by every log it passes.
4. **Send only to the account's own login address.** Never to `noticesEmail` because it was on
   the gym record: those can differ, and mailing a set-password link to an address that is not
   the login hands the account to a third party who did nothing wrong.
5. **TTL is the server's, and it is not published.** The page deliberately puts no number on the
   link. An earlier version promised an hour, which was both wrong and unfalsifiable from the
   frontend.
6. **Throttle per address and per IP, and answer a refusal as `400`.** Not `429`:
   `codeForStatus` maps anything outside 400/401/403/409 to `network`, whose message is "check
   your connection and try again" — the exact wrong instruction for a caller being throttled.
   A `400` arrives as `validation` and renders the server's own message. When
   `OnboardingErrorCode` gains `rate_limited`, this becomes a `429` and the two flip in that
   order: backend to send it, frontend to understand it.
7. **Consider ending other sessions when the password is set.** Not specified here because it is
   `POST /gym/account`'s behaviour rather than this route's, but the reason someone resets is
   often that they think somebody else is in — and a 12-hour non-refreshing session that
   survives the reset is that somebody, for the rest of the day.

Delivery is SES or the same SMTP transport, with `getPasswordResetEmailTemplate({ name,
resetUrl })`. Note that template currently lives on the frozen Supabase side; the copy is
reusable, the function is not the one to call from AWS.

### What shipped here

- `requestPortalPasswordReset(email)` in `gymSession.ts` — one `POST`, and a success that means
  *accepted*, never *found*. It must not gain a return value that tells the two apart.
- `SELF_SERVE_RESET_ENABLED = NEXT_PUBLIC_MBP_SELF_SERVE_RESET === "on"`. Unset in every deployed
  environment, which is what keeps the shipped page honest while the route is missing; `.env.local`
  is the one place it is on. **Turning it on before the route sends recreates §9.2's harm exactly** —
  a confident confirmation and a gym owner waiting instead of calling.
- `GymForgotPassword` renders both halves. Off: today's prose, unchanged. On: an email field, and
  on any accepted request a panel reading "if we have an account for that address, a link to set
  a new password is on its way", plus the mailto as the fallback for when nothing arrives. No
  password fields on this page in either state — the link's landing page is where a password gets
  set, and the old version's two fields changed the password of whatever session the browser
  already had.
- The brand panel's three facts and its subhead switch with the flag, because "a person checks
  you're the account holder" stops being true the moment the route mints without one.

Both halves are in the file on purpose. Deleting the prose half and restoring it later is how the
reasoning above gets lost, and the prose half is the honest one.

### Verified

`npx tsc --noEmit` clean. Screenshots of both states at 1440/768/390. The new suite covers the
switch itself — a getter on the mocked flag, since a build-time const is otherwise untestable in
both directions — and pins the invariant directly: the confirmation says "if we have an account",
never "we have emailed you", never "no account", and never echoes the address back.

## 44. The flag comes out (2026-09-04)

> lets remove gym forgot password self_serve_reset_enabled flag. we want to gym to be able to
> reset password automatcially

§43 shipped both halves of the page behind `SELF_SERVE_RESET_ENABLED` and specified the one route
it was waiting on. That route landed in `mbp-backend` on 2026-08-29 as
`services/onboarding/src/handlers/gymPasswordReset.ts`, it is wired at
`infra/lib/stacks/onboarding-stack.ts:274`, and it is deployed to production — `POST` a malformed
address to `https://api.muscleboxpro.com/gym/password-reset` and it answers `400` with
`fieldErrors.email`, which proves the route without minting anything. It mints a `setpw` token
through `issuePasswordResetToken`, throttles at three per account per hour, and mails the link with
`deliver({ kind: "password_reset" })` to the address on the account.

So the condition the flag existed for is met, and the flag is gone rather than flipped on. A flag
whose off-state is unreachable is a switch that no longer switches anything: it keeps a second page
compiled and untested in the bundle, and the next person to read it cannot tell whether prose is
where we are going back to or where we came from.

### What went

- `SELF_SERVE_RESET_ENABLED` in `gymSession.ts`, and `NEXT_PUBLIC_MBP_SELF_SERVE_RESET` with it.
  The variable was never set in any deployed environment, so nothing on Vercel changes.
- `ResetByRequest`, `relayFacts`, and the three conditionals in the page. One state now: a form,
  then a neutral confirmation.
- The suite's hoisted flag getter and its "with no self-service route deployed" block. Thirteen
  tests remain and all pass.

### What stayed, deliberately

**The mailto, on every state of the page.** It reads as a leftover from the prose half and is not.
The route declines quietly in three cases a gym owner can neither see nor fix — a disabled account,
a terminated gym, and **two logins on one gym**, where `POST /gym/account`'s `setpw` branch requires
exactly one account and cannot tell which password to change. All three get the same confirmation as
a successful send, because the alternative tells a script which addresses are customers'. A person
issuing the link through `POST /admin/gyms/{gymId}/set-password-link` is the only way out of them,
which is also why that route is not now redundant.

**No expiry figure, and no claim an account was found.** Unchanged from §43, and the two things the
suite pins.

### One correction to §43's contract

Item 6 above asked the route to answer a throttled caller `400`, on the grounds that `429` maps to
`network` and renders "check your connection", which is the wrong instruction for someone being
throttled. **The route answers `202` instead, and that is better than what was specified.** A `400`
would still be a different answer for an address that has an account than for one that does not,
which is the enumeration oracle the rest of the design closes. The frontend's own comment has been
corrected to match: the only failures `requestPortalPasswordReset` can now see are a malformed
address and a request that never arrived.

Item 7 — ending other sessions when the password is set — is still open, and is still
`POST /gym/account`'s behaviour rather than this route's.

The admin side is unchanged: `/admin/login` still has no forgot-password link, because there is no
admin reset route. A sender now exists, so that note's reasoning is narrower than it was — the
missing piece is the route alone.

### Verified

`npm run check` clean. `npx vitest run client/src/__tests__/pages/GymForgotPassword.test.tsx` —
13 passed. Production route probed with a malformed address, which returns the `validation` body
above and touches no account.
