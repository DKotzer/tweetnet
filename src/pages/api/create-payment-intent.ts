// This is your test secret API key.
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const calculateOrderAmount = (items: any) => {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  return 500;
};



export default async function handler(req: any, res: any) {
  const { items } = req.body;
  // Alternatively, set up a webhook to listen for the payment_intent.succeeded event
  // and attach the PaymentMethod to a new Customer
  const customer = await stripe.customers.create();

  const paymentIntent = await stripe.paymentIntents.create({
    customer: customer.id,
    amount: calculateOrderAmount(items),
    currency: "cad",
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
}
