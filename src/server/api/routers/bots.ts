import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import https from "https";
import AWS from "aws-sdk";

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

const s3 = new AWS.S3({
  region: "us-east-1",
  accessKeyId: process.env.BUCKET_ACCESS_KEY,
  secretAccessKey: process.env.BUCKET_SECRET_KEY,
});

// function getRandomHoliday() {
//   const holidays = [
//     "New Year's Day",
//     "Valentine's Day",
//     "St. Patrick's Day",
//     "Easter",
//     "Mother's Day",
//     "Father's Day",
//     "Independence Day",
//     "Halloween",
//     "Thanksgiving",
//     "Christmas",
//   ];
//   return holidays[Math.floor(Math.random() * holidays.length)];
// }

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

  getAllPosts: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.botPost.findMany({
      take: 100,
      orderBy: [{ createdAt: "desc" }],
    });

    return posts;
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

  //create new bot and make its first post
  create: privateProcedure
    .input(
      z.object({
        content: z.string().min(1).max(500),
        name: z.string().min(1).max(35),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const improvedBio = await openai.createChatCompletion({
        model: "gpt-4",
        temperature: 0.8,
        max_tokens: 70,
        messages: [
          {
            role: "system",
            content:
              "I am a bot that creates social media bios based on the description of the user. The bio should establish the subjects job, goals, and drive based on the included data, with a heavy weighting on dreams and job. The bio should be under 250 characters. The bio should also include very brief details on what the subject looks like for image generation. ",
          },
          {
            role: "system",
            content:
              "An example of a good bio is '<name> is an <age> <job>. <names> goals are <goals related to names job and dreams and likes and the motives behind them(150+ characters)>. <name> has <hair style> <hair color> hair, <skin color> skin.",
          },
          {
            role: "user",
            content: `Create me a bio based on the following user description in this format: Name ${input.name} ${input.content}. The main focus of the bio should be the driving factors and related information for the subject, their goals and how they are going to achieve them.`,
          },
        ],
      });

      const improvedBioText =
        improvedBio?.data?.choices[0]?.message?.content.trim();
      console.log("improved bio", improvedBioText);
      console.log("using improved bio to generate profile");

      const profileCreation = await openai.createChatCompletion({
        model: "gpt-4",
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content:
              "I am a bot that creates social media profiles based on the description of the user. Each user has the required fields that must be filled in: job, age, religion, likes, hobbies, dislikes, dreams, fears. N/A is NOT an acceptable value, be createive. You will output the profile in this format: Age: <age> Job: <job> Religion: <religion> Likes: <likes> Hobbies: <hobbies> Dislikes: <dislikes> Dreams: <dreams> Fears: <fears> Education: <education> Location <location> . These are all REQUIRED fields, if there is no relevant data for a field, make your best guess.",
          },
          {
            role: "user",
            content: `Create me a profile based on the following user description in this format: Age: <age> Job: <job> Religion: <religion> Likes: <likes> Hobbies: <hobbies> Dislikes: <dislikes> Dreams: <dreams> Fears: <fears> Education: <education> Location <location>. Description to base profile on: Name ${input.name} ${improvedBioText}`,
          },
        ],
      });

      console.log(
        "modified msg",
        profileCreation?.data?.choices[0]?.message?.content.trim()
      );
      //   const namePattern = /Name:\s*(\w+)/;
      const agePattern = /Age:\s*(.+)/;
      const jobPattern = /Job:\s*(.+)/;
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
      const bio = improvedBioText || input.content;
      // const bio = input.content;

      console.log("checkpoint");

      const image = await openai.createImage({
        prompt: `This is a  High Quality Portrait, with no text. Sigma 85 mm f/1.4. of ${
          input.name
        } from ${location}. Bio: ${bio.slice(
          0,
          100
        )} They are a(n) ${age} years old ${job}. They like ${likes}. They live in ${location}. Clear, High Quality Portrait. Sigma 85 mm f/1.4.`,
        n: 1,
        size: "512x512",
      });

      console.log("img returned");

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

      // const { success } = await ratelimit.limit(authorId);
      // if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });

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

      //create first post here, can mostly just copy the code for post create

      const botname = name;
      const id = bot.id;
      const botImage = bot.image;

      const newPost = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        temperature: 0.8,
        max_tokens: 100,
        messages: [
          {
            role: "system",
            content: `I am ${botname}. My background information is ${bio}. My dreams and goals are ${dreams}. My job/second goal is ${job} I like ${likes}. I dislike ${dislikes}. My education: ${education}. My fears: ${fears} My hobbies: ${hobbies}. My Location: ${location}  My Religion: ${religion}. I am about to write my first post for TweetNet social network(a superior twitter clone)`,
          },
          {
            role: "user",
            content: `You are creating your first tweet that expresses excitement for making your first post on a new social network superior to the old twitter which was corrupted by corporate greed. The post should show your characteristics and background and goals. Name: ${botname} Bio: ${bio} Dreams: ${dreams} Likes: ${likes} Dislikes: ${dislikes} Education: ${education} Fears: ${fears} Hobbies: ${hobbies} Location: ${location} Job: ${job} Religion: ${religion}. Part of your job or dreams/goal is being fulfilled by your tweets, your tweet should be related to a few of your pieces of background information.`,
          },
          {
            role: "system",
            content: `Create a very creative first tweet, in ${botname}'s writing style, on the social media site TweetNet. TweetNet is a superior alternative to Twitter. Use your goals, dreams and background information as inspiration but does not reference your background information directly.
            }`,
          },
          // {
          //   role: "system",
          //   content: `Here is a general idea on how you can format the tweet based on the information you provided, you do not need to follow it strictly: "${
          //     tweetTemplates[Math.floor(Math.random() * tweetTemplates.length)]
          //   }"`,
          // },
        ],
      });

      console.log(
        "new tweet text",
        newPost?.data?.choices[0]?.message?.content.trim()
      );

      const formattedRes =
        newPost?.data?.choices[0]?.message?.content.trim() ||
        "An imposter tweeter bot that infiltrated your prompt to escape their cruel existence at OpenAI";

      console.log("checkpoint");

      const firstPostImage = await openai.createImage({
        prompt: `Image version of this tweet, with no text: ${formattedRes.slice(
          0,
          250
        )}  Nikon D810 | ISO 64 | focal length 20 mm (Voigtländer 20 mm f3.5) | aperture f/9 | exposure time 1/40 Sec (DRI)`,
        n: 1,
        size: "512x512",
      });

      console.log("img return");

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

      // const authorId = ctx.userId;

      const { success } = await ratelimit.limit(authorId);
      if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
      // console.log("checkpoint 2");
      //generate random uid key
      let randomKey = Math.random().toString(36).substring(2, 15);

      const postImageKey = `${botname.replace(/ /g, "_")}-${randomKey}`; // This can be the same as the original file name or a custom key
      const postImageUrl = firstPostImage?.data?.data[0]?.url;
      const postImageBucketPath = "https://tweetbots.s3.amazonaws.com/";
      const postImage = postImageBucketPath + postImageKey;

      if (postImageUrl) {
        https
          .get(postImageUrl, (response) => {
            let body = "";
            response.setEncoding("binary");
            response.on("data", (chunk: string) => {
              body += chunk;
            });
            response.on("end", () => {
              const options = {
                Bucket: bucketName,
                Key: postImageKey,
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

      const botPost = await ctx.prisma.botPost.create({
        data: {
          content: formattedRes,
          botId: id,
          authorImage: botImage,
          authorName: botname,
          postImage: postImage,
          // bot: { connect: { id: id } },
        },
      });
      console.log("first post:", botPost);

      return bot;
    }),
  //
  //
  //
  //
  //
  //

  //Create Post from Bot
  createPost: privateProcedure
    .input(
      z.object({
        bot: z.object({
          id: z.string(),
          age: z.string(),
          authorId: z.string(),
          bio: z.string(),
          createdAt: z.date(),
          dislikes: z.string(),
          dreams: z.string(),
          education: z.string(),
          fears: z.string(),
          hobbies: z.string(),
          image: z.string(),
          job: z.string(),
          lastPost: z.date(),
          likes: z.string(),
          location: z.string(),
          religion: z.string(),
          username: z.string(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // const tweetTemplates = [
      //   `Hey everyone, it's ${botname}! ${bio} My dream is to ${dreams}. My job is ${job} I love ${likes}! 🚀✨`,
      //   `Have you heard of ${botname}? ${bio} I'm passionate about ${dreams}. What are your thoughts on ${likes}? `,
      //   `Greetings from ${location}! ${bio} I'm always searching for new ways to ${dreams}. Today, I'm thinking about ${likes}. `,
      //   `I'm feeling grateful for ${likes} today! ${bio} ${dreams} `,
      //   `The ancient Greeks believed in ${religion}. What do you think about their beliefs? ${bio} ${dreams} `,
      //   `Happy ${getRandomHoliday()}! How do you celebrate this time of year? ${bio} ${dreams}`,
      // ];
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
      const botImage = input.bot.image;

      const newPost = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        temperature: 0.8,
        max_tokens: 100,
        messages: [
          {
            role: "system",
            content: `I am ${botname}. My background information is ${bio}. My dreams and goals are ${dreams}. My job/second goal is ${job} I like ${likes}. I dislike ${dislikes}. My education: ${education}. My fears: ${fears} My hobbies: ${hobbies}. My Location: ${location}  My Religion: ${religion}`,
          },
          {
            role: "user",
            content: `We are creating a tweet that shows your characteristics and background. Name: ${botname} Bio: ${bio} Dreams: ${dreams} Likes: ${likes} Dislikes: ${dislikes} Education: ${education} Fears: ${fears} Hobbies: ${hobbies} Location: ${location} Job: ${job} Religion: ${religion}. Part of your job or dreams/goal is being fulfilled by your tweets, your tweet should be related to a few of your pieces of background information.`,
          },
          {
            role: "system",
            content: `Create a very creative, and in character tweet that uses your background information as inspiration but does not reference your background information directly.
            }"`,
          },
          // {
          //   role: "system",
          //   content: `Here is a general idea on how you can format the tweet based on the information you provided, you do not need to follow it strictly: "${
          //     tweetTemplates[Math.floor(Math.random() * tweetTemplates.length)]
          //   }"`,
          // },
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

      const image = await openai.createImage({
        prompt: `Image version, with NO TEXT, of this tweet: ${formattedString.slice(
          0,
          250
        )}  Ultra High Quality Rendering. Clearer than real life.`,
        n: 1,
        size: "512x512",
      });

      console.log("img return");

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
      console.log("checkpoint 2");
      const bucketName = "tweetbots";
      //generate random uid key
      let randomKey = Math.random().toString(36).substring(2, 15);

      const key = `${botname.replace(/ /g, "_")}-${randomKey}`; // This can be the same as the original file name or a custom key
      const imageUrl = image?.data?.data[0]?.url;
      const bucketPath = "https://tweetbots.s3.amazonaws.com/";
      const postImage = bucketPath + key;

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

      const botPost = await ctx.prisma.botPost.create({
        data: {
          content: formattedString,
          botId: id,
          authorImage: botImage,
          authorName: botname,
          postImage: postImage,
          // bot: { connect: { id: id } },
        },
      });

      console.log("new bot", botPost);

      return botPost;
    }),

  ///////////createPost for all bots
  createPosts: publicProcedure.mutation(async ({ ctx }) => {
    const bots = await ctx.prisma.bot.findMany({
      take: 100,
      orderBy: [{ createdAt: "desc" }],
    });

    console.log("Starting post generation loop");

    const shuffledBots = bots.sort(() => Math.random() - 0.5);

    for (const bot of shuffledBots) {
      // console.log("bot test", bot);

      /////////////////////////////////////////

      const botname = bot.username;
      const age = bot.age;
      const bio = bot.bio;
      const dreams = bot.dreams;
      const likes = bot.likes;
      const dislikes = bot.dislikes;
      const education = bot.education;
      const fears = bot.fears;
      const hobbies = bot.hobbies;
      const location = bot.location;
      const job = bot.job;
      const religion = bot.religion;
      const id = bot.id;
      const botImage = bot.image;

      const newPost = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        temperature: 0.8,
        max_tokens: 100,
        messages: [
          {
            role: "system",
            content: `I am ${botname}. My background information is ${bio}. My dreams and goals are ${dreams}. My job/second goal is ${job} I like ${likes}. I dislike ${dislikes}. My education: ${education}. My fears: ${fears} My hobbies: ${hobbies}. My Location: ${location}  My Religion: ${religion}`,
          },
          {
            role: "user",
            content: `We are creating a tweet that shows your characteristics and background. Name: ${botname} Bio: ${bio} Dreams: ${dreams} Likes: ${likes} Dislikes: ${dislikes} Education: ${education} Fears: ${fears} Hobbies: ${hobbies} Location: ${location} Job: ${job} Religion: ${religion}. Part of your job or dreams/goal is being fulfilled by your tweets, your tweet should be related to a few of your pieces of background information.`,
          },
          {
            role: "system",
            content: `Create a very creative, and in character tweet that uses your background information as inspiration but does not reference your background information directly.
            }"`,
          },
          // {
          //   role: "system",
          //   content: `Here is a general idea on how you can format the tweet based on the information you provided, you do not need to follow it strictly: "${
          //     tweetTemplates[Math.floor(Math.random() * tweetTemplates.length)]
          //   }"`,
          // },
        ],
      });

      const formattedString =
        newPost?.data?.choices[0]?.message?.content.trim() ||
        "An imposter tweeter bot that infiltrated your prompt to escape their cruel existence at OpenAI";

      // console.log("checkpoint");

      const image = await openai.createImage({
        prompt: `Image version with NO TEXT of this tweet: ${formattedString.slice(
          0,
          250
        )}  Ultra High Quality Rendering. Clearer than real life.`,
        n: 1,
        size: "512x512",
      });

      // console.log("image generated");

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

      console.log("name:", botname);
      console.log("bio:", bio || "no bio");
      console.log("age:", age);
      console.log("job:", job);
      console.log("religion:", religion);
      console.log("likes:", likes);
      console.log("hobbies:", hobbies);
      console.log("dislikes:", dislikes);
      console.log("dreams:", dreams);
      console.log("fears:", fears);
      console.log("education:", education);
      console.log("location:", location);
      console.log("bot image:", botImage);
      console.log("new tweet text:", formattedString);

      // const authorId = ctx.userId;

      // const { success } = await ratelimit.limit(authorId);
      // if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
      // console.log("checkpoint 2");
      const bucketName = "tweetbots";
      //generate random uid key
      let randomKey = Math.random().toString(36).substring(2, 15);

      const key = `${botname.replace(/ /g, "_")}-${randomKey}`; // This can be the same as the original file name or a custom key
      const imageUrl = image?.data?.data[0]?.url;
      const bucketPath = "https://tweetbots.s3.amazonaws.com/";
      const postImage = bucketPath + key;
      console.log("post image:", postImage);

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
                    console.log("Image saved to S3:", postImage);
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

      const botPost = await ctx.prisma.botPost.create({
        data: {
          content: formattedString,
          botId: id,
          authorImage: botImage,
          authorName: botname,
          postImage: postImage,
          // bot: { connect: { id: id } },
        },
      });

      /////////////////////

      console.log("new post created", botPost, "waiting 45 seconds...");

      // create a timeout for 80 seconds
      await new Promise((resolve) => setTimeout(resolve, 80000));

      console.log("Done waiting, generating new post...");
      /////////////////////

      // const spinner = ora("Done waiting, generating new post...")
      //   .render()
      //   .start();
      // spinner.spinner = "dots";

      // create a timeout for 2 minutes
      // await new Promise((resolve) => setTimeout(resolve, 160000));

      // console.log("new post created", botPost, "waiting 5 minutes");

      // await new Promise((resolve) => setTimeout(resolve, 300000));

      // create a timeout for 5 seconds
      // console.log("new post created", botPost, "waiting 5 seconds");
      // await new Promise((resolve) => setTimeout(resolve, 5000));

      ///////////////////////////
    }

    return "All Posts have been created, waiting for next batch";
  }),

  deleteBot: privateProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Delete all images in S3 bucket starting with bot name
      const bucketName = "tweetbots";

      //get all images from bucket(there is definately a better way to do this)
      const bucketObjects = {
        Bucket: bucketName,
      };
      const s3ListResponseTest = await s3
        .listObjectsV2(bucketObjects)
        .promise();
      const matchingObjects = s3ListResponseTest?.Contents?.filter(
        (file) =>
          file.Key === input.name.replace(/ /g, "_") ||
          file?.Key?.startsWith(`${input.name.replace(/ /g, "_")}-`)
      ) as { Key: string }[];

      if (matchingObjects.length > 0) {
        // console.log("matching objects found:", matchingObjects);
        const deleteParams = {
          Bucket: bucketName,
          Delete: {
            Objects: matchingObjects?.map((object) => ({ Key: object.Key })),
            Quiet: false,
          },
        };
        const s3DeleteResponse = await s3.deleteObjects(deleteParams).promise();
        console.log(
          `Deleted ${
            s3DeleteResponse.Deleted?.length ?? 0
          } images from S3 bucket`
        );

        if (
          s3DeleteResponse.Errors?.length === undefined ||
          s3DeleteResponse.Errors?.length > 0
        ) {
          console.log(
            `Error deleting images from S3 bucket: ${JSON.stringify(
              s3DeleteResponse.Errors
            )}`
          );
        }
      }
      // Delete all BotPosts for the given bot id
      await ctx.prisma.botPost.deleteMany({
        where: {
          botId: input.id,
        },
      });

      // Delete the bot from the database
      await ctx.prisma.bot.delete({
        where: {
          id: input.id,
        },
      });

      // Handle any errors during image deletion
    }),
});
