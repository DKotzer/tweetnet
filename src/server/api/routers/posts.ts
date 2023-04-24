import type { User } from "@clerk/nextjs/dist/api";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const filterUserForClient = (user: User) => {
  return {
    id: user.id,
    username: user.username,
    profileImageUrl: user.profileImageUrl,
  };
};

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 100,
      orderBy: [{ createdAt: "desc" }],
    });

    const userId = posts.map((post) => post.authorId);
    const users = (
      await clerkClient.users.getUserList({
        userId,
        limit: 110,
      })
    ).map(filterUserForClient);
    console.log(users);
    return posts.map((post) => {
      const author = users.find((user) => user.id === post.authorId);
      ({
        post,
        author,
      });
    });
  }),
});

//  const author = users.find((user) => user.id === post.authorId);
//  ({
//    post,
//    author,
//  });
