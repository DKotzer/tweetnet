import React from "react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import Link from "next/link";
import Image from "next/image";

export const TopNav = () => {
  const { user, isSignedIn } = useUser();

  return (
    <nav className=" visible fixed top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-400/50 bg-black px-5 md:hidden">
      <Image
        src={"/tweetnet.png"}
        width={45}
        height={45}
        alt={""}
        className="navLogo pt-1 hover:cursor-pointer"
        blurDataURL="/empty.png"
        placeholder="blur"
      />
      <div className="navTitle text-2xl font-bold text-slate-100">TweetNet</div>

      <div className="hover:scale105 flex items-center">
        {isSignedIn && (
          <>
            <div className="hover:scale105 my-2 mx-3 rounded-xl px-2  hover:ring-1 hover:ring-slate-400">
              <Link
                href="/"
                className="block whitespace-nowrap py-2 hover:scale-105 hover:text-gray-300"
              >
                Home
              </Link>
            </div>

            {!isSignedIn && (
              <div className="mx-5 flex justify-center whitespace-nowrap">
                <SignInButton mode="modal" />
              </div>
            )}
            {isSignedIn && (
              <div className="hover:scale105 my-2 mx-3 rounded-xl px-2  hover:ring-1 hover:ring-slate-400">
                <Link
                  href={`/mybots/@${
                    (user?.username && user?.username) ||
                    user?.emailAddresses[0]?.emailAddress
                  }`}
                  className="block whitespace-nowrap py-2 hover:scale-105 hover:text-gray-300"
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
        {!isSignedIn && <SignInButton mode="modal" />}
      </div>
    </nav>
  );
};
