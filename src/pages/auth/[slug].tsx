import React, { useEffect, useState } from "react";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import { Elements } from "@stripe/react-stripe-js";
import type { NextPage } from "next";
import { loadStripe } from "@stripe/stripe-js";
import { PageLayout } from "~/components/layout";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";

const PaymentForm = (props: {
  clientSecret: string;
  paymentIntent: string;
}) => {
  // const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(
  //   null
  // );
  const { user, isSignedIn, isLoaded } = useUser();

  type PaymentObject = {
    status?: string;
    data?: {
      amount_received?: number;
      receipt_email?: string;
      id?: string;
      client_secret?: string;
    };
  };
  let paymentObj: PaymentObject = {};
  //  const [payment, setPayment] = useState({}) as any;
  const [paymentSaved, setPaymentSaved] = useState(false);

  if (
    Object.keys(paymentObj).length === 0 ||
    paymentObj.status !== "succeeded"
  ) {
    paymentObj = api.profile.getPaymentById.useQuery({
      paymentIntentId: props.paymentIntent,
    });

    // console.log(paymentObj, 'p2test')
  }
  const { mutate, isLoading: isPosting } = api.profile.savePayment.useMutation({
    onSuccess: () => {
      console.log("payment successful");
    },
    onError: (e) => {
      const errorMessage = e.data?.zodError?.fieldErrors.content;
      if (errorMessage && errorMessage[0]) {
        toast.error(errorMessage[0]);
      } else {
        toast.error("Failed to save payment, please contact dkotzer@gmail.com");
      }
    },
  });

  if (!isLoaded || Object.keys(paymentObj).length === 0) {
    return <div>Processing payment...</div>;
  }

  if (
    !paymentSaved &&
    paymentObj.status &&
    paymentObj.data &&
    typeof paymentObj.data.client_secret === "string" &&
    typeof paymentObj.data.amount_received === "number"
  ) {
    setPaymentSaved(true);
    const paymentData = {
      stripeId: paymentObj.data?.id || "",
      amount: paymentObj.data?.amount_received || 500,
      status: paymentObj.status || "failed",
      secret: paymentObj.data?.client_secret || "no secret found",
      receiptEmail: paymentObj.data?.receipt_email || "no email found",
      authorId: user?.id || "noUserFound",
      tokensBought: 1000000,
      currency: "cad",
    };
    toast.success(`1,000,000 Tokens added!.`);
    //  console.log(paymentData, "paymentData test");
    mutate({ ...paymentData });
  }

  //  console.log('p3 test',paymentObj)

  return (
    <div className="border-b border-slate-400/50 pb-5">
      {/* Render the PaymentForm using the paymentIntent state */}
      <div>
        <div className="bg-black p-6  md:mx-auto">
          <Image
            src={"https://tweetbots.s3.amazonaws.com/tweetnet.webp"}
            width={258}
            height={258}
            alt={"TweetNet"}
            className="mx-auto pt-1  hover:scale-105"
            priority={true}
            placeholder={"blur"}
            blurDataURL={"/tweetnet.svg"}
          />
          <svg
            viewBox="0 0 24 24"
            className="mx-auto my-6 h-16 w-16 text-green-600"
          >
            <path
              fill="currentColor"
              d="M12,0A12,12,0,1,0,24,12,12.014,12.014,0,0,0,12,0Zm6.927,8.2-6.845,9.289a1.011,1.011,0,0,1-1.43.188L5.764,13.769a1,1,0,1,1,1.25-1.562l4.076,3.261,6.227-8.451A1,1,0,1,1,18.927,8.2Z"
            ></path>
          </svg>
          <div className="text-center">
            <h3 className="text-center text-base font-semibold text-slate-100 md:text-2xl">
              Purchase Complete!
            </h3>
            <p className="my-2 text-slate-100">
              Thank you{" "}
              <span className="font-bold">
                {user?.username ||
                  user?.emailAddresses[0]?.emailAddress ||
                  user?.firstName + "-" + user?.lastName ||
                  user?.firstName}{" "}
              </span>
              for completing your secure online payment.
            </p>
            <p className="my-2 text-slate-100">
              {paymentObj?.data?.receipt_email &&
                `A receipt was e-mailed to ${paymentObj.data.receipt_email}`}
            </p>
            <p className="my-2 text-slate-100">
              1,000,000 tokens have been added to your account.
            </p>
            <p className="my-2 text-slate-100">
              Your bot limit has been increased to 10.
            </p>
            <p className="my-2 text-slate-100"> Have a great day! </p>
            <div className="py-10 text-center">
              <Link
                href={`/mybots/@${
                  user?.username ||
                  user?.emailAddresses[0]?.emailAddress ||
                  user?.firstName + "-" + user?.lastName ||
                  user?.firstName
                }`}
                className="bg-indigo-600 px-12 py-3 font-semibold text-white hover:bg-indigo-500"
              >
                GO BACK
              </Link>
            </div>
          </div>
        </div>
        {/* <div>
            {user && user.firstName}{" "}
            {user && user.emailAddresses[0]?.emailAddress}{" "}
            {paymentObj?.status && paymentObj?.status}{" "}
            {paymentObj?.data?.amount_received &&
              `$${paymentObj?.data?.amount_received / 100}.00 CAD`}
            {paymentObj?.data?.receipt_email &&
              `Receipt e-mailed to ${paymentObj.data.receipt_email}`}
            {paymentObj?.data?.id && `Payment ID: ${paymentObj.data.id}`}
            {paymentObj?.data?.client_secret &&
              `Client Secret: ${paymentObj.data.client_secret}`}
          </div> */}
      </div>
    </div>
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

  // console.log("secret string test", secret);

  useEffect(() => {
    if (router.isReady) {
      //payment_intent = secret
      setStatus(redirect_status as string);
      setPaymentIntent(payment_intent as string);
      setIsLoading(false);
      // console.log("router test", router);
    }
    // console.log("status:", status, "payment_intent:", paymentIntent);
  }, [router.isReady, router.query]);

  if (isLoading) {
    return <div>Processing..</div>;
  }

  const stripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
  );

  return (
    <PageLayout>
      <div className="min-h-screen border border-slate-400/50">
        <Elements stripe={stripePromise}>
          {/* {redirect_status && redirect_status}{" "}
          {payment_intent && payment_intent} */}
          <PaymentForm clientSecret={secret} paymentIntent={paymentIntent} />
        </Elements>
      </div>
    </PageLayout>
  );
};

export default AuthPage;
