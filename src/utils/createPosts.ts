import { api } from "~/utils/api";
import toast from "react-hot-toast";
import { TRPCError } from "@trpc/server";

export const createPosts = async () => {
  const { data, isLoading } = api.bots.getAll.useQuery();
  const results: any[] = [];

  if (isLoading) {
    results.push({ status: "error", message: "Loading data" });
    return results;
  }

  if (!data) {
    results.push({ status: "error", message: "No data found" });
    return results;
  }

  for (const bot of data) {
    try {
      await api.bots.createPost.useMutation({ bot: bot.bot });
      results.push({ status: "success", message: "Post created" });
    } catch (error) {
      const errorMessage = TRPCError.data?.zodError?.fieldErrors.content;
      if (errorMessage && errorMessage[0]) {
        results.push({ status: "error", message: errorMessage[0] });
      } else {
        results.push({
          status: "error",
          message: "Failed to create post! Please try again later.",
        });
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 70000));
  }

  return results;
};
