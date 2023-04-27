import type { User } from "@clerk/nextjs/dist/api";
export const filterUserForClient = (user: User) => {
  return {
    id: user.id,
    username:
      user.username || user.emailAddresses[0]?.emailAddress|| user.firstName + "-" + user.lastName || user.firstName,
    profileImageUrl: user.profileImageUrl,
    externalUsername:
      user.externalAccounts.find(
        (externalAccount) => externalAccount.provider === "oauth_github"
      )?.username ||
      user.externalAccounts.find(
        (externalAccount) => externalAccount.provider === "oauth_google"
      )?.username ||
      null,
  };
};
