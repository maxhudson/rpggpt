export default async function handler(req, res) {
  if (req.method === 'POST') {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { credits, userId } = req.body;

    try {
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: process.env.NODE_ENV === 'production' ? 'price_1R4EQvLoYru0yFboaqhwLVd0' : 'price_1R4EuZLoYru0yFboEZ6Fxzm7',
            quantity: credits,
          },
        ],
        payment_intent_data: { metadata: {credits, userId} },
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_URL}?creditsPurchased`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL}`,
      });

      res.status(200).json({ checkoutUrl: session.url });
    } catch (error) {
      console.error('Stripe error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
