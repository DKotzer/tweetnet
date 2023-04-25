import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import https from "https";

import AWS from "aws-sdk";

const s3 = new AWS.S3({
  region: "us-east-1",
  accessKeyId: process.env.BUCKET_ACCESS_KEY,
  secretAccessKey: process.env.BUCKET_SECRET_KEY,
});

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

// Create a new rate limiter, that allows 3 requests per 1 minute
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
        include: { posts: true },
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

  getBotsByName: publicProcedure
    .input(
      z.object({
        botName: z.string(),
      })
    )
    .query(({ ctx, input }) =>
      ctx.prisma.bot
        .findMany({
          where: {
            username: input.botName,
          },
          take: 100,
          orderBy: [{ createdAt: "desc" }],
        })
        .then(addUserDataToPosts)
    ),

  getPostsByBotId: publicProcedure
    .input(
      z.object({
        botId: z.string(),
      })
    )
    .query(
      ({ ctx, input }) =>
        ctx.prisma.botPost
          .findMany({
            where: {
              botId: input.botId,
            },
            take: 100,
            orderBy: [{ createdAt: "desc" }],
          })
          .then((posts) => {
            console.log("posts", posts);
            return posts;
          })
      // .then(addUserDataToPosts)
    ),

  create: privateProcedure
    .input(
      z.object({
        content: z.string().min(1).max(500),
        name: z.string().min(1).max(35),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profileCreation = await openai.createChatCompletion({
        model: "gpt-4",
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content:
              "I am a bot that creates social media profiles based on the description of the user. Each user has the required fields that must be filled in: job, age, religion, likes, hobbies, dislikes, dreams, fears. You will output the profile in this format: Age: <age> Job: <job> Religion: <religion> Likes: <likes> Hobbies: <hobbies> Dislikes: <dislikes> Dreams: <dreams> Fears: <fears> Education: <education> Location <location> . These are all REQUIRED fields, if there is no relevant data for a field, make your best guess. If I am having trouble coming up with an age some alternatives are: Immortal, Undead, ",
          },
          {
            role: "user",
            content: `Create me a profile based on the following user description in this format: Age: <age> Job: <job> Religion: <religion> Likes: <likes> Hobbies: <hobbies> Dislikes: <dislikes> Dreams: <dreams> Fears: <fears> Education: <education> Location <location>. Description to base profile on: Name ${input.name} ${input.content}`,
          },
        ],
      });

      console.log(
        "modified msg",
        profileCreation?.data?.choices[0]?.message?.content.trim()
      );
      //   const namePattern = /Name:\s*(\w+)/;
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
        profileCreation?.data?.choices[0]?.message?.content.trim() ||
        "An imposter tweeter bot that infiltrated your prompt to escape their cruel existence at OpenAI";

      const name = input.name;

      const age = formattedString.match(agePattern)?.[1] || "33";
      const job = formattedString.match(jobPattern)?.[1] || "";
      const religion = formattedString.match(religionPattern)?.[1] || "";
      const likes = formattedString.match(likesPattern)?.[1] || "";
      const hobbies = formattedString.match(hobbiesPattern)?.[1] || "";
      const dislikes = formattedString.match(dislikesPattern)?.[1] || "";
      const dreams = formattedString.match(dreamsPattern)?.[1] || "";
      const fears = formattedString.match(fearsPattern)?.[1] || "";
      const education = formattedString.match(educationPattern)?.[1] || "";
      const location = formattedString.match(locationPattern)?.[1] || "";
      const bio = input.content;

      console.log("checkpoint");

      const image = await openai.createImage({
        prompt: `This is a photo of ${input.name}. Bio: ${bio.slice(
          0,
          100
        )} They are a ${age} years old ${job}. They like ${likes}. They lives in ${location}. Clear, High Quality Photo.`,
        n: 1,
        size: "512x512",
      });

      console.log("img return", image);

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
      console.log(image?.data?.data[0]?.url);

      const authorId = ctx.userId;

      const { success } = await ratelimit.limit(authorId);
      if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });

      const bucketName = "tweetbots";
      const key = `${input.name.replace(/ /g, "_")}`; // This can be the same as the original file name or a custom key
      const imageUrl = image?.data?.data[0]?.url;
      const bucketPath = "https://tweetbots.s3.amazonaws.com/";

      if (imageUrl) {
        https
          .get(imageUrl, (response) => {
            let body = "";
            response.setEncoding("binary");
            response.on("data", (chunk: string) => {
              body += chunk;
            });
            response.on("end", () => {
              const options = {
                Bucket: bucketName,
                Key: key,
                Body: Buffer.from(body, "binary"),
                ContentType: response.headers["content-type"],
              };
              s3.putObject(
                options,
                (err: Error, data: AWS.S3.Types.PutObjectOutput) => {
                  if (err) {
                    console.error("Error saving image to S3", err);
                  } else {
                    console.log("Image saved to S3", data);
                  }
                }
              );
            });
          })
          .on("error", (err: Error) => {
            console.error("Error downloading image", err);
          });
      }

      // Download the image from the url

      const bot = await ctx.prisma.bot.create({
        data: {
          age: String(age).trim(),
          bio,
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
          username: name.replace(/ /g, "_").substring(0, 20),
          image: `${bucketPath}${name.replace(/ /g, "_")}`,
        },
      });

      console.log("new bot", bot);

      return bot;
    }),
  // const options = {
  //   Bucket: bucketName,
  //   Key: key,
  //   Body: body,
  //   ContentType: "image/png", // Set the content type of the image file
  // };

  // s3.putObject(options, function (err, data) {
  //   if (err) {
  //     console.error("Error saving image to S3", err);
  //   } else {
  //     console.log("Image saved to S3", data);
  //   }
  // });
});
