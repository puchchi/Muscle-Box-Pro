require("dotenv").config();

const express = require("express");
const path = require("path");
const { ImapFlow } = require("imapflow");
const nodemailer = require("nodemailer");
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

  try {
    const info = await transporter.sendMail({
      from:    process.env.SMTP_FROM || "MuscleBoxPro <contact@muscleboxpro.com>",
      to, subject, html,
      ...(inReplyTo  ? { inReplyTo }  : {}),
      ...(references ? { references } : {}),
    });
    log.ok(`Reply sent  →  ${to}  (messageId: ${info.messageId})`);
    res.json({ message: "Reply sent" });
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

    const [demoCount, campaignCount, demoRecent, campaignRecent] = await Promise.all([
      supabase.from("demo_requests").select("*", { count: "exact", head: true }),
      supabase.from("campaign_requests").select("*", { count: "exact", head: true }),
      supabase.from("demo_requests")
        .select("id, name, gym_name, email, mobile, location, message, created_at")
        .order("created_at", { ascending: false }).limit(50),
      supabase.from("campaign_requests")
        .select("id, brand_name, email, mobile, created_at")
        .order("created_at", { ascending: false }).limit(50),
    ]);

    if (demoCount.error)      throw new Error(`demo_requests count: ${demoCount.error.message}`);
    if (campaignCount.error)  throw new Error(`campaign_requests count: ${campaignCount.error.message}`);
    if (demoRecent.error)     throw new Error(`demo_requests recent: ${demoRecent.error.message}`);
    if (campaignRecent.error) throw new Error(`campaign_requests recent: ${campaignRecent.error.message}`);

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

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => log.banner(PORT));
