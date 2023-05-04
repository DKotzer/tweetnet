import React, { useState, useEffect } from "react";
import { Elements, useStripe, useElements } from "@stripe/react-stripe-js";

const PaymentForm = () => {
  const stripe = useStripe();
  const [paymentIntent, setPaymentIntent] = useState(null);

  useEffect((props: {clientSecret : string}) => {
    if (stripe) {
      stripe.retrievePaymentIntent(props.clientSecret).then((paymentIntent) => {
        setPaymentIntent(paymentIntent);
      });
    }
  }, [stripe]);

  // render the payment form using Elements and useElements

  return (
    <div>
      {paymentIntent && (
        <div>
          PaymentIntent: {paymentIntent.id} ({paymentIntent.status})
        </div>
      )}
      // render the payment form using Elements and useElements
    </div>
  );
};

const MyCheckoutPage = () => {
  const stripePromise = loadStripe("YOUR_STRIPE_PUBLISHABLE_KEY");

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm clientSecret="YOUR_PAYMENT_INTENT_CLIENT_SECRET" />
    </Elements>
  );
};

export default MyCheckoutPage