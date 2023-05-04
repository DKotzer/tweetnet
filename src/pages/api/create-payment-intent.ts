// This is your test secret API key.
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const calculateOrderAmount = (items: any) => {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  return 500;
};

// const chargeCustomer = async (customerId: string) => {
//   // Lookup the payment methods available for the customer
//   const paymentMethods = await stripe.paymentMethods.list({
//     customer: customerId,
//     type: "card",
//   });
//   try {
//     // Charge the customer and payment method immediately
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: 500,
//       currency: "cad",
//       customer: customerId,
//       payment_method: paymentMethods.data[0].id,
//       off_session: false,
//       confirm: true,
//     });
//   } catch (err) {
//     // Error code will be authentication_required if authentication is needed
//     console.log("Error code is: ", err.code);
//     const paymentIntentRetrieved = await stripe.paymentIntents.retrieve(
//       err.raw.payment_intent.id
//     );
//     console.log("PI retrieved: ", paymentIntentRetrieved.id);
//   }
// };

export default async function handler(req: any, res: any) {
  const { items } = req.body;
  // Alternatively, set up a webhook to listen for the payment_intent.succeeded event
  // and attach the PaymentMethod to a new Customer
  const customer = await stripe.customers.create();

  // Create a PaymentIntent with the order amount and currency
  //   const paymentIntent = await stripe.paymentIntents.create({
  //     amount: calculateOrderAmount(items),
  //     currency: "cad",

  //     automatic_payment_methods: {
  //       enabled: false,
  //     },
  //   });
  const paymentIntent = await stripe.paymentIntents.create({
    customer: customer.id,
    amount: calculateOrderAmount(items),
    currency: "cad",
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
}

// This is your test secret API key.
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// const calculateOrderAmount = (items: any) => {
//   // Replace this constant with a calculation of the order's amount
//   // Calculate the order total on the server to prevent
//   // people from directly manipulating the amount on the client
//   return 500;
// };

// export default async function handler(req: any, res: any) {
//   const { items } = req.body;

//   // Create a PaymentIntent with the order amount and currency
//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: calculateOrderAmount(items),
//     currency: "cad",

//     automatic_payment_methods: {
//       enabled: false,
//     },
//   });

//   res.send({
//     clientSecret: paymentIntent.client_secret,
//   });
// }
