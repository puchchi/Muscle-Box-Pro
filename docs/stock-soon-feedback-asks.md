# Coming soon, Contact us and ratings: asks from the dashboard

Status: written 2026-10-02, not yet sent. Both open decisions are settled. These add to `mbp-machine/docs/HANDOFF-BACKEND-STOCK-SOON-FEEDBACK.md`
(§2.5, §3.3, §4). The dashboard side is built against that brief and is on branch `machine-dashboard`.

## Backend (mbp-backend)

**A1. Filter goods by Coming soon.** `GET goods?comingSoon=yes|no`. The goods library has a Status filter (All, On
sale, Coming soon) and already sends it. Until the backend reads it, the page filters only the rows it got back, so
the total and paging are wrong.

**A2. `comingSoon` on a machine's goods rows.** `GET machines/{sn}/goods` rows need `comingSoon`, as `goodDto` has
it. The brief's §3.3 adds only `rating` to these rows. The machine's goods tab shows "Coming soon" in the Sold out
column from this field.

**A3. Counts per type on the Feedback list.** Optional: add `counts: {query, review, complaint}` to the
`GET feedback` reply, counted with the same `sn` and `state` filters but not `type`. The type chips show them when
present and no number when absent.

**A4. `goodsId` filter on `GET feedback`.** The rating links open reviews by type and SN. With `goodsId` they can
open that drink's reviews. The brief already says "if the backend adds".

**A5. Two details of §3.3 the dashboard assumes:**
- `newCount` ignores the list's filters. The menu badge reads it from `GET feedback?state=new&limit=1`.
- `PATCH feedback/{id}` with `note: ""` clears the note to `null`. The dashboard sends the note trimmed.

**A6. Email support on a new complaint** (decided 2026-10-02: now). When a `complaint` is stored (not a repeated
`id`), send one email to `contact@muscleboxpro.com`, set in config the way `franchiseLeadsEmail` is. Put in it the
reason in words, the machine's SN and shop name, the order id with whether it was found, the time, and a link to
`https://muscleboxpro.com/machines/feedback?type=complaint&sn=<sn>`. Leave out the customer's email, phone and
message: they are read on the dashboard, and the email would copy them into another mailbox. A failed send must not
fail the machine's request.

**A7. Keep a customer's email and phone for 12 months** (decided 2026-10-02). Twelve months after `receivedAt`,
remove `email` and `phone` from the message and keep the rest. A DynamoDB TTL can't remove two attributes, so this
needs a scheduled job or a second item for the contact that does carry a TTL. The dashboard shows "—" once they are
gone.

## Decisions (Anurag, 2026-10-02)

1. Customer email and phone on feedback are kept for 12 months (A7).
2. A new complaint emails support, starting now (A6).
