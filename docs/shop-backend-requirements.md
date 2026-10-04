# Shop (`/join` and `/drinks`): backend requirements

Status: **superseded** by `mbp-backend/docs/shop-agreed-spec.md` (agreed 2026-10-01). Where they differ, the agreed
spec wins. This file is kept as the frontend's original request.

This replaces two parts of `mbp-machine/docs/NEXT-BUILD.md` §F:

- **§F.1.2 (`partner/codes` with a shared API key).** It is not needed. The website no longer talks to the backend
  through a server-held key, because the purchase and the code both live in a new AWS service (§3).
- **§F.2 ("Supabase, as today").** Supabase is frozen and customer login was removed from the site. Customer
  accounts are new, and they live in AWS.

§F.1.1 (links in `getQrConfig`), §F.1.3 (wrong-code lockout) and §F.1.4 (public machine menu) stand, with the
details below.

## 1. Decisions

1. **The machine is unchanged.** It shows a QR to `https://muscleboxpro.com/join?sn=<SN>` (Join Members) and
   `https://muscleboxpro.com/drinks?sn=<SN>` (Get Drinks). A drink bought on the phone becomes a normal redeem
   code that the customer types or scans under Get Drinks (§5A). There is no push to the machine.
2. **A guest can buy.** No login is needed to buy one drink.
3. **A bought code works only at the machine it was bought at, for the drink that was bought, once. It never
   expires.** It works until it is used. There is no automatic refund.
4. **Loyalty is a stamp card: every 10th drink is free.** Only a signed-in customer collects stamps.
5. **Sign-in is a 6-digit code sent by email.** Phone OTP comes later (it needs DLT registration for SMS in India).
6. **The machine a customer joined at is recorded**, and through its owner, the gym. This is their home gym.
7. **A new `shop` service** in mbp-backend, its own stack and table, served at `api.muscleboxpro.com/shop`.

## 2. What exists today (for orientation)

| Fact | Where |
|---|---|
| Redeem codes, consume and release | `services/machine/src/domain/redeem.ts`, `repo/codes.ts` (`consumeCode`, `releaseCode`) |
| Machine redeem routes | `handlers/redeem.ts`: `getExchangeGoods`, `exchangeGenOrder` |
| A failed make gives the use back | `handlers/orderFlow.ts` (`produceFail` → `releaseCode`) |
| Per-machine listing and price | `MACHINE#<sn>/ASSIGN#<goodsId>` (`listed`, `devicePriceInr`), `shownPriceInr` in `domain/goodsView.ts` |
| Sold out per drink | `MACHINE#<sn>/PRODUCT#<goodsId>.soldOut` (`repo/catalog.ts`) |
| Online | `lastSeen` within 3 minutes (`admin/repo/overview.ts`) |
| Machine owner | `owner` on `MACHINE#<sn>/PROFILE` (`repo/machines.ts`) |
| QR settings | `admin/handlers/qr.ts`, `domain/appStartViews.ts` (`QrSettings`, `qrConfigView`) |
| PIN lockout to copy | `domain/lockout.ts` |
| Razorpay webhook to copy (verify raw bytes, then parse; 401/200/500 rules) | `services/onboarding/src/handlers/webhookDeposit.ts` |
| Email | `services/onboarding/src/lib/mail.ts`, `providers/ses.ts` |
| Customer accounts, stamps, OTP | none, in either repo |

## 3. Shape

```
Phone /drinks?sn=X  ──GET  shop/machines/X──────────▶ shop ──internal──▶ machine: menu for X
                    ──POST shop/orders──────────────▶ shop ──▶ Razorpay order
                    ── Razorpay Checkout (UPI) ──▶ Razorpay
Razorpay ───────────── POST shop/webhook/razorpay ──▶ shop ──internal──▶ machine: create code
Phone               ──GET  shop/orders/{token}──────▶ shop: paid + code
Machine             ── Get Drinks, type code ──▶ getExchangeGoods ──▶ exchangeGenOrder (unchanged)
```

- The machine service stays the only owner of redeem codes and the menu. The shop reaches it through an
  **internal** interface (IAM-authenticated API route or direct Lambda invoke, your choice). No shared secret in a
  browser, in Vercel, or in a header.
- The shop never tells a machine anything. Everything at the machine goes through the code.

## 4. Machine service changes

### 4.1 Links in the QR settings (§F.1.1)

- `QrSettings` gains `memberLink` and `exchangeLink`, strings, default `""`.
- `PUT qr` reads them. Empty is allowed (the machine's default). Otherwise: `https`, host `muscleboxpro.com` or a
  subdomain, at most 200 characters, no `sn` handling (the machine sets `sn`). Field errors on `memberLink` and
  `exchangeLink`.
- `GET qr` returns them.
- `qrConfigView` adds `memberLink` and `exchangeLink`.
- Keep `memberQr` and `exchangeQr` as they are for old apps. The dashboard keeps sending the stored images
  unchanged, so a save does not clear them.
- A change to either link marks app start changed, as the rest of the settings do.

### 4.2 Wrong-code lockout (§F.1.3)

- On `getExchangeGoods`, per machine: 5 wrong codes in a row locks Get Drinks on that machine for 5 minutes. Copy
  the rule in `domain/lockout.ts`: while locked, every code is refused without being looked up, and a locked
  attempt does not extend the lock.
- Refusal text: "Too many wrong codes. Try again in N min."
- A correct code while unlocked resets the count.
- Log `redeem.bad` with the sn and the last 2 digits only. Never the full code.
- Also apply it on `exchangeGenOrder`, since that route also takes a code.

### 4.3 Where a code came from

New optional fields on the code row: `source` (`admin`, `shop_purchase`, `shop_reward`), `customerId`, `orderId`.
Admin-made codes are `admin` (old rows without the field read as `admin`). The admin code list and detail return
them, and the list can filter by `source`.

### 4.4 Internal: create a code

Called by the shop only.

| Field | Rules |
|---|---|
| `orderId` | Required, unique. **Idempotent:** the same `orderId` again returns the same code, never a second one. |
| `source` | `shop_purchase` or `shop_reward`. |
| `customerId` | Optional (a guest has none). |
| `goodsIds` | Purchase: exactly the one drink. Reward: empty (any drink). |
| `sns` | Purchase: exactly the one machine. Reward: empty (every machine). |
| `usesAllowed` | 1. |
| `expiresAt` | Not set. These codes never expire. |
| `theme` | A label for the dashboard, for example `Website: Chocolate shake` or `Reward: 10th drink`. |

The code is **8 digits**, unique among all codes. Replies `{code, state, usesAllowed, usedCount}`.

Also internal: **read codes by id** (state and `usedCount`), so the shop can show uses left, and **disable a code**
(for a refund). Disabling a used code is refused.

### 4.5 Internal: a machine's menu (§F.1.4)

Given an sn: `{sn, name, place, online, enabled}` and the listed drinks as
`{goodsId, name, nameEn, spec, priceInr, image, serveTemp, soldOut}`, sorted as on the machine. `priceInr` is the
price at this machine (`shownPriceInr`). An unknown sn returns not found. No ids, owners, PINs or stock levels
beyond `soldOut`.

## 5. Shop service

### 5.1 Records (names are suggestions)

- **`CUSTOMER#<id>/PROFILE`**: `email` (lower-cased), `name` (optional), `joinedSn`, `joinedGymId` (from the
  machine's owner at sign-up, null if none), `createdAt`, `stamps` (0 to 9), `lifetimeDrinks`, `deletedAt`.
  Unique on email.
- **`ORDER#<id>`**: `token` (unguessable, at least 128 bits, the guest's only handle), `customerId|null`, `sn`,
  `goodsId`, drink name and picture as bought, `priceInr` as charged, `razorpayOrderId`, `razorpayPaymentId`,
  `status` (`created`, `paid`, `coded`, `refunded`, `failed`), `code`, `stampAwarded`, timestamps.
- **`STAMP#<customerId>/<orderId>`** ledger rows: `+1` for a paid drink, `-10` when a reward is issued, `-1` for a
  refund. The card count is derived from the ledger or kept on the profile with a conditional write. It must be
  exact under a retried webhook.
- Sign-in codes: hashed, 10 minutes, 5 tries, one live code per email.

### 5.2 Public routes (no session)

- **`GET shop/machines/{sn}`**: the menu from §4.5. Rate-limited per IP. `Cache-Control: max-age=30`.
- **`POST shop/orders`** `{sn, goodsId}`: refuses, with a plain message, when the machine is unknown, disabled or
  offline, or the drink is not listed or is sold out ("This machine is offline right now, so you can't buy here."
  / "That drink is sold out on this machine."). The price is the server's. Creates the Razorpay order and returns
  `{token, razorpayOrderId, amount, currency, keyId}` for Checkout. With a session, the order belongs to the
  customer.
- **`GET shop/orders/{token}`**: `{status, drink, priceInr, sn, machineName, code|null, used}`. The code appears
  only once the order is `coded`. `Cache-Control: no-store`. This is the guest's receipt, so treat the token as a
  credential: never log it in full.
- **`POST shop/webhook/razorpay`**: the only thing that may mark an order paid. Same rules as
  `webhookDeposit.ts` (verify the raw bytes before parsing; 401 for a bad signature, 200 for anything permanent,
  500 only when a retry should happen). On `payment.captured` or `order.paid` for the right amount: mark paid,
  create the code (§4.4, `orderId` = our order id), mark coded, award the stamp (§5.4). Each step is idempotent, so
  a redelivery finishes a half-done order and never makes a second code or stamp.
- A sweep for orders stuck in `paid` without a code, as `paySweep` does for machine payments.

### 5.3 Sign-in and account routes

- **`POST shop/auth/code`** `{email, sn?}`: emails a 6-digit code. Always answers the same way, whether or not the
  email has an account. Rate-limited per email and per IP.
- **`POST shop/auth/verify`** `{email, code, sn?, claimToken?}`: signs in, creating the customer on first use with
  `joinedSn` = `sn`. Sets a session cookie (same rules as the gym and franchise sessions). With `claimToken`, a
  guest order bought on this phone moves to the account and earns its stamp, if it is unclaimed.
- **`GET shop/me`**: profile, `stamps`, and `stampsToNext` (10 minus the count).
- **`GET shop/me/codes`**: the customer's codes, newest first, with drink, machine, state and whether used.
- **`GET shop/me/orders`**: order history.
- **`POST shop/logout`**.
- **`DELETE shop/me`**: deletes the account (DPDP). Unused codes keep working; they are bearer codes.

### 5.4 Stamps

- A signed-in customer's paid website drink earns 1 stamp, once per order.
- On the 9th stamp: issue a reward code (§4.4: `shop_reward`, any drink, any machine, 1 use, never expires) and
  take 9 stamps off, so the reward is the 10th drink (decided 2026-10-02). The reward is idempotent on
  `reward:<customerId>:<n>`.
- A reward drink earns no stamp.
- Drinks paid on the machine's own pay screen earn none (they are anonymous). A later phase could change that.
- A refund removes the order's stamp. If that stamp already turned into a reward, the count can go below zero
  and the next stamps pay it back.

### 5.5 Admin routes (dashboard)

Behind the admin session, like `machine-admin`:

- **`GET shop-admin/orders`** with filters (status, sn, date range, customer) and **`GET shop-admin/orders/{id}`**.
- **`POST shop-admin/orders/{id}/refund`**: only while the code is unused. Disables the code (§4.4), then refunds
  through Razorpay, then removes the stamp. A used code is refused with "This code has been used, so it can't be
  refunded."
- **`POST shop-admin/orders/{id}/reissue`**: for a drink that can no longer be made at that machine (delisted, or
  the machine moved). Disables the old code and issues a new one for a chosen machine and drink at the same price
  or lower.
- **`GET shop-admin/customers`** and **`GET shop-admin/customers/{id}`**: profile, joined machine and gym, stamps,
  codes and orders. Read-only.

## 6. Website side (for your awareness)

- **`/drinks?sn=`:** the menu → buy → Razorpay Checkout → wait on `GET shop/orders/{token}` → the code in large
  digits with a QR. The token goes in the page URL so the page is the receipt, and it is also kept on the phone.
- **`/join?sn=`:** what an account gets you → email → code → signed in → on to `/drinks?sn=`.
- The site's CSP gains the shop host and Razorpay Checkout (`checkout.razorpay.com`, `api.razorpay.com`).
- Both pages are kept out of search indexing. (Changed 2026-10-04: `/join` and `/drinks` are indexed;
  `/drinks/account` and `/drinks/receipt` are not.)
- Until the shop is live, both pages are holding pages that tell the customer to pay on the machine.

## 7. Order of work

1. §4.1 links and §4.2 lockout. Small, and they unblock the machine app.
2. §4.3 to §4.5 and §5.2: guest purchase.
3. §5.3: accounts.
4. §5.4 stamps and §5.5 admin.

## 8. Tests

- The same `orderId` twice gives the same code; a redelivered webhook gives no second code and no second stamp.
- A purchase code works only at its machine and for its drink, once, and never expires. A reward code works for any
  drink at any machine.
- Five wrong codes lock the machine; a right code is refused while locked and works after.
- An order is refused for an offline machine, an unlisted drink and a sold-out drink. The price is the server's.
- A webhook with a bad signature is 401 and changes nothing. A wrong amount is not applied.
- 10 paid drinks issue exactly one reward code. A refund removes the stamp.
- A refund is refused once the code is used.
- The sign-in code expires after 10 minutes and locks after 5 wrong tries.
- The two links are checked (https, the host, the length) and reach `getQrConfig`.
