import React from "react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import Link from "next/link";
import Image from "next/image";

export const TopNav = () => {
  const { user, isSignedIn } = useUser();

  return (
    <nav className=" visible fixed top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-400/50 bg-black px-5 md:hidden">
      <Link
        href="/"
        className=" my-auto flex flex-row whitespace-nowrap  hover:text-gray-300 "
      >
        <Image
          src={"https://tweetbots.s3.amazonaws.com/tweetnet.webp"}
          width={45}
          height={45}
          alt={""}
          className="navLogo mr-2 pt-1 hover:cursor-pointer"
          priority={true}
          // placeholder="blur"
        />
        <div className="navTitle my-auto text-2xl font-bold text-slate-100">
          TweetNet
        </div>
      </Link>

      <div className="hover:scale105 flex items-center">
        {isSignedIn && (
          <>
            <div className="hover:scale105 hover: mx-auto   block whitespace-nowrap rounded-xl px-5 py-1 ring-slate-100/90 hover:bg-slate-500/30">
              <Link
                href="/"
                className="block whitespace-nowrap py-1 hover:scale-105 hover:text-gray-300"
              >
                Home
              </Link>
            </div>

            {isSignedIn && (
              <div className="hover:scale105 hover: mx-auto   block whitespace-nowrap rounded-xl px-5 py-1 ring-slate-100/90 hover:bg-slate-500/30">
                <Link
                  href={`/mybots/@${
                    (user?.username && user?.username) ||
                    user?.emailAddresses[0]?.emailAddress
                  }`}
                  className="block whitespace-nowrap py-1 hover:scale-105 hover:text-gray-300"
                >
                  My-Bots
                </Link>
              </div>
            )}
            {/* <div className="mx-3 text-slate-100">
              Welcome back,{" "}
              {(user?.username && user?.username) ||
                user?.emailAddresses[0]?.emailAddress.replace("@gmail.com", "")}
            </div> */}
            <div className="mx-3">
              <UserButton
                appearance={{
                  baseTheme: dark,
                  elements: {
                    userButtonAvatarBox: { width: 40, height: 40 },
                  },
                }}
              />
            </div>
          </>
        )}
        {!isSignedIn && (
          <div className="hover:scale105 hover: mx-auto  block whitespace-nowrap rounded-xl px-5 py-2 ring-slate-100/90 hover:bg-slate-500/30 ">
            <SignInButton mode="modal" />
          </div>
        )}
      </div>
    </nav>
  );
};
