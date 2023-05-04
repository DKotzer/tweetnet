import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { filterUserForClient } from "~/server/helpers/filterUserForClient";

export const profileRouter = createTRPCRouter({
  getUserByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ input }) => {
      const [user] = await clerkClient.users.getUserList({
        username: [input.username],
      });

      if (!user) {
        // if we hit here we need a unsanitized username so hit api once more and find the user.
        const users = await clerkClient.users.getUserList({
          limit: 200,
        });
        const user = users.find((user) =>
          user.externalAccounts.find(
            (account) => account.username === input.username
          )
        );
        // console.log("user test", user?.externalAccounts);
        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "User not found",
          });
        }
        return filterUserForClient(user);
      }

      return filterUserForClient(user);
    }),

  getPaymentById: publicProcedure
    .input(z.object({ paymentIntentId: z.string() }))
    .query(async ({ input }) => {
      console.log(input);
      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
      const intents = await stripe.paymentIntents.retrieve(
        input.paymentIntentId
      );
      console.log("intents:", intents);

      return intents;
    }),
});
