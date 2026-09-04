"use client";

import { ImageOff } from "lucide-react";

/**
 * Untrusted email HTML, rendered where it cannot reach anything.
 *
 * **This is the only place in the panel that renders a message body, and it must stay that way.** The
 * `html` on a message off `GET /admin/mail/messages/{uid}` is markup a stranger composed and mailed to
 * `contact@`. `dangerouslySetInnerHTML` would put it in the same document as an authenticated admin
 * session, and both provider modules in mbp-backend say so in as many words.
 *
 * Three independent barriers, because each covers what the others do not:
 *
 * 1. **`sandbox=""`**, with no allow-tokens at all. The frame gets a unique opaque origin, so it cannot
 *    read this document; scripts, forms, popups and top-level navigation are all off. A link in the
 *    message therefore does nothing when clicked, which is the intended behaviour rather than a bug to
 *    fix: whoever needs to follow a link in a stranger's email can read the plain-text view, where it
 *    is text.
 * 2. **A `Content-Security-Policy` meta**, `default-src 'none'`. Belt and braces against the sandbox
 *    being loosened by someone adding `allow-scripts` for a reason that seems good at the time.
 *    `style-src 'unsafe-inline'` is unavoidable: every marketing email on earth is inline-styled, and
 *    stripping that renders a wall of text.
 * 3. **Remote images never load**, so a `<img>` pointing at a stranger's server cannot act as a read
 *    receipt telling them the address is live and being read by a human.
 *
 * `srcDoc` rather than a blob URL, so nothing is written to a URL that could be opened outside the
 * frame's restrictions.
 *
 * ## There is deliberately no "load images anyway" button
 *
 * A `srcdoc` frame inherits the embedding document's CSP, and `next.config.mjs` sets `img-src 'self'
 * data: blob:` for the whole site. The effective policy is the intersection of that and the meta above,
 * which is `data:` alone. So an opt-in button cannot work from inside this component however the meta is
 * written: it would hide the notice, load nothing, and leave whoever pressed it believing the message
 * has no images rather than knowing they are blocked. One was written here and removed for exactly that
 * reason. Making it work would mean widening `img-src` for every page on the marketing site, which is a
 * bad trade for seeing a logo in an enquiry.
 */

/** Whether the markup would fetch anything from a remote host if a policy allowed it to. */
function hasRemoteContent(html: string): boolean {
  return /(?:src\s*=\s*["']?|url\()\s*https?:/i.test(html);
}

const FRAME_STYLE = `
  html { background: #ffffff; }
  body {
    margin: 0;
    padding: 14px;
    font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #111111;
    overflow-wrap: break-word;
  }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
  a { color: #b3341a; }
`;

function documentFor(html: string): string {
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;">
<style>${FRAME_STYLE}</style>
</head><body>${html}</body></html>`;
}

export function MessageHtml({
  html,
  height = "28rem",
  testId,
}: {
  html: string;
  /** A CSS length. Fixed rather than measured: `sandbox=""` is what stops us reading the frame's own scrollHeight, and that is a trade worth keeping. */
  height?: string;
  testId: string;
}) {
  return (
    <div className="space-y-2">
      {hasRemoteContent(html) && (
        <div
          className="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 px-3.5 py-2.5"
          data-testid={`${testId}-images-blocked`}
        >
          <ImageOff className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0" aria-hidden />
          <span className="text-xs text-muted-foreground">
            Remote images are not shown. Loading one would tell the sender this address is read by a
            person.
          </span>
        </div>
      )}
      <iframe
        title="Message body"
        // Empty, and deliberately not omitted: `sandbox=""` applies every restriction, while no
        // attribute at all applies none.
        sandbox=""
        referrerPolicy="no-referrer"
        srcDoc={documentFor(html)}
        style={{ height }}
        // White on a dark panel, and not a leftover: the frame holds a stranger's inline-styled
        // markup written for a white client, so `FRAME_STYLE` pins the background. Theming it to
        // `bg-card` would leave every dark-on-transparent email unreadable.
        className="w-full rounded-xl border border-border bg-white"
        data-testid={testId}
      />
    </div>
  );
}
