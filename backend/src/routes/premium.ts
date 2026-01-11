// backend/src/routes/premium.ts
import { Router, Request, Response } from "express";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { query } from "../db";
import dotenv from "dotenv";
import stripePackage from "stripe";
import { getCountryFromRequest } from "../lib/geo";
import { getRazorpay } from "../lib/razorpay";
import { getStripe } from "../lib/stripe";

dotenv.config();
const router = Router();

type PlanKey =
  | "premium_1m"
  | "premium_3m"
  | "premium_12m"
  | "creator_1m"
  | "creator_3m"
  | "creator_12m";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

function priceIdFor(planKey: PlanKey) {
  const map: Record<PlanKey, string | undefined> = {
    premium_1m: process.env.STRIPE_PRICE_ID_PREMIUM_1M,
    premium_3m: process.env.STRIPE_PRICE_ID_PREMIUM_3M,
    premium_12m: process.env.STRIPE_PRICE_ID_PREMIUM_12M,
    creator_1m: process.env.STRIPE_PRICE_ID_CREATOR_1M,
    creator_3m: process.env.STRIPE_PRICE_ID_CREATOR_3M,
    creator_12m: process.env.STRIPE_PRICE_ID_CREATOR_12M,
  };
  return map[planKey] || "";
}

function amountFallback(planKey: PlanKey) {
  // smallest unit: INR paise / USD cents
  const map: Record<PlanKey, number> = {
    premium_1m: 19900,
    premium_3m: 49900,
    premium_12m: 149900,
    creator_1m: 49900,
    creator_3m: 129900,
    creator_12m: 399900,
  };
  return map[planKey];
}

// ✅ Frontend can render plan cards from here
router.get("/plans", (_req: Request, res: Response) => {
  const plans = ([
    ["premium_1m", "Premium", "1 Month", "Unlock Premium features", "inr", 199],
    ["premium_3m", "Premium", "3 Months", "Save with quarterly plan", "inr", 499],
    ["premium_12m", "Premium", "12 Months", "Best value yearly", "inr", 1499],
    ["creator_1m", "Creator", "1 Month", "Creator tools + perks", "inr", 499],
    ["creator_3m", "Creator", "3 Months", "Save with quarterly plan", "inr", 1299],
    ["creator_12m", "Creator", "12 Months", "Best value yearly", "inr", 3999],
  ] as const).map(([key, tier, duration, desc, currency, displayAmount]) => ({
    key,
    tier,
    duration,
    description: desc,
    currency,
    displayAmount,
    stripePriceId: priceIdFor(key as PlanKey) || null,
  }));

  return res.json({ plans });
});

// ✅ Create checkout session (EMAIL VERIFIED REQUIRED)
router.post(
  "/create-checkout-session",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.is_email_verified) {
        return res.status(403).json({
          error: "EMAIL_NOT_VERIFIED",
          message: "Verify email before purchasing.",
        });
      }

      const planKey = String(req.body?.planKey || "") as PlanKey;
      const country = getCountryFromRequest(req);

      const priceMap: Record<
        PlanKey,
        { amountInInr: number; plan: "premium" | "creator"; months: number }
      > = {
        premium_1m: { amountInInr: 199, months: 1, plan: "premium" },
        premium_3m: { amountInInr: 499, months: 3, plan: "premium" },
        premium_12m: { amountInInr: 1499, months: 12, plan: "premium" },
        creator_1m: { amountInInr: 499, months: 1, plan: "creator" },
        creator_3m: { amountInInr: 1299, months: 3, plan: "creator" },
        creator_12m: { amountInInr: 3999, months: 12, plan: "creator" },
      };

      if (!priceMap[planKey]) {
        return res.status(400).json({ error: "INVALID_PLAN" });
      }

      // 🇮🇳 INDIA → RAZORPAY
      if (country === "IN") {
        const razorpay = getRazorpay();
        if (!razorpay) {
          return res.status(500).json({
            error: "RAZORPAY_NOT_CONFIGURED",
            message: "Razorpay keys not set on server.",
          });
        }

        const order = await razorpay.orders.create({
          amount: priceMap[planKey].amountInInr * 100, // paise
          currency: "INR",
          receipt: `rcpt_${req.user.id}_${Date.now()}`,
          notes: { userId: req.user.id, planKey },
        });

        return res.json({
          gateway: "razorpay",
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: process.env.RAZORPAY_KEY_ID,
        });
      }

      // 🌍 INTERNATIONAL → STRIPE
      const stripe = getStripe();
      if (!stripe) {
        return res.status(500).json({
          error: "STRIPE_NOT_CONFIGURED",
          message: "Stripe key not set on server.",
        });
      }

      // If you have Stripe Price IDs configured, use them (recommended)
      const priceId = priceIdFor(planKey);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: req.user.email,
        line_items: priceId
          ? [{ price: priceId, quantity: 1 }]
          : [
              {
                price_data: {
                  currency: "usd",
                  product_data: { name: `StoryVerse ${priceMap[planKey].plan} plan` },
                  unit_amount: Math.round((priceMap[planKey].amountInInr / 80) * 100) * 100, // rough INR->USD fallback
                },
                quantity: 1,
              },
            ],
        metadata: {
          userId: req.user.id,
          planKey,
          plan: priceMap[planKey].plan,
        },
        success_url: `${FRONTEND_URL}/premium?success=1`,
        cancel_url: `${FRONTEND_URL}/premium?cancel=1`,
      });

      return res.json({
        gateway: "stripe",
        checkoutUrl: session.url,
      });
    } catch (err) {
      console.error("create-checkout-session failed:", err);
      return res.status(500).json({ error: "CHECKOUT_FAILED" });
    }
  }
);

// ✅ Stripe Webhook (sets plan after successful payment)
router.post("/webhook", async (req: Request, res: Response) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecret || !webhookSecret) {
    return res.status(400).json({ error: "Webhook not configured" });
  }

  const stripe = new stripePackage.Stripe(stripeSecret, { apiVersion: "2022-11-15" });
  const sig = req.headers["stripe-signature"];
  const payload = (req as any).rawBody || req.body;

  try {
    const event = stripe.webhooks.constructEvent(payload, sig as string, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;

      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan; // "premium" | "creator"

      if (userId && (plan === "premium" || plan === "creator")) {
        await query(
          `UPDATE users
           SET is_premium = TRUE,
               plan = $2
           WHERE id = $1`,
          [userId, plan]
        );
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("stripe webhook error:", err);
    return res.status(400).json({ error: "Webhook error" });
  }
});

export default router;
