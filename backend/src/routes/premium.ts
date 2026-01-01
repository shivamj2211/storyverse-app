import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { query } from '../db';
import dotenv from 'dotenv';
import stripePackage from 'stripe';

// Load env for Stripe keys
dotenv.config();

const router = Router();

// Expose the current premium plan. In a real application this would likely
// be dynamic (monthly, yearly, etc.) but here we return a single plan
// configured via environment or falling back to a sensible default.
router.get('/plans', (req: Request, res: Response) => {
  const priceId = process.env.STRIPE_PRICE_ID || '';
  // For demo purposes we return a static price amount. If you set a Stripe
  // price ID, the frontend will redirect to a real checkout page.
  return res.json({
    plan: {
      id: priceId || 'free',
      name: 'Premium Membership',
      description: 'Unlock unlimited replays and 50 saved stories.',
      currency: 'usd',
      amount: priceId ? undefined : 500, // $5.00 one‑time fee when no Stripe
    }
  });
});

// Create a checkout session. If Stripe keys are provided this returns a real
// checkout URL. Otherwise, it directly upgrades the user to premium and
// responds with a fake URL.
router.post('/create-checkout-session', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  try {
    // When Stripe is configured we create a session with the provided price ID.
    if (stripeSecret && priceId) {
      const stripe = new stripePackage.Stripe(stripeSecret, { apiVersion: '2022-11-15' });
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: { userId },
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/premium/success`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/premium/cancel`,
      });
      return res.json({ checkoutUrl: session.url });
    }
    // No Stripe configured: immediately upgrade the user
    await query('UPDATE users SET is_premium=true WHERE id=$1', [userId]);
    return res.json({ checkoutUrl: null, upgraded: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unable to create checkout session' });
  }
});

// Webhook to handle Stripe checkout completion. When a payment is successful
// we look up the user from the metadata and set their account to premium.
router.post('/webhook', async (req: Request, res: Response) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecret || !webhookSecret) {
    return res.status(400).json({ error: 'Webhook not configured' });
  }
  const stripe = new stripePackage.Stripe(stripeSecret, { apiVersion: '2022-11-15' });
  const sig = req.headers['stripe-signature'];
  const payload = (req as any).rawBody || req.body;
  try {
    const event = stripe.webhooks.constructEvent(payload, sig as string, webhookSecret);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const userId = session.metadata?.userId;
      if (userId) {
        await query('UPDATE users SET is_premium=true WHERE id=$1', [userId]);
      }
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Webhook error' });
  }
});

// Manual mock upgrade for development/testing. This endpoint simply
// upgrades the user to premium without any payment. Useful when Stripe
// keys are not set. It requires auth and can be disabled in production.
router.post('/mock-upgrade', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    await query('UPDATE users SET is_premium=true WHERE id=$1', [userId]);
    return res.json({ upgraded: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unable to upgrade account' });
  }
});

export default router;