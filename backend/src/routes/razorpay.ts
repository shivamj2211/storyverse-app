import { Router, Response } from "express";
import crypto from "crypto";
import { getRazorpay } from "../lib/razorpay";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { query } from "../db";
import { getCountryFromRequest } from "../lib/geo";

const router = Router();


/**
 * Create Razorpay Order (India only)
 */
router.post("/create-order", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // 🔐 Email verification check
    if (!req.user?.is_email_verified) {
      return res.status(403).json({
        error: "EMAIL_NOT_VERIFIED",
        message: "Verify email before purchasing.",
      });
    }

    // 🌍 Country detection
    const country = getCountryFromRequest(req);

    // 🇮🇳 Razorpay only for India
    if (country !== "IN") {
      return res.status(400).json({
        error: "RAZORPAY_NOT_ALLOWED",
        message: "Razorpay is only available for India.",
      });
    }

    // 🧠 Get Razorpay instance safely
    const razorpay = getRazorpay();

    if (!razorpay) {
      return res.status(500).json({
        error: "RAZORPAY_NOT_CONFIGURED",
        message: "Payment service unavailable. Contact support.",
      });
    }

    const { planKey } = req.body as { planKey?: string };

    // 💰 Amounts in paise
    const amountMap: Record<string, number> = {
      premium_1m: 19900,
      premium_3m: 49900,
      premium_12m: 149900,
      creator_1m: 49900,
      creator_3m: 129900,
      creator_12m: 399900,
    };

    if (!planKey || !amountMap[planKey]) {
      return res.status(400).json({ error: "INVALID_PLAN" });
    }

    // 🧾 Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountMap[planKey], // paise
      currency: "INR",
      receipt: `rcpt_${req.user.id}_${Date.now()}`,
      notes: {
        userId: req.user.id,
        planKey,
      },
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // frontend needs this
    });
  } catch (err) {
    console.error("Create order failed:", err);
    return res.status(500).json({ error: "ORDER_CREATION_FAILED" });
  }
});


/**
 * Verify Razorpay Payment
 */
router.post("/verify-payment", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = req.body || {};

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ error: "INVALID_PAYMENT_DATA" });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: "RAZORPAY_NOT_CONFIGURED" });
    }

    // 🔐 Step 1: Signature verification
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "INVALID_SIGNATURE" });
    }

    // 🔍 Step 2: Fetch order from Razorpay (to get planKey)
    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(500).json({ error: "RAZORPAY_NOT_AVAILABLE" });
    }

    const order = await razorpay.orders.fetch(razorpay_order_id);

    
    const userId = order?.notes?.userId || req.user!.id;

    const rawPlanKey = order?.notes?.planKey;

// 🔐 Hard validation (NO guessing)
if (typeof rawPlanKey !== "string") {
  return res.status(400).json({ error: "INVALID_PLAN_KEY" });
}

const planKey = rawPlanKey as string;

let plan: "free" | "premium" | "creator" = "free";
let months = 1;

if (planKey.startsWith("premium")) {
  plan = "premium";
}

if (planKey.startsWith("creator")) {
  plan = "creator";
}

if (planKey.endsWith("3m")) {
  months = 3;
}

if (planKey.endsWith("12m")) {
  months = 12;
}



    // 🧾 Step 4: Update user subscription
    await query(
      `
      UPDATE users
      SET
        plan = $1,
        is_premium = TRUE,
        premium_expires_at = NOW() + ($2 || ' months')::interval
      WHERE id = $3
      `,
      [plan, months, userId]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("verify-payment failed:", err);
    return res.status(500).json({ error: "PAYMENT_VERIFY_FAILED" });
  }
});


export default router;
