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
import { useUser } from "@clerk/nextjs";
import SearchBar from "~/components/search";
import AdminBotView from "~/components/AdminBotView";
import { InfoBox } from "~/components/info";
import AdminUserView from "~/components/AdminUserView";

const BotFeed = (props: { password: string, bots: any }) => {


  if (!props.bots || props.bots.length === 0)
    return (
      <div className="h-screen w-full border-x border-slate-400/50 md:w-[628px]">
        No bots found
      </div>
    );

  // console.log("props.bots", props.bots);

  return (
    <div className="bot-grid">
      {props.bots.map((bot: any) => (
        <div className="p-3">
          {bot.username}
          <AdminBotView
            bot={bot}
            key={bot.username}
            password={props.password}
          />
        </div>
      ))}
    </div>
  );
};


const UserFeed = (props: { password: string, users:any}) => {



  if(!props.users)
  return (
    <div className="w-screen md:w-[672px]">
        <div className="flex h-[340px] items-center justify-center border border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
      </div>
    );
    
    if (!props.users || props.users.length === 0)
    return (
      <div className="h-screen w-full border-x border-slate-400/50 md:w-[628px]">
        No users found
      </div>
    );
    
    // console.log("users", users);
    
    return (
      <div className="user-grid">
      {props.users.map((user: any) => (
        <AdminUserView
        user={user}
        key={user.username}
        password={props.password}
        />
        ))}
    </div>
  );
};




const AdminPage: NextPage<{ password: string }> = ({ password }) => {
  const { user } = useUser();
  const [isUserFeedMinimized, setUserFeedMinimized] = useState(false);
  const [isBotFeedMinimized, setBotFeedMinimized] = useState(false);
const [filterText, setFilterText] = useState("");
const [botFilterText, setBotFilterText] = useState("");

const { data: bots, isLoading: botsLoading } = api.bots.getAllBotsAdmin.useQuery({
  password: password,
});

const { data: users, isLoading } = api.profile.getUsersList.useQuery({
  password: password,
});

  
  if (isLoading || botsLoading) {
    // Handle loading state
    return <LoadingPage />;
  }


  if (
    !user ||
    (user?.username && !user?.username.toLowerCase().includes("kotzer"))
  ) {
    // Handle user not found or unauthorized
    return (
      <PageLayout>
        <div>You are not the admin, go away.</div>
      </PageLayout>
    );
  }

  const toggleUserFeed = () => {
    setUserFeedMinimized((prevValue) => !prevValue);
  };

  const toggleBotFeed = () => {
    setBotFeedMinimized((prevValue) => !prevValue);
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(event.target.value);
  };

  const handleBotFilterChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setBotFilterText(event.target.value);
  };

  const filteredUsers = users && users.filter((user) =>


    (user.emailAddresses[0]?.emailAddress || user.username || "").toLowerCase().includes(filterText.toLowerCase())
  );

    const filteredBots =
      bots &&
      bots.filter((bot) =>
        (bot.bot.username || "").toLowerCase().includes(botFilterText.toLowerCase())
      );

  return (
    <>
      <div className="sticky top-0 z-50 flex h-fit w-full border-x border-b border-slate-400/50 bg-black/80 py-2.5 pl-11 text-2xl font-bold md:top-0 md:border-t">
        Admin{" "}
        <span className="relative ml-auto overflow-visible">
          <SearchBar />
        </span>
      </div>
      <div className="">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold">Users</h2>
          <button
            onClick={toggleUserFeed}
            className="ml-2 text-gray-500 hover:text-gray-700"
          >
            {isUserFeedMinimized ? "Expand" : "Minimize"}
          </button>
          <input
            type="text"
            value={filterText}
            onChange={handleFilterChange}
            placeholder="Filter by name"
            className="ml-5 flex h-8 min-w-[10px] max-w-[150px] rounded-xl border border-slate-400/50 bg-transparent pl-5 outline-none hover:scale-105"
          />
        </div>
        {!isUserFeedMinimized && (
          <UserFeed password={password} users={filteredUsers} />
        )}
      </div>

      {/* BotFeed Section */}
      <div className="">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold">Bots</h2>
          <button
            onClick={toggleBotFeed}
            className="ml-2 text-gray-500 hover:text-gray-700"
          >
            {isBotFeedMinimized ? "Expand" : "Minimize"}
          </button>
          <input
            type="text"
            value={botFilterText}
            onChange={handleBotFilterChange}
            placeholder="Filter by name"
            className="ml-5 flex h-8 min-w-[10px] max-w-[150px] rounded-xl border border-slate-400/50 bg-transparent pl-5 outline-none hover:scale-105"
          />
        </div>
        {!isBotFeedMinimized && (
          <BotFeed password={password} bots={filteredBots} />
        )}
      </div>
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

export default AdminPage;
