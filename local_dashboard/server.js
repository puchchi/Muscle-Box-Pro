require("dotenv").config();

const express = require("express");
const path    = require("path");
const axios   = require("axios");
const QRCode  = require("qrcode");
const { ImapFlow } = require("imapflow");
const nodemailer = require("nodemailer");
const MailComposer = require("nodemailer/lib/mail-composer");
const { createClient } = require("@supabase/supabase-js");
const { simpleParser } = require("mailparser");

const log = require("./lib/logger");
const { buildTemplateHtml } = require("./lib/emailTemplates");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 4000;
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "admin";

// ─── Request logger middleware ─────────────────────────────────────────────────

app.use((req, _res, next) => {
  if (req.path.startsWith("/api")) log.req(req.method, req.path);
  next();
});

// ─── Auth middleware ───────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const auth = req.headers["x-dashboard-password"];
  if (auth !== DASHBOARD_PASSWORD) {
    log.warn(`Unauthorized request to ${req.path}`);
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// ─── POST /api/login ──────────────────────────────────────────────────────────

app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (password === DASHBOARD_PASSWORD) {
    log.ok("Login successful");
    res.json({ ok: true });
  } else {
    log.warn("Failed login attempt — wrong password");
    res.status(401).json({ message: "Wrong password" });
  }
});

// ─── GET /api/inbox ───────────────────────────────────────────────────────────

app.get("/api/inbox", requireAuth, async (req, res) => {
  const host = process.env.IMAP_HOST || "imap.secureserver.net";
  const port = Number(process.env.IMAP_PORT || 993);

  log.step(`Connecting to IMAP  ${host}:${port}`);

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    logger: false,
  });

  try {
    await client.connect();
    log.ok(`IMAP connected as ${process.env.SMTP_USER}`);

    const lock = await client.getMailboxLock("INBOX");
    const messages = [];

    try {
      const total = client.mailbox?.exists ?? 0;
      log.step(`Mailbox has ${total} message(s)`);

      if (total > 0) {
        const start = Math.max(1, total - 49);
        log.step(`Fetching messages ${start}–${total}`);

        for await (const msg of client.fetch(`${start}:${total}`, { uid: true, flags: true, source: true })) {
          const parsed = await simpleParser(msg.source);
          const from = parsed.from?.value?.[0];
          messages.push({
            uid:       msg.uid,
            messageId: parsed.messageId ?? "",
            subject:   parsed.subject ?? "(no subject)",
            from:      { name: from?.name ?? "", address: from?.address ?? "" },
            to:        (parsed.to?.value  ?? []).map(a => ({ name: a.name ?? "", address: a.address ?? "" })),
            cc:        (parsed.cc?.value  ?? []).map(a => ({ name: a.name ?? "", address: a.address ?? "" })),
            bcc:       (parsed.bcc?.value ?? []).map(a => ({ name: a.name ?? "", address: a.address ?? "" })),
            date:      parsed.date?.toISOString() ?? "",
            textBody:  parsed.text ?? "",
            htmlBody:  parsed.html || "",
            seen:      msg.flags?.has("\\Seen") ?? false,
          });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    messages.reverse();
    log.ok(`Returning ${messages.length} message(s) to client`);
    res.json({ messages });
  } catch (err) {
    await client.logout().catch(() => {});
    log.error(`IMAP error: ${err.message}`);
    console.error(err);
    res.status(500).json({ message: err.message || "Failed to fetch inbox" });
  }
});

// ─── POST /api/reply ──────────────────────────────────────────────────────────

app.post("/api/reply", requireAuth, async (req, res) => {
  const { to, subject, html: rawHtml, inReplyTo, references, templateKey, fields } = req.body;

  if (!to || !subject) {
    log.warn("Reply rejected — missing to/subject");
    return res.status(400).json({ message: "to and subject are required" });
  }

  let html = rawHtml;
  if (templateKey) {
    log.step(`Rendering template: ${templateKey}`);
    html = buildTemplateHtml(templateKey, fields || {});
    if (!html) {
      log.warn(`Unknown template key: ${templateKey}`);
      return res.status(400).json({ message: `Unknown template: ${templateKey}` });
    }
  }

  if (!html) {
    log.warn("Reply rejected — no html or templateKey provided");
    return res.status(400).json({ message: "html or templateKey is required" });
  }

  log.step(`Sending reply  →  ${to}`);
  log.step(`Subject: ${subject}`);
  if (inReplyTo) log.step(`In-Reply-To: ${inReplyTo}`);

  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE || "true") === "true",
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const mailOptions = {
    from:    process.env.SMTP_FROM || "MuscleBoxPro <contact@muscleboxpro.com>",
    to, subject, html,
    ...(inReplyTo  ? { inReplyTo }  : {}),
    ...(references ? { references } : {}),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    log.ok(`Reply sent  →  ${to}  (messageId: ${info.messageId})`);

    // Respond immediately — don't block on IMAP append
    res.json({ message: "Reply sent" });

    // ── Append to Sent folder in background ────────────────────────────────
    (async () => {
      try {
        const raw = await new Promise((resolve, reject) =>
          new MailComposer(mailOptions).compile().build((err, buf) => err ? reject(err) : resolve(buf))
        );

        const imapClient = new ImapFlow({
          host:   process.env.IMAP_HOST || "imap.secureserver.net",
          port:   Number(process.env.IMAP_PORT || 993),
          secure: true,
          auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          logger: false,
        });

        await imapClient.connect();
        const sentFolders = ["Sent", "Sent Items", "INBOX.Sent"];
        let appended = false;
        for (const folder of sentFolders) {
          try {
            await imapClient.append(folder, raw, ["\\Seen"], new Date());
            log.ok(`Saved to Sent folder: ${folder}`);
            appended = true;
            break;
          } catch {}
        }
        if (!appended) log.warn("Could not save to any Sent folder — skipping");
        await imapClient.logout().catch(() => {});
      } catch (appendErr) {
        log.warn(`Sent folder append failed: ${appendErr.message}`);
      }
    })();
  } catch (err) {
    log.error(`SMTP error: ${err.message}`);
    console.error(err);
    res.status(500).json({ message: err.message || "Failed to send reply" });
  }
});

// ─── GET /api/stats ───────────────────────────────────────────────────────────

app.get("/api/stats", requireAuth, async (req, res) => {
  log.step(`Querying Supabase  →  ${process.env.SUPABASE_URL}`);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    log.step("Running 4 parallel queries");

    const [demoRecent, campaignRecent] = await Promise.all([
      supabase.from("demo_requests")
        .select("id, name, gym_name, email, mobile, location, message, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("campaign_requests")
        .select("id, brand_name, email, mobile, created_at")
        .order("created_at", { ascending: false }),
    ]);
    const demoCount    = { count: demoRecent.data?.length ?? 0,    error: demoRecent.error };
    const campaignCount = { count: campaignRecent.data?.length ?? 0, error: campaignRecent.error };

    if (demoRecent.error)     throw new Error(`demo_requests: ${demoRecent.error.message}`);
    if (campaignRecent.error) throw new Error(`campaign_requests: ${campaignRecent.error.message}`);

    log.ok(`Stats ready  —  ${demoCount.count} demo requests, ${campaignCount.count} campaign requests`);

    res.json({
      demoRequestCount:       demoCount.count ?? 0,
      campaignRequestCount:   campaignCount.count ?? 0,
      recentDemoRequests:     demoRecent.data ?? [],
      recentCampaignRequests: campaignRecent.data ?? [],
    });
  } catch (err) {
    log.error(`Stats error: ${err.message}`);
    console.error(err);
    res.status(500).json({ message: err.message || "Failed to fetch stats" });
  }
});

// ─── POST /api/mark-read ─────────────────────────────────────────────────────

app.post("/api/mark-read", requireAuth, async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ message: "uid is required" });

  const client = new ImapFlow({
    host:   process.env.IMAP_HOST || "imap.secureserver.net",
    port:   Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      await client.messageFlagsAdd({ uid }, ["\\Seen"], { uid: true });
      log.ok(`Marked UID ${uid} as read`);
    } finally {
      lock.release();
    }
    await client.logout();
    res.json({ ok: true });
  } catch (err) {
    await client.logout().catch(() => {});
    log.error(`mark-read error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/mark-unread ───────────────────────────────────────────────────

app.post("/api/mark-unread", requireAuth, async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ message: "uid is required" });

  const client = new ImapFlow({
    host:   process.env.IMAP_HOST || "imap.secureserver.net",
    port:   Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      await client.messageFlagsRemove({ uid }, ["\\Seen"], { uid: true });
      log.ok(`Marked UID ${uid} as unread`);
    } finally {
      lock.release();
    }
    await client.logout();
    res.json({ ok: true });
  } catch (err) {
    await client.logout().catch(() => {});
    log.error(`mark-unread error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/preview ───────────────────────────────────────────────────────

app.post("/api/preview", requireAuth, (req, res) => {
  const { templateKey, fields } = req.body;
  if (!templateKey) return res.status(400).json({ message: "templateKey is required" });

  const html = buildTemplateHtml(templateKey, fields || {});
  if (!html) {
    log.warn(`Preview requested for unknown template: ${templateKey}`);
    return res.status(400).json({ message: `Unknown template: ${templateKey}` });
  }

  log.step(`Preview rendered for template: ${templateKey}`);
  res.json({ html });
});

// ─── PhonePe config (v2 OAuth) ────────────────────────────────────────────────

const PHONEPE_CLIENT_ID      = process.env.PHONEPE_CLIENT_ID;
const PHONEPE_CLIENT_SECRET  = process.env.PHONEPE_CLIENT_SECRET;
const PHONEPE_CLIENT_VERSION = parseInt(process.env.PHONEPE_CLIENT_VERSION || "1", 10);
const PHONEPE_IS_PROD        = process.env.PHONEPE_ENV === "production";

const PHONEPE_TOKEN_URL = PHONEPE_IS_PROD
  ? "https://api.phonepe.com/apis/identity-manager/v1/oauth/token"
  : "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";

const PHONEPE_PAY_URL = PHONEPE_IS_PROD
  ? "https://api.phonepe.com/apis/pg/checkout/v2/pay"
  : "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay";

const PHONEPE_STATUS_URL = PHONEPE_IS_PROD
  ? "https://api.phonepe.com/apis/pg/checkout/v2/order"
  : "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order";

// Token cache — reuse until 60 s before expiry
let _tokenCache = { token: null, expiresAt: 0 };

async function getPhonePeToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt - 60_000) {
    return _tokenCache.token;
  }
  const params = new URLSearchParams({
    client_id:      PHONEPE_CLIENT_ID,
    client_secret:  PHONEPE_CLIENT_SECRET,
    client_version: String(PHONEPE_CLIENT_VERSION),
    grant_type:     "client_credentials",
  });
  const { data } = await axios.post(PHONEPE_TOKEN_URL, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  _tokenCache = { token: data.access_token, expiresAt: data.expires_at * 1000 };
  log.ok("PhonePe token refreshed");
  return _tokenCache.token;
}

async function createOrder(amount) {
  const token   = await getPhonePeToken();
  const orderId = `MBP${Date.now()}`;
  const body    = {
    merchantOrderId: orderId,
    amount:          Math.round(parseFloat(amount) * 100), // paisa
    expireAfter:     600,
    paymentFlow: {
      type: "PG_CHECKOUT",
      merchantUrls: {
        redirectUrl: `http://localhost:${PORT}/phonepe-test.html?orderId=${orderId}&status=redirect`,
      },
    },
  };
  const { data } = await axios.post(PHONEPE_PAY_URL, body, {
    headers: { "Content-Type": "application/json", Authorization: `O-Bearer ${token}` },
  });
  return { orderId, redirectUrl: data.redirectUrl };
}

// ─── POST /api/phonepe/pay ────────────────────────────────────────────────────

app.post("/api/phonepe/pay", async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount) || parseFloat(amount) <= 0)
    return res.status(400).json({ message: "Valid amount is required" });

  log.step(`PhonePe Pay  ₹${amount}`);
  try {
    const { orderId, redirectUrl } = await createOrder(amount);
    if (!redirectUrl) throw new Error("No redirect URL in PhonePe response");
    log.ok(`PhonePe Pay initiated  order=${orderId}`);
    res.json({ redirectUrl, orderId });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    log.error(`PhonePe Pay error: ${msg}`);
    res.status(500).json({ message: msg });
  }
});

// ─── POST /api/phonepe/qr ─────────────────────────────────────────────────────
// Creates a payment order and returns a QR code of the checkout URL.
// Scanning opens PhonePe's hosted checkout page on mobile.

app.post("/api/phonepe/qr", async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount) || parseFloat(amount) <= 0)
    return res.status(400).json({ message: "Valid amount is required" });

  log.step(`PhonePe QR  ₹${amount}`);
  try {
    const { orderId, redirectUrl } = await createOrder(amount);
    const qrImage = await QRCode.toDataURL(redirectUrl, { width: 300, margin: 2 });
    log.ok(`PhonePe QR generated  order=${orderId}`);
    res.json({ qrImage, orderId });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    log.error(`PhonePe QR error: ${msg}`);
    res.status(500).json({ message: msg });
  }
});

// ─── GET /api/phonepe/status/:orderId ─────────────────────────────────────────

app.get("/api/phonepe/status/:orderId", async (req, res) => {
  const { orderId } = req.params;
  log.step(`PhonePe status check  order=${orderId}`);
  try {
    const token = await getPhonePeToken();
    const { data } = await axios.get(`${PHONEPE_STATUS_URL}/${orderId}/status`, {
      headers: { "Content-Type": "application/json", Authorization: `O-Bearer ${token}` },
    });
    log.ok(`PhonePe status  order=${orderId}  state=${data.state}`);
    res.json(data);
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    log.error(`PhonePe status error: ${msg}`);
    res.status(500).json({ message: msg });
  }
});

// ─── POST /api/phonepe/callback ───────────────────────────────────────────────

app.post("/api/phonepe/callback", (req, res) => {
  log.ok(`PhonePe webhook received`);
  console.log("[PhonePe Webhook]", JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => log.banner(PORT));
