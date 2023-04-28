import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { dark } from "@clerk/themes";

export const Sidebar = () => {
  const { user, isSignedIn } = useUser();

  // console.log("user sidebar test", user);

  return (
    <div className="sticky top-0 h-max ">
      <div className="height-screen hidden flex-col border-l border-t border-slate-400 text-white md:flex">
        <div className="width-40 w-30 mx-auto">
          <div className=" my-6 mx-5 text-2xl font-bold">TweetNet</div>
        </div>

        <div className="flex-grow">
          <div className="flex h-full flex-col justify-between">
            <div className="">
              <div className="menuItems mx-auto w-min">
                <div className="mb-4 w-min rounded-xl px-5 hover:scale-105 hover:ring-1 hover:ring-slate-400">
                  <Link
                    href="/"
                    className="block whitespace-nowrap py-2  hover:text-gray-300 "
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
                  <div className="hover:scale105 mx-auto mb-4 rounded-xl px-5 hover:ring-1  hover:ring-slate-400">
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
              </div>
              <div className=" mb-5 flex">
                {isSignedIn && (
                  <div className="center mx-auto rounded-full ring-slate-400 hover:scale-105 hover:ring-2">
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
                <div className="mx-auto border-y px-5 ">
                  Welcome back,
                  <div className="text-center text-2xl">
                    {(user?.username && user?.username) ||
                      user?.emailAddresses[0]?.emailAddress.replace(
                        "@gmail.com",
                        ""
                      )}
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
