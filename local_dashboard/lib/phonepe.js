const log = require("./logger");

// ─── Order creation timestamps (for 3-min pending failsafe) ──────────────────

const orderCreatedAt = new Map();
const PENDING_TIMEOUT_MS = 3 * 60 * 1000;

// ─── Token cache ──────────────────────────────────────────────────────────────

let cachedToken  = null;
let tokenExpiry  = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    log.step("[PhonePe] Using cached OAuth token");
    return cachedToken;
  }

  log.step("[PhonePe] Fetching new OAuth token...");
  const res = await fetch(process.env.PHONEPE_TOKEN_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:     "client_credentials",
      client_id:      process.env.PHONEPE_CLIENT_ID,
      client_secret:  process.env.PHONEPE_CLIENT_SECRET,
      client_version: process.env.PHONEPE_CLIENT_VERSION,
    }),
  });

  const text = await res.text();
  log.step(`[PhonePe] Token response (${res.status}): ${text}`);

  if (!res.ok) throw new Error(`PhonePe token fetch failed ${res.status}: ${text}`);

  const data = JSON.parse(text);
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // expire 60 s early
  log.ok(`[PhonePe] Token acquired — expires in ${data.expires_in}s`);
  return cachedToken;
}

// ─── Create order ─────────────────────────────────────────────────────────────

async function createOrder({ merchantOrderId, amount, subject, notifyUrl, deviceInfo }) {
  const token      = await getToken();
  const amountPaise = Math.round(parseFloat(amount) * 100);

  const payload = {
    merchantOrderId,
    amount: amountPaise,
    expireAfter: 1200,
    metaInfo: {
      udf1: deviceInfo || "",
      udf2: subject,
    },
    paymentFlow: {
      type:    "PG_CHECKOUT",
      message: subject,
      merchantUrls: { redirectUrl: notifyUrl },
    },
  };

  log.step(`[PhonePe] POST ${process.env.PHONEPE_PAY_URL}`);
  log.step(`[PhonePe] Request payload: ${JSON.stringify(payload)}`);

  const res = await fetch(process.env.PHONEPE_PAY_URL, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `O-Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  log.step(`[PhonePe] Create order response (${res.status}): ${text}`);

  if (!res.ok) throw new Error(`PhonePe create order failed ${res.status}: ${text}`);

  const data  = JSON.parse(text);
  const qrUrl = data.redirectUrl ?? null;

  orderCreatedAt.set(merchantOrderId, Date.now());
  log.ok(`[PhonePe] Order created — phonepeOrderId=${data.orderId}  state=${data.state}`);
  log.step(`[PhonePe] Checkout URL: ${qrUrl}`);

  return {
    phonepeOrderId: data.orderId,
    checkoutUrl:    qrUrl,
    qrUrl,
    state:          data.state,
    expireAt:       data.expireAt,
  };
}

// ─── Order status ─────────────────────────────────────────────────────────────

// PhonePe state → machine orderStatus code
const STATE_MAP = {
  PENDING:          1,
  COMPLETED:        2,
  FAILED:           3,
  REFUND_INITIATED: 4,
  REFUNDED:         5,
  EXPIRED:          6,
};

async function getOrderStatus(merchantOrderId) {
  const token = await getToken();
  const url   = `${process.env.PHONEPE_STATUS_URL}/${merchantOrderId}/status`;

  log.step(`[PhonePe] GET ${url}`);

  const res = await fetch(url, {
    method:  "GET",
    headers: { "Authorization": `O-Bearer ${token}` },
  });

  const text = await res.text();
  log.step(`[PhonePe] Status response (${res.status}): ${text}`);

  if (!res.ok) throw new Error(`PhonePe status check failed ${res.status}: ${text}`);

  const data        = JSON.parse(text);
  let   orderStatus = String(STATE_MAP[data.state] ?? 1);
  const payDetail   = (data.paymentDetails ?? [])[0] ?? {};

  // Failsafe: if still PENDING after 3 min, treat as FAILED
  if (orderStatus === "1") {
    const createdAt = orderCreatedAt.get(merchantOrderId);
    if (createdAt && Date.now() - createdAt > PENDING_TIMEOUT_MS) {
      log.warn(`[PhonePe] Order ${merchantOrderId} pending > 3 min — forcing FAILED`);
      orderStatus = "3";
    }
  }

  log.ok(`[PhonePe] Status — state=${data.state}  mapped orderStatus=${orderStatus}`);

  return {
    orderStatus,
    orderTime:     data.createdAt  ? msToStr(data.createdAt)  : null,
    payTime:       data.updatedAt  ? msToStr(data.updatedAt)  : null,
    totalAmount:   String((data.amount ?? 0) / 100),
    channelUserId: payDetail?.payerAccountDetails?.accountId ?? "",
    raw:           data,
  };
}

// ─── Cancel order ─────────────────────────────────────────────────────────────

async function cancelOrder(merchantOrderId) {
  const token = await getToken();
  const url   = `${process.env.PHONEPE_STATUS_URL}/${merchantOrderId}/cancel`;

  log.step(`[PhonePe] POST ${url}`);

  const res = await fetch(url, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `O-Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  const text = await res.text();
  log.step(`[PhonePe] Cancel response (${res.status}): ${text}`);

  if (!res.ok) throw new Error(`PhonePe cancel failed ${res.status}: ${text}`);

  log.ok(`[PhonePe] Order ${merchantOrderId} cancelled`);
  return JSON.parse(text);
}

function getOrderAgeMs(merchantOrderId) {
  const createdAt = orderCreatedAt.get(merchantOrderId);
  return createdAt ? Date.now() - createdAt : null;
}

function msToStr(ms) {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19);
}

module.exports = { getToken, createOrder, getOrderStatus, cancelOrder, getOrderAgeMs };
