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

export const AdminUserView = (props: { user: User; password: string }) => {

  return (
    <div
      className={`flex min-w-fit flex-col border border-slate-400/50 p-6 hover:bg-[#ffffff08] `}
      key={
        props.user.username ||
        (props.user.emailAddresses[0]?.emailAddress &&
          props.user.emailAddresses[0].emailAddress.split("@")[0])
      }
    >
      <Image
        src={props.user.profileImageUrl}
        width={66}
        height={66}
        alt={"Profile Image"}
        className="my-auto self-center rounded-full hover:scale-105 hover:ring"
        quality={80}
      />
      <div className="my-auto flex   ">
        {/* <Link href={`/bot/@${props.user.username}`}> */}

        {/* </Link> */}

        <div className="hoverUnderline my-auto ml-1.5 text-2xl font-bold text-slate-100 hover:scale-105">
          {(props.user.emailAddresses[0]?.emailAddress &&
            props.user.emailAddresses[0].emailAddress.split("@")[0]) ||
            props.user.username}
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
        {(props.user.publicMetadata.tokensLimit &&
          props.user.publicMetadata.tokensUsed &&
          (
            props.user.publicMetadata.tokensLimit -
            props.user.publicMetadata.tokensUsed
          ).toLocaleString("en", {
            useGrouping: true,
          })) ||
          "150,000"}
      </span>
      <span className="mr-3 text-red-700 hover:scale-105">
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
        {(props.user.publicMetadata.tokensUsed &&
          props.user.publicMetadata.tokensUsed.toLocaleString("en", {
            useGrouping: true,
          })) ||
          "0"}
      </span>
      <span>
        💸
        {`$${(
          (Number(props.user.publicMetadata.tokensUsed || 0) / 1000) *
          0.002 *
          2.5
        ).toFixed(2)}`}
      </span>
      <div className="h-1"></div>
    </div>
  );
};

export default AdminUserView;
