import React, { useState, useEffect } from "react";
import { Elements, useStripe, useElements } from "@stripe/react-stripe-js";
import type { GetStaticProps, NextPage } from "next";
import { loadStripe } from "@stripe/stripe-js";

const PaymentForm = (props: { clientSecret: string }) => {
  const stripe = useStripe();
  const [paymentIntent, setPaymentIntent] = useState(null);

useEffect(() => {
  if (stripe) {
    stripe.retrievePaymentIntent(props.clientSecret).then((result) => {
      if (result.paymentIntent) {
        setPaymentIntent(result.paymentIntent);
      }
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

const MyCheckoutPage: NextPage<{ secret: string }> = ({ secret }) => {
  const stripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
  );

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm clientSecret={secret} />
    </Elements>
  );
};

export default MyCheckoutPage;
