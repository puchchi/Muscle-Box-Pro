require("dotenv").config();

const express = require("express");
const path = require("path");
const { ImapFlow } = require("imapflow");
const nodemailer = require("nodemailer");
const { createClient } = require("@supabase/supabase-js");
const { simpleParser } = require("mailparser");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 4000;
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "admin";

// ─── Auth middleware ───────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const auth = req.headers["x-dashboard-password"];
  if (auth !== DASHBOARD_PASSWORD) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// ─── POST /api/login ──────────────────────────────────────────────────────────

app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (password === DASHBOARD_PASSWORD) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ message: "Wrong password" });
  }
});

// ─── GET /api/inbox ───────────────────────────────────────────────────────────

app.get("/api/inbox", requireAuth, async (req, res) => {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST || "imap.titan.email",
    port: Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    const messages = [];

    try {
      const total = client.mailbox?.exists ?? 0;
      if (total > 0) {
        const start = Math.max(1, total - 49);
        for await (const msg of client.fetch(`${start}:${total}`, {
          uid: true,
          flags: true,
          source: true,
        })) {
          const parsed = await simpleParser(msg.source);
          const from = parsed.from?.value?.[0];

          messages.push({
            uid: msg.uid,
            messageId: parsed.messageId ?? "",
            subject: parsed.subject ?? "(no subject)",
            from: {
              name: from?.name ?? "",
              address: from?.address ?? "",
            },
            to: (parsed.to?.value ?? []).map(a => ({ name: a.name ?? "", address: a.address ?? "" })),
            cc: (parsed.cc?.value ?? []).map(a => ({ name: a.name ?? "", address: a.address ?? "" })),
            bcc: (parsed.bcc?.value ?? []).map(a => ({ name: a.name ?? "", address: a.address ?? "" })),
            date: parsed.date?.toISOString() ?? "",
            textBody: parsed.text ?? "",
            htmlBody: parsed.html || "",
            seen: msg.flags?.has("\\Seen") ?? false,
          });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    messages.reverse();
    res.json({ messages });
  } catch (err) {
    await client.logout().catch(() => {});
    console.error("IMAP error:", err);
    res.status(500).json({ message: err.message || "Failed to fetch inbox" });
  }
});

// ─── POST /api/reply ──────────────────────────────────────────────────────────

app.post("/api/reply", requireAuth, async (req, res) => {
  const { to, subject, html, inReplyTo, references } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ message: "to, subject and html are required" });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "MuscleBoxPro <contact@muscleboxpro.com>",
      to,
      subject,
      html,
      ...(inReplyTo ? { inReplyTo } : {}),
      ...(references ? { references } : {}),
    });
    res.json({ message: "Reply sent" });
  } catch (err) {
    console.error("Reply error:", err);
    res.status(500).json({ message: err.message || "Failed to send reply" });
  }
});

// ─── GET /api/stats ───────────────────────────────────────────────────────────

app.get("/api/stats", requireAuth, async (req, res) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const [demoCount, campaignCount, demoRecent, campaignRecent] = await Promise.all([
      supabase.from("demo_requests").select("*", { count: "exact", head: true }),
      supabase.from("campaign_requests").select("*", { count: "exact", head: true }),
      supabase
        .from("demo_requests")
        .select("id, name, gym_name, email, mobile, location, message, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("campaign_requests")
        .select("id, brand_name, email, mobile, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    res.json({
      demoRequestCount: demoCount.count ?? 0,
      campaignRequestCount: campaignCount.count ?? 0,
      recentDemoRequests: demoRecent.data ?? [],
      recentCampaignRequests: campaignRecent.data ?? [],
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: err.message || "Failed to fetch stats" });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  MuscleBoxPro Local Dashboard`);
  console.log(`  Running at http://localhost:${PORT}\n`);
});
