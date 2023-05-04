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

const AccountInfo = (props: {publicMetadata:any}) => {
  return (
    <div className=" border-x border-slate-400/50  bg-slate-600">
      <div className="flex flex-row justify-center gap-5 pl-5 text-2xl">
        <span>
          {" "}
          Used 🪙:{" "}
          {props.publicMetadata.tokensUsed.toLocaleString("en", {
            useGrouping: true,
          })}
        </span>
        <span className="mr-16 hover:scale-105">
          {" "}
          💸
          {`$${(
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
      <button
        className="checkoutButton bg-green-600 hover:scale-95 hover:bg-green-400 "
        id="submit"
      >
        <span id="button-text">Buy Tokens</span>
      </button>
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

const CreateBotsWizard = () => {
  const [input, setInput] = useState("");
  const [name, setName] = useState("");

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

  return (
    <div className="border-x border-t border-b border-slate-400/50">
      <div className="flex w-full flex-col gap-3  ">
        <div className=" bg-slate-600 p-5 backdrop-blur-lg">
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
                className={`bioInput block w-full h-5 max-w-full resize-y bg-transparent outline-none ${
                  input !== "" && "h-[150px]"
                }`}
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

const MyBotsPage: NextPage<{ username: string }> = ({ username }) => {
  const { data, isLoading } = api.profile.getUserByUsername.useQuery({
    username,
  });
  const { user } = useUser();
  const [publicMetadata, setPublicMetadata] = useState<any>(null);
  useEffect(() => {
    const getPublicMetadata = async () => {
      const publicMetadata = user?.publicMetadata;
      return publicMetadata;
    };
    const loadPublicMetadata = async () => {
      const publicMetadata = await getPublicMetadata();
      setPublicMetadata(publicMetadata);
      console.log(publicMetadata) // set the state variable with the publicMetadata value
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
        <div className="flex w-full border-x border-slate-400/50 bg-slate-600">
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
          <div>
            <div className="my-auto p-4 text-3xl font-bold">
              {`${
                data?.username?.replace("@gmail.com", "") ??
                data?.externalUsername?.replace("@gmail.com", "") ??
                "unknown"
              }'s bots`}
            </div>
            <div className="pl-5 text-2xl">
              🪙Tokens:{" "}
              {(
                publicMetadata.tokensLimit - publicMetadata.tokensUsed
              ).toLocaleString("en", {
                useGrouping: true,
              })}
            </div>
            <div className="pl-5 text-2xl">
              Account:{" "}
              {(publicMetadata?.subscribed && "Activated") ||
                "Free Mode"}
            </div>

            {/* <div className="pl-5 text-2xl">
              Tokens Used:{" "}
              {publicMetadata.tokensUsed.toLocaleString("en", {
                useGrouping: true,
              })}
            </div>
            <div className="pl-5 text-2xl">
              Max Tokens:{" "}
              {publicMetadata.tokensLimit.toLocaleString("en", {
                useGrouping: true,
              })}
            </div> */}
          </div>
        </div>
        <AccountInfo publicMetadata={publicMetadata} />

        <CreateBotsWizard />

        <ProfileFeed userId={data.id} />
      </PageLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = async (context) => {
  const ssg = generateSSGHelper();

  const slug = context.params?.slug;

  if (typeof slug !== "string") throw new Error("no slug");

  const username = slug.replace("@", "");

  await ssg.profile.getUserByUsername.prefetch({ username });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      username,
    },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default MyBotsPage;
