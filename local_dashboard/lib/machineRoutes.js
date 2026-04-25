const { Router } = require("express");
const log = require("./logger");

const router = Router();

function genThirdOrderNo() {
  return "TP" + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function nowStr() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

// POST /order/qr — Order Create
router.post("/qr", (req, res) => {
  const { orderNo, subject, totalAmount, notifyUrl } = req.body;
  if (!orderNo || !subject || !totalAmount || !notifyUrl) {
    return res.status(400).json({ code: 400, message: "Missing required fields: orderNo, subject, totalAmount, notifyUrl" });
  }
  const thirdOrderNo = genThirdOrderNo();
  log.ok(`[Machine] Order QR created: ${orderNo} → ${thirdOrderNo}`);
  res.json({
    code: 200,
    message: "success",
    data: {
      qrUrl: `https://pay.example.com/qr/${thirdOrderNo}`,
      orderStatus: 1,
      thirdOrderNo,
    },
  });
});

// POST /order/status — Order Query
router.post("/status", (req, res) => {
  const { orderNo, thirdOrderNo } = req.body;
  if (!orderNo || !thirdOrderNo) {
    return res.status(400).json({ code: 400, message: "Missing required fields: orderNo, thirdOrderNo" });
  }
  log.ok(`[Machine] Order status query: ${orderNo}`);
  res.json({
    code: 200,
    message: "success",
    data: {
      orderNo,
      thirdOrderNo,
      orderStatus: "2",
      orderTime: nowStr(),
      payTime: nowStr(),
      totalAmount: req.body.totalAmount || "10.00",
      channelUserId: "usr_" + Math.random().toString(36).slice(2, 10),
    },
  });
});

// POST /order/refund — Order Refund
router.post("/refund", (req, res) => {
  const { refundNo, orderNo, thirdOrderNo, refundAmount } = req.body;
  if (!refundNo || !orderNo || !thirdOrderNo || !refundAmount) {
    return res.status(400).json({ code: 400, message: "Missing required fields: refundNo, orderNo, thirdOrderNo, refundAmount" });
  }
  log.ok(`[Machine] Refund created: ${refundNo} for order ${orderNo}`);
  res.json({
    code: 200,
    message: "success",
    data: {
      refundNo,
      orderNo,
      thirdOrderNo,
      thirdRefundNo: "RF" + Date.now(),
      refundStatus: "success",
      refundTime: nowStr(),
      totalAmount: req.body.totalAmount || refundAmount,
      refundAmount,
    },
  });
});

// POST /order/complete — Order Complete
router.post("/complete", (req, res) => {
  const { orderNo, thirdOrderNo, success, orderStatus, outStockStatus } = req.body;
  if (!orderNo || !thirdOrderNo || success === undefined || !orderStatus || !outStockStatus) {
    return res.status(400).json({ code: 400, message: "Missing required fields: orderNo, thirdOrderNo, success, orderStatus, outStockStatus" });
  }
  log.ok(`[Machine] Order complete: ${orderNo}, success=${success}`);
  res.json({
    code: 200,
    message: "success",
    data: {
      orderNo,
      thirdOrderNo,
      returnCode: "success",
      returnMsg: "Order completion notified successfully",
    },
  });
});

// POST /order/cancel — Order Cancel
router.post("/cancel", (req, res) => {
  const { orderNo, thirdOrderNo, orderStatus, cancelTime } = req.body;
  if (!orderNo || !thirdOrderNo || orderStatus === undefined || !cancelTime) {
    return res.status(400).json({ code: 400, message: "Missing required fields: orderNo, thirdOrderNo, orderStatus, cancelTime" });
  }
  log.ok(`[Machine] Order cancelled: ${orderNo}`);
  res.json({
    code: 200,
    message: "success",
    data: {
      orderNo,
      thirdOrderNo,
      returnCode: "success",
      returnMsg: "Order cancelled successfully",
    },
  });
});

module.exports = router;
