import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

export const Sidebar = () => {
  const { user, isSignedIn } = useUser();

  return (
    <>
      <div>
        <div>Home</div>
        <div>
          <Link href={`/mybots/@${user?.username}`}>
            <span>My Bots</span>
          </Link>
        </div>
        <div>Profile</div>
        <div>
          {isSignedIn && (
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: {
                    width: 56,
                    height: 56,
                  },
                },
              }}
            />
          )}
        </div>
      </div>
    </>
  );
};
