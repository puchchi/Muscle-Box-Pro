const { Router } = require("express");
const log     = require("./logger");
const { createOrder, getOrderStatus, getOrderAgeMs } = require("./phonepe");
const { gsAuth, redactHeaders } = require("./gsAuth");
const { validateOrderAmount } = require("./orderAmount");

const STATUS_HARD_FAIL_MS = 5 * 60 * 1000;

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowStr() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function callerIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  return forwarded ? forwarded.split(",")[0].trim() : (req.socket?.remoteAddress ?? "unknown");
}

function bodyDump(keys, body) {
  return keys
    .map(k => `${k}=${body[k] != null && body[k] !== "" ? JSON.stringify(body[k]) : "(missing)"}`)
    .join("  ");
}

function missing(required, body) {
  return required.filter(k => body[k] == null || body[k] === "");
}

// Vendor spec §3.2.2 names the envelope field `msg`; we shipped `message`. Emit both until a real
// machine request confirms which one the firmware reads, then drop the other.
function ok(res, data) {
  return res.json({ code: 200, msg: "success", message: "success", data });
}

// Spec defines only 200 and 400 — there is no 500 in the protocol, so a business error must be 400
// or the machine sees an undefined code.
function fail400(res, text) {
  return res.status(400).json({ code: 400, msg: text, message: text });
}

function reject400(tag, res, fields) {
  log.warn(`[Machine:${tag}] Validation failed — missing: ${fields.join(", ")}`);
  return fail400(res, `Missing required fields: ${fields.join(", ")}`);
}

// ─── Request / Response header logger ────────────────────────────────────────

router.use((req, res, next) => {
  const pad = (s) => s.padEnd(26);

  log.info(`[Machine] ── INCOMING REQUEST ───────────────────────`);
  log.step(`${req.method} ${req.originalUrl}  from ${callerIp(req)}`);
  // redactHeaders masks `key` / `key-md5` — this used to write working credentials to the log.
  Object.entries(redactHeaders(req.headers)).forEach(([k, v]) => log.step(`  ${pad(k)} ${v}`));

  res.on("finish", () => {
    log.info(`[Machine] ── OUTGOING RESPONSE ──────────────────────`);
    log.step(`${res.statusCode} ${res.statusMessage ?? ""}`);
    Object.entries(res.getHeaders()).forEach(([k, v]) => log.step(`  ${pad(k)} ${v}`));
  });

  next();
});

// Auth runs *after* the logger so rejected requests are still visible in the console — that log is
// how we learn the real `key-md5` construction. Defaults to observe mode; see lib/gsAuth.js.
router.use(gsAuth);

// ─── POST /order/qr — Order Create (PhonePe) ─────────────────────────────────

router.post("/qr", async (req, res) => {
  const body = req.body;
  log.step(bodyDump(["orderNo", "objectId", "subject", "attach", "totalAmount", "notifyUrl"], body));

  const bad = missing(["orderNo", "subject", "totalAmount", "notifyUrl"], body);
  if (bad.length) return reject400("QR", res, bad);

  // The amount is validated before PhonePe is touched (TODO A4). gsAuth proves who is calling, but
  // the GS digest covers only headers — never the body — so a valid signature is no evidence about
  // the sum inside it. Without this, a replayed header triple mints a payment URL for any amount.
  const amount = validateOrderAmount(body);
  if (!amount.ok) {
    log.error(`[Machine:QR] Amount rejected — ${amount.reason}`);
    return fail400(res, "Invalid order amount");
  }

  try {
    log.step(`[Machine:QR] Initiating PhonePe order for ${body.orderNo}  amount=₹${amount.normalised}  priceList=${amount.priceListVerdict}`);

    const result = await createOrder({
      merchantOrderId: body.orderNo,
      // The normalised value, not the raw field: it has been format-checked and round-trips
      // exactly through `createOrder`'s rupees→paise conversion.
      amount:          amount.normalised,
      subject:         body.subject,
      notifyUrl:       body.notifyUrl,
      deviceInfo:      body.attach,
    });

    const data = {
      qrUrl:        result.qrUrl,
      orderStatus:  1,
      thirdOrderNo: result.phonepeOrderId,
    };

    log.ok(`[Machine:QR] Done — orderNo=${body.orderNo}  thirdOrderNo=${result.phonepeOrderId}  state=${result.state}`);
    log.step(`[Machine:QR] qrUrl=${result.qrUrl}`);
    ok(res, data);
  } catch (err) {
    log.error(`[Machine:QR] PhonePe error: ${err.message}`);
    fail400(res, err.message);
  }
});

// ─── POST /order/status — Order Query (PhonePe) ──────────────────────────────

router.post("/status", async (req, res) => {
  const body = req.body;
  log.step(bodyDump(["orderNo", "thirdOrderNo"], body));

  const bad = missing(["orderNo", "thirdOrderNo"], body);
  if (bad.length) return reject400("STATUS", res, bad);

  const ageMs = getOrderAgeMs(body.orderNo);
  if (ageMs !== null && ageMs > STATUS_HARD_FAIL_MS) {
    log.warn(`[Machine:STATUS] Order ${body.orderNo} is ${Math.floor(ageMs / 1000)}s old — returning FAILED without PhonePe call`);
    const now = nowStr();
    // KNOWN DEFECT (TODO Track B): this reports FAILED without asking PhonePe, so a payment that
    // landed at 4:59 is disowned at 5:01 — we keep the money and dispense nothing. Also, the spec's
    // code for a timeout is "6" (Time Exceeded), not "3" (Transaction Failed). Both are deliberately
    // left alone here: the fix needs durable order state (the in-memory Map dies on restart) and
    // changing what the firmware sees on timeout must not be guessed at on a live machine.
    return ok(res, {
      orderNo:       body.orderNo,
      thirdOrderNo:  body.thirdOrderNo,
      orderStatus:   "3",
      orderTime:     now,
      payTime:       now,
      totalAmount:   "",
      channelUserId: "",
    });
  }

  try {
    log.step(`[Machine:STATUS] Querying PhonePe for orderNo=${body.orderNo}`);

    const result = await getOrderStatus(body.orderNo);

    const data = {
      orderNo:       body.orderNo,
      thirdOrderNo:  body.thirdOrderNo,
      orderStatus:   result.orderStatus,
      orderTime:     result.orderTime ?? nowStr(),
      payTime:       result.payTime   ?? nowStr(),
      totalAmount:   result.totalAmount,
      channelUserId: result.channelUserId,
    };

    log.ok(`[Machine:STATUS] Done — orderNo=${body.orderNo}  orderStatus=${result.orderStatus}`);
    ok(res, data);
  } catch (err) {
    log.error(`[Machine:STATUS] PhonePe error: ${err.message}`);
    fail400(res, err.message);
  }
});

// ─── POST /order/refund — Order Refund ───────────────────────────────────────

router.post("/refund", (req, res) => {
  const body = req.body;
  log.step(bodyDump(["refundNo", "orderNo", "thirdOrderNo", "refundAmount", "refundReason", "refundNotifyUrl"], body));

  const bad = missing(["refundNo", "orderNo", "thirdOrderNo", "refundAmount"], body);
  if (bad.length) return reject400("REFUND", res, bad);

  try {
    const thirdRefundNo = "RF" + Date.now();
    const refundTime    = nowStr();

    log.step(`[Machine:REFUND] Processing refund: ${body.refundNo} for order ${body.orderNo}`);
    log.step(`[Machine:REFUND] Generated thirdRefundNo: ${thirdRefundNo}`);

    const data = {
      refundNo:      body.refundNo,
      orderNo:       body.orderNo,
      thirdOrderNo:  body.thirdOrderNo,
      thirdRefundNo,
      refundStatus:  "success",
      refundTime,
      totalAmount:   body.totalAmount || body.refundAmount,
      refundAmount:  body.refundAmount,
    };

    log.ok(`[Machine:REFUND] Success — refundNo=${body.refundNo}  orderNo=${body.orderNo}  amount=${body.refundAmount}  status=success`);
    log.step(`[Machine:REFUND] Response → thirdRefundNo=${thirdRefundNo}  refundTime=${refundTime}`);
    ok(res, data);
  } catch (err) {
    log.error(`[Machine:REFUND] Unexpected error: ${err.message}`);
    fail400(res, "Internal error");
  }
});

// ─── POST /order/complete — Order Complete ────────────────────────────────────

router.post("/complete", (req, res) => {
  const body = req.body;
  log.step(bodyDump(["orderNo", "thirdOrderNo", "success", "orderStatus", "outStockStatus", "outStockTime"], body));

  const bad = missing(["orderNo", "thirdOrderNo", "orderStatus", "outStockStatus"], body);
  // success field checked separately since false is valid
  if (body.success === undefined || body.success === "") bad.push("success");
  if (bad.length) return reject400("COMPLETE", res, bad);

  try {
    const successFlag = body.success === true || body.success === "true";
    const stockStatus = { "1": "Not shipped yet", "2": "Already shipped" }[body.outStockStatus] ?? body.outStockStatus;

    log.step(`[Machine:COMPLETE] orderNo=${body.orderNo}  success=${successFlag}  outStockStatus=${stockStatus}`);
    if (body.outStockTime) log.step(`[Machine:COMPLETE] outStockTime=${body.outStockTime}`);
    if (!successFlag) log.warn(`[Machine:COMPLETE] Beverage preparation FAILED for order ${body.orderNo}`);

    const data = {
      orderNo:      body.orderNo,
      thirdOrderNo: body.thirdOrderNo,
      returnCode:   "success",
      returnMsg:    "Order completion notified successfully",
    };

    log.ok(`[Machine:COMPLETE] Notified — orderNo=${body.orderNo}  makingSuccess=${successFlag}  delivery=${stockStatus}`);
    ok(res, data);
  } catch (err) {
    log.error(`[Machine:COMPLETE] Unexpected error: ${err.message}`);
    fail400(res, "Internal error");
  }
});

// ─── POST /order/cancel — Order Cancel ───────────────────────────────────────

router.post("/cancel", async (req, res) => {
  const body = req.body;
  log.step(bodyDump(["orderNo", "thirdOrderNo", "orderStatus", "remark", "cancelTime"], body));

  const bad = missing(["orderNo", "thirdOrderNo", "cancelTime"], body);
  // orderStatus=0 is falsy, check explicitly
  if (body.orderStatus === undefined || body.orderStatus === "") bad.push("orderStatus");
  if (bad.length) return reject400("CANCEL", res, bad);

  try {
    log.step(`[Machine:CANCEL] Cancelling orderNo=${body.orderNo}  thirdOrderNo=${body.thirdOrderNo}`);
    log.step(`[Machine:CANCEL] cancelTime=${body.cancelTime}  remark=${body.remark || "(none)"}`);

    // PhonePe has no cancel API — order expires naturally; just acknowledge
    log.step(`[Machine:CANCEL] Skipping PhonePe call (no cancel API) — order will expire`);

    const data = {
      orderNo:      body.orderNo,
      thirdOrderNo: body.thirdOrderNo,
      returnCode:   "success",
      returnMsg:    "Order cancelled successfully",
    };

    log.ok(`[Machine:CANCEL] Confirmed — orderNo=${body.orderNo}  status=0 (Cancel Payment)  at=${body.cancelTime}`);
    ok(res, data);
  } catch (err) {
    log.error(`[Machine:CANCEL] PhonePe error: ${err.message}`);
    fail400(res, err.message);
  }
});

module.exports = router;
