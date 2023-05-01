import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { dark } from "@clerk/themes";
import Image from "next/image";

export const Sidebar = () => {
  const { user, isSignedIn, isLoaded } = useUser();

  // console.log("user sidebar test", user);

  return (
    <div className="top-0">
      <div className="height-screen hidden flex-col border-t border-slate-400/50 text-slate-100 md:flex">
        <div className="width-40 w-30 mx-auto">
          <div className=" my-6 mx-5 text-2xl font-bold">
            <Link
              href="/"
              className="block whitespace-nowrap   hover:text-gray-300 "
            >
              <span className="logoTooltip text-2xl hover:scale-105 hover:cursor-default">
                <span className="">
                  <Image
                    src={"/tweetnet.png"}
                    width={85}
                    height={85}
                    alt={"TweetNet"}
                    className="pt-1 hover:cursor-pointer"
                    priority={true}
                  />
                </span>{" "}
                <span className="tooltiptext bg-black">TweetNet</span>
              </span>
            </Link>
          </div>
        </div>

        <div className="flex-grow">
          <div className="flex h-full flex-col justify-between">
            <div className="">
              <div className="menuItems mx-auto w-min">
                <div className="hover:scale105 hover: mx-auto mb-4 rounded-xl px-5 ring-slate-100/90 hover:bg-slate-500/30  ">
                  <Link
                    href="/"
                    className="block whitespace-nowrap py-2 text-center  hover:text-slate-300 "
                  >
                    Home
                  </Link>
                </div>
                {!isSignedIn && (
                  <div className="hover:scale105 hover: mx-auto  mb-4 block whitespace-nowrap rounded-xl px-5 py-2 ring-slate-100/90 hover:bg-slate-500/30 ">
                    <SignInButton mode="modal" />
                  </div>
                )}
                {isSignedIn && (
                  <div className="hover:scale105 mx-auto mb-4 rounded-xl px-5 hover:bg-slate-500/30   ">
                    <Link
                      href={`/mybots/@${
                        (user?.username && user?.username) ||
                        user?.emailAddresses[0]?.emailAddress
                      }`}
                      className="block whitespace-nowrap py-2 hover:scale-105 hover:text-slate-300 "
                    >
                      My Bots
                    </Link>
                  </div>
                )}
              </div>
              <div className=" mb-5 flex">
                {isSignedIn && (
                  <div className="center mx-auto rounded-full ring-slate-400/50 hover:scale-105 hover:ring-2">
                    <UserButton
                      appearance={{
                        baseTheme: dark,
                        elements: {
                          userButtonAvatarBox: { width: 75, height: 75 },
                        },
                      }}
                    />
                  </div>
                )}
              </div>
              {isSignedIn && (
                <div className="mx-auto  border-y border-slate-400/50">
                  <div className="m3 text-center ">
                    Welcome back,
                    <div className="text-center text-2xl">
                      {(user?.username && user?.username) ||
                        user?.emailAddresses[0]?.emailAddress.replace(
                          "@gmail.com",
                          ""
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
