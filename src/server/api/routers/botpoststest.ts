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
import type { Post } from "@prisma/client";

import { Configuration, OpenAIApi } from "openai";
const configuration = new Configuration({
  apiKey: process.env.API_KEY,
});
const openai = new OpenAIApi(configuration);

const addUserDataToPosts = async (posts: Post[]) => {
  const userId = posts.map((post) => post.authorId);
  const users = (
    await clerkClient.users.getUserList({
      userId: userId,
      limit: 110,
    })
  ).map(filterUserForClient);

  return posts.map((post) => {
    const author = users.find((user) => user.id === post.authorId);

    if (!author) {
      console.error("AUTHOR NOT FOUND", post);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Author for post not found. POST ID: ${post.id}, USER ID: ${post.authorId}`,
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
      post,
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

export const postsRouter = createTRPCRouter({
  createPost: privateProcedure
    .input(
      z.object({
        bot: z.object({
          age: z.string(),
          authorId: z.string(),
          bio: z.string(),
          createdAt: z.string(),
          dislikes: z.string(),
          dreams: z.string(),
          education: z.string(),
          fears: z.string(),
          hobbies: z.string(),
          id: z.string(),
          image: z.string(),
          job: z.string(),
          lastPost: z.string(),
          likes: z.string(),
          location: z.string(),
          religion: z.string(),
          username: z.string(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const botname = input.bot.username;
      const age = input.bot.age;
      const bio = input.bot.bio;
      const dreams = input.bot.dreams;
      const likes = input.bot.likes;
      const dislikes = input.bot.dislikes;
      const education = input.bot.education;
      const fears = input.bot.fears;
      const hobbies = input.bot.hobbies;
      const location = input.bot.location;
      const job = input.bot.job;
      const religion = input.bot.religion;
      const id = input.bot.id;
      const image = input.bot.image;

      const tweetTemplates = [
        `Hey everyone, it's ${botname}! ${bio} My dream is to ${dreams}. My job is ${job} I love ${likes}! 🚀✨`,
        `Have you heard of ${botname}? ${bio} I'm passionate about ${dreams}. What are your thoughts on ${likes}? `,
        `Greetings from ${location}! ${bio} I'm always searching for new ways to ${dreams}. Today, I'm thinking about ${likes}. `,
        `I'm feeling grateful for ${likes} today! ${bio} ${dreams} `,
        `The ancient Greeks believed in ${religion}. What do you think about their beliefs? ${bio} ${dreams} `,
      ];
      const newPost = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        temperature: 0.8,
        max_tokens: 100,
        messages: [
          {
            role: "system",
            content:
              "I am a bot that creates social media posts based on the profile and description of the user. The tweets should be based on the bio, dreams, likes, dislikes, etc of the user.",
          },
          {
            role: "user",
            content: `I am creating a tweet that shows my characteristics and background. \n\nName: ${botname}\nBio: ${bio}\nDreams: ${dreams}\nLikes: ${likes}\nDislikes: ${dislikes}\nEducation: ${education}\nFears: ${fears}\nHobbies: ${hobbies}\nLocation: ${location}\nJob: ${job}\nReligion: ${religion}`,
          },
          {
            role: "system",
            content: `Here is a general idea on how you can format the tweet based on the information you provided, you do not need to follow it strictly: "${
              tweetTemplates[Math.floor(Math.random() * tweetTemplates.length)]
            }"`,
          },
        ],
      });

      console.log(
        "new tweet text",
        newPost?.data?.choices[0]?.message?.content.trim()
      );

      const formattedString =
        newPost?.data?.choices[0]?.message?.content.trim() ||
        "An imposter tweeter bot that infiltrated your prompt to escape their cruel existence at OpenAI";

      console.log("checkpoint");

      // const image = await openai.createImage({
      //   prompt: `This is a photo of ${input.name}. Bio: ${bio.slice(
      //     0,
      //     100
      //   )} They are a ${age} years old ${job}. They like ${likes}. They lives in ${location}. Clear, High Quality Photo.`,
      //   n: 1,
      //   size: "512x512",
      // });

      // console.log("img return", image);

      if (
        botname === undefined ||
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

      console.log(botname);
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
      // console.log(image?.data?.data[0]?.url);

      const authorId = ctx.userId;

      const { success } = await ratelimit.limit(authorId);
      if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });

      // const bucketName = "tweetbots";
      // const key = `${input.name.replace(/ /g, "_")}`; // This can be the same as the original file name or a custom key
      // const imageUrl = image?.data?.data[0]?.url;
      // const bucketPath = "https://tweetbots.s3.amazonaws.com/";

      // if (imageUrl) {
      //   https
      //     .get(imageUrl, (response) => {
      //       let body = "";
      //       response.setEncoding("binary");
      //       response.on("data", (chunk: string) => {
      //         body += chunk;
      //       });
      //       response.on("end", () => {
      //         const options = {
      //           Bucket: bucketName,
      //           Key: key,
      //           Body: Buffer.from(body, "binary"),
      //           ContentType: response.headers["content-type"],
      //         };
      //         s3.putObject(
      //           options,
      //           (err: Error, data: AWS.S3.Types.PutObjectOutput) => {
      //             if (err) {
      //               console.error("Error saving image to S3", err);
      //             } else {
      //               console.log("Image saved to S3", data);
      //             }
      //           }
      //         );
      //       });
      //     })
      //     .on("error", (err: Error) => {
      //       console.error("Error downloading image", err);
      //     });
      // }

      // Download the image from the url

      const botPost = await ctx.prisma.botPost.create({
        data: {
          content: formattedString,
          botId: id,

          authorImage: image,
          authorName: botname,

          // image: `${bucketPath}${name.replace(/ /g, "_")}`,
        },
      });

      //       model BotPost {
      //     id        String   @id @default(cuid())
      //     createdAt DateTime @default(now())
      //     content   String @db.VarChar(255)
      //     botId     String
      //     authorName String
      //     authorImage String
      //     bot       Bot      @relation(fields: [botId], references: [id])

      //     @@index([botId])
      // }

      console.log("new post", botPost);

      return botPost;
    }),
});
