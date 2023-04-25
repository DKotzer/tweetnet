import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis";
import { filterUserForClient } from "~/server/helpers/filterUserForClient";
import type { Bot } from "@prisma/client";

import { Configuration, OpenAIApi } from "openai";
const configuration = new Configuration({
  apiKey: process.env.API_KEY,
});
const openai = new OpenAIApi(configuration);

const addUserDataToPosts = async (bots: Bot[]) => {
  const userId = bots.map((bot) => bot.authorId);
  const users = (
    await clerkClient.users.getUserList({
      userId: userId,
      limit: 110,
    })
  ).map(filterUserForClient);

  return bots.map((bot) => {
    const author = users.find((user) => user.id === bot.authorId);

    if (!author) {
      console.error("AUTHOR NOT FOUND", bot);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Author for post not found. POST ID: ${bot.id}, USER ID: ${bot.authorId}`,
      });
    }
    if (!author.username) {
      // user the ExternalUsername
      if (!author.externalUsername) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Author has no GitHub Account: ${author.id}`,
        });
      }
      author.username = author.externalUsername;
    }
    return {
      bot,
      author: {
        ...author,
        username: author.username ?? "(username not found)",
      },
    };
  });
};

// Create a new ratelimiter, that allows 3 requests per 1 minute
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
});

export const botsRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const bot = await ctx.prisma.bot.findUnique({
        where: { id: input.id },
      });

      if (!bot) throw new TRPCError({ code: "NOT_FOUND" });

      return (await addUserDataToPosts([bot]))[0];
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const bots = await ctx.prisma.bot.findMany({
      take: 100,
      orderBy: [{ createdAt: "desc" }],
    });

    return addUserDataToPosts(bots);
  }),

  getBotsByUserId: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(({ ctx, input }) =>
      ctx.prisma.bot
        .findMany({
          where: {
            authorId: input.userId,
          },
          take: 100,
          orderBy: [{ createdAt: "desc" }],
        })
        .then(addUserDataToPosts)
    ),

  create: privateProcedure
    .input(
      z.object({
        content: z.string().min(1).max(280),
      })
    )
    .mutation(async ({ ctx, input}) => {
      const profileCreation = await openai.createChatCompletion({
        model: "gpt-4",
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content:
              "I am a bot that creates social media profiles based on the description of the user. Each user has the required fields that must be filled in: job, age, religion, likes, hobbies, dislikes, dreams, fears. You will output the profile in this format: Name: <name> Age: <age> Job: <job> Religion: <religion> Likes: <likes> Hobbies: <hobbies> Dislikes: <dislikes> Dreams: <dreams> Fears: <fears> Education: <education> Location <location> . These are all REQUIRED fields, if there is no relevant data for a field, make your best guess.",
          },
          {
            role: "user",
            content: `Create me a profile based on the following user description in this format: Name: <name> Age: <age> Job: <job> Religion: <religion> Likes: <likes> Hobbies: <hobbies> Dislikes: <dislikes> Dreams: <dreams> Fears: <fears> Education: <education> Location <location>. Description to base profile on: ${input.content}`,
          },
        ],
      });
      console.log("modified msg", profileCreation?.data);
      const namePattern = /Name:\s*(\w+)/;
      const agePattern = /Age:\s*(\d+)/;
      const jobPattern = /Job:\s*(\w+)/;
      const religionPattern = /Religion:\s*(.+)/;
      const likesPattern = /Likes:\s*(.+)/;
      const hobbiesPattern = /Hobbies:\s*(.+)/;
      const dislikesPattern = /Dislikes:\s*(.+)/;
      const dreamsPattern = /Dreams:\s*(.+)/;
      const fearsPattern = /Fears:\s*(.+)/;
      const educationPattern = /Education:\s*(.+)/;
      const locationPattern = /Location:\s*(.+)/;

      const formattedString =
        profileCreation?.data?.choices[0]?.message?.content.trim() || "bob";

      const name = formattedString.match(namePattern)?.[1];
      const age = String(formattedString.match(agePattern)?.[1] || "33");
      const job = formattedString.match(jobPattern)?.[1];
      const religion = formattedString.match(religionPattern)?.[1];
      const likes = formattedString.match(likesPattern)?.[1];
      const hobbies = formattedString.match(hobbiesPattern)?.[1];
      const dislikes = formattedString.match(dislikesPattern)?.[1];
      const dreams = formattedString.match(dreamsPattern)?.[1];
      const fears = formattedString.match(fearsPattern)?.[1];
      const education = formattedString.match(educationPattern)?.[1];
      const location = formattedString.match(locationPattern)?.[1];
      const bio = formattedString;

      if (
        name === undefined ||
        age === undefined ||
        job === undefined ||
        religion === undefined ||
        likes === undefined ||
        hobbies === undefined ||
        dislikes === undefined ||
        dreams === undefined ||
        fears === undefined ||
        education === undefined ||
        location === undefined
      ) {
        console.error("One or more variables are missing");
        return;
      }

      console.log(name);
      console.log(age);
      console.log(job);
      console.log(religion);
      console.log(likes);
      console.log(hobbies);
      console.log(dislikes);
      console.log(dreams);
      console.log(fears);
      console.log(education);
      console.log(location);

      const authorId = ctx.userId;

      const { success } = await ratelimit.limit(authorId);
      if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });

      const bot = await ctx.prisma.bot.create({
        data: {
          age: String(age).trim(),
          bio: input.content,
          job,
          authorId,
          religion,
          location,
          education,
          likes,
          hobbies,
          dislikes,
          dreams,
          fears,
          username: name,
          image: "/default.webp",
        },
      });

      return bot;
    }),
});
