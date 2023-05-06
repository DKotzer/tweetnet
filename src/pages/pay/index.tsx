import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, ElementProps } from "@stripe/react-stripe-js";
import Image from "next/image";
import type { Layout } from "@stripe/stripe-js";
import { PageLayout } from "~/components/layout";

import CheckoutForm from "../../components/CheckoutForm";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

// interface CustomPaymentElementOptions {
//   layout?: {
//     type: Layout;
//     defaultCollapsed?: boolean;
//   };
//   // other properties of the options object
// }

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
    theme: "light" | "dark" | "night";
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
  const options: PaymentOptions | undefined = clientSecret
    ? {
        clientSecret,
        appearance,
      }
    : undefined;

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
              <a href="#">
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
              </a>

              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-slate-100">
                  $5.00 (CAD) ✅
                </span>
                {/* <a
              href="#"
              className="rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              Add to cart
            </a> */}
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


     {
       /* <div className="mt-2.5 mb-5 flex items-center">
              <svg
                aria-hidden="true"
                className="h-5 w-5 text-yellow-300"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>First star</title>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
              <svg
                aria-hidden="true"
                className="h-5 w-5 text-yellow-300"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Second star</title>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
              <svg
                aria-hidden="true"
                className="h-5 w-5 text-yellow-300"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Third star</title>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
              <svg
                aria-hidden="true"
                className="h-5 w-5 text-yellow-300"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Fourth star</title>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
              <svg
                aria-hidden="true"
                className="h-5 w-5 text-yellow-300"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Fifth star</title>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
              <span className="mr-2 ml-3 rounded bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-200 dark:text-blue-800">
                5.0
              </span>
            </div> */
     }