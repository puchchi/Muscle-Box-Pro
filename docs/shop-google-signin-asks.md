# Shop sign-in with Google: asks from the website

Status: **parked** by Anurag 2026-10-02. Sign-in is the email code (OTP) only, and these asks
are not sent. They are kept in case Google sign-in comes back.

## Decisions

1. **"Continue with Google" is added next to the email code**, on the `/drinks` pay sheet and on
   `/drinks/account`. Google comes first. The email code stays for iPhones and people without
   Google.
2. **One account per email.** A Google sign-in with a verified address lands on the same customer as
   an email-code sign-in with that address. That customer keeps the same stamps, codes and orders.
3. Nothing else changes. The session, the guest join, `claimToken` and the stamps all work as they do
   after `POST shop/auth/verify`.

## Backend (mbp-backend)

**G1. `POST shop/auth/google {credential, sn?, claimToken?}`.** `credential` is the ID token that
Google Identity Services hands the page. The handler:

- Checks the token's signature against Google's keys, and that `aud` is our client id, `iss` is
  Google, it hasn't expired, and `email_verified` is true. If any check fails, it refuses with a new
  code, `google_signin_failed` (400), and a message we can show.
- Lower-cases the email and then runs `authVerify`'s steps 1 to 5 unchanged: find or create the
  customer, join that email's guest orders, claim `claimToken`, award stamps, start the session.
  Signing in with Google proves the email just as the code does.
- Replies in the same shape as `auth/verify`: `{customer, joinedOrders, claimed, sessionToken?}`,
  sets the same cookie, and returns the sandbox bearer the same way.
- Keeps the Google `sub` on the customer, so a later change of Gmail address can be handled. Matching
  is by email for now.
- Shares `verifyPerIp`, or gets a limit of its own.
- Never logs the credential or the address (the domain only), the same as `authVerify`.

**G2. The client id.** One Google Cloud OAuth web client per stage. The authorised JavaScript origins
are `https://muscleboxpro.com`, `https://www.muscleboxpro.com` and `http://localhost:3000` for sandbox.
The handler reads the client id from config. The website gets it as
`NEXT_PUBLIC_GOOGLE_SHOP_CLIENT_ID`, and shows no Google button while that is unset.

**G3. Deleting the account** also removes the stored `sub`.

## Website, once G1 exists

- Load `https://accounts.google.com/gsi/client` only on the sign-in step, and send the credential
  with the phone's newest saved order as `claimToken`.
- `/drinks/:path*` CSP: allow `accounts.google.com` in `script-src`, `frame-src`, `connect-src` and
  `style-src`. Check Google's current guidance against our `Referrer-Policy: no-referrer` and our COOP
  header before shipping: the button needs a referrer, and the popup needs a COOP that allows popups.
- Privacy policy: one line saying Google sign-in shares your name and email with us, and nothing else.
