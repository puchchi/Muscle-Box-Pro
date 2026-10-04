# Shop balance: asks from the website

Status: decided by Anurag 2026-10-02. Updated 2026-10-04: the backend has built S1 to S7, and the
dashboard side is built (balance refund and stuck-refund buttons on the customer page). The customer
website still has no balance UI: top up and pay from balance are the next website work. The rest of
the signed-in flow (sign-in, "My drink codes", orders, stamps) is built.

## Decisions

1. **A signed-in customer can top up a prepaid balance**, then buy a drink from it in one tap, with no
   Razorpay step.
2. **Any amount**, between a minimum and a maximum. We propose ₹100 to ₹5,000 for one top-up and
   ₹10,000 for the balance. Tell us if Razorpay, RBI's PPI rules or accounting need other numbers.
3. **No bonus.** ₹500 paid is ₹500 to spend.
4. **It never expires**, and **support refunds it on request.** There is no refund button for the
   customer.
5. **A drink paid from the balance earns a stamp**, the same as a drink paid by card. A reward's free
   drink does not touch the balance.
6. Guests have no balance. Deleting an account with money in it needs an answer (S6).

## Backend (mbp-backend)

**S1. A ledger, not a number.** One row per top-up, purchase, refund of a drink, and support refund,
in paise, with the order or payment it came from. The balance is their sum, and is never negative.
A purchase takes the money and creates the order in one transaction, so two taps on two phones can't
spend the same rupees twice.

**S2. `GET shop/me/balance`** (session) → `{balancePaise, minTopUpPaise, maxTopUpPaise, maxBalancePaise}`,
and `GET shop/me/balance/entries?cursor=` → `{entries:[{kind, amountPaise, shopOrderId?, createdAt}], nextCursor}`
for an account page list. Or put `balancePaise` on `GET shop/me`; either is fine.

**S3. `POST shop/me/topups {amountPaise}`** (session) → the same shape `POST shop/orders` returns
(`razorpayOrderId, amount, currency, keyId`, plus a `topUpId`), so the website reuses its Razorpay
Checkout code. The money is added only by the verified webhook, never by the browser's reply.
`GET shop/me/topups/{topUpId}` lets the page wait for it, as the receipt does for a code.
Refusals: `top_up_too_small`, `top_up_too_large`, `balance_too_large`, with a message we can show.

**S4. `POST shop/orders {sn, goodsId, payWith:"balance"}`** (session). No Razorpay order: the drink's
price comes off the balance and the order goes straight to `paid`, then `coded` as now, and earns its
stamp. It returns the order token, so the website opens the same receipt. Refusals:
`balance_too_low` (with `balancePaise`), and `signed_out`. Unlike a card order, a missing session must
refuse, not fall back to a guest order.

**S5. A drink refund puts the money back where it came from.** Refunding a balance-paid order (the
dashboard's Refund, or the machine not pouring) credits the balance, not Razorpay. A card-paid order
refunds to the card as now.

**S6. Support refunds the unused balance.** An admin route, for example
`POST shopadmin/customers/{customerId}/balance/refund {reason}`, refunds what is left to the top-up
payments it came from, newest first, as partial Razorpay refunds through the refund worker, and
writes the ledger rows. Razorpay refunds a payment only within its refund window, so tell us what
happens to money from an older top-up. Also say what `DELETE shop/me` does while the balance is above
zero: we suggest refusing with `balance_not_empty` and asking the customer to contact support first.

**S7. The dashboard.** The customer page's reply gains `balancePaise` and the ledger, so support can
see it before refunding.

## Website, once S1 to S4 exist

- `/drinks/account`: the balance, "Add money" with an amount field and quick picks, and the ledger.
- `/drinks`: when signed in and the balance covers the drink, Buy offers "Pay ₹99 from balance" next to
  paying by UPI or card.
- The dashboard customer page: the balance, the ledger and "Refund the balance".
