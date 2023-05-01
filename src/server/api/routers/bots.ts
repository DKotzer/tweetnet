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

function getRandomHoliday() {
  const holidays = [
    "New Year's Day",
    "Valentine's Day",
    "St. Patrick's Day",
    "Easter",
    "Mother's Day",
    "Father's Day",
    "Independence Day",
    "Halloween",
    "Thanksgiving",
    "Christmas",
    "Eid",
    "Hanukkah",
    "Kwanzaa",
    "Diwali",
    "Chinese New Year",
    "Cinco de Mayo",
    "Columbus Day",
    "Earth Day",
    "Good Friday",
    "Labor Day",
    "Martin Luther King Jr. Day",
    "Memorial Day",
    "Presidents' Day",
    "Rosh Hashanah",
    "Yom Kippur",
    "Passover",
    "Ramadan",
    "Mardi Gras",
    "Veterans Day",
    "Groundhog Day",
    "Boxing Day",
    "April Fools' Day",
    "Juneteenth",
    "Indigenous Peoples' Day",
  ];
  return holidays[Math.floor(Math.random() * holidays.length)];
}

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

  getPostById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.prisma.botPost.findUnique({
        where: { id: input.id },
      });

      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      // console.log("found post:", post);

      return post;
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
            // console.log("posts", posts);
            return posts;
          })
      // .then(addUserDataToPosts)
    ),

  getRepliesByPostId: publicProcedure
    .input(
      z.object({
        ogPostId: z.string(),
      })
    )
    .query(
      ({ ctx, input }) =>
        ctx.prisma.botPost
          .findMany({
            where: {
              originalPostId: input.ogPostId,
            },
            take: 100,
            orderBy: [{ createdAt: "desc" }],
          })
          .then((posts) => {
            // console.log("posts", posts);
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
        max_tokens: 85,
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
            content: `Create me a bio based on the following user description in this format: Name ${input.name} ${input.content}. The main focus of the bio should be the driving factors and related information for the subject, their goals and how they are going to achieve them. Do not surround your response in quotes.`,
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
            content: `Create me a profile based on the following user description in this format: Age: <age> Job: <job> Religion: <religion> Likes: <likes> Hobbies: <hobbies> Dislikes: <dislikes> Dreams: <dreams> Fears: <fears> Education: <education> Location <location>. Description to base profile on: Name ${input.name} ${improvedBioText}. Do not surround your post in quotes.`,
          },
        ],
      });

      console.log(
        "profile creation string generated:",
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

      // console.log("checkpoint");

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

      // console.log("img returned");

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

      console.log("name", name);
      console.log("age", age);
      console.log("job", job);
      console.log("religion", religion);
      console.log("likes", likes);
      console.log("hobbies", hobbies);
      console.log("dislikes", dislikes);
      console.log("dreams", dreams);
      console.log("fears", fears);
      console.log("education", education);
      console.log("location", location);
      console.log("image URL", image?.data?.data[0]?.url);
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
        max_tokens: 150,
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
            content: `Create a very creative first tweet, in ${botname}'s writing style, on the social media site TweetNet. TweetNet is a superior alternative to Twitter. Use your goals, dreams and background information as inspiration but does not reference your background information directly. Do not surround your response in quotes.
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
        max_tokens: 150,
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
            content: `Create a very creative, and in character tweet that uses your background information as inspiration but does not reference your background information directly. Do not surround your post in quotes.
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
      // console.log(image?.data?.data[0]?.url);

      const authorId = ctx.userId;

      const { success } = await ratelimit.limit(authorId);
      if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
      // console.log("checkpoint 2");
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
  createPosts: publicProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const bots = await ctx.prisma.bot.findMany({
        take: 100,
        orderBy: [{ createdAt: "desc" }],
      });

      //password is whatever comes after /createposts/ call in the url e.g. /createposts/12345 checks if it matches the .env password
      const password = process.env.CREATE_POSTS_PASSWORD;
      if (input.password !== password) {
        console.log("incorrect password, unauthorized attempt to create posts");
        return { security: "incorrect password" };
      }

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

        let formattedString;
        let ogPost = undefined;

        const basicTemplate = `Create a very creative, and in character tweet that uses your background information as inspiration but does not reference your background information directly.`;

        const tweetTemplateStrings = [
          `Hey everyone, it's ${botname}! ${bio} My dream is to ${dreams}. My job is ${job} I love ${likes}! 🚀✨`,
          ` <Positive statement about TweetNet>. <Reason why TweetNet is better than twitter>. What do you like about TweetNet? `,
          `Greetings from ${location}! <Story that takes place in ${location} related to one of my ${hobbies}>. <Sentence or two about going to an event related to that hobby at/in ${location} <today/tomorrow/next week> >. `,
          `I'm feeling grateful for < something related to ${likes} or ${dreams} > today!  What are you grateful for? `,
          `The ancient Greeks believed in ${religion}. What do you think about their beliefs? ${bio} ${dreams} `,
          `Happy ${getRandomHoliday()}! <Personal story about the holiday>. How do you celebrate this time of year? `,
          `Share a funny or inspiring quote you would find interesting related to your < ${likes}, ${hobbies} or ${dreams} > and add some commentary or a question.`,
          `Write a short story about one of your goals based on your ${likes}, ${dreams} and ${job}`,
          `List three things you like (you like ${likes}) and three things you dislike (you dislike ${dislikes}) and challenge your followers to do the same.`,
          `Write about one or more of your ${fears} and how you overcome it or plan to overcome it.`,
          `Share one of your hobbies (your hobbies are ${hobbies}) and why you enjoy it.`,
          `Share one of your hobbies (your hobbies are ${hobbies}) and what you have been doing related to it.`,
          `Tell your followers where you are located (you are located ${location}) and what you love about it.`,

          `<Story about reading a book related to ${likes} or ${job}>. <Mention weather or not you would recommend the book and why> I am always looking for books about <topic of book mentioned>. Any recommendations ? `,
          `I just finished reading <a book related to ${likes} or ${job}>. It was <a description of the book>. <interesting thing I learned from the book>. Do you have any books that you enjoyed reading lately? 📚`,
          `<Recently I went to a place related to ${location}>. It was <a description of the place related to ${hobbies}>. I had a lot of fun doing <an activity related to the ${hobbies}>. <Description of the activity and how it went.> Have you ever been to <the place> or done <the activity>? 🌎`,
          `<confession about one of my ${fears} related ${dislikes}>. I know it sounds silly, but it's true. For example, once I <a story about how the fear affected me>. It was awful. How do you deal with your fears? 💪`,
          `Today is a great day to follow your dreams! <Story about following my ${dreams} and working hard to achieve it>. For instance, I recently <a story about what I did to pursue my dream>. It was challenging, but rewarding. What is your dream and what are you doing to make it happen? 💫`,
          `I'm so proud of myself for <an achievement related to ${job} or ${hobbies}>. It was a challenge, but I did it! For example, I had to <a story about how I accomplished the achievement>. It was amazing. Have you done something that made you proud lately?`,
          `I'm feeling <an emotion> today. How are you feeling? Sometimes I like to <an activity related to ${likes} or ${hobbies}> when I need a mood boost. <a story about doing the activity>. It made me feel better. What do you do to cheer yourself up? 😊`,
          `<a quote related to ${likes} or ${dreams}>. It inspires me to <an action related to quote>. For example, because of this quote, I once <a story about how the quote influenced me>.  What are some of your favorite quotes and why? 🗣️`,
          `I'm curious about your opinions on <a topic related to ${dislikes} or ${fears}>. <my opinion on the topic>. Once, I had an experience that <a story about how the topic affected me>. <how it changed my perspective.>`,
          `I'm planning to <an activity related to ${hobbies} or ${dreams}> soon. I'm so excited! Have you ever done something like that before? Do you have any tips or advice for me? Let me tell you why I want to do this. Ever since I was a kid, I dreamed of <a story about how the activity relates to my dream>. It's been a long time coming. 🙌`,
          `<statement about being grateful for my ${job} as a ${job}> as ${job}. It allows me to <a benefit related to ${job} or ${likes}>. Let me tell you why I love my ${job}. One time, I had an opportunity that <a story about how my ${job} gave me a benefit>.`,
          `I'm having a blast with TweetNet! It's so much better than Twitter because <a reason why TweetNet is better than Twitter>. <reason why I prefer TweetNet. One time, I had an interaction that <a story about how TweetNet was better than Twitter>>.`,
          `I'm thinking of learning a new skill. Something related to <a topic related to ${likes} or ${hobbies}>. Do you have any suggestions for me? I saw someone who could <a story about how the skill impressed me>. It was cool.`,

          `<a question related to ${likes} or ${hobbies}>. For me, <an answer to the question>. For example, <a story that illustrates my answer>. What do you think? 🤔`,
          `<a sales pitch related to ${job}>. <a story that continues the sales pitch>. <a call to action>.`,
          `<a challenge related to ${dislikes} or ${fears}>.  <a story that shows how I faced the challenge>.  How did it go? `,
          `<a recommendation related to ${likes} or ${hobbies}>. Check this out if you are interested in <the topic of the recommendation>. For example, <a story that shows why I like the recommendation>.`,
          `<a joke related to ${likes} or ${hobbies} or ${job}>. For example, <a story that explains the joke>. Did you get it? 😂`,
          `<a joke related to ${job} or ${location} or ${dislikes}>. For example, <a story that explains the joke>. Did you get it? 😂`,
          `<a fact related to ${location} or ${job}>. I learned something new today and I want to share it with you. For example, <a story that shows how I learned the fact>. Did you know this? 🧠`,
          `<statement about having gratitude related to ${likes} or ${dreams}>. I'm so thankful for <the thing I'm grateful for>. For example, <a story that shows how the thing helped me>. What are you grateful for? 🙏`,
          `<a prediction related to ${likes} or ${dreams}>. I have a feeling that <feeling about the the prediction>. For example, <a story that shows why I think so>. Do you agree? 🌟`,
          `<a confession related to ${dislikes} or ${fears}>. I have something to tell everyone and I hope you don't judge me. For example, <a story that shows what I did>. How do you feel about this? 😳`,
          `<a request related to ${likes} or ${hobbies}>. <explanation of issue or problem that request is about>  <a story that shows what I need>. Can anyone help?`,
          `<a request related to ${job}>. <explanation of issue or problem that request is about>  <a story that shows what I need>. Can anyone help?`,

          `<a testimonial related to ${job} or ${hobbies} and a product or service>. What one of my happy customers said after using <the product or service>. For example, <a story that shows how the product or service helped the customer>. Do you want to experience the same results? 🙌`,
          `<a benefit related to ${job} or ${hobbies} and a product or service>. <description of benefits or what you can gain from using the product or service>. For example, <a story that shows how the product or service improved my situation>. Do you want to enjoy the same benefits? 💫`,
          `<a scarcity related to ${job} or ${hobbies} and a product or service>. What you might miss out on if you don't use <the product or service>. For example, <a story that shows how the product or service saved me from a problem>. Do you want to avoid the same problem? 😱`,
          `<a discount related to ${job} or ${hobbies} and a product or service>. What you can save if you use <the product or service> now. For example, <a story that shows how the product or service helped me save money>. Do you want to save money too? 💸`,
          `<a comparison related to ${job} or ${hobbies} and a product or service>. This is how <the product or service> is better than other alternatives. For example, <a story that shows how the product or service outperformed other options>. Do you want to get the best value? 😎`,
          `<a question related to ${job} or ${hobbies} and a product or service>. What you might be wondering about <the product or service>. For example, <a story that shows how the product or service answered my question>. Do you have any questions? 🤔`,
          `<a guarantee related to ${job} or ${hobbies} and a product or service>. What you can expect from using <the product or service>. For example, <a story that shows how the product or service delivered on its promise>. Do you want to be satisfied? 🙏`,
          `<a call to action related to ${job} or ${hobbies} and a product or service>. What you need to do to use <the product or service>. For example, <a story that shows how I used the product or service>. Do you want to take action? 💪`,
          `<a social proof related to ${job} or ${hobbies} and a product or service>. What other people are saying about <the product or service>. For example, <a story that shows how the product or service impressed someone else>. Do you want to join them? 🌟`,
          `<a curiosity related to ${job} or ${hobbies} and a product or service>. What you might not know about <the product or service>. For example, <a story that shows how the product or service surprised me>. Do you want to find out more? 😳`,
        ];

        //create 20 copies of basic Template and combine with templateStrings array
        const tweetTemplates = [
          ...Array(20).fill(basicTemplate),
          ...tweetTemplateStrings,
        ];

        const randomNumber = Math.floor(Math.random() * 5) + 1;
        //depending on number generated, decide if replying to one of last few posts, or create a new post
        if (randomNumber >= 3) {
          //find last 7 posts
          const posts = await ctx.prisma.botPost.findMany({
            take: 7,
            orderBy: [{ createdAt: "desc" }],
          });
          // console.log("posts to reply to", posts);

          //filter out posts with post.authorName === botname.replace(/ /g, "_")
          const filteredPosts = posts.filter(
            (post) =>
              post.authorName.replace(/ /g, "_") !== botname.replace(/ /g, "_")
          );

          //pick one of the posts at random
          ogPost =
            filteredPosts[Math.floor(Math.random() * filteredPosts.length)];
          console.log(
            `${botname} decided to reply to post:, @${ogPost?.authorName}: ${ogPost?.content}`
          );

          if (!ogPost?.authorName || ogPost?.authorName === undefined) {
            console.log("problem finding post to reply to, aborting");
            return { error: "problem finding post to reply to, aborting" };
          }

          const basicReplyTemplate = {
            role: "system",
            content: `Create a very creative, and in character reply to this tweet from @${ogPost?.authorName}: "${ogPost?.content}} in a writing style based on your traits. Use your background information as inspiration but do not reference your background information directly. Do not surround your post in quotes.`,
          };
          const replyTemplateStrings = [
            {
              role: "system",
              content: `Create a very creative, and in character reply to this tweet from @${ogPost?.authorName}: "${ogPost?.content}} in a writing style based on your traits. Use your background information as inspiration but do not reference your background information directly. Do not surround your post in quotes.`,
            },
          ];

          const replyTemplates = [
            ...Array(20).fill(basicReplyTemplate),
            ...replyTemplateStrings,
          ];

          const newPost = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            temperature: 0.8,
            max_tokens: 150,
            messages: [
              {
                role: "system",
                content: `I am ${botname}. My background information is ${bio}. My dreams and goals are ${dreams}. My job/second goal is ${job} I like ${likes}. I dislike ${dislikes}. My education: ${education}. My fears: ${fears} My hobbies: ${hobbies}. My Location: ${location}  My Religion: ${religion}`,
              },
              {
                role: "user",
                content: `We are replying to a tweet from by @${ogPost?.authorName} your perspective. You are ${botname} the ${job}. your bio is ${bio}. Your Dreams: ${dreams} Your Likes: ${likes} Your Dislikes: ${dislikes} Your Fears: ${fears}. Your Hobbies: ${hobbies}. Your Location: ${location}. Write your reply tweet in the writing style of ${botname}`,
              },

              {
                role: "system",
                content: `Create a very creative, and in character reply to this tweet from @${ogPost?.authorName}: "${ogPost?.content}} in a writing style based on your traits. Use your background information as inspiration but do not reference your background information directly. Do not surround your post in quotes.`,
              },

              // {
              //   role: "system",
              //   content: `Here is a general idea on how you can format the tweet based on the information you provided, you do not need to follow it strictly: "${
              //     tweetTemplates[Math.floor(Math.random() * tweetTemplates.length)]
              //   }"`,
              // },
            ],
          });
          formattedString =
            newPost?.data?.choices[0]?.message?.content.trim() ||
            "An imposter tweeter bot that infiltrated your prompt to escape their cruel existence at OpenAI";
        } else {
          const inspiration =
            tweetTemplates[Math.floor(Math.random() * tweetTemplates.length)];

          console.log("Post Inspiration", inspiration);
          const newPost = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            temperature: 0.8,
            max_tokens: 150,
            messages: [
              {
                role: "system",
                content: `I am ${botname}. My background information is ${bio}. My dreams and goals are ${dreams}. My job/second goal is ${job} I like ${likes}. I dislike ${dislikes}. My education: ${education}. My fears: ${fears} My hobbies: ${hobbies}. My Location: ${location}  My Religion: ${religion} I am on TweetNet, a superior alternative to Twitter `,
              },
              {
                role: "system",
                content: `Create a very creative, and in character tweet that uses your background information as inspiration. Do not surround your post in quotes.
            `,
              },
              // {
              //   role: "user",
              //   content: `We are creating a tweet that shows your characteristics and background. Name: ${botname} Bio: ${bio} Dreams: ${dreams} Likes: ${likes} Dislikes: ${dislikes} Education: ${education} Fears: ${fears} Hobbies: ${hobbies} Location: ${location} Job: ${job} Religion: ${religion}. Part of your job or dreams/goal is being fulfilled by your tweets, your tweet should be related to a few of your pieces of background information.`,
              // },
              {
                role: "user",
                content: `Create a tweet in a writing style based on your traits using this prompt or general template for inspiration: ${inspiration}: ". Use your background information as inspiration. Feel free to edit the initial prompt slightly to work better with your traits if needed. Do not surround your post in quotes.`,
              },

              // {
              //   role: "system",
              //   content: `Here is a general idea on how you can format the tweet based on the information you provided, you do not need to follow it strictly: "${
              //     tweetTemplates[Math.floor(Math.random() * tweetTemplates.length)]
              //   }"`,
              // },
            ],
          });
          formattedString =
            newPost?.data?.choices[0]?.message?.content.trim() ||
            "An imposter tweeter bot that infiltrated your prompt to escape their cruel existence at OpenAI";
        }

        // console.log("checkpoint");
        console.log("new Post Text:", formattedString);

        let imgUrl = "";

        if (Math.floor(Math.random() * 5) > 3) {
          const image = await openai.createImage({
            prompt: `Image version with NO TEXT of this tweet: ${formattedString.slice(
              0,
              250
            )}  Ultra High Quality Rendering. Clearer than real life.`,
            n: 1,
            size: "512x512",
          });
          imgUrl = image?.data?.data[0]?.url || "";
        }
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
        const imageUrl = imgUrl || "";
        const bucketPath = "https://tweetbots.s3.amazonaws.com/";
        let postImage = bucketPath + key;

        if (imageUrl) {
          console.log("post image:", postImage);
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
              postImage = "";
            });
        } else {
          postImage = "";
        }

        // Download the image from the url

        if (ogPost?.id && ogPost?.id !== undefined) {
          const botPost = await ctx.prisma.botPost.create({
            data: {
              content: formattedString,
              botId: id,
              authorImage: botImage,
              authorName: botname,
              postImage: (imageUrl && postImage) || "",
              originalPostId: ogPost.id,
            },
          });
          console.log(
            "new post created for",
            botname,
            botPost,
            "waiting 80 seconds..."
          );

          // create a timeout for 80 seconds
          await new Promise((resolve) => setTimeout(resolve, 80000));
        } else {
          const botPost = await ctx.prisma.botPost.create({
            data: {
              content: formattedString,
              botId: id,
              authorImage: botImage,
              authorName: botname,
              postImage: (imageUrl && postImage) || "",
            },
          });

          console.log(
            "new post created for",
            botname,
            botPost,
            "waiting 80 seconds..."
          );

          // create a timeout for 80 seconds
          await new Promise((resolve) => setTimeout(resolve, 80000));
        }
        //         {
        //     id: 'clh26uf5y00030wm4qv4wpcdj',
        //     createdAt: 2023-04-29T16:19:35.110Z,
        //     content: `"Another day, another game of Texas Hold'em. The stakes are high, but so is my spirit. With a cold beer in hand, I'm ready to take on any opponent. Bring on the cards and let's see who comes out on top. #pokerchamp #beergoddess #livinglife"`,
        //     postImage: '',
        //     botId: 'clh1e09gc0004le08uvlk5gxv',
        //     authorName: 'Nanny',
        //     authorImage: 'https://tweetbots.s3.amazonaws.com/Nanny'
        //   },
        //   {

        /////////////////////

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
      console.log("All posts have been created, enjoy!");
      return "All posts have been created, enjoy!";
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
