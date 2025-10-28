import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    let event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;

      // Get current user credits - supabase
      const { userId } = paymentIntent.metadata;
      const { data: profile, error: userError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user profile:', userError);
        return res.status(500).json({ error: 'Failed to fetch user profile' });
      }

      // Update user credits - supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          credits: profile.credits + paymentIntent.amount,
          last_credit_purchase_date: Math.ceil(Date.now() / 1000) + 3
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating credits:', error);
        return res.status(500).json({ error: 'Failed to update credits' });
      }
    }

    res.status(200).json({ received: true });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
