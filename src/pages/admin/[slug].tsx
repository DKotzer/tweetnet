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
import AdminBotView from "~/components/AdminBotView";
import { InfoBox } from "~/components/info";
import AdminUserView from "~/components/AdminUserView";

const BotFeed = (props: { password: string }) => {
  const { data: bots, isLoading } = api.bots.getAllBotsAdmin.useQuery({password: props.password});
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

  if (!bots || bots.length === 0)
    return (
      <div className="h-screen w-full border-x border-slate-400/50 md:w-[628px]">
        No bots found
      </div>
    );

  // console.log("bots", bots);

  return (
    <div className="flex flex-col">
      {bots.map((bot) => (
        <AdminBotView bot={bot} key={bot.bot.username} password={props.password} />
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

const UserFeed = (props: { password: string }) => {
  const { data: users, isLoading } = api.profile.getUsersList.useQuery({password:props.password})

  if (isLoading)
    return (
      <div className="w-screen md:w-[672px]">
        <div className="flex h-[340px] items-center justify-center border-x border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
      </div>
    );

  if (!users || users.length === 0)
    return (
      <div className="h-screen w-full border-x border-slate-400/50 md:w-[628px]">
        No users found
      </div>
    );

  // console.log("users", users);

  return (
    <div className="flex flex-col">
      {users.map((user) => (
        <AdminUserView
          user={user}
          key={user.username}
          password={props.password}
        />
      ))}
    </div>
  );
};






const MyBotsPage: NextPage<{ password: string }> = ({ password }) => {
  
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
      // console.log(publicMetadata) // set the state variable with the publicMetadata value
    };
    if (user) {
      loadPublicMetadata();
    }
  }, [user]);

  if (!user) return <LoadingPage />;

  if (user.username && !user?.username.toLowerCase().includes('kotzer') ) {
    return (
      <PageLayout>
        <div>You are not the admin, go away.</div>
      </PageLayout>
    );
  }


  return (
    <>
      <Head>
        <title>Admin Page</title>
      </Head>
      <PageLayout>
        <div className="flex w-full border-x border-slate-400/50 bg-slate-900/80">
          <div className="flex flex-col w-full justify-center">
            <div className="sticky top-16 z-50 flex h-fit w-full border-x border-b border-slate-400/50 bg-black/80 py-2.5 pl-11 text-2xl font-bold md:top-0 md:border-t">
              {/* {`${
            data?.username?.replace("@gmail.com", "") ??
            data?.externalUsername?.replace("@gmail.com", "") ??
            "unknown"
          }'s`}{" "}
          Bots{" "} */}
              Admin
              <span className="  relative  ml-auto overflow-visible">
                <SearchBar />
              </span>
              <InfoBox password={password} />
            </div>
          </div>
        </div>

        <BotFeed password={password} />
      </PageLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = async (context) => {
  const ssg = generateSSGHelper();

  const password = context.params?.slug;




  return {
    props: {
      trpcState: ssg.dehydrate(),
      password,
    },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default MyBotsPage;
