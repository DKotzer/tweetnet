import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import Image from "next/image";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { BotView } from "~/components/botview";
import { useUser } from "@clerk/nextjs";
import SearchBar from "~/components/search";

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
      <div className="h-screen w-full border-x border-slate-400/50 md:w-[628px]">
        Create your first bot!
      </div>
    );

  // console.log("bots", data);

  return (
    <div className="flex flex-col">
      {data.map((bot) => (
        <BotView bot={bot} key={bot.bot.username} userId={props.userId} />
      ))}
    </div>
  );
};

const AccountInfo = (props: { publicMetadata: any }) => {
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

  if (botCount > 1 && !props.publicMetadata?.subscribed) {
    return (
      <div>
        <div className="flex w-full flex-col gap-3  ">
          <div className=" border-x border-slate-400/50 bg-slate-900/80 p-5 backdrop-blur-lg">
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
          <div className=" border-x border-slate-400/50 bg-slate-900/80 p-5 backdrop-blur-lg">
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
          <div className=" border-x border-slate-400/50 bg-slate-900/80 p-5 backdrop-blur-lg">
            You are out of tokens, please purchase more to continue tweeting and
            creating bots.
          </div>
        </div>
      </div>
    );
  }

  if (
    props.publicMetadata.tokensLimit - props.publicMetadata.tokensUsed <
    30000
  ) {
    return (
      <div>
        <div className="flex w-full flex-col gap-3  ">
          <div className=" border-x border-slate-400/50 bg-slate-900/80 p-5 backdrop-blur-lg">
            You are running low on tokens, please buy more to create more bots.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-x border-b border-slate-400/50 ">
      <div className="flex w-full flex-col gap-3  ">
        <div className=" bg-slate-900/80 p-5 backdrop-blur-lg  ">
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
                maxLength={15}
                onChange={(e) => setName(e.target.value)}
                // onKeyDown={(e) => {
                //   if (e.key === "Enter") {
                //     e.preventDefault();
                //     if (name !== "" && input !== "") {
                //       mutate({ content: name, name: name });
                //     }
                //   }
                // }}
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
                maxLength={1000}
                onChange={(e) => setInput(e.target.value)}
                // onKeyDown={(e) => {
                //   if (e.key === "Enter") {
                //     e.preventDefault();
                //     if (input !== "" && name !== "") {
                //       mutate({ content: input, name: name });
                //     }
                //   }
                // }}
                disabled={isPosting}
                style={{ resize: "none" }} // Set resize to none to prevent horizontal resize
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mr-5 pt-10 ">
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

      if (publicMetadata && !publicMetadata.tokensLimit) {
      }

      return publicMetadata;
    };
    const loadPublicMetadata = async () => {
      const publicMetadata = await getPublicMetadata();
      setPublicMetadata(publicMetadata);
      // console.log(publicMetadata) // set the state variable with the publicMetadata value
    };
    if (user) {
      loadPublicMetadata();
    }
  }, [user]);

  if (!data || !user) return <LoadingPage />;

  if (data && user && user.id !== data.id) {
    return (
      <PageLayout>
        <div>You can only view the profile of your own account.</div>
      </PageLayout>
    );
  }

  if (isLoading || !publicMetadata) return <LoadingPage />;

  return (
    <>
      <Head>
        <title>{data.username ?? data.externalUsername}</title>
      </Head>
      <PageLayout>
        <div className="flex w-full border-x border-slate-400/50 bg-slate-900/80">
          <div className="flex flex-col justify-center">
            <Link
              href={
                data.id === user?.id
                  ? "/myprofile"
                  : `/user/@${
                      data?.username?.replace("@gmail.com", "") ??
                      data?.externalUsername?.replace("@gmail.com", "")
                    }`
              }
            >
              <Image
                src={data.profileImageUrl}
                alt={`${
                  data.username ?? data.externalUsername ?? "unknown"
                }'s profile pic`}
                width={120}
                height={120}
                className="my-3 ml-4 justify-center rounded-full border-4 border-black bg-black hover:scale-105 hover:border-slate-100/50"
                quality={99}
              />
            </Link>
          </div>
          <div className="pb-2">
            <div className="my-auto p-4 text-3xl font-bold">
              {`${
                data?.username?.replace("@gmail.com", "") ??
                data?.externalUsername?.replace("@gmail.com", "") ??
                "unknown"
              }`}
            </div>
            <div className="pl-3 text-xl">
              <Image
                src="/token.ico"
                width={32}
                height={32}
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
            {/* <div className="pl-5 text-xl">
              Tokens Used:{" "}
              {publicMetadata.tokensUsed.toLocaleString("en", {
                useGrouping: true,
              })}
            </div> */}
            {/* <div className="pl-5 text-xl">
              Max Tokens:{" "}
              {publicMetadata.tokensLimit.toLocaleString("en", {
                useGrouping: true,
              })}
            </div> */}
            <div className="flex flex-row gap-5 pl-3  text-xl">
              {/* <span className="whitespace-nowrap text-red-600">
                {" "}
                {(
                  <Image
                    src="/token.ico"
                    width={32}
                    height={32}
                    alt={"tokens spent"}
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
            <div className="flex flex-row gap-5 pl-3  text-xl">
              {" "}
              <span className="whitespace-nowrap text-red-600">
                {(
                  <Image
                    src="/loonie.png"
                    width={32}
                    height={32}
                    alt={"dollars spent"}
                    className="mr-1 inline hover:scale-110"
                  />
                ) || "🪙"}
                {publicMetadata.tokensUsed &&
                  `$${(
                    (Number(publicMetadata.tokensUsed) / 1000) *
                    0.002 * 2.5
                  ).toFixed(2)}`}
              </span> */}
              {/* <span>
          Max 🪙:{" "}
          {props.publicMetadata.tokensLimit.toLocaleString("en", {
            useGrouping: true,
          })}
        </span> */}
            </div>{" "}
            <div className="flex   pl-5 text-xl">
              Bot Limit: {(publicMetadata?.subscribed && "10") || "2"}
            </div>
            {publicMetadata && user?.id && data.id === user?.id && (
              <Link href={`/myprofile`}>
                <div className="hoverUnderline  flex pl-5 text-xl hover:scale-105">
                  My Account Page
                </div>
              </Link>
            )}
          </div>
        </div>
        <div className="border-x border-slate-400/50 bg-slate-900/80 pt-2">
          <Link href="/pay">
            <button
              className="checkoutButton bg-green-600 hover:scale-95 hover:bg-green-400 "
              id="submit"
            >
              <span id="button-text">Buy Tokens</span>
            </button>
          </Link>
        </div>
        {/* <AccountInfo publicMetadata={publicMetadata} /> */}
        <div className="x-border border-slate-400/50">
          {publicMetadata && user?.id && data.id === user?.id && (
            <CreateBotsWizard
              publicMetadata={publicMetadata}
              userId={data.id}
            />
          )}
        </div>
        <div className="sticky top-16 z-50 flex h-fit w-full border-x border-b border-slate-400/50 bg-black/80 py-2.5 pl-11 text-2xl font-bold md:top-0 md:border-t">
          {/* {`${
            data?.username?.replace("@gmail.com", "") ??
            data?.externalUsername?.replace("@gmail.com", "") ??
            "unknown"
          }'s`}{" "}
          Bots{" "} */}
          My Bots
          <span className="  relative  ml-auto overflow-visible">
            <SearchBar />
          </span>
        </div>
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
