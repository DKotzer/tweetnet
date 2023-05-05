import React, { useEffect, useState } from "react";
import { loadStripe, Layout } from "@stripe/stripe-js";
import { useUser } from "@clerk/nextjs";


import {
  PaymentElement,
  LinkAuthenticationElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

interface CustomPaymentElementOptions {
  layout?: {
    type: Layout;
    defaultCollapsed?: boolean;
  };
  // other properties of the options object
}

export default function CheckoutForm(props: { clientSecret: string }) {
  const { user, isSignedIn, isLoaded } = useUser();
  const [clientSecret, setClientSecret] = React.useState<string | undefined>(
    undefined
  );

  const [selectedCurrency, setSelectedCurrency] = useState("CAD");

  
  if(!isLoaded ){
    return <div>Loading...</div>
  }
  if(!user){
    return <div>Unable to detect User, please sign in.</div>
  }
  
  const handleCurrencyChange = (event: any) => {
    setSelectedCurrency(event.target.value);
  };

  type PricePerToken = {
    [key: string]: { price: number; symbol: string };
  };

  const pricePerToken: PricePerToken = {
    CAD: { price: 5, symbol: "$" },
    USD: { price: 3.7, symbol: "~$" },
    EUR: { price: 3.36, symbol: "~€" },
    GBP: { price: 2.93, symbol: "~£" },
    JPY: { price: 496.54, symbol: "~¥" },
    // add more currencies and their prices here
  };

  const selectedCurrencyData = pricePerToken[selectedCurrency];

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
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState("");
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [paymentIntent, setPaymentIntent] = useState({});
  const [paymentIntentId, setPaymentIntentId] = useState("");

  useEffect(() => {
    if (!stripe) {
      return;
    }

    if (!props.clientSecret) {
      console.log("no client secret");
      return;
    }

    stripe
      .retrievePaymentIntent(props.clientSecret)
      .then(({ paymentIntent }) => {
        if (!paymentIntent) {
          return;
        }

        setPaymentIntent(paymentIntent);
        setPaymentIntentId(paymentIntent.id);

        switch (paymentIntent.status) {
          case "succeeded":
            setMessage("Payment succeeded!");
            console.log("payment intent");

            fetch("/api/log", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ paymentIntent }),
            })
              .then((res) => res.json())
              .then((data) => console.log(data))
              .catch((error) => console.error(error));

            break;
          case "processing":
            console.log("payment intent", paymentIntent);

            setMessage("Your payment is processing.");
            break;
          case "requires_payment_method":
            console.log("payment intent rpm", paymentIntent);

            setMessage(
              "Receipt will be e-mailed after the payment is processed."
            );
            break;
          default:
            console.log("payment intent", paymentIntent);

            setMessage("Something went wrong.");
            break;
        }
      });
  }, [stripe]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    setIsLoading(true);
    console.log("paymentIntentId", paymentIntentId);

    const payment = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `http://localhost:3000/auth/${paymentIntentId}`,
        receipt_email: email,
      },
    });

    console.log("payment test 2", payment);

    if (
      payment.error?.type === "card_error" ||
      payment.error?.type === "validation_error"
    ) {
      setMessage(payment.error.message || "Unexpected Error Occured");
    } else {
      console.log("payment test", payment);
      setMessage("An unexpected error occurred.");
    }

    setIsLoading(false);
  };

  const paymentElementOptions = {
    layout: {
      type: "tabs",
      defaultCollapsed: true,
    },
  };

  return (
    <div className="mx-auto">
      <form
        className="mb-5 w-[100%] border border-slate-400/50 md:max-w-[500px]"
        id="payment-form"
        onSubmit={handleSubmit}
      >
        {/* <LinkAuthenticationElement
          id="link-authentication-element"
          onChange={(event) => setEmail(event.value.email)}
        /> */}
        <p className="rounded-xl bg-slate-500 py-1 text-center text-xl">
          <span>1,000,000 TweetNet </span>
          <span>
            {" "}
            tokens for {selectedCurrencyData?.symbol}
            {selectedCurrencyData?.price.toFixed(2)}.
          </span>
        </p>
        <div>
          <label htmlFor="currency-picker">Select currency:</label>
          <select
            id="currency-picker"
            value={selectedCurrency}
            onChange={handleCurrencyChange}
            className="border-5 mb-3 mt-1 w-full rounded-lg border-[#1f2937] bg-[1f2937] bg-[#30313d] p-3 text-slate-100 active:border-slate-200"
          >
            <option value="CAD">CAD</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
            {/* add more currency options here */}
          </select>
        </div>
        <span className=" text-slate-100 ">Email</span>
        <br />
        <input
          className=" border-5 mb-3 mt-1 w-full rounded-lg border-[#1f2937] bg-[1f2937] bg-[#30313d] p-3 text-slate-100 active:border-slate-200"
          id="email"
          type="text"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PaymentElement
          id="payment-element"
          options={paymentElementOptions as CustomPaymentElementOptions}
        />

        <button
          className="checkoutButton bg-green-600 hover:scale-95 hover:bg-green-400 "
          disabled={isLoading || !stripe || !elements}
          id="submit"
        >
          <span id="button-text">
            {isLoading ? (
              <div className="spinner" id="spinner"></div>
            ) : (
              "Pay now"
            )}
          </span>
        </button>
        {message && (
          <div className="my-3" id="payment-message">
            {message}
          </div>
        )}

        <img
          className="mx-auto max-w-[90%] md:max-w-full"
          src="https://paymentsplugin.com/assets/blog-images/stripe-badge-grey.png"
        />
        {/* Show any error or success messages */}
      </form>
    </div>
  );
}
