import React from "react";
import {
  PaymentElement,
  LinkAuthenticationElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

export default function CheckoutForm(props: { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();

  const [email, setEmail] = React.useState<string>("");
  const [message, setMessage] = React.useState("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!stripe) {
      return;
    }
    console.log("stripe use effect", stripe);

    // const clientSecret = new URLSearchParams(window.location.search).get(
    //   "payment_intent_client_secret"
    // );

    if (!props.clientSecret) {
      console.log("no client secret");
      return;
    }
    console.log("client secret", props.clientSecret);
    stripe
      .retrievePaymentIntent(props.clientSecret)
      .then(({ paymentIntent }) => {
        console.log("useEffect hook triggered");

        fetch("/api/log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data: "useEffect hook triggered" }),
        })
          .then((res) => res.json())
          .then((data) => console.log(data))
          .catch((error) => console.error(error));
        if (!paymentIntent) {
          return;
        }

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
            // fetch("/api/log", {
            //   method: "POST",
            //   headers: {
            //     "Content-Type": "application/json",
            //   },
            //   body: JSON.stringify({ paymentIntent }),
            // })
            //   .then((res) => res.json())
            //   .then((data) => console.log(data))
            //   .catch((error) => console.error(error));

            setMessage("Your payment is processing.");
            break;
          case "requires_payment_method":
            console.log("payment intent rpm", paymentIntent);

            setMessage("Your payment was not successful, please try again.");
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

    const payment = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Make sure to change this to your payment completion page
        // Redirect customer to this URL after failed payment
        return_url: `http://localhost:3000/checkoutpage/${props.clientSecret}`,
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
    <div className="mx-auto mt-[20%]">
      <form className="bg-slate-400" id="payment-form" onSubmit={handleSubmit}>
        {/* <LinkAuthenticationElement
          id="link-authentication-element"
          onChange={(event) => setEmail(event.value.email)}
        /> */}
        <span className=" text-slate-700 ">Email</span>
        <br />
        <input
          className=" mb-3 mt-1 w-full rounded-lg p-3 text-slate-700"
          id="email"
          type="text"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PaymentElement id="payment-element" options={paymentElementOptions} />
        <button
          className="checkoutButton"
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
        {/* Show any error or success messages */}
        {message && <div id="payment-message">{message}</div>}
      </form>
    </div>
  );
}
