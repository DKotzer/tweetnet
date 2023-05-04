import React, { useEffect, useState } from "react";

import {
  Elements,
  PaymentElement,
  LinkAuthenticationElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { GetStaticProps, NextPage } from "next";
import { loadStripe } from "@stripe/stripe-js";

const PaymentForm = (props: { clientSecret: string }) => {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

  // const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(
  //   null
  // );

  useEffect(() => {
    const fetchPaymentIntent = async () => {
      if (stripe) {
        // const intents = await stripe.paymentIntents.retrieve(props.clientSecret);
        // console.log('stripe test:', intents)
      }
    };
    fetchPaymentIntent();
  }, [stripe]);

  // useEffect(() => {
  //   const fetchPaymentIntent = async () => {
  //     if (stripe) {
  //       const intents = await stripe.retrievePaymentIntent(props.clientSecret);
  //       setPaymentIntent(intents.paymentIntent);
  //     }
  //   };
  //   fetchPaymentIntent();
  // }, [stripe, props.clientSecret]);

  return (
    <div>{/* Render the PaymentForm using the paymentIntent state */}</div>
  );
};

const AuthPage: NextPage<{ secret: string }> = ({ secret }) => {
  // const stripe = useStripe();
  const stripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
  );

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm clientSecret={secret} />
    </Elements>
  );
};

export default AuthPage;
