import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

import CheckoutForm from "../../components/CheckoutForm";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

export default function PaymentPage() {
  const [clientSecret, setClientSecret] = React.useState<string | undefined>(
    undefined
  );

  React.useEffect(() => {
    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: "prod_NpPcHwWMwHjsct" }] }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("clientSecret:", data); // Log the response data
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        console.error("Error:", error); // Log any errors
      });
    console.log("stripePromise", stripePromise);
  }, []);

  const appearance = {
    theme: "stripe",
  };
  const options = clientSecret
    ? {
        clientSecret,
        appearance,
      }
    : undefined;

  return (
    <div className="flex h-screen w-screen">
      {options && (
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm clientSecret={clientSecret || ""} />
        </Elements>
      )}
    </div>
  );
}
