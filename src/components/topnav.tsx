import React from "react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import Link from "next/link";
import Image from "next/image";
import { BiHomeCircle } from "react-icons/bi";
import { TbRobot } from "react-icons/tb";
import { HiOutlineArrowLeftOnRectangle } from "react-icons/hi2";
import {MdOutlineManageAccounts} from "react-icons/md"

export const TopNav = () => {
  const { user, isSignedIn } = useUser();

  return (
    <nav className=" visible fixed top-0 z-10 flex h-16 w-full items-center  overflow-x-hidden border-b border-slate-400/50 bg-black px-5 md:hidden">
      <Link
        href="/"
        className=" my-auto flex flex-row whitespace-nowrap hover:mr-[-50px] hover:text-gray-300 "
      >
        <Image
          src={"https://tweetbots.s3.amazonaws.com/tweetnet.webp"}
          width={45}
          height={45}
          alt={""}
          className="navLogo mr-2  hover:scale-105 hover:cursor-pointer"
          priority={true}
          // placeholder="blur"
        />
        <div className="navTitle z-10 my-auto bg-black pr-3 text-2xl font-bold text-slate-100">
          TweetNet
        </div>
      </Link>

      <div className="flex w-full content-center items-center">
        <div className="hover:scale105 ml-2 flex w-full content-center items-center">
          <div className="hover:scale105  block whitespace-nowrap rounded-xl px-3 py-1 ring-slate-100/90 hover:bg-slate-900/80">
            <Link
              href="/"
              className="flex flex-row whitespace-nowrap py-1 hover:scale-105 hover:text-gray-300"
            >
              <BiHomeCircle className="my-auto mr-1" size={21} />
              Home
            </Link>
          </div>

          {isSignedIn && (
            <div className="hover:scale105   block whitespace-nowrap rounded-xl px-3 py-1 ring-slate-100/90 hover:bg-slate-900/80">
              <Link
                href={`/mybots/@${
                  (user?.username && user?.username) ||
                  user?.emailAddresses[0]?.emailAddress
                }`}
                className="flex flex-row whitespace-nowrap py-1 hover:scale-105 hover:text-gray-300"
              >
                <TbRobot className="my-auto mr-1" size={23} />
                My-Bots
              </Link>
            </div>
          )}
          {/* <div className="mx-3 text-slate-100">
              Welcome back,{" "}
              {(user?.username && user?.username) ||
                user?.emailAddresses[0]?.emailAddress.replace("@gmail.com", "")}
            </div> */}

          {isSignedIn && (
            <div className="ml-auto flex flex-row space-x-3">
              <Link
                href={`/myprofile`}
                className="flex flex-row whitespace-nowrap py-1 hover:scale-105 hover:text-gray-300 hover:bg-slate-900/80 p-3 rounded-full"
              >
                <MdOutlineManageAccounts className="my-auto" size={23} />
              </Link>
              <div className=" rounded-full ring-slate-400/50 hover:scale-105 hover:ring">
                <UserButton
                  appearance={{
                    baseTheme: dark,
                    elements: {
                      userButtonAvatarBox: { width: 40, height: 40 },
                    },
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {!isSignedIn && (
          <div className="ml-auto flex flex-row whitespace-nowrap rounded-xl px-5 py-2 ring-slate-100/90 hover:scale-105 hover:bg-slate-900/80 ">
            <HiOutlineArrowLeftOnRectangle
              className="my-auto mr-1 rotate-180"
              size={21}
            />
            <SignInButton mode="modal" />
          </div>
        )}
      </div>
    </nav>
  );
};
