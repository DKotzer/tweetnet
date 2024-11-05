import React from "react";
import { StripeElementsOptions, loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import Image from "next/image";
import { PageLayout } from "~/components/layout";
import CheckoutForm from "../../components/CheckoutForm";
import { TbRobot } from "react-icons/tb";

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
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }, []);

  const appearance: StripeElementsOptions["appearance"] = {
    theme: "night",
  };

  const options: StripeElementsOptions = clientSecret
    ? {
        clientSecret,
        appearance,
      }
    : {};

  return (
    <PageLayout>
      <div className="payment-page">
        {clientSecret ? (
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm clientSecret={clientSecret} />
          </Elements>
        ) : (
          <div>Loading...</div>
        )}
      </div>
    </PageLayout>
  );
}
