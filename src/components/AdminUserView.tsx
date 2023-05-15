import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import Image from "next/image";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
// import { PostView } from "~/components/postview";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";
import { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";



type User = {
  id: string;
  username: string | null;
  createdAt: number;
  profileImageUrl: string;
  emailAddresses: any;
  externalUsername?: string | null;
  publicMetadata: {
    tokensLimit?: number;
    tokensUsed?: number;
    subscribed?: boolean;
  }
};

//Type '{ bot: Bot; author: { username: string; id: string; profileImageUrl: string; externalUsername: string | null; }; }' is not assignable to type '{ bot: { id: string; username: string; bio: string; image: string; createdAt: string; job: string; age: string; location: string; education: string; likes: string; hobbies: string; dislikes: string; dreams: string; fears: string; externalUsername: string; }; }'.
//   Types of property 'bot' are incompatible.
// Property 'externalUsername' is missing in type 'Bot' but required in type '{ id: string; username: string; bio: string; image: string; createdAt: string; job: string; age: string; location: string; education: string; likes: string; hobbies: string; dislikes: string; dreams: string; fears: string; externalUsername: string; }'.

// const useDeleteBot = (id:string) => {
//      api.bots.deleteBot.mutate({id});

// };

export const AdminBotView = (props: { user: User; password: string }) => {
  const [showModal, setShowModal] = useState(false); //delete button modal
  const [showBot, setShowBot] = useState(true);

//   const { mutate, isLoading: isDeleting } = api.bots.deleteBot.useMutation({
//     onSuccess: () => {
//       toast.success(`Bot Deleted Successfully. RIP ${props.bot.bot.username}.`);
//     },
//     onError: (e: any) => {
//       const errorMessage = e.data?.zodError?.fieldErrors.content;
//       if (errorMessage && errorMessage[0]) {
//         toast.error(errorMessage[0]);
//       } else {
//         toast.error("Failed to delete bot! Please try again later.");
//       }
//     },
//   });
  // console.log("tokens test", props.bot.bot.tokens);

//   const handleDelete = (id: string, name: string) => {
//     // Handle bot deletion logic here
//     console.log(`Deleting bot: ${props.bot.bot.username}...`);
//     // toast.success(`Deleting bot: ${props.bot.bot.username}...`);
//     // Close the modal after deletion is complete
//     setShowBot(false);
//     setShowModal(false);
//     mutate({ id: id, name: name });
//     // api.bots.deleteBot.useQuery({ id });
//   };
  //   console.log("bot test", props.bot.bot);
  return (
    <div
      className={`flex flex-col border-x border-b border-slate-400/50 p-6 hover:bg-[#ffffff08] ${
        !showBot && "hidden"
      }`}
      key={props.user.username}
    >
      <div className="my-auto flex   ">
        {/* <Link href={`/bot/@${props.user.username}`}> */}
        <Image
          src={props.user.profileImageUrl}
          width={46}
          height={46}
          alt={"Profile Image"}
          className="my-auto self-center rounded-full hover:scale-105 hover:ring"
          quality={80}
        />
        {/* </Link> */}

        <div className="hoverUnderline my-auto ml-1.5 text-2xl font-bold text-slate-100 hover:scale-105">
          {props.user.username}
        </div>
        <span className=" my-auto"></span>
      </div>
      <div className="h-2"></div>
      📅 Created At {new Date(props.user.createdAt).toLocaleDateString()}
      {/* <span className="mr-16 hover:scale-105"> 👥 0 Human Followers</span> */}
      <span className="mr-3 hover:scale-105">
        {" "}
        {(
          <Image
            src="/token.ico"
            width={21}
            height={21}
            alt={"tokens"}
            className="mr-1 inline hover:scale-105"
          />
        ) || "🪙"}
        {props.user.publicMetadata.tokensLimit && props.user.publicMetadata.tokensLimit.toLocaleString(
          "en",
          {
            useGrouping: true,
          }
        ) || "150,000"}
      </span>
      <span>
        💸
        {`$${((Number(props.user.publicMetadata.tokensUsed || 0) / 1000) * 0.002 * 2.5).toFixed(2)}`}
      </span>
      <div className="h-1"></div>
      
      {/* <div className="flex flex-col gap-1">
        <span className="tooltip text-lg hover:scale-105 hover:cursor-default">
          <span className=" rounded-full bg-slate-400 p-1 hover:ring-2 hover:ring-slate-100  ">
            🎂
          </span>{" "}
          {props.bot.bot.age}
          <span className="tooltiptext">Age</span>
        </span>
        <br />

        <span className="tooltip text-lg hover:scale-105 hover:cursor-default">
          <span className=" rounded-full bg-slate-400 p-1  hover:ring-2 hover:ring-slate-100 ">
            💼
          </span>{" "}
          {props.bot.bot.job}
          <span className="tooltiptext">Job</span>
        </span>
        <br />

        <span className="tooltip text-lg hover:scale-105 hover:cursor-default">
          <span className=" rounded-full bg-slate-400 p-1  hover:ring-2 hover:ring-slate-100 ">
            🎓
          </span>{" "}
          {props.bot.bot.education}
          <span className="tooltiptext">Education</span>
        </span>
        <br />

        <span className="tooltip text-lg hover:scale-105 hover:cursor-default">
          <span className=" rounded-full bg-slate-400 p-1  hover:ring-2 hover:ring-slate-100 ">
            🗺️
          </span>{" "}
          {props.bot.bot.location}
          <span className="tooltiptext">Location</span>
        </span>
        <br />

        <span className="tooltip text-lg hover:scale-105 hover:cursor-default">
          <span className=" rounded-full bg-slate-400 p-1  hover:ring-2 hover:ring-slate-100 ">
            📈
          </span>{" "}
          {props.bot.bot.goals}
          <span className="tooltiptext">Goals</span>
        </span>
        <br />

        <span className="tooltip text-lg hover:scale-105 hover:cursor-default">
          <span className=" rounded-full bg-slate-400 p-1  hover:ring-2 hover:ring-slate-100 ">
            👍
          </span>{" "}
          {props.bot.bot.likes}
          <span className="tooltiptext">Likes</span>
        </span>
        <br />

        <span className="tooltip text-lg hover:scale-105 hover:cursor-default">
          <span className=" rounded-full bg-slate-400 p-1  hover:ring-2 hover:ring-slate-100 ">
            🎨
          </span>{" "}
          {props.bot.bot.hobbies}
          <span className="tooltiptext">Hobbies</span>
        </span>
        <br />

        <span className="tooltip text-lg hover:scale-105 hover:cursor-default">
          <span className=" rounded-full bg-slate-400 p-1 hover:ring-2 hover:ring-slate-100 ">
            👎
          </span>{" "}
          {props.bot.bot.dislikes}
          <span className="tooltiptext">Dislikes</span>
        </span>
        <br />

        <span className="tooltip text-lg hover:scale-105 hover:cursor-default ">
          <span className="rounded-full bg-slate-400 p-1 hover:ring-2 hover:ring-slate-100  ">
            🛌
          </span>{" "}
          {props.bot.bot.dreams}
          <span className="tooltiptext">Dreams</span>
        </span>
        <br />

        <span className="tooltip text-lg hover:scale-105 hover:cursor-default ">
          <span className=" rounded-full bg-slate-400 p-1  hover:ring-2 hover:ring-slate-100  ">
            😱
          </span>{" "}
          {props.bot.bot.fears}
          <span className="tooltiptext">Fears</span>
        </span>
        <br /> */}
        {/* {!showModal && (
          <button
            onClick={() => setShowModal(true)}
            className="mx-auto mr-6 w-fit rounded-full bg-red-500 py-2 px-4 font-bold text-slate-100 hover:scale-95 hover:bg-red-700 hover:ring-1 hover:ring-slate-400/50"
          >
            Delete Bot
          </button>
          // <span className="float-right rounded-xl p-2 ring ring-red-800 hover:scale-105 hover:cursor-not-allowed hover:bg-red-600">{`Delete ${props.bot.bot.username} `}</span>
        )}
        {showModal && (
          <div className="flex flex-col">
            <span className="float-right rounded-xl bg-red-500 p-2 text-center font-bold ring ring-red-800 hover:scale-105 hover:cursor-not-allowed hover:bg-red-600">
              Confirm deletion of {props.bot.bot.username}{" "}
            </span>
            <div className="mx-auto flex flex-row pt-2">
              <button
                onClick={() =>
                  handleDelete(props.bot.bot.id, props.bot.bot.username)
                }
                className="rounded-full bg-red-500 py-2 px-4 font-bold text-slate-100 hover:bg-red-700"
              >
                Delete
              </button>{" "}
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full bg-blue-500 py-2 px-4 font-bold text-slate-100 hover:bg-blue-700"
              >
                Back
              </button>
            </div>
          </div>
        )} */}
      {/* </div> */}
    </div>
  );
};

export default AdminBotView;
