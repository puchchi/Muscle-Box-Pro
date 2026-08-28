const log = require("./logger");
const {
  StandardCheckoutClient,
  StandardCheckoutPayRequest,
  MetaInfo,
  Env,
} = require("@phonepe-pg/pg-sdk-node");

// ─── Order creation timestamps (for pending failsafe) ─────────────────────────

const orderCreatedAt = new Map();
const PENDING_TIMEOUT_MS = 3 * 60 * 1000;

// ─── SDK client (singleton) ───────────────────────────────────────────────────

let _client = null;

function getClient() {
  if (_client) return _client;
  const env = process.env.PHONEPE_ENV === "production" ? Env.PRODUCTION : Env.SANDBOX;
  _client = StandardCheckoutClient.getInstance(
    process.env.PHONEPE_CLIENT_ID,
    process.env.PHONEPE_CLIENT_SECRET,
    parseInt(process.env.PHONEPE_CLIENT_VERSION || "1", 10),
    env,
  );
  log.ok(`[PhonePe] SDK client ready — env=${env}`);
  return _client;
}

// ─── Create order ─────────────────────────────────────────────────────────────

async function createOrder({ merchantOrderId, amount, subject, notifyUrl, deviceInfo }) {
  const client = getClient();
  const amountPaise = Math.round(parseFloat(amount) * 100);

  const request = StandardCheckoutPayRequest.builder()
    .merchantOrderId(merchantOrderId)
    .amount(amountPaise)
    .redirectUrl(notifyUrl)
    .metaInfo(MetaInfo.builder().udf1(deviceInfo || "").udf2(subject).build())
    .expireAfter(1200)
    .message(subject)
    .build();

  log.step(`[PhonePe] Creating order — merchantOrderId=${merchantOrderId}  amount=₹${amount}`);

  const res = await client.pay(request);

  orderCreatedAt.set(merchantOrderId, Date.now());
  log.ok(`[PhonePe] Order created — phonepeOrderId=${res.orderId}  state=${res.state}`);
  log.step(`[PhonePe] Checkout URL: ${res.redirectUrl}`);

  return {
    phonepeOrderId: res.orderId,
    checkoutUrl:    res.redirectUrl,
    qrUrl:          res.redirectUrl,
    state:          res.state,
    expireAt:       res.expireAt,
  };
}

// ─── Order status ─────────────────────────────────────────────────────────────

const STATE_MAP = {
  PENDING:   1,
  COMPLETED: 2,
  FAILED:    3,
};

async function getOrderStatus(merchantOrderId) {
  const client = getClient();

  log.step(`[PhonePe] Checking status — merchantOrderId=${merchantOrderId}`);

  const data = await client.getOrderStatus(merchantOrderId);
  let orderStatus = String(STATE_MAP[data.state] ?? 1);
  const payDetail = (data.paymentDetails ?? [])[0] ?? {};

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
    orderTime:     data.createdAt ? msToStr(data.createdAt) : null,
    payTime:       data.updatedAt ? msToStr(data.updatedAt) : null,
    totalAmount:   String((data.amount ?? 0) / 100),
    channelUserId: payDetail?.transactionId ?? "",
    raw:           data,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOrderAgeMs(merchantOrderId) {
  const createdAt = orderCreatedAt.get(merchantOrderId);
  return createdAt ? Date.now() - createdAt : null;
}

function msToStr(ms) {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19);
}

module.exports = { createOrder, getOrderStatus, getOrderAgeMs };
