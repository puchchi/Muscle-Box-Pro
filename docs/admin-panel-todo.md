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

- [ ] **Set-password link** — `POST /admin/gyms/{gymId}/set-password-link`. §9.2.

Resend, void and activate for gyms are done (2026-10-01, see below).

## Done 2026-10-01 — activation, invites, and the machine-console follow-ups

- **Gym activation** — `GymActivationCard`, rules in `activationRules.ts`. Shows the three checks
  (signed, machine placed, deposit), asks for a waiver reason of at least ten characters when the
  deposit is unpaid, and has a "tell the gym" switch. A `PENDING-` device number does not count
  as placed, on either side. Server refusals have their route names swapped for "the Machine
  section" by `plainActivationMessage`.
- **Gym invite resend and void** — `InviteActions subject="gym"`, the shared version of what was
  `AdminFranchiseInviteActions` (now a thin wrapper).
- **Franchise activation** — `FranchiseActivationCard`, `POST /admin/franchises/{id}/activate`.
  **No preconditions** (decided 2026-10-01): it lists what is unfinished but never blocks.
  Declined franchises are refused. The "you're live" email is on by default and can be switched
  off. The detail page's "Waiting on us" banner now covers `payment_verified`.
- **Franchise "not live yet" banner** on the franchise's own dashboard (`notLiveMessage`).
  Login and the portal are not gated on `active`.
- **Goods "Served" choice** — Normal, Chilled or Hot (`ServeTempField`), and a Served column in
  the goods library. The form always sends `serveTemp`; `null` means Normal.
- **QR and logo: links instead of QR pictures** — "Join Members link" and "Get Drinks link",
  empty for the machine's default (`/join`, `/drinks`). Only `https` on muscleboxpro.com or a
  subdomain, up to 200 characters. The stored QR pictures are still sent unchanged so old apps
  keep them. The backend stores both links and returns `restartPending` from the save.

Open from this work:

- [ ] **Who activated a franchise.** The backend stores `activatedByEmail`, but the admin
      franchise view does not return it, so the card shows only the date.
- [x] **The QR save message.** The save returns `restartPending`, and the notice is
      `appStartNotice(restartPending)` like the other app-start settings.

## Done 2026-10-04: remote control on the machine page (BACKEND-REQUESTS #13)

Contract: mbp-backend `docs/remote-control-dashboard-api.md`, checked against
`admin/handlers/remote.ts` and `mqtt.ts`. The routes are on a third machine base URL,
`NEXT_PUBLIC_MBP_MACHINE_IOT_API_URL`. Production derives it, like the other stacks; elsewhere unset
hides the tab. It is also in `connect-src`. Sandbox: the `IotApiUrl` output of `MbpMachineIot-sandbox`. Production:
`https://api.muscleboxpro.com/machine-iot`.

- A **Remote control** tab (`MachineRemoteTab.tsx`). The MQTT card reads `machine.mqtt` from
  `GET machines/{sn}` and shows one of four states. A certificate we didn't issue gets a warning in
  the card and a pill in the page header.
- **Connect MQTT** shows the code once, as `1234 5678`, with a countdown. After a reload,
  `pendingCode` keeps the countdown without the code. While a code is open, the page re-reads the
  machine every 10 s and drops the code once it has been used.
- **Disconnect MQTT** asks for confirmation first.
- **Commands** (`RemoteCommands.tsx`) appear only when the state is connected:
  - unlock, restart app and reboot ask for confirmation first;
  - each command's state is read every 2 s until it is final, and the outcome is in plain English
    (`remoteRules.ts`);
  - a 409 `in_use` shows the command that is still running (`fieldErrors.commandId`);
  - Cancel shows only while the command is `sent`.
- **Live status** (`RemoteLive.tsx`), also only when connected:
  - opens a session of 1 to 10 minutes and shows its countdown;
  - extends it 10 minutes at a time;
  - reads `live` every 5 s and greys out a report more than 15 s old;
  - says so on a 409 and opens nothing.

  The panel ends the session when it closes, but only if this tab opened it, so another admin's
  view isn't cut off.
- `machine.mqtt` is optional in `machinesSchema.ts`, because the backend that sends it isn't
  deployed. A settings save keeps the last MQTT block, since PATCH doesn't return one.
- **Deploys (2026-10-04):** all three machine stacks are in sandbox, and `MbpMachineIot-prod` is
  deployed but not yet proven. In production, set the variable only once `MbpMachine-prod` exists,
  since the routes read its table. Restart `next dev` after setting it so the CSP picks up the host.

## Done 2026-10-04: the machine console menu in four groups

`MachinesShell.tsx`: Fleet (Machines, Statistics, Logs), Sales (Orders, Shop orders, Customers,
Redeem codes, Feedback), Menu (Goods library, Materials, Discounts, New products) and On screen
(Ads, Voice prompts, QR and logo). Headings show from `lg` up; below that the strip scrolls
sideways with a divider between groups. The current page is scrolled into view either way, and
the sidebar scrolls on short screens.

## Done 2026-10-02: machine handoff (coming soon, Contact us, ratings, Instagram)

The brief is `mbp-machine/docs/HANDOFF-FRONTEND-STOCK-SOON-FEEDBACK.md`; the admin API it builds
against is the backend brief's §2.5, §3.3 and §4. The backend shipped #8, #9, #9b and #11 to sandbox
on 2026-10-02. Every new field still parses as off or none when it is missing. What this repo still needs from the
backend is in `docs/stock-soon-feedback-asks.md`.

- **Coming soon** on a drink: a switch in the goods form (`ComingSoonField`), a pill and a Status
  filter on the goods library, and "Coming soon" in the machine's Sold out column. While it is on,
  the recipe may be empty; a recipe line that was started is still checked.
- **Feedback page** at `/machines/feedback` (`AdminMachineFeedback.tsx`): type chips, a State
  filter that opens on New, an SN filter, cursor paging. The detail shows the whole message as
  text with its line breaks, `mailto:`/`tel:` links, a state and a note of up to 1000 characters.
  The order links to the orders page only when `orderLinked`. A New badge in the menu
  (`newFeedbackCount.ts`) comes from `newCount` and follows saves. Opened from a rating link
  (`?type=review&sn=`), it shows every state.
- **More pictures and videos** on a drink (`GoodsGallery.tsx`, brief
  `mbp-machine/docs/HANDOFF-FRONTEND-GALLERY.md`): up to 7, picked several at a time and uploaded
  one by one with the `goodsMedia` kind, with move left, move right and remove. Before uploading it
  refuses anything but PNG, JPG or MP4, pictures over 2 MB or not square (420 px or more), videos
  over 20 MB or 60 seconds, and files past the 7th. Save is off while uploading, and `media` is sent
  in the order shown (`[]` when all are removed). The goods list shows "+3" on the thumbnail. The
  backend side is `HANDOFF-BACKEND-GALLERY.md` §4; until it ships, a missing `media` reads as none.
- **End quick picks** (`EndField` in `scopeBits.tsx`): +1 mo, +3 mo, +6 mo and +1 yr under End on
  ad schedule rows, Discounts and New products. They count from Start, or from now in IST when Start
  is empty. Jan 31 + 1 month is the last day of February (`machines/quickEnd.ts`).
- **Ratings**: a Rating column (`★ 4.6 (23)`, or "—") on the goods library and on a machine's
  goods, linking to the Feedback page filtered to reviews (and to that machine).
- **Instagram page** on QR settings: `instagramLink`, `https` on `instagram.com` or
  `www.instagram.com` with a profile name; `""` clears it. One link for the whole fleet, not per
  machine. The backend is built (mbp-backend `94d72b8`, the same rule and message) but not deployed:
  until `MbpMachineAdmin-sandbox` and `MbpMachine-sandbox` are, the field does not stick and the
  machine shows instagram.com/muscleboxpro.
- Customer email and phone appear only on the Feedback page: not in URLs, analytics or logs.

Open from this work:

- [ ] Type chip counts appear only once the list reply has `counts` (asks A3).
- [ ] The Status filter filters the returned page on the client until `GET goods` takes
      `comingSoon` (asks A1), so the total and paging can be off.
- [ ] Filter ratings by drink once `GET feedback` takes `goodsId` (asks A4).
- [x] **Website** (done 2026-10-02 with the `/drinks` menu). A sold-out drink is greyed out and
      its button says "Sold out"; a coming-soon drink shows no price and a disabled "Coming soon"
      button; order refusals such as `coming_soon` show the server's message and reload the menu.
      Reviews stay private: nothing about them on the website.

## Shop: `/join` and `/drinks`

The contract is `mbp-backend/docs/shop-agreed-spec.md` (agreed 2026-10-01). It wins over this
repo's `docs/shop-backend-requirements.md`, which is kept as the original request. Decisions are
in its §1: guests can buy; a bought code works at that machine, for that drink, once, and never
expires; every 10th drink is free for signed-in customers; sign-in is an email code; accounts live
in a new AWS shop service, not Supabase.

- [x] Holding pages at `/join` and `/drinks` (`client/src/pages/shop/`). The machine app already
      draws QRs to them. They say what is coming and how to buy on the machine now. `/join` and `/drinks` are indexed since
      2026-10-04 (see the SEO entry below). `/drinks/account` and `/drinks/receipt` are not.
- [x] **Phase 1b, website** (2026-10-02). `/drinks?sn=` shows the live menu and buys with Razorpay
      Checkout (`DrinksShop.tsx`). The receipt is `/drinks/receipt#t=…` (`DrinkReceipt.tsx`): it
      polls until the code arrives, shows refunds in plain words, and has "Email me this code".
      The token stays in the fragment and goes only in `x-shop-order-token`, with
      `credentials: "omit"`. The phone keeps its last 10 orders (`savedOrders.ts`) so a closed
      checkout or a UPI app switch can find the order again. `/drinks/:path*` gets
      `Referrer-Policy: no-referrer` and the only CSP that allows Razorpay.
- [x] **Account orders skip the email form** (2026-10-03). The backend's `codeEmail` already
      sends a signed-in purchase's code to the account. So `buy` saves `account: true` with the
      order, and the receipt says "We've emailed this code to the address on your account."
      instead of the form. The receipt response has no owner, so an order claimed at sign-in, or
      opened on another phone, still shows the form. That is right for claims, which `codeEmail`
      skips.
- [x] **Phase 1c, website: signed-in `/drinks`** (2026-10-02), against `shop/auth/*` and
      `shop/me*` as built (spec §5.2, not deployed in sandbox yet, so tested with mocks).
      - Buy opens a sheet: "Sign in and pay" or "Pay as a guest". Sign-in is the email code inside
        the sheet, then Razorpay. It claims the phone's newest saved order. Once signed in, Buy pays
        straight away as the customer.
      - `/drinks/account?sn=`: the stamp card, "My drink codes" (free drinks included), orders a page
        at a time, sign out, and delete the account.
      - Production uses the `mbp_shop` cookie. Sandbox keeps the returned bearer in sessionStorage
        (`mbp:shop-sandbox-session`), never against `api.muscleboxpro.com`. localStorage holds only
        `mbp:shop-signed-in`, so a phone that never signed in doesn't call `GET me`.
- **Going live (all of the shop).** Production derives `https://api.muscleboxpro.com/shop` and
      `/shop-admin` (decided 2026-10-04), so the shop goes live with the deploy that carries this
      code, with no switch. Merge only once `MbpShop-prod` answers there. Production also
      needs `NEXT_PUBLIC_MBP_MACHINE_FILES_CDN_ORIGIN` for drink pictures, and the Razorpay shop
      webhook registered, before a real paid order reaches `coded`. After changing the variable,
      restart `next dev`: the CSP is built when the config loads. The full checklist is in the
      README under "Production go-live".
- [x] **Phase 1c, website:** `/join`, a real join page (f9f4332).
- [ ] **Prepaid balance.** The backend has built S1 to S7. The dashboard side is done (balance
      refund and stuck-refund buttons, 3f850ae and 1d0258b). Still to build on the website: top up
      and pay from balance. See `docs/shop-balance-asks.md`.
- [x] **SEO for `/join` and `/drinks`** (2026-10-04, 567f794 and 61567d7). Both are indexable, with
      a title, description, canonical (which drops `?sn=`), share preview, and `BreadcrumbList` plus
      `WebPage` JSON-LD (`shared/seo/webPage.ts`), dated from `PAGE_CHANGED_ON`. They are in the
      sitemap, `INDEXNOW_URLS` and `llms.txt`. robots.txt disallows `/drinks/account` and
      `/drinks/receipt`, which also stay `noindex`. The site footer links both, and `/join` links on
      to `/drinks` and `/menu`. The holding versions show only where the shop URL can't be derived.
- Sign in with Google: parked 2026-10-02. Sign-in is the email code only. The asks are kept
      in `docs/shop-google-signin-asks.md`, not sent.
- [x] **Dashboard: Redeem Codes source** (2026-10-02). A Source column and filter (Admin, Shop
      purchase, Shop reward) with the shop order id. Shop codes are read-only, because the backend
      refuses edit, disable and delete on them: the row offers View and Usage, and the detail page
      shows the code instead of the form.
- [x] **Dashboard: shop orders and customers** (2026-10-02), against the routes as built in
      `mbp-backend/services/shop/src/handlers/admin*.ts` (spec §5.4, not deployed yet).
      - `/machines/shop-orders` by month (this IST month by default), status, machine and customer;
        `/machines/shop-orders/[orderId]` with Refund, Try the refund again, Reissue for another
        drink, and Finish reissue when one was left half done. Every action needs a reason (200
        characters, the backend's limit). Reissue offers only drinks at or below the price paid.
      - `/machines/customers` and `/machines/customers/[customerId]`. A guest's email is shown on the
        order page.
      - Customers list (2026-10-03): each row leads with the email (the route already returns it, so
        hiding it protected nothing), then name, joining machine, stamps, drinks, free drinks,
        balance and join date. A deleted account shows "Deleted account" and no email. The find box
        filters the rows already loaded, by email, name, id or machine; nothing typed in it is sent.
      - Customer page (2026-10-03): profile, stamp card with each free code (made or still being
        made), orders, then the balance: balance now, total topped up, total refunded to the
        customer, the history (newest first, `Load more` pages `?ledgerCursor=`, each row linked to
        its order), the top-ups with their Razorpay payment and refundable-until date, and the
        refunds to the customer with who asked and why. A refund whose outcome is unknown shows
        "Check in Razorpay".
      - Balance actions (2026-10-03), both with a reason (200 characters):
        - **Refund balance**, shown while the balance is above zero:
          `POST shop-admin/customers/{customerId}/balance/refund`. It only marks; the refund worker
          pays within minutes. The page says what was queued and what stayed: past the 175-day
          window or from a refunded drink ("returned another way", still an open question for the
          owner), or past one go's payout cap ("press again"). Nothing queued shows as a warning.
        - **Record what Razorpay shows**, on a refund whose outcome is unknown:
          `POST shop-admin/payouts/{payoutId}/resolve` with refunded or not refunded. Not refunded
          puts the amount back on the balance. The dialog names the Razorpay payment to look up.
        - The page reloads the customer after either, so the balance and history are the server's.
      - Shop orders, emails and free codes (2026-10-03). An order carries only `customerId`, so the
        list and the order page look each customer up once (`GET shop-admin/customers/{id}`) and
        show their email over the id. Free codes are rewards, not orders, and no route lists them
        by month. So the list merges in the free codes of the customers it has loaded, at the time
        each was made, as "Free drink N", "Any machine", "Free" and a "Free code" pill. Hidden under
        a machine filter (a free code works at any machine) or a status other than Code issued, and
        none older than the last loaded order while there is more to load. The gap: a free code
        whose customer has no order in the loaded rows is not listed. That needs the backend to
        list rewards by month, and to put the email on the order row, which would also save the
        lookups.
      - The customer cell (2026-10-04): the email alone, linked to the customer page, with the id in
        its tooltip. A skeleton while the lookup runs, the id if it failed, "Deleted account" if the
        account is gone. A filter button on hover (always shown on touch) lists only that customer,
        under a banner that says it covers every month, since a `customerId` filter ignores the
        month. The order page shows the email with a copy button and the id under it. Times sit on
        two lines so the table fits at 1440.
      - Redeem Codes takes `?shopOrderId=` and links each shop code back to its order.
      - `NEXT_PUBLIC_MBP_SHOP_ADMIN_API_URL`: production derives
        `https://api.muscleboxpro.com/shop-admin`; elsewhere unset hides both sections. Restart
        `next dev` after setting it.
      - Not used yet: `GET shop-admin/customers?email=` (an email in a query string, so it would land
        in API access logs), and the
        `already` and `resumed` flags, since the page reloads the order after every action.
- **Not doing (decided 2026-10-01):** phone Start, and no "Website start" on orders. Customers type
      the code. MQTT on the machine page was built later for admins only, as remote control (#13).

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
