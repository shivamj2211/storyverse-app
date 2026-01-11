// backend/src/lib/stripe.ts
import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  if (!client) {
    client = new Stripe(key, { apiVersion: "2022-11-15" });
  }
  return client;
}
