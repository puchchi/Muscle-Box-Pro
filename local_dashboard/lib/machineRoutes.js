const { Router } = require("express");
const log     = require("./logger");
const { createOrder, getOrderStatus, getOrderAgeMs } = require("./phonepe");

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

function reject400(tag, res, fields) {
  log.warn(`[Machine:${tag}] Validation failed — missing: ${fields.join(", ")}`);
  return res.status(400).json({ code: 400, message: `Missing required fields: ${fields.join(", ")}` });
}

// ─── Request / Response header logger ────────────────────────────────────────

router.use((req, res, next) => {
  const pad = (s) => s.padEnd(26);

  log.info(`[Machine] ── INCOMING REQUEST ───────────────────────`);
  log.step(`${req.method} ${req.originalUrl}  from ${callerIp(req)}`);
  Object.entries(req.headers).forEach(([k, v]) => log.step(`  ${pad(k)} ${v}`));

  res.on("finish", () => {
    log.info(`[Machine] ── OUTGOING RESPONSE ──────────────────────`);
    log.step(`${res.statusCode} ${res.statusMessage ?? ""}`);
    Object.entries(res.getHeaders()).forEach(([k, v]) => log.step(`  ${pad(k)} ${v}`));
  });

  next();
});

// ─── POST /order/qr — Order Create (PhonePe) ─────────────────────────────────

router.post("/qr", async (req, res) => {
  const body = req.body;
  log.step(bodyDump(["orderNo", "objectId", "subject", "attach", "totalAmount", "notifyUrl"], body));

  const bad = missing(["orderNo", "subject", "totalAmount", "notifyUrl"], body);
  if (bad.length) return reject400("QR", res, bad);

  try {
    log.step(`[Machine:QR] Initiating PhonePe order for ${body.orderNo}  amount=₹${body.totalAmount}`);

    const result = await createOrder({
      merchantOrderId: body.orderNo,
      amount:          body.totalAmount,
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
    res.json({ code: 200, message: "success", data });
  } catch (err) {
    log.error(`[Machine:QR] PhonePe error: ${err.message}`);
    res.status(500).json({ code: 500, message: err.message });
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
    return res.json({
      code: 200, message: "success",
      data: {
        orderNo:       body.orderNo,
        thirdOrderNo:  body.thirdOrderNo,
        orderStatus:   "3",
        orderTime:     now,
        payTime:       now,
        totalAmount:   "",
        channelUserId: "",
      },
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
    res.json({ code: 200, message: "success", data });
  } catch (err) {
    log.error(`[Machine:STATUS] PhonePe error: ${err.message}`);
    res.status(500).json({ code: 500, message: err.message });
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
    res.json({ code: 200, message: "success", data });
  } catch (err) {
    log.error(`[Machine:REFUND] Unexpected error: ${err.message}`);
    res.status(500).json({ code: 500, message: "Internal error" });
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
    res.json({ code: 200, message: "success", data });
  } catch (err) {
    log.error(`[Machine:COMPLETE] Unexpected error: ${err.message}`);
    res.status(500).json({ code: 500, message: "Internal error" });
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
    res.json({ code: 200, message: "success", data });
  } catch (err) {
    log.error(`[Machine:CANCEL] PhonePe error: ${err.message}`);
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;
