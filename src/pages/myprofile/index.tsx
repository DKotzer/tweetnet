import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import Image from "next/image";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
// import { PostView } from "~/components/postview";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";
import { useEffect, useState } from "react";
// import { UserButton, useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import Link from "next/link";
import { BotView } from "~/components/botview";
// import { users } from "@clerk/clerk-sdk-node";
// import { clerkClient } from "@clerk/nextjs/server";
import { useUser } from "@clerk/nextjs";

const ProfileFeed = (props: { userId: string }) => {
  const { data, isLoading } = api.bots.getBotsByUserId.useQuery({
    userId: props.userId,
  });

  if (isLoading)
    return (
      <div className="w-screen md:w-[672px]">
        <div className="flex h-[340px] items-center justify-center border-x border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
        <div className="flex h-[360px] items-center justify-center border-x border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
        <div className=" flex  h-[355px] items-center justify-center border-x border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
        <div className="flex h-[340px] items-center justify-center border-x border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
        <div className="flex h-[360px] items-center justify-center border-x border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
        <div className=" flex  h-[355px] items-center justify-center border-x border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>

        {/* <div className="absolute top-0 right-0 flex h-screen w-screen items-center justify-center">
          
        </div> */}
      </div>
    );

  if (!data || data.length === 0)
    return (
      <div className="h-full w-full border-x border-slate-400/50 md:w-[628px]">
        User has no bots
      </div>
    );

  // console.log("bots", data);

  return (
    <div className="flex flex-col">
      {data.map((bot) => (
        <BotView bot={bot.bot} key={bot.bot.username} userId={props.userId} />
      ))}
    </div>
  );
};

const AccountInfo = (props: { publicMetadata: any; userId: string }) => {
  const { data, isLoading } = api.profile.getPaymentsByUserId.useQuery({
    userId: props.userId,
  });

  if (!isLoading && data && data.length > 0) {
    return (
      <div className="border-x border-slate-400/50">
        <div className="flex flex-col justify-center text-lg">
          {data.map((item) => (
            <div className="border-y border-slate-400/50 p-4" key={item.id}>
              <p>
                <strong>Payment ID:</strong> {item.id}
              </p>
              <p>
                <strong>Created at:</strong>{" "}
                {new Date(item.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Receipt Email:</strong> {item.receiptEmail}
              </p>

              {/* <p>
                      <strong>Stripe ID:</strong> {item.stripeId}
                    </p> */}
              <p>
                <strong>Status:</strong> {item.status}
              </p>
              <p>
                <strong>Amount:</strong>{" "}
                {(item.amount / 100).toLocaleString("en-US", {
                  style: "currency",
                  currency: "CAD",
                })}
              </p>
              <p>
                <strong>Currency:</strong> {"CAD"}
              </p>
              <p>
                <strong>Tokens bought:</strong>{" "}
                <Image
                  src="/token.ico"
                  width={30}
                  height={30}
                  alt={"tokens"}
                  className="mr-1 inline hover:scale-110"
                />
                {item.tokensBought.toLocaleString("en", {
                  useGrouping: true,
                })}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className=" border-x border-slate-400/50  bg-slate-900/80">
      <div className="flex flex-row justify-center gap-5 pl-5 pb-3 text-2xl">
        <span className="whitespace-nowrap">
          {" "}
          Spent:{" "}
          <Image
            src="/token.ico"
            width={35}
            height={35}
            alt={"tokens"}
            className="mr-1 inline hover:scale-110"
          />
          {props.publicMetadata.tokensUsed
            ? props.publicMetadata.tokensUsed.toLocaleString("en", {
                useGrouping: true,
              })
            : 0}
        </span>
        <span className="mr-16 hover:scale-105">
          {" "}
          {props.publicMetadata.tokensUsed && "💸"}
          {props.publicMetadata.tokensUsed &&
            `$${(
              (Number(props.publicMetadata.tokensUsed) / 1000) *
              0.002 *
              2.5
            ).toFixed(2)}`}
        </span>
        {/* <span>
          Max 🪙:{" "}
          {props.publicMetadata.tokensLimit.toLocaleString("en", {
            useGrouping: true,
          })}
        </span> */}
      </div>
      <div className="pl-5 text-2xl"></div>
      {/* <Link href="/pay">
        <button
          className="checkoutButton bg-green-600 hover:scale-95 hover:bg-green-400 "
          id="submit"
        >
          <span id="button-text">Buy Tokens</span>
        </button>
      </Link> */}
      {/* <div className="pl-5 text-2xl">
        Remaining 🪙:{" "}
        {(
          props.publicMetadata.tokensLimit - props.publicMetadata.tokensUsed
        ).toLocaleString("en", {
          useGrouping: true,
        })}
      </div> */}
      {/* <div className="pl-5 text-2xl">
        Account:{" "}
        {(props?.publicMetadata?.subscribed && "Activated") || "Free Mode"}
      </div> */}
    </div>
  );
};

const UserPage: NextPage = () => {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return <LoadingPage />;

  const { data, isLoading } = api.profile.getUserById.useQuery({
    id: user?.id ?? "",
  });

  const [publicMetadata, setPublicMetadata] = useState<any>(null);

  useEffect(() => {
    const getPublicMetadata = async () => {
      const publicMetadata = user?.publicMetadata;

      return publicMetadata;
    };
    const loadPublicMetadata = async () => {
      const publicMetadata = await getPublicMetadata();
      setPublicMetadata(publicMetadata);
      // console.log(publicMetadata); // set the state variable with the publicMetadata value
    };
    if (user) {
      loadPublicMetadata();
    }
  }, [user]);

  if (isLoading || !publicMetadata) return <LoadingPage />;
  if (!data || !user) return <LoadingPage />;

  return (
    <>
      <Head>
        <title>{data.username ?? data.externalUsername}</title>
      </Head>
      <PageLayout>
        <div className="flex w-full flex-row border-x border-slate-400/50 bg-slate-900/80 pb-5">
          <div className="flex flex-col justify-center">
            <Image
              src={data.profileImageUrl}
              alt={`${
                data.username ?? data.externalUsername ?? "unknown"
              }'s profile pic`}
              width={120}
              height={120}
              className="my-3 ml-4 rounded-full border-4 border-black bg-black"
              quality={99}
            />
          </div>
          <div>
            <div className="my-auto p-4 text-3xl font-bold">
              {`${
                data?.username?.replace("@gmail.com", "") ??
                data?.externalUsername?.replace("@gmail.com", "") ??
                "unknown"
              }`}
            </div>
            <div className="pl-3 text-2xl">
              <Image
                src="/token.ico"
                width={35}
                height={35}
                alt={"tokens"}
                className="mr-1 inline hover:scale-110"
              />

              {publicMetadata.tokensUsed
                ? (
                    publicMetadata.tokensLimit - publicMetadata.tokensUsed
                  ).toLocaleString("en", {
                    useGrouping: true,
                  })
                : "150,000"}
            </div>
            <div className="flex flex-row gap-5 pl-3  text-2xl">
              <span className="whitespace-nowrap text-red-600">
                <Image
                  src="/token.ico"
                  width={35}
                  height={35}
                  alt={"tokens"}
                  className="mr-1 inline hover:scale-110"
                />
                {publicMetadata.tokensUsed
                  ? publicMetadata.tokensUsed.toLocaleString("en", {
                      useGrouping: true,
                    })
                  : 0}{" "}
              </span>
            </div>
            <div className="flex flex-row gap-5 pl-3  text-2xl">
              {" "}
              <span className="whitespace-nowrap text-red-600">
                <Image
                  src="/loonie.png"
                  width={35}
                  height={35}
                  alt={"tokens"}
                  className="mr-1 inline hover:scale-110"
                />

                {publicMetadata.tokensUsed &&
                  `$${(
                    (Number(publicMetadata.tokensUsed) / 1000) *
                    0.002 *
                    2.5
                  ).toFixed(2)}`}
              </span>
              {/* <span>
          Max 🪙:{" "}
          {props.publicMetadata.tokensLimit.toLocaleString("en", {
            useGrouping: true,
          })}
        </span> */}
            </div>{" "}
            <div className="hidden h-[37px]  pl-5 text-2xl md:flex">
              Account:{" "}
              {(publicMetadata?.subscribed && "Activated") || "Free Mode"}
            </div>
            <div className="hidden h-[37px]  pl-5 text-2xl md:flex">
              Bot Limit: {(publicMetadata?.subscribed && "10") || "2"}
            </div>
          </div>
        </div>
        <div className="border-x border-slate-400/50">
          <Link href="/pay">
            <button
              className="checkoutButton bg-green-600 hover:scale-95 hover:bg-green-400 "
              id="submit"
            >
              <span id="button-text">Buy Tokens</span>
            </button>
          </Link>
        </div>

        <div className="border-x border-slate-400/50 p-5">
          <span className=" text-xl font-bold">Transaction History</span>
        </div>

        <AccountInfo publicMetadata={publicMetadata} userId={data.id} />

        {/* {publicMetadata.tokensLimit - publicMetadata.tokensUsed > 0 && (
          <CreateBotsWizard publicMetadata={publicMetadata} userId={data.id} />
        )} */}

        {/* <ProfileFeed userId={data.id} /> */}
      </PageLayout>
    </>
  );
};

export default UserPage;
