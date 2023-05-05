import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { users } from "@clerk/clerk-sdk-node";


import { createTRPCRouter, privateProcedure, publicProcedure } from "~/server/api/trpc";
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
      // console.log(input);
      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
      const intents = await stripe.paymentIntents.retrieve(
        input.paymentIntentId
      );
      // console.log("intents:", intents);

      return intents;
    }),

  savePayment: privateProcedure
    .input(
    z.object({
      stripeId: z.string(),
      amount: z.number(),
      status: z.string(),
      secret: z.string(),
      receiptEmail: z.string(),
      authorId: z.string(),
      tokensBought: z.number(),
      currency: z.string(),
    })
  ).mutation(async ({ ctx, input }) => {

    const {
      stripeId,
      amount,
      status,
      secret,
      receiptEmail,
      authorId,
      tokensBought,
      currency,
    } = input;

    if(ctx.userId !== authorId){
      console.log("user id mismatch, cancelling payment creation");
      return;
    }

    const existingPayment = await ctx.prisma.payment.findUnique({
      where: {
        stripeId,
      },
    });

    if (existingPayment) {
      return existingPayment;
    }

    const payment = await ctx.prisma.payment.create({
      data: {
        stripeId,
        amount,
        status,
        secret,
        receiptEmail,
        authorId,
        tokensBought,
        currency,
      },
    });

    if(status==="success"){
          const user = await users.getUser(ctx.userId);
          if (!user) {
            console.log("no user cancelling token addition");
            return;
          }
          //if user has no tokens used yet (first bot), set tokens to 0
          if (!user.publicMetadata.tokensLimit) {
            console.log("no token limit found on account, setting to 150000");
            await users.updateUser(authorId, {
              publicMetadata: {
                ...user.publicMetadata,
                tokensLimit: 1150000,
                tokensUsed: 0,
              },
            });
          } else {
             if (user.publicMetadata.tokensLimit) {
               console.log(
                 ` limit found on account: ${user.publicMetadata.tokensLimit}, adding 1,000,000`
               );
               await users.updateUser(authorId, {
                 publicMetadata: {
                   ...user.publicMetadata,
                   subscribed: true,
                   tokensLimit:
                     Number(user.publicMetadata.tokensLimit) + 1000000,
                 },
               });
             }
          }
    }

    return payment;
  })
});
