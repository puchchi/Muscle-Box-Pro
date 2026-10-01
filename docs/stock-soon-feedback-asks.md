# Coming soon, Contact us and ratings: asks from the dashboard

Status: written 2026-10-02, not yet sent. These add to `mbp-machine/docs/HANDOFF-BACKEND-STOCK-SOON-FEEDBACK.md`
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

## Open decisions (Anurag)

These are from the backend brief and are not decided yet:

1. **How long to keep a customer's email and phone** on feedback. The brief suggests 12 months.
2. **An alert on a new complaint**, for example an email to support, now or later.
