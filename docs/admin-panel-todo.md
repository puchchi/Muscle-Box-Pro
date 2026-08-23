# Admin panel — what's built and what's left

Started 2026-08-23. The admin panel (`app/admin/`, `client/src/pages/admin/`) has no other
backlog anywhere — the build order was agreed in conversation and never written down, so this
file exists to stop that happening again. Update it as items land or new ones come up; don't
let this become a second copy of `mbp-backend`'s `docs/gym-onboarding-api-design.md` §2.1 route
table — link to it instead of restating it.

## Done

- Admin login, session persistence (including the sandbox bearer-session fix).
- Gyms list (`GET /admin/gyms`) — client-side filter, cursor-based "load more".
- Gym detail, read-only (`GET /admin/gyms/{gymId}`) — the "why is this gym stuck?" screen.
- Invite a gym (`POST /admin/gyms`) — as of 2026-08-23, does **not** collect legal entity name,
  entity type, GSTIN, either address, the signatory, or the machine's device number/serial/
  accessories/installation date. The first seven are filled by the gym at onboarding step 1
  (`validateInviteDetails` server-side); the machine ones are filled later via the "assign
  machine" action below, once a physical unit is chosen (`validateInviteMachineInput`, which
  fills a `PENDING-`-prefixed placeholder `deviceNo` — see `shared/admin/gyms.ts`'s
  `isPendingDeviceNo`).

## Not built yet — the remaining write actions

`docs/gym-onboarding-api-design.md` §2.1 in `mbp-backend` lists these as already deployed
routes with no admin UI in front of them yet:

- [ ] **Resend invite** — `POST /admin/gyms/{gymId}/invite`. Regenerates the link, supersedes
      the previous handle.
- [ ] **Void invite** — `DELETE /admin/gyms/{gymId}/invite`.
- [ ] **Edit terms** — `PATCH /admin/gyms/{gymId}/terms`. Refused once signed.
- [ ] **Assign/replace machine** — `PUT /admin/gyms/{gymId}/machine`. **Priority**: this is what
      turns a pending placeholder device number (see above) into a real one, so a gym invited
      through the current form has no other path to ever getting a real machine assigned.
- [ ] **Activate** — `POST /admin/gyms/{gymId}/activate`. `deposit_paid` → `active`. Needs
      `installationDate` set first (`docs/onboarding-build-progress.md`, deviation found during
      the sandbox walk).
- [ ] **Set-password link** — `POST /admin/gyms/{gymId}/set-password-link`. §9.2.

## Worth considering

- [ ] **A malformed page hides every gym on it, not just the bad row.** `parseAdminGymList`
      validates the page as one object, so one row with an unexpected field takes the whole list
      down — that is how the blank-`legalEntityName` bug on 2026-08-23 turned two new gyms into
      "0 loaded" and hid a third, fully onboarded one. Parsing rows individually would render
      what is readable and list the rows that aren't. Not obviously right (a half-rendered list
      is its own kind of misleading), so this needs a decision rather than a patch.

## Not designed yet

### Terminate contract — requested 2026-08-24, from the Gyms list UI

No backend route exists for this at all — it isn't in §2.1's table. Before it can be built,
someone needs to answer:

- **Which clause is this?** §36.1 is the gym exiting on 30 days' written notice (nil cost,
  conditional on the notice); §12.4/§37.6 is MBP removing an underperforming machine (15 days'
  notice, MBP recovers retrieval costs). These are different triggers with different economics
  and might need to be two admin actions, not one — "terminate" is ambiguous between them.
- **What does it do to `OnboardingStatus`?** The ladder (`shared/onboarding/types.ts`) has no
  terminal state after `active` — `invited` → … → `active` and nothing past it. A terminated
  gym needs a new status value (additive, not a rename) and every place that switches on status
  — `STATUS_LABEL`, `STATUS_CLASS` in `adminFormat.ts`, `bindingMilestone`-adjacent logic if
  any — needs to know it's a dead end, not a step to progress from.
- **What happens to the deposit?** Refundable per §5.1/Schedule B — does termination trigger a
  refund flow, or is that a manual step outside this system for now?
- **What happens to the machine?** `MachineStatus` already has `"removed"` — likely the machine
  row transitions there, but does that happen automatically or does it require the separate
  "assign/replace machine" action to record removal?
- **Does `earlyTerminationChargeInr` matter here?** That field already exists per-gym
  (`OnboardingTerms`) precisely for this scenario — presumably the termination flow reads it
  rather than the admin retyping a number, but the null-vs-zero distinction
  (`AdminGymView.terms` docstring) needs to survive into whatever this endpoint does with it.
- **Where does it live in the UI?** Requested for the Gyms list specifically ("it should come
  in this ui") — worth deciding whether that means a row-level action there, or a link from
  the list into the gym detail page where the action actually lives (detail is where every
  other write action is planned to sit, since it's the page with the context to confirm against
  before an irreversible action).

Scope it properly before building — this touches money (deposit), a status ladder every other
screen assumes is forward-only, and a contractual clause with two different triggers.
