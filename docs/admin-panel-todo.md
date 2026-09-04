# Admin panel — what's built and what's left

Started 2026-08-23. The admin panel (`app/admin/`, `client/src/pages/admin/`) has no other
backlog anywhere — the build order was agreed in conversation and never written down, so this
file exists to stop that happening again. Update it as items land or new ones come up; don't
let this become a second copy of `mbp-backend`'s `docs/gym-onboarding-api-design.md` §2.1 route
table — link to it instead of restating it.

## Done

- Admin login, session persistence (including the sandbox bearer-session fix).
- Overview (`/admin`) — the funnel, the stalled list and the identity block. Every figure on it is
  counted client-side over rows already fetched (`adminFunnel.ts`), because there is no count
  endpoint and no per-status index; the page labels each one a floor rather than a total when a
  cursor remains. The identity block is still the first thing to read when the panel is
  mysteriously empty.
- Gyms list (`GET /admin/gyms`) — status chips, filter box and sortable columns, all client-side
  over the loaded rows and all labelled as such; cursor-based "load more" appends.
- Gym detail (`GET /admin/gyms/{gymId}`) — the "why is this gym stuck?" screen, now with an anchor
  nav and the write actions below. Every write re-reads the whole gym rather than patching local
  state, because replacing a machine and terminating both have server-decided side effects.
- Edit terms (`PATCH /admin/gyms/{gymId}/terms`) — `AdminTermsEditor`. Sends only the changed
  figures (`termsDiff`), and says "nothing changed" locally rather than letting the server's
  empty-patch refusal reach the admin. Refused once signed by a server `ConditionCheck`, so the
  editor does not pretend to gate it: no edit button once `signature` exists.
- Assign/replace machine (`PUT /admin/gyms/{gymId}/machine`) — `AdminMachineEditor`. Turns a
  `PENDING-` placeholder into a real device number, and warns before a device-number change that
  the route will read as a replacement. Always sends a whole machine, for the reason
  `adminMachineFormSchema` gives.
- Offboarding, all four routes — `AdminOffboardingSection`. The ladder is forward-only and
  terminal, so the card offers only the rung that is actually available rather than four buttons
  three of which can only produce a 409.
- The gym's own dashboard, mirrored (`AdminGymDashboard`) — card for card in the gym's order,
  including the seven cards that are empty. The trading cards show the same
  `not_implemented` state the gym sees; nothing here invents a figure, because a plausible number
  on this screen gets quoted to a partner.
- Invite a gym (`POST /admin/gyms`) — as of 2026-08-23, does **not** collect legal entity name,
  entity type, GSTIN, either address, the signatory, or the machine's device number/serial/
  accessories/installation date. The first seven are filled by the gym at onboarding step 1
  (`validateInviteDetails` server-side); the machine ones are filled later via the "assign
  machine" action below, once a physical unit is chosen (`validateInviteMachineInput`, which
  fills a `PENDING-`-prefixed placeholder `deviceNo` — see `shared/admin/gyms.ts`'s
  `isPendingDeviceNo`).

- The franchise detail page's three writes (2026-09-04) — `AdminFranchiseTermsEditor`
  (`PATCH /admin/franchises/{franchiseId}/terms`) and `AdminFranchiseInviteActions`
  (`POST`/`DELETE …/invite`). Three things about them are not obvious from the gym equivalents:
  the terms lock reads `timestamps.signedAt` rather than `status`, because the ladder moves past
  `signed` at step 8; the resend response carries the only copy of the URL that will ever exist, so
  it is parsed with its own schema and a stripped `onboardingUrl` is reported as unrecoverable
  rather than as retryable; and clearing the instalment schedule sends `null`, never `[]`, because
  those are different claims to the server. The routes are written in `mbp-backend` and **not yet
  deployed to either environment** (`.claude/TODO.md`, "three missing writes"), so the UI is ahead
  of sandbox until the three stacks go out in the order Onboarding → Admin → Wizard.

## The biggest gap — the panel reports onboarding, not the business

Raised 2026-08-28, looking at `/admin`: it shows where gyms are in onboarding and nothing about
what they sell. That is not an oversight in the UI. **No sales data exists anywhere.**
`GET /gym/portal` answers `sales`, `adRevenue`, `electricity` and `statements` with
`{available: false, reason: "not_implemented"}`; `AdminGymListRow` carries no money field at all;
there is no ingestion from the machines and no settlement job in either repo.

`/admin` now has a `Trading` band above the funnel that says exactly that, naming the four missing
pipelines rather than one "coming soon" line, and `AdminGymDashboard` mirrors the same blanks per
gym. Nothing invents a figure: a plausible total on an overview is the number that gets quoted to
a partner or an investor.

What it would take, in order:

- [ ] **Per-period cup counts off the machines.** The blocker, and the only one that is a new
      pipeline rather than a route. Everything else is arithmetic over it.
- [ ] **An admin rollup route.** `GET /admin/trading` or similar, aggregating across gyms for a
      period. It cannot be done from `gsi4-gymlist`, and it must not be done by fetching every gym
      client-side the way the funnel counts are — that is tolerable for eight thin fields per gym
      and not for a period of sales.
- [ ] **A `PortalSection`-shaped response.** Wrap each figure the way the gym's own does, so the
      admin screen can distinguish "we have not built this" from "this gym has no data yet". The
      two are opposite conclusions for whoever is reading.

The money split is *not* missing: `shared/settlement/compute.ts` already turns cup counts into each
side's share, cumulative counters and the electricity review window included. Do not rebuild it
server-side without deciding which copy is authoritative.

## Not built yet — the remaining write actions

`docs/gym-onboarding-api-design.md` §2.1 in `mbp-backend` lists these as already deployed
routes with no admin UI in front of them yet:

- [ ] **Resend invite** — `POST /admin/gyms/{gymId}/invite`. Regenerates the link, supersedes
      the previous handle. **Priority**: only `sha256(handle)` is stored, so a link is recoverable
      exactly once, in the response that minted it. Resending is the only way to get a working
      link to a gym that lost theirs, and the detail page currently says so without offering it.
      `AdminFranchiseInviteActions` is the same two writes on the franchise side and is the screen
      to copy: the confirm-first shape, the show-once URL panel and the honest `wasLive: false`
      outcome all apply unchanged.
- [ ] **Void invite** — `DELETE /admin/gyms/{gymId}/invite`.
- [ ] **Activate** — `POST /admin/gyms/{gymId}/activate`. `deposit_paid` → `active`. Needs
      `installationDate` set first (`docs/onboarding-build-progress.md`, deviation found during
      the sandbox walk).
- [ ] **Set-password link** — `POST /admin/gyms/{gymId}/set-password-link`. §9.2.

## Parked — the panel is cheap, the API's metrics are not

Raised 2026-08-28 while costing the panel. Recorded here rather than fixed, because the fix is a
one-line change in `mbp-backend` whose consequence is losing per-method latency and 4xx/5xx graphs,
and that is a decision rather than a patch.

**The pages are not the expense.** Loading `/admin` is two requests — `GET /admin/me` plus one
`GET /admin/gyms` — because the paging loop in `AdminHome.tsx` returns as soon as `nextCursor` is
null; `MAX_PAGES = 5` is a bound for a thousand gyms, not observed behaviour. At API Gateway and
on-demand DynamoDB prices that is roughly 2.5 paise per thousand page loads. Nothing on the admin
side is worth optimising for cost.

**The expense is `metricsEnabled: true`** on the REST API stage
(`infra/lib/stacks/onboarding-stack.ts`, the `deployOptions` block). It turns on API Gateway
*detailed* CloudWatch metrics, which are billed as custom metrics **per method** — around 330 to 460
billable metrics across the API's methods, at \$0.30 each, so on the order of \$100–140 a month, and
it is charged whether or not a single request arrives. It is very likely the largest line item in the
stack: there is no NAT gateway, DynamoDB is on-demand, secrets are in SSM Parameter Store rather than
Secrets Manager, `dataTraceEnabled` is false, X-Ray is off and there is no API cache.

This was not confirmed against a real bill — check Cost Explorer grouped by service, then by usage
type, before acting. If it is confirmed, the options are: turn detailed metrics off and rely on the
per-function `Errors` alarms that already exist, or keep them and accept the cost as the price of
per-method visibility. Do not change it as a side effect of some other piece of work.

## Worth considering

- [ ] **A malformed page hides every gym on it, not just the bad row.** `parseAdminGymList`
      validates the page as one object, so one row with an unexpected field takes the whole list
      down — that is how the blank-`legalEntityName` bug on 2026-08-23 turned two new gyms into
      "0 loaded" and hid a third, fully onboarded one. Parsing rows individually would render
      what is readable and list the rows that aren't. Not obviously right (a half-rendered list
      is its own kind of misleading), so this needs a decision rather than a patch.

## Terminate contract — how the 2026-08-24 questions were answered

Requested 2026-08-24 from the Gyms list UI, with no backend route and six open questions. The
routes now exist (`…/offboarding/notice`, `/terminate`, `/machine-recovered`, `/settlement`) and
the UI is `AdminOffboardingSection`. What the questions turned into, so nobody re-opens them:

- **Which clause** is `TerminationCause`: `gym_notice`, `gym_breach`, `mutual`, `term_expiry`.
  Deliberately no `mbp_convenience` — §35 gives us no right to terminate at will. The §36.1 notice
  is a separate rung *before* termination rather than a variant of it, so serving notice and cutting
  a served notice short are different recorded acts.
- **`OnboardingStatus` gained nothing.** The end of the relationship is its own record
  (`AdminOffboarding`), not a ninth rung, so `STATUS_LABEL`/`STATUS_CLASS` and everything else that
  switches on status stayed as they were. The detail page carries a banner instead, because an admin
  who does not know the agreement has ended will read the onboarding sections as if it were live.
- **The deposit is settled, not paid.** `payableToGymPaise` is a figure a human pays from the
  Razorpay dashboard afterwards, and the settlement panel says so out loud beside it. The amount we
  hold comes from what the gateway captured, never from the request body, which is why the
  settlement form has no field for it.
- **The machine** is recorded recovered on its own rung, with a condition note, and that note is
  what §37.6 deductions are argued from.
- **`earlyTerminationChargeInr`** is not read by termination. What §37.6 turns on is
  `earlyAgainstNotice`, stored at termination rather than recomputed, because a notice row may be
  corrected later and the answer wanted is whatever was true when we terminated.
- **It lives on the detail page**, not as a row action on the list. Every irreversible write sits
  next to the context needed to confirm it.

Still open:

- [ ] **Nothing links the list to it.** A terminated gym looks live in the Gyms list — the chips and
      the status column read `OnboardingStatus`, which is exactly the field termination did not
      touch. The list row would need `offboarding` on `AdminGymListRow`, which is nine thin fields
      today and is that size on purpose. Worth a decision, not a patch.
- [ ] **No refund flow, by design for now.** Whether payouts ever move through this system, or stay
      a Razorpay-dashboard step against a recorded settlement, is undecided.
