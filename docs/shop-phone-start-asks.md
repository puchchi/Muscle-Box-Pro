# Shop codes: asks from the website

Status: decided by Anurag 2026-10-01, sent, and all four answered (2026-10-02). The agreed spec,
`mbp-backend/docs/shop-agreed-spec.md`, now carries them:

- **B0:** phone Start is dropped (spec D4 and §6). The MQTT and start work is parked on the branch
  `phase2-mqtt-start`, reverted on the main line, and not kept for the `refresh` message.
- **B1:** `POST shop/order/email` is built and in sandbox (spec §5.2). The website calls it from the receipt. The
  sign-in join by `guestEmail` is built in 1c, not deployed yet.
- **B2:** yes, it could happen. The use is given back when no report arrives within five minutes (spec §3.5), in
  the machine service's sweep, in sandbox.
- **B3:** the reward code is issued on the 9th stamp and 9 are taken off (spec §5.3). Stamps are not awarded yet.

What follows is the request as sent.

## Decisions

1. **No phone Start on the website or the dashboard.** The website shows the 8-digit code and the customer types it
   on the machine. There is no "Start my drink" button and no time parameter in the Get Drinks link. The dashboard
   gets no "Website start" on orders. Spec §6.1's Start routes and §6.7 have no website or dashboard caller.
   (Later, 2026-10-04: the machine page did get "Connect MQTT" and MQTT status, for admin remote control,
   BACKEND-REQUESTS #13. Customers still never start a drink from a phone.)
2. **A guest can email themselves the code.** No SMS (it needs DLT). Emailing does not create an account.
3. **The 10th drink is free, not the 11th** (decided 2026-10-02). Nine paid drinks, then a free one.

## Backend (mbp-backend)

**B0. Phone Start work already done.** Commit 5a12cf7 adds MQTT enrolment, whose codes come from the dashboard's
"Connect MQTT" button, which will not be built. Please update the agreed spec's §2 and §6 to match decision 1, and
say whether the MQTT work is parked or kept for something else, such as the `refresh` message.

**B1. Email a guest their code.** `POST shop/order/email` with `x-shop-order-token` and `{email}`.

- Sends the code, the drink and the machine's name from `no-reply@muscleboxpro.com`.
- Only for a `coded` order. At most 3 sends per order, plus the per-IP limit. The reply is the same whether or not
  the send went out.
- It does not create an account. The email is stored on the order, lower-cased, as `guestEmail`.
- **When that email signs in, its guest orders join the account** (decided 2026-10-01). On `POST shop/auth/verify`,
  every order with that `guestEmail` and no `customerId` moves to the customer and earns its stamp, exactly as a
  `claimToken` claim does: once per order, none for a refunded order. This needs a lookup by `guestEmail`.
  Signing in proves the email, so no extra check is needed; a guest who typed someone else's email has given that
  person the code anyway.

**B2. A typed code whose reply is lost.** If `exchangeGenOrder` consumes the code but its reply never reaches the
machine, the machine makes nothing and never reports, so the customer has paid for a drink they did not get.
Please say whether this can happen today, and if so, give the use back when no `produceOver` or `produceFail`
arrives within 5 minutes. This is machine BACKEND-REQUESTS #5, applied to typed codes.


**B3. The reward comes after 9 stamps.** The spec says that on the 10th stamp a reward code is issued and 10 stamps
are taken off, which makes the 11th drink the free one. Decision 3 wants the 10th. So issue the reward on the 9th
stamp and take 9 off; the free drink is the 10th, and as before it earns no stamp. The idempotency key
`reward:<customerId>:<n>` is unchanged. The website will show the card as 9 boxes with "Your 10th drink is free".

## Website (Muscle-Box-Pro)

- The receipt shows the code in large digits with "Enter this code on the machine's Get Drinks screen."
- Guests see "Email me this code". Everyone not signed in sees "Log in to keep your codes in My drinks."
