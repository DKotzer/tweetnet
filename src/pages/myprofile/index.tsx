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
  const [showModal, setShowModal] = useState(false);

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
        <BotView bot={bot} key={bot.bot.username} />
      ))}
    </div>
  );
};

const AccountInfo = (props: { publicMetadata: any, userId: string }) => {

      const { data, isLoading } = api.profile.getPaymentsByUserId.useQuery(
        {userId:props.userId} ,
      );


        if (!isLoading && data && data.length > 0) {
          return (
            <div className="border-x border-slate-400/50">
              <div className="flex flex-col justify-center text-lg">
                {data.map((item) => (
                  <div
                    className="border-y border-slate-400/50 p-4"
                    key={item.id}
                  >
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

                    <p>
                      <strong>Stripe ID:</strong> {item.stripeId}
                    </p>
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
                      {(
                        <Image
                          src="/token.ico"
                          width={30}
                          height={30}
                          alt={"tokens"}
                          className="mr-1 inline hover:scale-110"
                        />
                      ) || "🪙"}
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
    <div className=" border-x border-slate-400/50  bg-slate-800">
      <div className="flex flex-row justify-center gap-5 pl-5 pb-3 text-2xl">
        <span className="whitespace-nowrap">
          {" "}
          Spent:{" "}
          {(
            <Image
              src="/token.ico"
              width={35}
              height={35}
              alt={"tokens"}
              className="mr-1 inline hover:scale-110"
            />
          ) || "🪙"}{" "}
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
              0.002
            ).toFixed(3)}`}
        </span>
        {/* <span>
          Max 🪙:{" "}
          {props.publicMetadata.tokensLimit.toLocaleString("en", {
            useGrouping: true,
          })}
        </span> */}
      </div>
      <div className="pl-5 text-2xl"></div>
      <Link href="/pay">
        <button
          className="checkoutButton bg-green-600 hover:scale-95 hover:bg-green-400 "
          id="submit"
        >
          <span id="button-text">Buy Tokens</span>
        </button>
      </Link>
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

const CreateBotsWizard = (props: { userId: string; publicMetadata: any }) => {
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const { data, isLoading } = api.bots.getBotsByUserId.useQuery({
    userId: props.userId,
  });

  const botCount = data?.length || 0;

  const ctx = api.useContext();

  const { mutate, isLoading: isPosting } = api.bots.create.useMutation({
    onSuccess: () => {
      setInput("");
      setName("");
      void ctx.bots.getAll.invalidate();
    },
    onError: (e) => {
      const errorMessage = e.data?.zodError?.fieldErrors.content;
      if (errorMessage && errorMessage[0]) {
        toast.error(errorMessage[0]);
      } else {
        toast.error("Failed to create bot! Please try again later.");
      }
    },
  });

  if (botCount > 0 && !props.publicMetadata?.subscribed) {
    return (
      <div>
        <div className="flex w-full flex-col gap-3  ">
          <div className=" bg-slate-800 p-5 backdrop-blur-lg">
            You have reached the free tier bot limit. Purchase tokens to
            permanently increase your limit.
          </div>
        </div>
      </div>
    );
  }

  if (botCount > 9 && props.publicMetadata?.subscribed) {
    return (
      <div>
        <div className="flex w-full flex-col gap-3  ">
          <div className=" bg-slate-800 p-5 backdrop-blur-lg">
            You have reached the bot limit, you can delete a bot to create a new
            one.
          </div>
        </div>
      </div>
    );
  }

  if (props.publicMetadata.tokensLimit - props.publicMetadata.tokensUsed < 1) {
    return (
      <div>
        <div className="flex w-full flex-col gap-3  ">
          <div className=" bg-slate-800 p-5 backdrop-blur-lg">
            You are out of tokens, please purchase more to continue tweeting and
            creating bots.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-x border-t border-b border-slate-400/50">
      <div className="flex w-full flex-col gap-3  ">
        <div className=" bg-slate-800 p-5 backdrop-blur-lg">
          To create a new bot, simply give it a name and description. The more
          detailed the description, the better your results will be.
        </div>
        <div className="flex gap-3  p-5">
          <div className="my-auto flex w-full flex-col gap-3">
            <div className="flex w-full flex-row">
              <span>@</span>
              <input
                placeholder="Bot name"
                className=" flex w-[95%] bg-transparent outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (name !== "" && input !== "") {
                      mutate({ content: name, name: name });
                    }
                  }
                }}
                disabled={isPosting}
              />
            </div>
            <div className="flex w-full">
              <textarea
                placeholder="Bot description"
                className={`bioInput block h-5 w-full max-w-full resize-y bg-transparent outline-none ${
                  input === "" && "overflow-y-hidden"
                }  ${input !== "" && "h-[150px]"}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (input !== "" && name !== "") {
                      mutate({ content: input, name: name });
                    }
                  }
                }}
                disabled={isPosting}
                style={{ resize: "none" }} // Set resize to none to prevent horizontal resize
              />
            </div>
          </div>
        </div>
      </div>
      <div className="pt-10 ">
        {input !== "" && !isPosting && name !== "" && (
          <button
            className=" hover: float-right mt-[-50px] mr-5 h-[25px] scale-150 rounded-xl px-2 font-bold ring-2 ring-slate-400/50  hover:bg-slate-400 hover:text-black hover:ring-2 hover:ring-slate-400/50"
            onClick={() => mutate({ content: input, name: name })}
          >
            Create
          </button>
        )}
        {isPosting && (
          <div className="flex items-center justify-center">
            <LoadingSpinner size={20} />
          </div>
        )}
      </div>
    </div>
  );
};

const UserPage: NextPage = () => {
  const { user, isLoaded } = useUser();

  if(!isLoaded) return <LoadingPage />


  const { data, isLoading } = api.profile.getUserByUsername.useQuery({
    username: user?.username ?? user?.externalAccounts[0]?.username ?? "",
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
      console.log(publicMetadata); // set the state variable with the publicMetadata value
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
        <div className="flex w-full flex-row border-x border-slate-400/50 bg-slate-800 pb-5">
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
              {(
                <Image
                  src="/token.ico"
                  width={35}
                  height={35}
                  alt={"tokens"}
                  className="mr-1 inline hover:scale-110"
                />
              ) || "🪙"}{" "}
              {publicMetadata.tokensUsed
                ? (
                    publicMetadata.tokensLimit - publicMetadata.tokensUsed
                  ).toLocaleString("en", {
                    useGrouping: true,
                  })
                : "150,000"}
            </div>
            {/* <div className="pl-5 text-2xl">
              Tokens Used:{" "}
              {publicMetadata.tokensUsed.toLocaleString("en", {
                useGrouping: true,
              })}
            </div> */}
            {/* <div className="pl-5 text-2xl">
              Max Tokens:{" "}
              {publicMetadata.tokensLimit.toLocaleString("en", {
                useGrouping: true,
              })}
            </div> */}
            <div className="flex flex-row gap-5 pl-3  text-2xl">
              <span className="whitespace-nowrap text-red-600">
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
                {(
                  <Image
                    src="/loonie.png"
                    width={35}
                    height={35}
                    alt={"tokens"}
                    className="mr-1 inline hover:scale-110"
                  />
                ) || "🪙"}
                {publicMetadata.tokensUsed &&
                  `$${(
                    (Number(publicMetadata.tokensUsed) / 1000) *
                    0.002
                  ).toFixed(3)}`}
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

// export const getStaticProps: GetStaticProps = async (context) => {
//   const ssg = generateSSGHelper();

//   const slug = context.params?.slug;

//   if (typeof slug !== "string") throw new Error("no slug");

//   const username = slug.replace("@", "");

//   await ssg.profile.getUserByUsername.prefetch({ username });

//   return {
//     props: {
//       trpcState: ssg.dehydrate(),
//       username,
//     },
//   };
// };

// export const getStaticPaths = () => {
//   return { paths: [], fallback: "blocking" };
// };

export default UserPage;
