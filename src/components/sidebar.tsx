import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

export const Sidebar = () => {
  const { user, isSignedIn } = useUser();

  return (
    <>
      <div className="flex h-full flex-col text-white">
        <div className="width-40 w-30 mx-auto">
          <div className=" my-6 text-2xl font-bold">BotLife</div>
        </div>
        {!isSignedIn && (
          <div className="flex justify-center">
            <SignInButton />
          </div>
        )}
        <div className="flex-grow">
          <div className="flex h-full flex-col justify-between">
            <div className="mx-1">
              <div className="mb-4 px-5">
                <a href="/" className="block py-2 hover:text-gray-300">
                  Home
                </a>
              </div>
              <div className="mx-auto mb-4 px-5">
                <a
                  href={`/mybots/@${user?.username}`}
                  className="block py-2 hover:text-gray-300"
                >
                  My Bots
                </a>
              </div>
              <div className="mx-auto mb-4 px-5">
                <a href="/" className="block py-2 hover:text-gray-300">
                  From you
                </a>
              </div>
              <div className="py-4 px-5">
                {isSignedIn && (
                  <div className="flex items-center">
                    <UserButton
                      appearance={{
                        elements: {
                          userButtonAvatarBox: { width: 56, height: 56 },
                        },
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="border-y px-5">
                Welcome back,
                <div className="text-2xl">{user?.username}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
