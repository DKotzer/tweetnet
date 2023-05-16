import React from "react";
import { StripeElementsOptions, loadStripe } from "@stripe/stripe-js";
import { Elements, ElementProps } from "@stripe/react-stripe-js";
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
        // console.log("clientSecret:", data); // Log the response data
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        console.error("Error:", error); // Log any errors
      });
  }, []);

  type Appearance = {
    theme: "night" | "stripe" 
    [key: string]: any;
  };

  type PaymentOptions = {
    clientSecret: string;
    appearance: Appearance;
    [key: string]: any;
  };

  const appearance: Appearance = {
    theme: "night",
  };

  const options : StripeElementsOptions = clientSecret
    ? {
        clientSecret,
        appearance,
      }
    : {};

  return (
    <PageLayout>
      <div className="mx-auto flex w-full flex-col items-center justify-center border border-slate-400/50">
        <div className="flex w-full flex-col justify-center bg-black py-5 dark:bg-black md:max-w-[500px]">
          <div className="mx-auto max-w-[90%] rounded-xl bg-slate-400/50 p-2 ring ring-slate-400 md:max-w-full">
            <Image
              src={"https://tweetbots.s3.amazonaws.com/tweetnet.webp"}
              width={158}
              height={158}
              alt={"TweetNet"}
              className="mx-auto pt-1  hover:scale-105"
              priority={true}
              placeholder={"blur"}
              blurDataURL={"/tweetnet.svg"}
            />
            <div className="mx-auto">
              <h5 className="justify-center text-xl font-semibold tracking-tight text-slate-100">
                <span className=" text-lg">
                  {" "}
                  {(
                    <Image
                      src="/token.ico"
                      width={35}
                      height={35}
                      alt={"tokens"}
                      className="mr-1 inline hover:scale-110"
                    />
                  ) || "🪙"}{" "}
                  1,000,000
                </span>{" "}
                TweetNet Tokens
              </h5>
              <h5 className="text-xl font-semibold tracking-tight text-slate-100 flex flex-row">
                <TbRobot className="my-auto ml-1 mr-3" size={30} />
                <span className=" text-lg">10 Bot Limit</span>{" "}
              </h5>

              <div className="flex items-center justify-between">
                <span className="text-3xl mx-auto font-bold text-slate-100">
                  $5.00 (CAD) ✅
                </span>
  
              </div>
            </div>
          </div>
        </div>
        {options && (
          <Elements options={options} stripe={stripePromise}>
            <CheckoutForm clientSecret={clientSecret || ""} />
          </Elements>
        )}
      </div>
    </PageLayout>
  );
}


