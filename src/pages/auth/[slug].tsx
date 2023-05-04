import React, { useEffect, useState } from "react";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import {
  Elements,
  PaymentElement,
  LinkAuthenticationElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { GetStaticProps, NextPage } from "next";
import { loadStripe } from "@stripe/stripe-js";

const PaymentForm = (props: {
  clientSecret: string;
  paymentIntent: string;
}) => {
  // const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(
  //   null
  // );

  const fetchPaymentIntent = async () => {
    let payment = await api.profile.getPaymentById.useQuery({
      paymentIntentId: props.paymentIntent,
    });
    console.log("payment test", payment);
  };

  if(props.paymentIntent && props.paymentIntent !== undefined){
    fetchPaymentIntent();
  }

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
  const router = useRouter();
  const [status, setStatus] = useState<string>("");
  const [paymentIntent, setPaymentIntent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // const [redirectStatus, setRedirectStatus] = useState<string>
  // const [paymentIntentId, setPaymentIntentId] = useState<string>

  const { redirect_status, payment_intent } = router.query;

  console.log("secret string test", secret);

  useEffect(() => {
    if (router.isReady) {
      //payment_intent = secret
      setStatus(redirect_status as string);
      setPaymentIntent(payment_intent as string);
      setIsLoading(false);
      console.log("router test", router);
    }
  }, [router.isReady, router.query]);

  if (isLoading) {
    return <div>Processing..</div>;
  }

  console.log("status:", status, "payment_intent:", paymentIntent);

  const stripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
  );

  return (
    <Elements stripe={stripePromise}>
      {redirect_status && redirect_status} {payment_intent && payment_intent}
      <PaymentForm clientSecret={secret} paymentIntent={paymentIntent} />
    </Elements>
  );
};

export default AuthPage;
