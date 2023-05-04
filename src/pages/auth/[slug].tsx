import React from "react";
import {
  Elements,
  PaymentElement,
  LinkAuthenticationElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { GetStaticProps, NextPage } from "next";

const AuthPage: NextPage<{ secret: string }> = ({ secret }) => {
  // const stripe = useStripe();
  const elements = useElements();

  React.useEffect(() => {
    (async () => {
      const payment = await stripe?.retrievePaymentIntent(secret);
      console.log("payment test:", payment);
    })();
  }, [stripe, secret]);

  return (
    <div className="flex h-screen w-screen">
      {stripe && (
        <PaymentElement
          options={
            {
              // ...
            }
          }
        />
      )}
    </div>
  );
};

export default AuthPage;
