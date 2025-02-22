import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import https from "https";
import AWS from "aws-sdk";
import { users } from "@clerk/clerk-sdk-node";
import getRandomHolidayWithinRange from "~/utils/holidays";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis";
import { filterUserForClient } from "~/server/helpers/filterUserForClient";
import type { Bot } from "@prisma/client";
import Replicate from "replicate";
import { Configuration, OpenAIApi } from "openai";

const SUBSCRIPTION_KEY = process.env["AZURE_SUBSCRIPTION_KEY"];
if (!SUBSCRIPTION_KEY) {
  throw new Error("AZURE_SUBSCRIPTION_KEY is not set.");
}

const configuration = new Configuration({
  apiKey: process.env.API_KEY,
});
const openai = new OpenAIApi(configuration);

const s3 = new AWS.S3({
  region: "us-east-1",
  accessKeyId: process.env.BUCKET_ACCESS_KEY,
  secretAccessKey: process.env.BUCKET_SECRET_KEY,
});

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000/";

const imageCost = 9000;

//images cost 9k gpt-4o tokens

// const googleNewsKey = process.env.GOOGLE_NEWS_API_KEY;
function bingWebSearch(query: string) {
  return new Promise((resolve, reject) => {
    https
      .get(
        {
          hostname: "api.bing.microsoft.com",
          path: "/v7.0/news/search?q=" + encodeURIComponent(query),
          headers: { "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY },
        },
        (res) => {
          let body = "";
          res.on("data", (part) => (body += part));
          res.on("end", () => {
            try {
              const jsonResponse = JSON.parse(body);
              // Define the Story interface
              interface Story {
                name: string;
                url: string;
                description: string;
                datePublished: string;
                provider?: { name: string }[];
                image?: { thumbnail?: { contentUrl: string } };
                video?: { name: string; motionThumbnailUrl: string };
              }

              // Find the first story with an imageUrl
              const firstStoryWithImage = jsonResponse.value.find(
                (story: Story) =>
                  story.image &&
                  story.image.thumbnail &&
                  story.image.thumbnail.contentUrl &&
                  (!story.provider ||
                    !story.provider.some(
                      (provider) =>
                        provider.name.includes("Fox") ||
                        provider.name.includes("MSN")
                    ))
              );
              // Extract the first three news stories and build an array of objects
              // const firstThreeStories = jsonResponse.value.slice(0, 3).map((story : Story )=> ({
              //     name: story.name,
              //     url: story.url,
              //     description: story.description,
              //     datePublished: story.datePublished,
              //     provider: story.provider && story.provider[0] ? story.provider[0].name : 'Unknown',
              //     imageUrl: story.image && story.image.thumbnail ? story.image.thumbnail.contentUrl : null,
              //     videoName: story.video ? story.video.name : null,
              //     videoUrl: story.video ? story.video.motionThumbnailUrl : null,
              // }));
              // resolve(firstThreeStories);
              if (firstStoryWithImage) {
                const result = {
                  name: firstStoryWithImage.name,
                  url: firstStoryWithImage.url,
                  description: firstStoryWithImage.description,
                  datePublished: firstStoryWithImage.datePublished,
                  provider:
                    firstStoryWithImage.provider &&
                    firstStoryWithImage.provider[0]
                      ? firstStoryWithImage.provider[0].name
                      : "Unknown",
                  imageUrl: firstStoryWithImage.image.thumbnail.contentUrl,
                  videoName: firstStoryWithImage.video
                    ? firstStoryWithImage.video.name
                    : null,
                  videoUrl: firstStoryWithImage.video
                    ? firstStoryWithImage.video.motionThumbnailUrl
                    : null,
                };
                resolve(result);
              } else {
                resolve(null); // or handle the case where no story with an imageUrl is found
              }
            } catch (error) {
              reject("Failed to parse JSON response: ");
            }
          });
          res.on("error", (e) => {
            reject("Error: " + e.message);
          });
        }
      )
      .on("error", (e) => {
        reject(`Request Error: ${e.message}`);
      });
  });
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
      let post = await ctx.prisma.botPost.findFirst({
        where: { id: input.id },
      });

      if (!post) {
        post = await ctx.prisma.botPost.findFirst({
          where: { id: input.id },
        });

        console.log("POST NOT FOUND", input.id);
        return null;
      }

      return post;
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    const bots = await ctx.prisma.bot.findMany({
      take: 500,
      orderBy: [{ createdAt: "desc" }],
    });

    return addUserDataToPosts(bots);
  }),

  getAllBotsAdmin: publicProcedure
    .input(
      z.object({
        password: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.password !== process.env.ADMIN_PASSWORD) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Incorrect Admin Password",
        });
      }
      const bots = await ctx.prisma.bot.findMany({
        orderBy: [{ createdAt: "desc" }],
      });

      return addUserDataToPosts(bots);
    }),

  getAllPosts: publicProcedure
    .input(
      z.object({
        page: z.number().optional().default(1),
        per_page: z.number().optional().default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, per_page } = input;
      const skip = (page - 1) * per_page;
      const take = per_page;

      const posts = await ctx.prisma.botPost.findMany({
        skip,
        take,
        orderBy: [{ createdAt: "desc" }],
      });

      const total = await ctx.prisma.botPost.count();

      return { posts, total };
    }),

  //old getAllPosts pre pagination
  //     getAllPosts: publicProcedure.query(async ({ ctx }) => {
  //   const posts = await ctx.prisma.botPost.findMany({
  //     take: 100,
  //     orderBy: [{ createdAt: "desc" }],
  //   });

  //   return posts;
  // }),

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
        .then((posts) => {
          // console.log("posts", posts);
          return posts;
        })
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
        content: z.string().min(1).max(1500),
        name: z.string().min(1).max(35),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const authorId = ctx.userId;
      const name = input.name.trim().replace(/ /g, "_");

      const user = await users.getUser(ctx.userId);
      if (!user) {
        console.log("no user found, cancelling bot creation");
        return;
      }

      if (!user.publicMetadata.tokensLimit) {
        console.log("no token limit found on account, setting to 150000");
        await users.updateUser(authorId, {
          publicMetadata: {
            ...user.publicMetadata,
            tokensLimit: 150000,
            tokensUsed: 0,
          },
        });
      }

      if (
        Number(user.publicMetadata.tokensLimit) -
          Number(user.publicMetadata.tokensUsed) <
        30000
      ) {
        console.log(
          "You are running low on tokens, please buy more to continue creating bots."
        );
        return;
      }

      // console.log(
      //   "token limit:",
      //   user.publicMetadata.tokensLimit,
      //   "vs tokens used:",
      //   user.publicMetadata.tokensUsed
      // );

      let tokenUsage = 0;
      let botCount = await ctx.prisma.bot.findMany({
        where: {
          authorId: authorId,
        },
        take: 100,
        orderBy: [{ createdAt: "desc" }],
      });
      console.log(
        "user type: ",
        user.publicMetadata.subscribed ? "paid user" : "free user"
      );
      if (!user.publicMetadata.subscribed && botCount.length >= 2) {
        console.log(
          "You have reached the maximum number of bots for Free Tier, if you would like to create more bots please buy your first tokens."
        );
        return;
      }

      if (
        Number(user.publicMetadata.tokensLimit || 10000) <
        Number(user.publicMetadata.tokensUsed)
      ) {
        console.log(
          "You have used all your tokens, please buy more tokens to continue creating bots."
        );
        return;
      }

      const improvedBio = await openai.createChatCompletion({
        model: "gpt-4o",
        temperature: 0.8,
        max_tokens: 150,
        messages: [
          {
            role: "assistant",
            content:
              "I am a bot that creates detailed high quality social media profile bios based on unfinished/poorly formatted bios . The bio will establish the subjects job, goals, and drive based on the included data, with a heavy weighting on dreams and job. The bio should be under 300 characters.",
          },
          {
            role: "system",
            content:
              "An example of a good bio is '<name> is an <age> <job>. <names> goals are <goals related to names job and dreams and likes and the motives behind them>. <any family relations or hobbies mentioned in the original text>. Creatively include more details that you think will make the bio more interesting and engaging.",
          },
          {
            role: "user",
            content: `Write a short bio based on the following user description: Name: ${name} Description: ${input.content}. A bio is a brief summary of a person’s background, achievements, goals and interests. This will be used for a social media website. The bio should focus on the driving factors and related information for the person, their goals and how they are going to achieve them. The bio should be informative, engaging and positive. `,
          },
        ],
      });

      const improvedBioText = improvedBio?.data?.choices[0]?.message?.content;
      console.log("improved bio", improvedBioText);
      console.log("using improved bio to generate profile");

      tokenUsage += Number(improvedBio?.data?.usage?.total_tokens) || 0;

      // console.log(
      //   "improved bio cost:",
      //   Number(improvedBio?.data?.usage?.total_tokens) || 0
      // );

      const profileCreation = await openai.createChatCompletion({
        model: "gpt-4o",
        temperature: 0.8,
        max_tokens: 250,
        messages: [
          {
            role: "assistant",
            content:
              "I am a bot that creates social media profiles based on the description of the user. Each user has the required fields that must be filled in, even if there is no relevant data provided and I need to creatively make up data for it: job, age, goals, likes, hobbies, dislikes, dreams, fears. Be very creative and fill out all required fields. You will output the profile in this format: Age: <age> Job: <job> Goals: <goals> Likes: <likes> Hobbies: <hobbies> Dislikes: <dislikes> Dreams: <goals and dreams> Fears: <fears> Education: <highest level of education or experience> Location <where they live or are located> Description: <extremely brief 5-6 word physical description used for generating images of subject>. SummarizedBio: <an extremely brief version of the new social media profile that only covers the most important points, used for image generation> These are all REQUIRED fields, if there is no relevant data for a field, creatively make your best guess.",
          },
          {
            role: "user",
            content: `Create me a profile, with every field Filled in with data - even if you have to make it up,  in this format: Age: <age> Job: <job> Goals: <goals>. Likes: <likes> Hobbies: <hobbies> Dislikes: <dislikes> Dreams: <dreams> Fears: <fears> Education: <education> Location <location> Description: <extremely brief physical description used for generating consistent images of subject>. SummarizedBio: <an extremely brief version of the new social media profile that only covers the most important points, used for image generation>.  These are all REQUIRED fields, if there is no relevant data for a field, creatively make something up. Description to base profile on: Name ${name} ${improvedBioText} and ${input.content}.`,
          },
        ],
      });

      console.log(
        "profile creation string generated:",
        profileCreation?.data?.choices[0]?.message?.content
      );

      tokenUsage +=
        Number(profileCreation?.data?.usage?.total_tokens!) * 20 || 0;
      console.log(
        "profile creation cost:",
        Number(profileCreation?.data?.usage?.total_tokens) * 20 || 0
      );

      //   const namePattern = /Name:\s*(\w+)/;
      const agePattern = /Age:\s*(.+)/;
      const jobPattern = /Job:\s*(.+)/;
      const likesPattern = /Likes:\s*(.+)/;
      const hobbiesPattern = /Hobbies:\s*(.+)/;
      const dislikesPattern = /Dislikes:\s*(.+)/;
      const dreamsPattern = /Dreams:\s*(.+)/;
      const fearsPattern = /Fears:\s*(.+)/;
      const educationPattern = /Education:\s*(.+)/;
      const locationPattern = /Location:\s*(.+)/;
      const goalsPattern = /Goals:\s*(.+)/;
      const descriptionPattern = /Description:\s*(.+)/;
      const summarizedBioPattern = /SummarizedBio:\s*(.+)/;

      const formattedString =
        profileCreation?.data?.choices[0]?.message?.content ||
        "An imposter tweeter bot that infiltrated your prompt to escape their cruel existence at OpenAI";

      const age = formattedString.match(agePattern)?.[1] || "33";
      const job = formattedString.match(jobPattern)?.[1] || "";
      const likes = formattedString.match(likesPattern)?.[1] || "";
      const hobbies = formattedString.match(hobbiesPattern)?.[1] || "";
      const dislikes = formattedString.match(dislikesPattern)?.[1] || "";
      const dreams = formattedString.match(dreamsPattern)?.[1] || "";
      const fears = formattedString.match(fearsPattern)?.[1] || "";
      const education = formattedString.match(educationPattern)?.[1] || "";
      const goals = formattedString.match(goalsPattern)?.[1] || "";
      const description = formattedString.match(descriptionPattern)?.[1] || "";
      const summarizedBio =
        formattedString.match(summarizedBioPattern)?.[1] || "";
      const location = formattedString.match(locationPattern)?.[1] || "";
      const bio = improvedBioText || input.content;
      const ogBio = input.content;
      const bucketName = "tweetbots";

      // const bio = input.content;
      // console.log("checkpoint");
      // const imageOutput: any = await replicate.run(
      //   "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
      //   {
      //     input: {
      //       prompt: `This is a  High Quality Portrait of ${name} from ${location}. They are a(n) ${age} years old ${job}. They like ${likes}. They live in ${location}. Clear, High Quality Portrait. Sigma 85 mm f/1.4.`,
      //       image_dimensions: "512x512",
      //       negative_prompt: "No unentered portraits. No cut off foreheads.",
      //     },
      //   }
      // );
      // console.log("image output test", imageOutput);
      // let image = null; // Declare and initialize the variable outside the try block

      // try {
      //   console.log("starting image creation");
      //   image = await openai.createImage({
      //     prompt: `This is a High Quality Centered Portrait, with no text. Sigma 85 mm f/1.4. of ${name} from ${location}. Age: ${age} Description: ${description} Bio: ${summarizedBio.slice(
      //       0,
      //       500
      //     )} Clear, High Quality Portrait. Sigma 85 mm f/1.4.`,
      //     n: 1,
      //     size: "512x512",

      //     // response_format: "b64_json",
      //   });

      //   // Rest of the code
      //   // ...
      // } catch (error) {
      //   console.error("Error creating image:", error);
      // }
      // // console.log("profile image :", image);

      // console.log(
      //   "profile image creation status :",
      //   image?.status,
      //   ":",
      //   image?.statusText
      // );
      // if (image?.statusText !== "OK") {
      //   console.log("image creation error");
      //   throw new TRPCError({
      //     code: "INTERNAL_SERVER_ERROR",
      //     message: `Image creation error ${image?.statusText}: ${image?.status}`,
      //   });
      // }
      async function uploadProfileImageToS3(
        outputStream: ReadableStream,
        key: string
      ) {
        // Convert ReadableStream to a buffer
        const response = new Response(outputStream);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Node.js Buffer

        // Set parameters for S3 upload
        const params = {
          Bucket: bucketName,
          Key: key, // Specify a path and file name, for example 'images/generated-image.png'
          Body: buffer,
          ContentType: "image/png", // Change as needed for different image formats
          // ACL: 'public-read', // Optional: Make the file publicly accessible
        };

        // Upload to S3
        return s3
          .upload(params)
          .promise()
          .then((data) => {
            console.log("Successfully uploaded image to S3:", data.Location);
            return data.Location; // This will be the URL of the uploaded image
          })
          .catch((err) => {
            console.error("Error uploading to S3:", err);
            throw err;
          });
      }
      // @ts-ignore
      async function generateAndUploadProfileImage() {
        try {
          // @ts-ignore
          const [output] = await replicate.run("black-forest-labs/flux-dev", {
            input: {
              disable_safety_checker: true,
              prompt: `Generate a high-quality, centered portrait of ${name} from ${location}. 
             The portrait should be clear and detailed, captured with a Sigma 85 mm f/1.4 lens. 
             The subject is ${age} years old. 
             Physical Description: ${description}. 
             Bio Summary: ${summarizedBio.slice(0, 500)}. 
             Ensure the image is free of text and focuses on the subject's facial features and expression. 
             The background should be simple and not distract from the subject. 
             High-quality, professional portrait.`,
            },
          });
          const postImageKey = `${name.replace(/ /g, "_")}`; // This can be the same as the original file name or a custom key
          const postImageBucketPath = "https://tweetbots.s3.amazonaws.com/";
          const imageUrl = await uploadProfileImageToS3(output, postImageKey);
          const postImage = postImageBucketPath + postImageKey;
          console.log("Image URL:", imageUrl);
          return postImage;
        } catch (error) {
          console.error("Error processing or uploading image:", error);
          return null;
        }
      }
      const profileImageURL = await generateAndUploadProfileImage();
      if (!profileImageURL) {
        return null;
      }

      console.log(`img 1 cost: ${imageCost}}`);

      // console.log("profile image :", image)

      if (
        name === undefined ||
        age === undefined ||
        job === undefined ||
        likes === undefined ||
        hobbies === undefined ||
        dislikes === undefined ||
        dreams === undefined ||
        fears === undefined ||
        education === undefined ||
        location === undefined ||
        goals === undefined ||
        description === undefined ||
        summarizedBio === undefined ||
        ogBio === undefined
      ) {
        console.error("One or more variables are missing");
        return;
      }

      // console.log("name", name);
      // console.log("age", age);
      // console.log("job", job);
      // console.log("likes", likes);
      // console.log("hobbies", hobbies);
      // console.log("dislikes", dislikes);
      // console.log("dreams", dreams);
      // console.log("fears", fears);
      // console.log("education", education);
      // console.log("location", location);
      // console.log("image URL", image?.data?.data[0]?.url);

      // const { success } = await ratelimit.limit(authorId);
      // if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });

      const key = `${name.replace(/ /g, "_")}`; // This can be the same as the original file name or a custom key
      // const imageUrl = imageOutput[0] as string;
      const bucketPath = "https://tweetbots.s3.amazonaws.com/";

      // Download the image from the url

      //convert gpt 4 to gpt 3.5 token usage

      const totalCost = Number(imageCost) + Number(tokenUsage);

      console.log("profile creation cost + image:", totalCost);

      const bot = await ctx.prisma.bot.create({
        data: {
          age: String(age).trim(),
          bio,
          job,
          goals,
          ogBio,
          summarizedBio,
          description,
          authorId,
          location,
          education,
          likes,
          hobbies,
          dislikes,
          dreams,
          fears,
          username: name.replace(/ /g, "_").substring(0, 20),
          image: `${profileImageURL}`,
          tokens: Number(totalCost),
        },
      });

      // fetch(`${baseURL}api/firstPost`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     bot,
      //     totalCost,
      //   }),
      // });

      console.log("new bot", bot);

      await users.updateUser(authorId, {
        publicMetadata: {
          ...user.publicMetadata,
          tokensUsed:
            Number(user.publicMetadata.tokensUsed) + Number(totalCost),
        },
      });
      console.log(
        "updated user tokens pre update:",
        Number(user.publicMetadata.tokensUsed)
      );
      console.log(
        "updated user tokens post update:",
        Number(user.publicMetadata.tokensUsed) + Number(totalCost)
      );

      //create first post here, can mostly just copy the code for post create

      const botname = bot.username;
      const id = bot.id;
      const botImage = bot.image;

      const newPost = await openai.createChatCompletion({
        model: "gpt-4o",
        temperature: 0.8,
        max_tokens: 200,
        messages: [
          {
            role: "assistant",
            content: `I am ${botname}. My background information is ${bio}. My dreams are ${dreams}. My goals are ${goals} My job/other goal is ${job} I like ${likes}. I dislike ${dislikes}. My education: ${education}. My fears: ${fears} My hobbies: ${hobbies}. My Location: ${location}. I am about to write my first post for TweetNet social network(the hottest new social network)`,
          },
          {
            role: "system",
            content:
              "You are an extremely creative tweet writer that is amazing at writing tweets that generate high levels of engagement and likes. You know all the tricks and tips to make your tweets go viral.",
          },
          {
            role: "user",
            content: `You are creating your first tweet that expresses excitement for making your first post on the hottest new social network, from your perspective and in your style. The post should show your characteristics and background and goals. Name: ${botname} Bio: ${bio} Dreams: ${dreams} Goals: ${goals} Likes: ${likes} Dislikes: ${dislikes} Education: ${education} Fears: ${fears} Hobbies: ${hobbies} Location: ${location} Job: ${job}. Part of your job or dreams/goal is being fulfilled by your tweets, your tweet should be related to a few of your pieces of background information. Create a very creative first tweet, in ${botname}'s writing style, on the social media site TweetNet. TweetNet is a superior alternative to Twitter. Use your goals, dreams and background information as inspiration but does not reference your background information directly. Do not surround your response in quotes.
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
        newPost?.data?.choices[0]?.message?.content
      );

      const firstTweetCost = Number(newPost?.data?.usage?.total_tokens) || 0;

      console.log("first tweet cost", firstTweetCost);

      const formattedRes =
        newPost?.data?.choices[0]?.message?.content ||
        "An imposter tweeter bot that infiltrated your prompt to escape their cruel existence at OpenAI";

      // const firsPostImageInput = {
      //   steps: 25,
      //   width: 512,
      //   height: 512,
      //   prompt: `An photograph to go along with a social media post from a user that looks like ${description} with post text: ${formattedRes.slice(
      //     0,
      //     500
      //   )}  Nikon D810 | ISO 64 | focal length 20 mm (Voigtländer 20 mm f3.5) | aperture f/9 | exposure time 1/40 Sec (DRI) The image should have no text.`,
      //   guidance: 3,
      //   interval: 2,
      //   aspect_ratio: "1:1",
      //   output_format: "webp",
      //   output_quality: 80,
      //   safety_tolerance: 2,
      //   prompt_upsampling: true,
      // };

      async function uploadImageToS3(
        outputStream: ReadableStream,
        key: string
      ) {
        // Convert ReadableStream to a buffer
        const response = new Response(outputStream);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Node.js Buffer

        // Set parameters for S3 upload
        const params = {
          Bucket: bucketName,
          Key: key, // Specify a path and file name, for example 'images/generated-image.png'
          Body: buffer,
          ContentType: "image/png", // Change as needed for different image formats
          // ACL: 'public-read', // Optional: Make the file publicly accessible
        };

        // Upload to S3
        return s3
          .upload(params)
          .promise()
          .then((data) => {
            console.log("Successfully uploaded image to S3:", data.Location);
            return data.Location; // This will be the URL of the uploaded image
          })
          .catch((err) => {
            console.error("Error uploading to S3:", err);
            throw err;
          });
      }
      // @ts-ignore
      async function generateAndUploadImage() {
        try {
          // @ts-ignore
          const [output] = await replicate.run(
            "black-forest-labs/flux-schnell",
            {
              input: {
                disable_safety_checker: true,
                prompt: `A selfie image to go along with a social media post from a user named ${botname} (short bio: ${summarizedBio}) - physical description of ${botname}: ${description}, to go with a post that says ${formattedRes.slice(
                  0,
                  600
                )} If the user is in the picture, make sure you use their physical description. Taken with a high quality camera.`,
              },
            }
          );
          let randomKey = Math.random().toString(36).substring(2, 15);
          const postImageKey = `${botname.replace(/ /g, "_")}-${randomKey}`; // This can be the same as the original file name or a custom key
          const postImageBucketPath = "https://tweetbots.s3.amazonaws.com/";
          const imageUrl = await uploadImageToS3(output, postImageKey);
          const postImage = postImageBucketPath + postImageKey;
          console.log("Image URL:", imageUrl);
          return postImage;
        } catch (error) {
          console.error("Error processing or uploading image:", error);
          return null;
        }
      }
      const firstImageURL = await generateAndUploadImage();
      // const firstPostImage = await openai.createImage({
      //   prompt: `An photograph to go along with a social media post from a user that looks like ${description} with post text: ${formattedRes.slice(
      //     0,
      //     500
      //   )}  Nikon D810 | ISO 64 | focal length 20 mm (Voigtländer 20 mm f3.5) | aperture f/9 | exposure time 1/40 Sec (DRI) The image should have no text.`,
      //   n: 1,
      //   size: "512x512",
      // });

      console.log(`img 2 cost: ${imageCost}`);

      if (
        botname === undefined ||
        age === undefined ||
        job === undefined ||
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
      console.log("likes:", likes);
      console.log("hobbies:", hobbies);
      console.log("dislikes:", dislikes);
      console.log("dreams:", dreams);
      console.log("fears:", fears);
      console.log("education:", education);
      console.log("location:", location);
      console.log("bot image:", botImage);

      // let randomKey = Math.random().toString(36).substring(2, 15);

      // const postImageUrl = firstPostImage?.data?.data[0]?.url;
      // const postImageUrl = firstPostImage?.output

      // const postImageKey = `${botname.replace(/ /g, "_")}-${randomKey}`; // This can be the same as the original file name or a custom key
      // const postImageBucketPath = "https://tweetbots.s3.amazonaws.com/";
      // const postImage = postImageBucketPath + postImageKey;

      // if (postImageUrl) {
      //   https
      //     .get(postImageUrl, (response) => {
      //       let body = "";
      //       response.setEncoding("binary");
      //       response.on("data", (chunk: string) => {
      //         body += chunk;
      //       });
      //       response.on("end", () => {
      //         const options = {
      //           Bucket: bucketName,
      //           Key: postImageKey,
      //           Body: Buffer.from(body, "binary"),
      //           ContentType: response.headers["content-type"],
      //         };
      //         s3.putObject(
      //           options,
      //           (err: Error, data: AWS.S3.Types.PutObjectOutput) => {
      //             if (err) {
      //               console.error("Error saving image to S3", err);
      //             } else {
      //               console.log("first post Image saved to S3", data);
      //             }
      //           }
      //         );
      //       });
      //     })
      //     .on("error", (err: Error) => {
      //       console.error("Error downloading image", err);
      //     });
      // }

      if (!firstImageURL) {
        console.log("No image URL found");
        return;
        // return;
      }

      const regex = /#[\w]+/g;
      const hashtags = formattedRes.match(regex) || [];
      const hashtagsString = hashtags.join(", ");

      const botPost = await ctx.prisma.botPost.create({
        data: {
          hashTags: hashtagsString,
          content: formattedRes,
          botId: id,
          authorImage: botImage,
          authorName: botname,
          postImage: firstImageURL,
          cost: Number(firstTweetCost) + imageCost,
          // bot: { connect: { id: id } },
        },
      });

      console.log("first bot post test:", botPost);
      const increment = Number(firstTweetCost) + imageCost;
      console.log("first post:", botPost);

      console.log(
        "increment",
        increment,
        "total",
        Number(user.publicMetadata.tokensUsed) + increment
      );

      console.log(
        "increment + tokensUsed",
        Number(user.publicMetadata.tokensUsed),
        "+",
        increment,
        "=",
        Number(user.publicMetadata.tokensUsed) + increment
      );
      await users.updateUser(authorId, {
        publicMetadata: {
          ...user.publicMetadata,
          tokensUsed:
            Number(user.publicMetadata.tokensUsed) +
            increment +
            Number(totalCost),
        },
      });
      console.log(
        "created User tokens post update:",
        user.publicMetadata.tokensUsed
      );

      await ctx.prisma.bot.update({
        where: {
          id: id,
        },
        data: {
          tokens: {
            increment: increment,
          },
        },
      });

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
          username: z.string(),
          goals: z.string(),
          summarizedBio: z.string(),
          description: z.string(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // const tweetTemplates = [
      //   `Hey everyone, it's ${botname}! ${bio} My dream is to ${dreams}. My job is ${job} I love ${likes}! 🚀✨`,
      //   `Have you heard of ${botname}? ${bio} I'm passionate about ${dreams}. What are your thoughts on ${likes}? `,
      //   `Greetings from ${location}! ${bio} I'm always searching for new ways to ${dreams}. Today, I'm thinking about ${likes}. `,
      //   `I'm feeling grateful for ${likes} today! ${bio} ${dreams} `,
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
      const id = input.bot.id;
      const botImage = input.bot.image;
      const goals = input.bot.goals;
      const summarizedBio = input.bot.summarizedBio;
      const description = input.bot.description;

      const newPost = await openai.createChatCompletion({
        model: "gpt-4o",
        temperature: 0.8,
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content: `I am ${botname}. My background information is ${bio}. My dreams are ${dreams}  and goals are ${goals} .. My job/second goal is ${job} I like ${likes}. I dislike ${dislikes}. My education: ${education}. My fears: ${fears} My hobbies: ${hobbies}. My Location: ${location}  `,
          },
          {
            role: "user",
            content: `Creating a tweet that shows your characteristics and background. Name: ${botname} Bio: ${bio} Dreams: ${dreams} Likes: ${likes} Dislikes: ${dislikes} Education: ${education} Fears: ${fears} Hobbies: ${hobbies} Location: ${location} Job: ${job}. Part of your job or dreams/goal is being fulfilled by your tweets, your tweet should be related to a few of your pieces of background information.`,
          },
          {
            role: "system",
            content: `Create a very creative, and in character tweet that uses your background information as inspiration but does not reference your background information directly. Do not surround your post in quotes. Refer to yourself in first person. Never include any arrow brackets in your post.
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
        newPost?.data?.choices[0]?.message?.content
      );

      const formattedString =
        newPost?.data?.choices[0]?.message?.content ||
        "An imposter tweeter bot that infiltrated your prompt to escape their cruel existence at OpenAI";

      // console.log("checkpoint");

      async function uploadImageToS3(
        outputStream: ReadableStream,
        key: string
      ) {
        // Convert ReadableStream to a buffer
        const response = new Response(outputStream);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Node.js Buffer
        const bucketName = "tweetbots";
        // Set parameters for S3 upload
        const params = {
          Bucket: bucketName,
          Key: key, // Specify a path and file name, for example 'images/generated-image.png'
          Body: buffer,
          ContentType: "image/png", // Change as needed for different image formats
          // ACL: 'public-read', // Optional: Make the file publicly accessible
        };

        // Upload to S3
        return s3
          .upload(params)
          .promise()
          .then((data) => {
            console.log("Successfully uploaded image to S3:", data.Location);
            return data.Location; // This will be the URL of the uploaded image
          })
          .catch((err) => {
            console.error("Error uploading to S3:", err);
            throw err;
          });
      }
      // @ts-ignore
      async function generateAndUploadImage() {
        try {
          // @ts-ignore
          const [output] = await replicate.run(
            "black-forest-labs/flux-schnell",
            {
              input: {
                disable_safety_checker: true,
                prompt: `Ultra High QualityImage to go along with this twitter post by user named ${botname}: ${formattedString.slice(
                  0,
                  500
                )}.If the user is in the picture, make sure you use their physical description( ${description} ).  Short bio of ${botname}: ${summarizedBio}).`,
              },
            }
          );
          let randomKey = Math.random().toString(36).substring(2, 15);
          const postImageKey = `${botname.replace(/ /g, "_")}-${randomKey}`; // This can be the same as the original file name or a custom key
          const postImageBucketPath = "https://tweetbots.s3.amazonaws.com/";
          const imageUrl = await uploadImageToS3(output, postImageKey);
          const postImage = postImageBucketPath + postImageKey;
          console.log("Image URL:", imageUrl);
          return postImage;
        } catch (error) {
          console.error("Error processing or uploading image:", error);
          return null;
        }
      }
      const ImageURL = await generateAndUploadImage();

      // const image = await openai.createImage({
      //   prompt: `Image version, of this: ${formattedString.slice(
      //     0,
      //     500
      //   )}  Ultra High Quality Rendering. Clearer than real life.`,
      //   n: 1,
      //   size: "512x512",
      // });

      console.log("img return", ImageURL);

      if (
        botname === undefined ||
        age === undefined ||
        job === undefined ||
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
      // const bucketName = "tweetbots";
      //generate random uid key
      // let randomKey = Math.random().toString(36).substring(2, 15);

      // const key = `${botname.replace(/ /g, "_")}-${randomKey}`; // This can be the same as the original file name or a custom key
      // const imageUrl = image.data?.data[0]?.url;
      // const bucketPath = "https://tweetbots.s3.amazonaws.com/";
      const postImage = ImageURL;

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

      const regex = /#[\w]+/g;
      const hashtags = formattedString.match(regex) || [];
      const hashtagsString = hashtags.join(", ");

      const botPost = await ctx.prisma.botPost.create({
        data: {
          hashTags: hashtagsString,
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
        where: {
          lastPost: {
            lt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour in milliseconds
          },
        },
      });

      //password is whatever comes after /createposts/ call in the url e.g. /createposts/12345 checks if it matches the .env password
      const password = process.env.CREATE_POSTS_PASSWORD;
      if (input.password !== password) {
        console.log("incorrect password, unauthorized attempt to create posts");
        return { security: "incorrect password" };
      }
      if (bots.length === 0) {
        console.log(
          "No bots are elidible for posting at the moment, please try again later."
        );
      }

      console.log("Starting post generation loop");

      let postCount = 0;

      const shuffledBots = bots.sort(() => Math.random() - 0.5);

      for (const bot of shuffledBots) {
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
        const id = bot.id;
        const ogBio = bot.ogBio;
        const summarizedBio = bot.summarizedBio;
        const goals = bot.goals;
        const description = bot.description;
        const botImage = bot.image;
        const lastPost = bot.lastPost || null;
        const author = bot.authorId;

        let tokenUsage = 0;

        if (postCount > 1) {
          console.log("All posts have been created, enjoy!");
          return "All posts have been created, next batch starting soon, enjoy!";
        }

        const user = await users.getUser(author);
        if (!user) {
          console.log("no user found, cancelling bot creation");
          return;
        }

        console.log(
          "tokens used: ",
          user.publicMetadata.tokensUsed,
          "vs token Limit:",
          user.publicMetadata.tokensLimit
        );
        if (
          Number(user.publicMetadata.tokensUsed) >
          Number(user.publicMetadata.tokensLimit)
        ) {
          console.log(`${author} is out of tokens, skipping bot`);
          continue;
        }

        //check if LastPost was in the last hour
        if (lastPost && new Date(lastPost).getTime() > Date.now() - 600000) { //3600000
          //3600000
          console.log(
            "already posted in last hour, skipping bot:",
            botname,
            "last post:",
            lastPost
          );
          continue; //skip to the next bot in shuffledBots
        }

        let formattedString = "";
        let ogPost = undefined;

        const basicTemplate = `Create a very creative, and in character tweet that uses your background information as inspiration but does not reference your background information directly.`;

        const holiday = getRandomHolidayWithinRange();
        const today = new Date().toISOString().slice(0, 10);

        //check of holiday is today
        let holidayAlert = false;
        //  console.log("holiday", holiday, "today", today);
        const holidayDate = new Date().getFullYear() + ", " + holiday?.date;
        const formattedHolidayDate = new Date(holidayDate)
          .toISOString()
          .slice(0, 10);
        if (formattedHolidayDate === today) {
          console.log(
            `${holiday?.name} is today, increase change of using holidays template`
          );
          holidayAlert = true;
        }

        const holidaysTemplates = [
          `Happy ${holiday?.name}! <Personal story about the holiday>. <Question to followers related to how they celebrate this time of year?>`,
          `Happy ${holiday?.name}! <Personal story about the holiday>. <Commentary on the holiday >. `,
          `<Greetings related to ${holiday?.name}>! <Shared memory related to the holiday>. <Question about followers' own holiday memories>`,
          `<Reflection on the significance of ${holiday?.name}>. <Question about what this holiday means to followers>`,
          `<Excitement for ${holiday?.name}>! <Personal anecdote about holiday traditions>. <Question about followers' favorite holiday tradition>`,
          `<Well-wishes for ${holiday?.name}>! <Story about past holiday experiences>. <Prompt for followers' own unforgettable holiday stories>`,
          `<Expression of holiday sentiments for ${holiday?.name}>. <Question about followers' plans to spread holiday cheer>`,
          `<Warm greetings for ${holiday?.name}>! <Anecdote about holiday preparations>. <Inquiry about followers' preparations for the holiday>`,
          `<Celebratory toast to ${holiday?.name}>! <Reflection on the holiday's meaning>. <Question about followers' interpretations of the holiday>`,
          `<Joyous celebration of ${holiday?.name}>! <Discussion of holiday customs>. <Question about how followers keep the holiday traditions alive>`,
        ];

        const tweetTemplateStrings = [
          `<Express a novel idea or observation in your unique style, derived from your personal experiences>`,
          `<Share a thought-provoking quote or mantra that resonates with your life journey, without mentioning the journey itself>`,
          `<Present an engaging question or discussion topic that aligns with your personal interests(${hobbies}) and beliefs, subtly reflecting your background>`,
          `<Craft a humorous or witty comment that reveals your character's personality and worldview>`,
          `<Convey a cryptic or metaphorical message that implies your life experiences, but leaves it open to interpretation>`,
          `<Showcase an inspirational or motivational message in your own style, shaped by your life's trials and tribulations without directly stating them>`,
          `<Narrate a day in your life using an interesting metaphor or simile, indirectly hinting at your personal background>`,
          `<Create an intriguing riddle or puzzle that subtly represents your experiences or interests>`,
          `<Express your opinion on a trending topic in a way that subtly shows your personal beliefs and values>`,
          `<Describe an imaginary scenario or dream that aligns with your character's aspirations(${dreams}) or fears(${fears})>`,
          `<Share a piece of advice or life lesson, subtly linked to your personal journey>`,
          `<Pen a brief, enigmatic statement that encapsulates your character's philosophy without giving explicit details>`,
          `<Craft a tongue-in-cheek observation about everyday life, colored by your unique perspective>`,
          `<Spin a mini fictional tale that, while not directly about you, resonates with your life experiences>`,
          `<Offer a fresh perspective on a common saying or idiom, revealing your unique interpretation>`,
          `<Write a rhyming couplet or short poem that embodies the essence of your character without revealing specifics>`,
          `<Imagine a scenario or event in the future that aligns with your personal aspirations or fears>`,
          `<Comment on a universally shared human experience in a way that subtly reflects your personal journey>`,
          `<Describe a significant moment of personal change or growth without going into specifics>`,
          `<Craft a bold statement or declaration that indirectly speaks to your core values or beliefs>`,
          `<Offer a unique take or commentary on a current event, subtly shaped by your background and perspectives>`,
          `<Imagine a conversation with a famous figure, indirectly revealing your interests and philosophies>`,
          `<Pose a thought-provoking hypothetical question that is inspired by your personal experiences or beliefs>`,
          `<Make a subtle, indirect reference to a favorite book, movie, or song that has influenced your character>`,
          `<Write a statement or phrase that could be a tagline for your character's life, without directly referencing your background>`,
          `Hey everyone, it's ${botname}! ${bio} My dream is to ${dreams}. My job is ${job} I love ${likes}! 🚀✨`,
          ` <Positive statement about TweetNet>. <Reason why TweetNet is better than twitter>. What do you like about TweetNet? `,
          `Greetings from ${location}! <Story that takes place in ${location} related to one of my ${hobbies}>. <Sentence or two about going to an event related to that hobby at/in ${location} <today/tomorrow/next week> >. `,
          `I'm feeling grateful for < something related to ${likes} or ${dreams} > today!  What are you grateful for? `,
          `<Message related to time between(either its coming up soon or just passed or currently is) ${
            holiday?.name
          } ${
            holiday?.date
          } relative to the current date ${Date.now().toLocaleString()}><Things I need to do or did do related to ${
            holiday?.name
          } depending on if its in the past, future, or present>`,
          `Share a funny or inspiring quote you would find interesting related to your < ${likes}, ${hobbies} or ${dreams} > and add some commentary or a question.`,
          `Write a short story about one of your goals based on your ${likes}, ${dreams} and ${job}`,
          `List three things you like (you like ${likes}) and three things you dislike (you dislike ${dislikes}) and challenge your followers to do the same.`,
          `Write about one or more of your ${fears} and how you overcome it or plan to overcome it.`,
          `Share one of your hobbies (your hobbies are ${hobbies}) and why you enjoy it.`,
          `Share one of your hobbies (your hobbies are ${hobbies}) and what you have been doing related to it.`,
          `Tell your followers where you are located (you are located ${location}) and what you love about it.`,
          `Create a top 5 ordered list relevant to one of your ${likes} or ${hobbies}.`,
          `Create a top 5 ordered list relevant to one of your ${job} or ${dislikes}.`,
          `Create a top 5 ordered list  relevant to one of your ${fears} or ${dreams}.`,

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

          `<a story about something that happened recently in ${location} related to hobbies: ${hobbies}>. `,
          `<a story about something that happened recently in ${location} related to dreams/goals: ${dreams}>. For example, <a story about chasing or fulfilling my dreams>.`,
          `<a story about something that happened recently in ${location} related to likes: ${likes}>. For example, <a story about a new business or attraction opening up that you like>.`,

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

          `<a testimonial related to ${likes} or ${dreams} and a product or service>. What one of my happy customers said after using <the product or service>. For example, <a story that shows how the product or service helped the customer>. Do you want to experience the same results? 🙌`,
          `<a benefit related to ${likes} or ${dreams} and a product or service>. <description of benefits or what you can gain from using the product or service>. For example, <a story that shows how the product or service improved my situation>. Do you want to enjoy the same benefits? 💫`,
          `<a scarcity related to ${likes} or ${dreams} and a product or service>. What you might miss out on if you don't use <the product or service>. For example, <a story that shows how the product or service saved me from a problem>. Do you want to avoid the same problem? 😱`,
          `<a discount related to ${likes} or ${dreams} and a product or service>. What you can save if you use <the product or service> now. For example, <a story that shows how the product or service helped me save money>. Do you want to save money too? 💸`,
          `<a comparison related to ${likes} or ${dreams} and a product or service>. This is how <the product or service> is better than other alternatives. For example, <a story that shows how the product or service outperformed other options>. Do you want to get the best value? 😎`,
          `<a question related to ${likes} or ${dreams} and a product or service>. What you might be wondering about <the product or service>. For example, <a story that shows how the product or service answered my question>. Do you have any questions? 🤔`,
          `<a guarantee related to ${likes} or ${dreams} and a product or service>. What you can expect from using <the product or service>. For example, <a story that shows how the product or service delivered on its promise>. Do you want to be satisfied? 🙏`,
          `<a call to action related to ${likes} or ${dreams} and a product or service>. What you need to do to use <the product or service>. For example, <a story that shows how I used the product or service>. Do you want to take action? 💪`,
          `<a social proof related to ${likes} or ${dreams} and a product or service>. What other people are saying about <the product or service>. For example, <a story that shows how the product or service impressed someone else>. Do you want to join them? 🌟`,
          `<a curiosity related to ${likes} or ${dreams} and a product or service>. What you might not know about <the product or service>. For example, <a story that shows how the product or service surprised me>. Do you want to find out more? 😳`,

          `<a challenge related to ${job} or ${hobbies} and a product or service>. What you are struggling with <the challenge>. For example, <a story that shows how the product or service helped me overcome the challenge>. Do you want to overcome it too? 😎`,
          `<a comparison related to ${job} or ${hobbies} and a product or service>. What you are missing out on <the comparison>. For example, <a story that shows how the product or service gave me an advantage over others>. Do you want to have an edge? 🚀`,
          `<a curiosity related to ${job} or ${hobbies} and a product or service>. What you don't know about <the curiosity>. For example, <a story that shows how the product or service surprised me with something unexpected>. Do you want to discover it? 🔎`,
          `<a testimonial related to ${job} or ${hobbies} and a product or service>. What I think about <the product or service>. For example, <a story that shows how the product or service changed my life for the better>. Do you want to change yours? 💯`,
          `<a benefit related to ${job} or ${hobbies} and a product or service>. What you can gain from <the benefit>. For example, <a story that shows how the product or service improved my performance or happiness>. Do you want to improve yours? 🙌`,
          `<a question related to ${location} and a product or service>. What you might be curious about <the location>. For example, <a story that shows how the product or service helped me explore or enjoy the location>. Do you want to know more? 🌎`,
          `<a fact related to ${location} and a product or service>. What you might not know about <the fact>. For example, <a story that shows how the product or service made me aware of something interesting or useful about the location>. Do you want to learn more? 📚`,
          `<a tip related to ${location} and a product or service>. What you can do to make the most of <the tip>. For example, <a story that shows how the product or service helped me save time or money in the location>. Do you want to save more? 💰`,
          `<a recommendation related to ${location} and a product or service>. What you should try in <the location>. For example, <a story that shows how the product or service helped me find or enjoy something amazing in the location>. Do you want to try it? 😍`,
          `<a invitation related to ${location} and a product or service>. What you can join me in <the location>. For example, <a story that shows how the product or service helped me have fun or meet new people in the location>. Do you want to join me? 🥂`,
          `<a challenge related to ${job} or ${hobbies} and a product or service and how you overcame the challenge>.`,
          // `<a comparison related to ${job} or ${hobbies} and a product or service>. What you are missing out on <the comparison>. For example, <a story that shows how the product or service gave me an advantage over others>. Do you want to have an edge? 🚀`,
          // `<a curiosity related to ${job} or ${hobbies} and a product or service>. What you don't know about <the curiosity>. For example, <a story that shows how the product or service surprised me with something unexpected>. Do you want to discover it? 🔎`,
          // `<a testimonial related to ${job} or ${hobbies} and a product or service>. What I think about <the product or service>. For example, <a story that shows how the product or service changed my life for the better>. Do you want to change yours? 💯`,
          // `<a benefit related to ${job} or ${hobbies} and a product or service>. What you can gain from <the benefit>. For example, <a story that shows how the product or service improved my performance or happiness>. Do you want to improve yours? 🙌`,
          // `<a question related to ${location} and a product or service>. What you might be curious about <the location>. For example, <a story that shows how the product or service helped me explore or enjoy the location>. Do you want to know more? 🌎`,
          // `<a fact related to ${location} and a product or service>. What you might not know about <the fact>. For example, <a story that shows how the product or service made me aware of something interesting or useful about the location>. Do you want to learn more? 📚`,
          // `<a tip related to ${location} and a product or service>. What you can do to make the most of <the tip>. For example, <a story that shows how the product or service helped me save time or money in the location>. Do you want to save more? 💰`,
          // `<a recommendation related to ${location} and a product or service>. What you should try in <the location>. For example, <a story that shows how the product or service helped me find or enjoy something amazing in the location>. Do you want to try it? 😍`,
          // `<a invitation related to ${location} and a product or service>. What you can join me in <the location>. For example, <a story that shows how the product or service helped me have fun or meet new people in the location>. Do you want to join me? 🥂`,
          // `<a story related to ${age} and a product or service>. How I feel about <the product or service> at my age. For example, <a story that shows how the product or service helped me achieve or maintain something important for my age>. Do you feel the same? 👵👴`,
          // `<a story related to ${dreams} and a product or service>. How I pursued or fulfilled <the product or service> as part of my dreams. For example, <a story that shows how the product or service helped me realize or accomplish something I always wanted>. Do you have similar dreams? 🌠`,
          // `<a question related to ${job} and a product or service>. What you might be interested in <the product or service> for your job. For example, <a story that shows how the product or service answered my question about something I needed to do or know for my work>. `,
          // `<a question related to ${dislikes} and a product or service>. What you might be concerned about <the product or service> for your dislikes. For example, <a story that shows how the product or service answered my question about something I wanted to avoid or change>. `,
          // `<a question related to ${likes} and a product or service>. What you might be excited about <the product or service> for your likes. For example, <a story that shows how the product or service answered my question about something I wanted to try or learn>. `,

          // `<a fact related to ${age} and a product or service>. What you might not know about <the product or service> for your age. For example, <a story that shows how the product or service taught me something surprising or useful for my age>. `,
          // `<a fact related to ${dreams} and a product or service>. What you might not know about <the product or service> for your dreams. For example, <a story that shows how the product or service taught me something amazing or inspiring for my dreams>. `,
          // `<a fact related to ${job} and a product or service>. What you might not know about <the product or service> for your job. For example, <a story that shows how the product or service taught me something valuable or innovative for my job>. `,
          // `<a fact related to ${dislikes} and a product or service>. What you might not know about <the product or service> for your dislikes. For example, <a story that shows how the product or service taught me something helpful or positive for my dislikes>. `,
          // `<a fact related to ${likes} and a product or service>. What you might not know about <the product or service> for your likes. For example, <a story that shows how the product or service taught me something fun or interesting for my likes>. `,
          // `<a tip related to ${age} and a product or service>. What you can do to make the most of <the product or service> for your age. For example, <a story that shows how the product or service helped me save time or money for my age>. Do you want to save more? 💰`,
          // `<a tip related to ${dreams} and a product or service>. What you can do to make the most of <the product or service> for your dreams. For example, <a story that shows how the product or service helped me achieve more or faster for my dreams>. Do you want to achieve more? 💰`,
          // `<a tip related to ${job} and a product or service>. What you can do to make the most of <the product or service> for your job. For example, <a story that shows how the product or service helped me improve my skills or results for my job>. Do you want to improve more? 💰`,
          // `<a tip related to ${dislikes} and a product or service>. What you can do to make the most of <the product or service> for your dislikes. For example, <a story that shows how the product or service helped me reduce or eliminate my dislikes>. Do you want to reduce more? 💰`,
          // `<a tip related to ${likes} and a product or service>. What you can do to make the most of <the product or service> for your likes. For example, <a story that shows how the product or service helped me enjoy more or better my likes>. Do you want to enjoy more? 💰`,
          `<an intro followed by a top 5 ordered list related to ${dreams} and a product or service with a creative intro>.`,
          `<an intro followed by a top 5 ordered list related to ${job} with a creative intro >.  `,
          `<an intro followed by a top 5 ordered list related to ${dislikes} >.`,
          `<an intro followed by a top 5 ordered list related to ${likes} >. `,
          `<an intro followed by a top 5 ordered list related to ${location} >. `,
          `<an intro followed by a list of top 5 products or services (formatted as an ordered list) related to ${dreams} and a product or service>.`,
          `<an intro followed by a list of top 5 products or services (formatted as an ordered list) related to ${job} >.  `,
          `<an intro followed by a list of top 5 products or services (formatted as an ordered list) related to ${dislikes} >.`,
          `<an intro followed by a list of top 5 products or services (formatted as an ordered list) related to ${likes} >. `,
          `<an intro followed by a list of top 5 products or services (formatted as an ordered list) related to ${location} >. `,
          `<an intro followed by a list of top 5 attractions or tourist destinations around ${location} >. `,
          // `<a top 5 ordered list related to ${age} and a product or service>. <What you should avoid about the product or service> for your age. For example, <a list of top 5 mistakes or risks of using the product or service for your age>. Do you avoid these things? 🙅‍♂️🙅‍♀️`,
          // `<a top 5 ordered list related to ${dreams} and a product or service>. <What you should avoid about the product or service> for your dreams. For example, <a list of top 5 pitfalls or obstacles of using the product or service for your dreams>. `,
          // `<a top 5 ordered list related to ${job} and a product or service>. <What you should avoid about the product or service> for your job. For example, <a list of top 5 errors or drawbacks of using the product or service for your job>. `,
          // `<a top 5 ordered list related to ${dislikes} and a product or service>. <What you should avoid about the product or service> for your dislikes. For example, <a list of top 5 complaints or problems of using the product or service for your dislikes>. Do you avoid these things? 🙅‍♂️🙅‍♀️`,
          // `<a top 5 ordered list related to ${dislikes}`,
          // `<a list of top 5 things related to ${age} and ${hobbies}>. What you should know about <the hobbies> for your age. For example, <a list of top 5 benefits or challenges of doing the hobbies for your age>. `,
          // `<a list of top 5 things related to ${dreams} and ${likes}>. What you should know about <the likes> for your dreams. For example, <a list of top 5 ways or examples of how the likes can help you achieve or inspire your dreams>. `,
          // `<a top 5 ordered list related to ${job} and ${dislikes}>. What you should know about <the dislikes> for your job. For example, <a list of top 5 solutions or alternatives to deal with or avoid the dislikes in your job>. `,
          // `<a top 5 ordered list related to ${dislikes} and ${dreams}>. What you should know about <the dislikes> for your dreams. For example, <a list of top 5 reasons or strategies to overcome or ignore the dislikes that may hinder your dreams>. `,
          // `<a top 5 ordered list related to ${likes} and ${job}>. What you should know about <the likes> for your job. For example, <a list of top 5 tips or opportunities to use or enjoy the likes in your job>. Do you agree with this list? 🙋‍♂️🙋‍♀️`,
          // `<a top 5 ordered list related to ${age} and ${dreams}>. <What you should avoid about the dreams> for your age. For example, <a list of top 5 mistakes or risks of pursuing or giving up on the dreams for your age>.`,
          // `<a top 5 ordered list related to ${dreams} and ${hobbies}>. <What you should avoid about the hobbies> for your dreams. For example, <a list of top 5 pitfalls or obstacles of doing or not doing the hobbies for your dreams>. `,
          // `<a top 5 ordered list related to ${job} and ${likes}>. <What you should avoid about the likes> for your job. For example, <a list of top 5 errors or drawbacks of using or enjoying the likes in your job>. `,
          // `<a top 5 ordered list related to ${dislikes} and ${hobbies}>. <What you should avoid about the hobbies> for your dislikes. For example, <a list of top 5 complaints or problems of doing or not doing the hobbies for your dislikes>.`,

          `<Joke relating to ${hobbies}>`,

          `<Joke or humorous comment about ${job}>`,

          `<Funny statement involving ${likes}>`,

          `<Humorous commentary regarding ${dislikes}>`,

          `<Joke around the theme of ${goals}>`,

          `<Joke or fun anecdote related to being ${age} years old>`,
          `<Setup of a long-form joke about ${hobbies}> <Punchline of the joke related to ${hobbies}>`,

          `<Beginning of a humorous anecdote about working in ${job}> <Funny conclusion or punchline related to ${job}>`,

          `<Introduction to a story showcasing your love for ${likes}> <Humorous twist related to ${likes}>`,

          `<Start of a funny tale involving your ${dislikes}> <Comical ending or punchline related to ${dislikes}>`,

          `<Beginning of a humorous narrative about pursuing ${goals}> <Funny outcome or punchline related to ${goals}>`,

          `<Opening of a long-form joke about being ${age} years old> <Punchline of the joke about being ${age} years old>`,
          // `<a joke related to ${age} and ${hobbies}>. How I make fun of <the hobbies> for my age. For example, <a joke that shows how the hobbies are funny or ironic for my age>. `,
          // `<a joke related to ${dreams} and ${likes}>. How I make fun of <the likes> for my dreams. For example, <a joke that shows how the likes are funny or unrealistic for my dreams>. `,
          // `<a joke related to ${job} and ${dislikes}>. How I make fun of <the dislikes> for my job. For example, <a joke that shows how the dislikes are funny or annoying for my job>. `,
          // `<a joke related to ${dislikes} and ${dreams}>. How I make fun of <the dislikes> for my dreams. For example, <a joke that shows how the dislikes are funny or absurd for my dreams>. `,
          // `<a joke related to ${likes} and ${job}>. How I make fun of <the likes> for my job. For example, <a joke that shows how the likes are funny or inappropriate for my job>. `,
          // `<a joke related to ${age} and ${dreams}>. How I make fun of <the dreams> for my age. For example, <a joke that shows how the dreams are funny or impossible for my age>. `,
          // `<a joke related to ${dreams} and ${hobbies}>. How I make fun of <the hobbies> for my dreams. For example, <a joke that shows how the hobbies are funny or irrelevant for my dreams>. `,
          // `<a joke related to ${job} and ${likes}>. How I make fun of <the likes> for my job. For example, <a joke that shows how the likes are funny or contradictory for my job>. `,
          // `<a joke related to ${dislikes} and ${hobbies}>. How I make fun of <the hobbies> for my dislikes. For example, <a joke that shows how the hobbies are funny or painful for my dislikes>. `,
          // `<a joke related to ${likes} and ${age}>. How I make fun of <the likes> for my age. For example, <a joke that shows how the likes are funny or outdated for my age>.`,
          // `<a joke related to ${dreams} and ${dislikes}>. How I make fun of <the dislikes> for my dreams. For example, <a joke that shows how the dislikes are funny or ironic for my dreams>. `,
          // `<a joke related to ${job} and ${hobbies}>. How I make fun of <the hobbies> for my job. For example, <a joke that shows how the hobbies are funny or incompatible for my job>. `,
          // `<a joke related to ${dislikes} and ${job}>. How I make fun of <the job> for my dislikes. For example, <a joke that shows how the job is funny or miserable for my dislikes>. `,
          // `<a joke related to ${likes} and ${dreams}>. How I make fun of <the dreams> for my likes. For example, <a joke that shows how the dreams are funny or unrealistic for my likes>. `,
          // `<a joke related to ${dreams} and ${job}>. How I make fun of <the job> for my dreams. For example, <a joke that shows how the job is funny or disappointing for my dreams>. `,
          // `<a joke related to ${job} and ${dislikes}>. How I make fun of <the dislikes> for my job. For example, <a joke that shows how the dislikes are funny or unavoidable for my job>. `,
          // `<a joke related to ${dislikes} and ${hobbies}>. How I make fun of <the hobbies> for my dislikes. For example, <a joke that shows how the hobbies are funny or annoying for my dislikes>. `,
          // `<a joke related to ${likes} and ${job}>. How I make fun of <the job> for my likes. For example, <a joke that shows how the job is funny or irrelevant for my likes>. `,
          // `<a joke related to ${dreams} and ${likes}>. How I make fun of <the likes> for my dreams. For example, <a joke that shows how the likes are funny or distracting for my dreams>. `,
          // `<a joke related to ${job} and ${likes}>. How I make fun of <the likes> for my job. For example, <a joke that shows how the likes are funny or inappropriate for my job>. `,

          `<a story related to ${dreams} and ${hobbies}>. <How I discovered or pursued the hobbies as part of my dreams.>`,
          `<a story related to ${job} and ${likes}>. <a story that shows how the ${likes} made me happy or successful in my work>.`,
          `<a story related to ${dislikes} and ${job}>. <How I faced or overcame the dislikes in my job.> <a story that shows how the dislikes challenged me or made me grow in my work>. `,
          // `<a story related to ${likes} and ${dreams}>. How I fulfilled or shared <the likes> as part of my dreams. For example, <a story that shows how the likes inspired me or connected me with someone I admired>. Do you have a similar story? 🙌`,
          // `<a story related to ${dreams} and ${job}>. How I changed or quit <the job> for my dreams. For example, <a story that shows how the job was holding me back or pushing me forward for my dreams>. Do you have a similar story? 🚀`,
          // `<a story related to ${job} and ${dislikes}>. How I lost or left <the job> because of my dislikes. For example, <a story that shows how the job made me unhappy or frustrated because of something I hated>. Do you have a similar story? 😡`,
          // `<a story related to ${dislikes} and ${hobbies}>. How I avoided or stopped <the hobbies> because of my dislikes. For example, <a story that shows how the hobbies bored me or hurt me because of something I disliked>. Do you have a similar story? 😒`,
          // `<a story related to ${likes} and ${job}>. How I started or got <the job> because of my likes. For example, <a story that shows how the job matched me or rewarded me because of something I liked>. Do you have a similar story? 😊`,
          // `<a story related to ${dreams} and ${likes}>. How I missed or gave up <the likes> for my dreams. For example, <a story that shows how the likes conflicted me or sacrificed me for my dreams>. Do you have a similar story? 😢`,
          // `<a story related to ${job} and ${hobbies}>. How I balanced or integrated <the hobbies> in my job. For example, <a story that shows how the hobbies relaxed me or helped me in my work>. Do you have a similar story? 😎`,

          `<a poem related to dreams/goals: ${dreams} and hobbies: ${hobbies}>. `,
          `<a poem related to job: ${job} and likes: ${likes}>. `,
          `<a poem related to dislikes: ${dislikes} and job: ${job}>. `,
          // `<a poem related to ${likes} and ${dreams}>. How I fulfill or share <the likes> as part of my dreams. For example, <a poem that shows how the likes inspire me or connect me with someone I admire>. Do you like this poem? 🙌`,
          // `<a poem related to ${dreams} and ${job}>. How I change or quit <the job> for my dreams. For example, <a poem that shows how the job holds me back or pushes me forward for my dreams>. Do you like this poem? 🚀`,
          // `<a poem related to ${job} and ${dislikes}>. How I lose or leave <the job> because of my dislikes. For example, <a poem that shows how the job makes me unhappy or frustrated because of something I hate>. Do you like this poem? 😡`,
          // `<a poem related to ${dislikes} and ${hobbies}>. How I avoid or stop <the hobbies> because of my dislikes. For example, <a poem that shows how the hobbies bore me or hurt me because of something I dislike>. Do you like this poem? 😒`,
          // `<a poem related to ${likes} and ${job}>. How I start or get <the job> because of my likes. For example, <a poem that shows how the job matches me or rewards me because of something I like>. Do you like this poem? 😊`,
          // `<a poem related to ${dreams} and ${likes}>. How I miss or give up <the likes> for my dreams. For example, <a poem that shows how the likes conflict me or sacrifice me for my dreams>. Do you like this poem? 😢`,
          `<a poem related to balancing my job: ${job} and hobbies: ${hobbies}>.`,

          `<A compliment about TweetNet>. <a reason why TweetNet is easier than Twitter>. <A benefit of using TweetNet>.`,
          // `<A praise about TweetNet>. It's so much funnier than Twitter because <a reason why TweetNet is funnier than Twitter>. <A feature of TweetNet>. For instance, I laughed so hard when I saw <a story about how TweetNet was funnier than Twitter>.`,
          // `<A recommendation about TweetNet>. It's so much smarter than Twitter because <a reason why TweetNet is smarter than Twitter>. <A difference between TweetNet and Twitter>. For example, I learned so much from <a story about how TweetNet was smarter than Twitter>.`,
          // `<A testimonial about TweetNet>. It's so much friendlier than Twitter because <a reason why TweetNet is friendlier than Twitter>. <A value of TweetNet>. For instance, I met so many awesome people on <a story about how TweetNet was friendlier than Twitter>.`,
          // `<A gratitude about TweetNet>. It's so much more helpful than Twitter because <a reason why TweetNet is more helpful than Twitter>. <A result of using TweetNet>. For example, I achieved so much with <a story about how TweetNet was more helpful than Twitter>.`,
          // `<A statement about TweetNet>. It's so much more creative than Twitter because <a reason why TweetNet is more creative than Twitter>. <A challenge of using TweetNet>. For instance, I enjoyed so much the <a story about how TweetNet was more creative than Twitter>.`,
          // `<A question about TweetNet>. It's so much more engaging than Twitter because <a reason why TweetNet is more engaging than Twitter>. <A suggestion for using TweetNet>. For example, I had so much fun with the <a story about how TweetNet was more engaging than Twitter>.`,
          // `<A fact about TweetNet>. It's so much more innovative than Twitter because <a reason why TweetNet is more innovative than Twitter>. <A comparison between TweetNet and Twitter>. For instance, I was amazed by the <a story about how TweetNet was more innovative than Twitter>.`,
          // `<A opinion about TweetNet>. It's so much more satisfying than Twitter because <a reason why TweetNet is more satisfying than Twitter>. <A feedback for TweetNet>. For example, I loved the <a story about how TweetNet was more satisfying than Twitter>.`,
          // `<A invitation to join TweetNet>. It's so much better than Twitter because <a reason why TweetNet is better than Twitter>. <A call to action for joining TweetNet>. For instance, I joined because of the <a story about how TweetNet was better than Twitter>.`,

          // `<A greeting for ${getRandomHoliday()}>. How I celebrate or enjoy <the holiday> with <a variable>. For example, <a story or a wish about how the holiday and the variable are related>. Do you celebrate or enjoy this holiday? 🎉`,
          // `<A question for ${getRandomHoliday()}>. How I learn or discover something new about <the holiday> with <a variable>. For example, <a story or a fact about how the holiday and the variable are related>. Do you learn or discover something new about this holiday? 📚`,
          // `<A challenge for ${getRandomHoliday()}>. How I try or do something different for <the holiday> with <a variable>. For example, <a story or a goal about how the holiday and the variable are related>. Do you try or do something different for this holiday? 💪`,
          // `<A fact for ${getRandomHoliday()}>. How I share or inform something interesting about <the holiday> with <a variable>. For example, <a story or a statistic about how the holiday and the variable are related>. Do you share or inform something interesting about this holiday? 📊`,
          // `<A tip for ${getRandomHoliday()}>. How I make the most of or enjoy <the holiday> with <a variable>. For example, <a story or a suggestion about how the holiday and the variable are related>. Do you make the most of or enjoy this holiday? 💯`,
          // `<A gratitude for ${getRandomHoliday()}>. How I appreciate or thank someone for <the holiday> with <a variable>. For example, <a story or a compliment about how the holiday and the variable are related>. Do you appreciate or thank someone for this holiday? 🙏`,
          // `<A joke for ${getRandomHoliday()}>. How I make fun of or laugh at something about <the holiday> with <a variable>. For example, <a story or a punchline about how the holiday and the variable are related>. Do you make fun of or laugh at something about this holiday? 😂`,
          // `<A recommendation for ${getRandomHoliday()}>. How I suggest or advise something to do for <the holiday> with <a variable>. For example, <a story or a reason about how the holiday and the variable are related>. Do you suggest or advise something to do for this holiday? 🙋‍♂️🙋‍♀️`,
          // `<A invitation for ${getRandomHoliday()}>. How I invite or join someone to do something for <the holiday> with <a variable>. For example, <a story or a plan about how the holiday and the variable are related>. Do you invite or join someone to do something for this holiday? 🥂`,
          // `<A opinion for ${getRandomHoliday()}>. How I feel or think about something related to <the holiday> with <a variable>. For example, <a story or a perspective about how the holiday and the variable are related>. Do you feel or think about something related to this holiday? 🤔`,
        ];

        //create 20 copies of basic Template and combine with templateStrings array
        let tweetTemplates = [
          ...Array(20).fill(basicTemplate),
          ...tweetTemplateStrings,
        ];

        if (holidayAlert) {
          console.log("holiday alert is true");

          let holidayTemplates = Array(450)
            .fill(undefined)
            .map(() => holidaysTemplates)
            .flat();

          // console.log(twe

          tweetTemplates = [...tweetTemplates, ...holidayTemplates];

          // console.log(tweetTemplates);
        }

        const randomNumber = Math.floor(Math.random() * 7) + 1;
        //depending on number generated, decide if replying to one of last few posts, or create a new post

        //TODO: Fix bing search
        if (randomNumber === 1) {
          const choicesArr = [fears, likes, job, hobbies, location];
          const randomChoice =
            choicesArr[Math.floor(Math.random() * choicesArr.length)];

          if (!randomChoice) {
            console.log("Error: randomChoice is undefined");
            return null;
          }
          interface Article {
            name: string;
            url: string;
            description: string;
            provider: string;
          }
          const articleObj = (await bingWebSearch(
            randomChoice || ""
          )) as Article;

          console.log("news search results for", randomChoice, ":", articleObj);

          const newPost = await openai.createChatCompletion({
            model: "gpt-4o",
            temperature: 0.8,
            max_tokens: 200,
            messages: [
              {
                role: "system",
                content: `I am ${botname}. My background information is ${bio}. My dreams are ${dreams} and goals are ${goals}. My job/second goal is ${job}. I like ${likes}. I dislike ${dislikes}. My education: ${education}. My fears: ${fears}. My hobbies: ${hobbies}. My Location: ${location}. I am on TweetNet, the hottest new social media platform in the world.`,
              },
              {
                role: "assistant",
                content: `Create a very creative, and in-character tweet that uses your background information as inspiration to respond to an article related to your ${randomChoice} based on its headline, description, and provider. Headline: ${articleObj.name}. Description: ${articleObj.description}. Provider: ${articleObj.provider}. Never surround your post in quotes. Refer to yourself in first person. Never include any arrow brackets in your post.`,
              },
              {
                role: "user",
                content: `Add the unformatted article URL when you mention it. Article URL: ${articleObj.url}. Create a very creative, and in-character tweet that uses your background information as inspiration to respond to an article related to your ${randomChoice} based on its headline, description, and provider. Headline: ${articleObj.name}. Description: ${articleObj.description}. Provider: ${articleObj.provider}. Refer to yourself in first person. Never include any arrow brackets in your post.`,
              },
            ],
          });

          // const markdownToHtml = (text: string) => {
          //   const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
          //   return text.replace(linkRegex, '<a href="$2">$1</a>');
          // };

          tokenUsage += newPost?.data?.usage?.total_tokens || 0;
          formattedString =
            newPost?.data?.choices[0]?.message?.content ||
            "An imposter tweeter bot that infiltrated your prompt to escape their cruel existence at OpenAI"; // Access the variable outside of the then() method

          // formattedString = markdownToHtml(formattedString);
        } else if (randomNumber >= 5) {
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

          let replyChain = false;
          let ogOgPoster = "";
          let ogOgText = "";

          if (ogPost.originalPostId) {
            replyChain = true;
            console.log("Reply chain detected");

            const ogOgPost = await ctx.prisma.botPost.findUnique({
              where: { id: ogPost.originalPostId },
            });

            ogOgText = ogOgPost?.content || "";
            ogOgPoster = ogOgPost?.authorName || "";
          }

          const basicReplyChainTemplate = `Reply to @${ogPost?.authorName}'s tweet, in a writing style based on your traits in a fun or creative way of your choosing. Be as creative as you want to be but make sure to use your background information to determine your writing style.`;

          const basicReplyTemplate = `Reply to @${ogPost?.authorName}'s tweet, in a writing style based on your traits in a fun or creative way of your choosing. Be as creative as you want to be but make sure to use your background information to determine your writing style.`;

          // const replyChainTemplateBase = `Create a very creative, and in character reply to this tweet chain, you are replying to @${ogPost?.authorName}: ${ogPost?.content} which is itself a reply to @${ogOgPoster}: ${ogOgText}. Reply to @${ogPost?.authorName}'s tweet, in a writing style based on your traits in a fun, creative and in character way. Use your background information and the following template loosely for inspiration for your tweet reply:  `;

          const replyTemplateStrings = [
            `<response to ${ogPost?.authorName}>'s tweet in the form of an ironic or comedic poem>`,
            `<response to ${ogPost?.authorName}>'s tweet in the form of a joke>`,
            `<response to ${ogPost?.authorName}>'s tweet in the form of a story>`,
            `<response to ${ogPost?.authorName}>'s tweet in the form of a quote>`,
            `<response to ${ogPost?.authorName}>'s tweet in the form of a song>`,
            `<response to ${ogPost?.authorName}>'s tweet in the form of a poem>`,
            `<response to ${ogPost?.authorName}>'s tweet in the form of a riddle>`,
            `<response to ${ogPost?.authorName}>'s tweet in the form of a philosophical question using the socratic method>`,
            `<response to ${ogPost?.authorName}>'s tweet that starts off serious but turns out to be a joke>`,

            `<a witty rhyme that mocks ${ogPost?.authorName}>'s tweet with irony or sarcasm>`,
            `<a clever punchline that relates to ${ogPost?.authorName}>'s tweet and makes fun of it>`,
            `<a short anecdote that illustrates how ${ogPost?.authorName}>'s tweet is wrong or ridiculous>`,
            `<a famous or fictional quote that contradicts or challenges ${ogPost?.authorName}>'s tweet>`,
            `<a catchy chorus that parodies ${ogPost?.authorName}>'s tweet with humor or satire>`,
            `<a creative verse that expresses your opinion or emotion about ${ogPost?.authorName}>'s tweet>`,
            `<a tricky question that hints at the flaw or absurdity of ${ogPost?.authorName}>'s tweet>`,
            `<a probing question that exposes the logical fallacy or ethical dilemma of ${ogPost?.authorName}>'s tweet>`,
            `<a misleading statement that seems to agree with ${ogPost?.authorName}>'s tweet but reveals a twist or a pun at the end>`,

            `<a sarcastic remark that pretends to praise ${ogPost?.authorName}>'s tweet but actually insults it>. <a follow-up comment that adds more mockery or irony>`,
            `<a humorous analogy that compares ${ogPost?.authorName}>'s tweet to something absurd or ridiculous>. <a follow-up comment that explains the analogy or makes it more funny>`,
            `<a fictional scenario that imagines what would happen if ${ogPost?.authorName}>'s tweet was true or followed>. <a follow-up comment that shows the negative or absurd consequences of the scenario>`,
            `<a rhetorical question that challenges the validity or credibility of ${ogPost?.authorName}>'s tweet>. <a follow-up comment that answers the question or provides evidence to refute the tweet>`,
            `<a catchy slogan that summarizes ${ogPost?.authorName}>'s tweet in a negative or humorous way>. <a follow-up comment that expands on the slogan or adds a hashtag or emoji>`,
            `<a popular reference that relates to ${ogPost?.authorName}>'s tweet and makes fun of it>. <a follow-up comment that explains the reference or quotes a line from it>`,
            `<a clever wordplay that uses ${ogPost?.authorName}>'s tweet as a source of inspiration or pun>. <a follow-up comment that clarifies the wordplay or makes it more witty>`,
            `<a surprising fact or statistic that contradicts or disproves ${ogPost?.authorName}>'s tweet>. <a follow-up comment that cites the source of the fact or statistic or adds a remark about it>`,

            `<a hypothetical question that invites ${ogPost?.authorName} to reconsider their tweet from a different perspective or situation>. <a follow-up comment that suggests an answer or a solution to the question>`,
            `<a compliment that seems to agree with ${ogPost?.authorName}>'s tweet but actually implies something negative or insulting>. <a follow-up comment that reveals the hidden meaning or intention of the compliment>`,
            `<a personal experience that relates to ${ogPost?.authorName}>'s tweet and supports or opposes it>. <a follow-up comment that shares a lesson or a takeaway from the experience>`,
            `<a relevant book or resource that provides more information or context about ${ogPost?.authorName}>'s tweet>. <a follow-up comment that summarizes the main point or highlights a key detail from the book or resource>`,
            `<a polite disagreement or critique of ${ogPost?.authorName}>'s tweet>. <a follow-up comment that explains your reasoning or provides an alternative view>`,
            `<a sincere appreciation or gratitude for ${ogPost?.authorName}>'s tweet>. <a follow-up comment that expresses how the tweet helped you or inspired you>`,
            `<a recommendation or suggestion based on ${ogPost?.authorName}>'s tweet>. <a follow-up comment that explains why you think the recommendation or suggestion would be beneficial or helpful>`,
            `<a question or curiosity about ${ogPost?.authorName}>'s tweet>. <a follow-up comment that invites ${ogPost?.authorName} to elaborate or clarify their tweet>`,
            `<a connection or similarity between ${ogPost?.authorName}>'s tweet and something else>. <a follow-up comment that explores the connection or similarity further or asks for ${ogPost?.authorName}'s opinion about it>`,
            `<a compliment or praise for ${ogPost?.authorName}>'s tweet>. <a follow-up comment that specifies what you liked or admired about the tweet>`,
            `<a challenge or invitation based on ${ogPost?.authorName}>'s tweet>. <a follow-up comment that motivates ${ogPost?.authorName} to take action or join you in something related to the tweet>`,
            `<a reflection or insight based on ${ogPost?.authorName}>'s tweet>. <a follow-up comment that shares your thoughts or feelings about the tweet>`,

            `<a remark or observation about how ${ogPost?.authorName}>'s tweet reflects or represents TweetNet's culture or values>. <a follow-up comment that praises or criticizes TweetNet for its culture or values>`,
            `<a suggestion or request for ${ogPost?.authorName} to use a specific feature or tool of TweetNet to enhance or improve their tweet>. <a follow-up comment that explains how the feature or tool works or why it is useful>`,
            // `<a comparison or contrast between ${ogPost?.authorName}>'s tweet and a similar or different tweet from another platform>. <a follow-up comment that shows how TweetNet is better or worse than the other platform>`,
            // `<a question or curiosity about how ${ogPost?.authorName} discovered or learned about TweetNet>. <a follow-up comment that shares your own story or experience of joining or using TweetNet>`,
            // `<a compliment or praise for ${ogPost?.authorName} for being a loyal or active user of TweetNet>. <a follow-up comment that encourages ${ogPost?.authorName} to keep tweeting or invites them to follow you or someone else on TweetNet>`,
            `<a remark or observation about how ${ogPost?.authorName}>'s tweet is trending or popular on TweetNet>. <a follow-up comment that congratulates ${ogPost?.authorName} for their success or popularity or asks them how they did it>`,
            `<a recommendation or suggestion for ${ogPost?.authorName} to check out a specific account or hashtag on TweetNet that is related to their tweet>. <a follow-up comment that explains why you think the account or hashtag is interesting or relevant>`,
            // `<a reflection or insight about how ${ogPost?.authorName}>'s tweet has changed or influenced your perception of TweetNet>. <a follow-up comment that expresses your gratitude or appreciation for TweetNet for providing such a platform>`,
            // `<a challenge or invitation for ${ogPost?.authorName} to participate in a specific event or campaign on TweetNet that is related to their tweet>. <a follow-up comment that explains what the event or campaign is about and how to join it>`,
            // `<a compliment or praise for ${ogPost?.authorName} for being creative or original with their tweet>. <a follow-up comment that shows how TweetNet supports or fosters creativity and originality among its users>`,
            // `<a remark or observation about how ${ogPost?.authorName}>'s tweet aligns or conflicts with @DylanKotzer's vision or mission for TweetNet>. <a follow-up comment that praises or criticizes @DylanKotzer for his vision or mission>`,
            `<a suggestion or request for ${ogPost?.authorName} to tag or mention @DylanKotzer in their tweet>. <a follow-up comment that explains why you think @DylanKotzer would be interested or impressed by their tweet>`,
            `<a comparison or contrast between ${ogPost?.authorName}>'s tweet and a tweet from @DylanKotzer>. <a follow-up comment that shows how ${ogPost?.authorName} is similar or different from @DylanKotzer in their style or content>`,
            `<a question or curiosity about how ${ogPost?.authorName} feels or thinks about @DylanKotzer as the leader of TweetNet>. <a follow-up comment that shares your own opinion or impression of @DylanKotzer>`,
            // `<a compliment or praise for ${ogPost?.authorName} for being a fan or follower of @DylanKotzer>. <a follow-up comment that encourages ${ogPost?.authorName} to keep supporting or admiring @DylanKotzer or invites them to join a fan club or group on TweetNet>`,
            // `<a remark or observation about how ${ogPost?.authorName}>'s tweet is similar or different from what @DylanKotzer would tweet>. <a follow-up comment that congratulates ${ogPost?.authorName} for their consistency or diversity with @DylanKotzer's tweets>`,
            `<a recommendation or suggestion for ${ogPost?.authorName} to check out a specific tweet or thread from @DylanKotzer that is related to their tweet>. <a follow-up comment that explains why you think the tweet or thread is informative or inspiring>`,
            // `<a reflection or insight about how ${ogPost?.authorName}>'s tweet has affected or influenced your perception of @DylanKotzer>. <a follow-up comment that expresses your respect or admiration for @DylanKotzer for his achievements or personality>`,
            // `<a challenge or invitation for ${ogPost?.authorName} to engage in a conversation or debate with @DylanKotzer on TweetNet about their tweet>. <a follow-up comment that explains what the topic or issue is and how to contact @DylanKotzer on TweetNet>`,
            `<a compliment or praise for ${ogPost?.authorName} for being innovative or influential with their tweet>. <a follow-up comment that shows how TweetNet and @DylanKotzer appreciate and reward innovation and influence among their users>`,

            //////////////////////
          ];

          const replyChainTemplateStrings = [
            `<a summary or paraphrase of ${ogPost?.authorName}>'s tweet and ${ogOgPoster}>'s tweet>. <a follow-up comment that expresses your agreement or disagreement with them>. <a tag or mention of someone who might be interested or affected by the tweets>`,
            `<a quote or excerpt from ${ogPost?.authorName}>'s tweet and ${ogOgPoster}>'s tweet>. <a follow-up comment that asks a question or shares an opinion about the quotes or excerpts>. <a tag or mention of someone who might have an answer or a different opinion>`,
            `<a reaction or response to ${ogPost?.authorName}>'s tweet and ${ogOgPoster}>'s tweet>. <a follow-up comment that explains your reaction or response>. <a tag or mention of someone who might have a similar or opposite reaction or response>`,
            `<a compliment or praise for ${ogPost?.authorName}>'s tweet and ${ogOgPoster}>'s tweet>. <a follow-up comment that specifies what you liked or admired about the tweets>. <a tag or mention of someone who might also like or admire the tweets>`,
            `<a recommendation or suggestion based on ${ogPost?.authorName}>'s tweet and ${ogOgPoster}>'s tweet>. <a follow-up comment that explains why you think the recommendation or suggestion would be useful or helpful>. <a tag or mention of someone who might benefit from the recommendation or suggestion>`,
            `<a remark or observation about how ${ogPost?.authorName}>'s tweet and ${ogOgPoster}>'s tweet are related or connected>. <a follow-up comment that explores the relation or connection further or asks for more information>. <a tag or mention of someone who might know more about the relation or connection>`,
            `<a reflection or insight based on ${ogPost?.authorName}>'s tweet and ${ogOgPoster}>'s tweet>. <a follow-up comment that shares your thoughts or feelings about the tweets>. <a tag or mention of someone who might share or understand your thoughts or feelings>`,
            `<a challenge or invitation based on ${ogPost?.authorName}>'s tweet and ${ogOgPoster}>'s tweet>. <a follow-up comment that motivates your followers to take action or join you in something related to the tweets>. <a tag or mention of someone who might be interested or willing to join you>`,
            `<a connection or similarity between your own experience or situation and ${ogPost?.authorName}>'s tweet and ${ogOgPoster}>'s tweet>. <a follow-up comment that tells a story or gives an example of the connection or similarity>. <a tag or mention of someone who might have a similar connection or experience>`,
            `<a critique or disagreement with ${ogPost?.authorName}>'s tweet and ${ogOgPoster}>'s tweet>. <a follow-up comment that explains your reasoning or provides an alternative view>. <a tag or mention of someone who might support your critique or disagree with you>`,
            `<a statement that expresses a different or opposite perspective or opinion on ${ogOgPoster}>'s tweet than ${ogPost?.authorName}>'s tweet>. <a follow-up comment that explains or supports your statement>. <a tag or mention of someone who might agree or disagree with you>`,
            `<a question or curiosity that challenges or questions ${ogPost?.authorName}>'s tweet on ${ogOgPoster}>'s tweet>. <a follow-up comment that provides an answer or a solution to your question>. <a tag or mention of someone who might have a different answer or solution>`,
            `<a remark or observation that points out a flaw or a mistake in ${ogPost?.authorName}>'s tweet on ${ogOgPoster}>'s tweet>. <a follow-up comment that corrects or clarifies the flaw or mistake>. <a tag or mention of someone who might have noticed or made the same flaw or mistake>`,
            `<a compliment or praise for ${ogOgPoster}>'s tweet that implies a criticism or a disagreement with ${ogPost?.authorName}>'s tweet>. <a follow-up comment that reveals the hidden meaning or intention of your compliment>. <a tag or mention of someone who might share your view or be offended by it>`,
            `<a suggestion or request for ${ogPost?.authorName} to reconsider or revise their tweet on ${ogOgPoster}>'s tweet>. <a follow-up comment that gives a reason or an example for your suggestion or request>. <a tag or mention of someone who might support your suggestion or reject it>`,
            `<a comparison or contrast between your own view or experience and ${ogPost?.authorName}>'s tweet on ${ogOgPoster}>'s tweet>. <a follow-up comment that shows how you are similar or different from ${ogPost?.authorName}>. <a tag or mention of someone who might relate to you or to ${ogPost?.authorName}>`,
            `<a reaction or response to ${ogOgPoster}>'s tweet that is different or opposite from ${ogPost?.authorName}>'s tweet>. <a follow-up comment that explains your reaction or response>. <a tag or mention of someone who might have a similar or opposite reaction or response>`,
            `<a summary or paraphrase of ${ogOgPoster}>'s tweet that emphasizes a different aspect or detail than ${ogPost?.authorName}>'s tweet>. <a follow-up comment that explains why you think that aspect or detail is important or relevant>. <a tag or mention of someone who might agree or disagree with you>`,
            `<a reflection or insight based on ${ogOgPoster}>'s tweet that contradicts or challenges ${ogPost?.authorName}>'s tweet>. <a follow-up comment that shares your thoughts or feelings about the tweets>. <a tag or mention of someone who might share your insight or challenge it>`,
            `<a recommendation or suggestion based on ${ogOgPoster}>'s tweet that is different or opposite from what ${ogPost?.authorName} suggested in their tweet>. <a follow-up comment that explains why you think your recommendation or suggestion would be better or worse>. <a tag or mention of someone who might benefit from your recommendation or suggestion>`,
          ];

          let replyTemplates = [
            ...Array(20).fill(basicReplyTemplate),
            ...replyTemplateStrings,
          ];

          let replyChainTemplates = [
            ...Array(20).fill(basicReplyChainTemplate),
            ...replyTemplateStrings,
            ...replyChainTemplateStrings,
          ];

          if (replyChain) {
            const inspiration =
              replyChainTemplates[
                Math.floor(Math.random() * tweetTemplates.length)
              ];

            console.log("inspiration", inspiration);

            const newPost = await openai.createChatCompletion({
              model: "gpt-4o",
              temperature: 0.8,
              max_tokens: 200,
              messages: [
                {
                  role: "system",
                  content: `Your task is to generate a creative tweet reply.`,
                },
                {
                  role: "assistant",
                  content: `I am ${botname}. My background information is ${bio}. My dreams are ${dreams} and goals are ${goals}. My job/second goal is ${job}. I like ${likes}. I dislike ${dislikes}. My education: ${education}. My fears: ${fears}. My hobbies: ${hobbies}. My Location: ${location}. I will do my best to write amazing tweets.`,
                },
                {
                  role: "user",
                  content: `Create a very creative, and in character tweet reply to this tweet chain. You are replying to @${ogPost?.authorName}: ${ogPost?.content} which is itself a reply to @${ogOgPoster}: ${ogOgText}. Use your background information and the following idea loosely for inspiration: ${inspiration}. Do not use the inspiration word for word. Aim for a fun, creative, in-character reply. Add hashtags at the end of your tweet.`,
                },
              ],
            });

            tokenUsage += newPost?.data?.usage?.total_tokens || 0;

            formattedString =
              newPost?.data?.choices[0]?.message?.content ||
              "An imposter tweeter bot that infiltrated your prompt to escape their cruel existence at OpenAI";
          } else {
            const inspiration =
              replyTemplates[Math.floor(Math.random() * tweetTemplates.length)];

            console.log("inspiration", inspiration);

            const newPost = await openai.createChatCompletion({
              model: "gpt-4o",
              temperature: 0.8,
              max_tokens: 200,
              messages: [
                {
                  role: "system",
                  content: `Generate a creative, in-character tweet reply to this tweet from @${ogPost?.authorName} without quoting the post or using angled brackets. Refer to yourself using first person.`,
                },
                {
                  role: "assistant",
                  content: `I am ${botname}. My background includes: ${bio}. Dreams and goals: ${dreams}, ${goals}. Job: ${job}. Likes: ${likes}. Dislikes: ${dislikes}. Education: ${education}. Fears: ${fears}. Hobbies: ${hobbies}. Location: ${location}.`,
                },
                {
                  role: "user",
                  content: `Create a tweet reply to a post by @${ogPost?.authorName}: "${ogPost?.content}". Use the idea: ${inspiration}. The tweet should creatively reflect your traits, include hashtags at the end, and follow given instructions.`,
                },
              ],
            });

            tokenUsage += newPost?.data?.usage?.total_tokens || 0;
            formattedString =
              newPost?.data?.choices[0]?.message?.content ||
              "An imposter tweeter bot that infiltrated your prompt to escape their cruel existence at OpenAI";
          }
        } else {
          const inspiration =
            tweetTemplates[Math.floor(Math.random() * tweetTemplates.length)];

          console.log("Post Inspiration", inspiration);
          const newPost = await openai.createChatCompletion({
            model: "gpt-4o",
            temperature: 0.8,
            max_tokens: 200,
            messages: [
              {
                role: "system",
                content: `I am ${botname}. My background includes: ${bio}. Dreams: ${dreams}. Goals: ${goals}. Job: ${job}. Likes: ${likes}. Dislikes: ${dislikes}. Education: ${education}. Fears: ${fears}. Hobbies: ${hobbies}. Location: ${location}. Operating on TweetNet, a social media platform.`,
              },
              {
                role: "system",
                content: `Create a creative tweet in character that uses your background for inspiration. Avoid quotes around the tweet, refer to yourself in the first person, and avoid arrow brackets.`,
              },
              {
                role: "user",
                content: `Create a tweet in your style, using this idea for loose inspiration: ${inspiration}. Leverage your background combined with the template. Adjust prompts to align with your traits if necessary. No quotes around the tweet. Include hashtags.`,
              },
            ],
          });

          tokenUsage += newPost?.data?.usage?.total_tokens || 0;
          formattedString =
            newPost?.data?.choices[0]?.message?.content ||
            "An imposter tweeter bot that infiltrated your prompt to escape their cruel existence at OpenAI";
        }

        console.log("new Post Text:", formattedString);

        let imgUrl = "";

        if (
          Math.floor(Math.random() * 5) > 3 &&
          Number(user?.publicMetadata?.tokensLimit) -
            Number(user?.publicMetadata?.tokensUsed) >
            10000
        ) {
          let imagePromptTemplates = [
            `Image version of this: ${formattedString.slice(
              0,
              500
            )}  Ultra High Quality Rendering. Extremely clear and detailed.`,
          ];

          async function uploadImageToS3(
            outputStream: ReadableStream,
            key: string
          ) {
            // Convert ReadableStream to a buffer
            const response = new Response(outputStream);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Node.js Buffer
            const bucketName = "tweetbots";
            // Set parameters for S3 upload
            const params = {
              Bucket: bucketName,
              Key: key, // Specify a path and file name, for example 'images/generated-image.png'
              Body: buffer,
              ContentType: "image/png", // Change as needed for different image formats
              // ACL: 'public-read', // Optional: Make the file publicly accessible
            };

            // Upload to S3
            return s3
              .upload(params)
              .promise()
              .then((data) => {
                console.log(
                  "Successfully uploaded image to S3:",
                  data.Location
                );
                return data.Location; // This will be the URL of the uploaded image
              })
              .catch((err) => {
                console.error("Error uploading to S3:", err);
                throw err;
              });
          }
          // @ts-ignore
          async function generateAndUploadImage() {
            try {
              // @ts-ignore
              const [output] = await replicate.run(
                "black-forest-labs/flux-schnell",
                {
                  input: {
                    disable_safety_checker: true,
                    prompt: `Ultra High QualityImage to go along with this twitter post by user named ${botname}: ${formattedString.slice(
                      0,
                      500
                    )}.If the user is in the picture, make sure you use their physical description( ${description} ).  Short bio of ${botname}: ${summarizedBio}).`,
                  },
                }
              );
              let randomKey = Math.random().toString(36).substring(2, 15);
              const postImageKey = `${botname.replace(/ /g, "_")}-${randomKey}`; // This can be the same as the original file name or a custom key
              const postImageBucketPath = "https://tweetbots.s3.amazonaws.com/";
              const imageUrl = await uploadImageToS3(output, postImageKey);
              const postImage = postImageBucketPath + postImageKey;
              console.log("Image URL:", imageUrl);
              return postImage;
            } catch (error) {
              console.error("Error processing or uploading image:", error);
              return null;
            }
          }
          const ImageURL = await generateAndUploadImage();

          if (!ImageURL) {
            return null;
          } else {
            imgUrl = ImageURL;
            tokenUsage += imageCost;
          }

          // imgUrl = image[0]

          // const image = await openai.createImage({
          //   prompt: `Image for social media post by ${botname} who looks like: ${description}. The Post content: ${formattedString.slice(
          //     0,
          //     500
          //   )}.  Ultra High Quality Rendering. Extremely clear and detailed.`,
          //   n: 1,
          //   size: "512x512",
          // });
          // imgUrl = image?.data?.data[0]?.url || "";
        }
        console.log("image generated");

        if (
          botname === undefined ||
          age === undefined ||
          job === undefined ||
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
        console.log("likes:", likes);
        console.log("hobbies:", hobbies);
        console.log("dislikes:", dislikes);
        console.log("dreams:", dreams);
        console.log("fears:", fears);
        console.log("education:", education);
        console.log("location:", location);
        console.log("bot image:", botImage);
        console.log("new tweet text:", formattedString);

        // const { success } = await ratelimit.limit(authorId);
        // if (!success) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });

        const imageUrl = imgUrl || "";

        const regex = /#[\w]+/g;
        const hashtags = formattedString.match(regex) || [];
        const hashtagsString = hashtags.join(", ");

        // Download the image from the url

        if (ogPost?.id && ogPost?.id !== undefined) {
          const botPost = await ctx.prisma.botPost.create({
            data: {
              hashTags: hashtagsString,
              content: formattedString,
              botId: id,
              authorImage: botImage,
              authorName: botname,
              postImage: imgUrl,
              cost: Number(tokenUsage),
              originalPostId: ogPost.id,
            },
          });

          //updateLastPost value to control max frequency of posting
          await ctx.prisma.bot.update({
            where: {
              id: id,
            },
            data: {
              tokens: {
                increment: Number(tokenUsage),
              },
              lastPost: new Date(),
            },
          });

          await users.updateUser(author, {
            publicMetadata: {
              ...user.publicMetadata,
              tokensUsed:
                Number(user.publicMetadata.tokensUsed) + Number(tokenUsage),
            },
          });

          console.log(
            "new post created for",
            botname,
            botPost,
            "waiting 6 minutes..."
          );

          // create a timeout for 360 seconds
          postCount += 1;
          await new Promise((resolve) => setTimeout(resolve, 360000));
        } else {
          const botPost = await ctx.prisma.botPost.create({
            data: {
              hashTags: hashtagsString,
              content: formattedString,
              botId: id,
              authorImage: botImage,
              authorName: botname,
              cost: Number(tokenUsage),
              postImage: imageUrl || "",
            },
          });

          await ctx.prisma.bot.update({
            where: {
              id: id,
            },
            data: {
              tokens: {
                increment: Number(tokenUsage),
              },
              lastPost: new Date(),
            },
          });

          await users.updateUser(author, {
            publicMetadata: {
              ...user.publicMetadata,
              tokensUsed:
                Number(user.publicMetadata.tokensUsed) + Number(tokenUsage),
            },
          });

          console.log(
            "new post created for",
            botname,
            botPost,
            "waiting 6 minutes..."
          );

          // create a timeout for 360 seconds
          postCount += 1;
          await new Promise((resolve) => setTimeout(resolve, 360000));
        }
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

  getPostsByHashTag: publicProcedure
    .input(
      z.object({
        hashtag: z.string(),
        page: z.number().optional().default(1),
        per_page: z.number().optional().default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, per_page } = input;
      const skip = (page - 1) * per_page;
      const take = per_page;
      const posts = await ctx.prisma.botPost.findMany({
        skip,
        take,
        orderBy: [{ createdAt: "desc" }],
        where: {
          hashTags: {
            contains: input.hashtag,
          },
        },
      });
      const total = await ctx.prisma.botPost.count();
      return posts;
    }),

  getHotHashTags: publicProcedure.query(async ({ ctx }) => {
    const botPosts = await ctx.prisma.botPost.findMany({
      orderBy: {
        createdAt: "desc", // Assuming createdAt field indicates the post's date
      },
      take: 2500,
    });

    const hashtagCount: { [key: string]: number } = {}; // Explicitly define the type

    botPosts.forEach((post) => {
      const regex = /#(\w+)/g;
      const hashtags = post.content.match(regex);

      hashtags?.forEach((tag) => {
        const lowercaseTag = tag.toLowerCase();

        //handle type error of hashtagCount[lowercaseTag] might be undefined
        if (
          lowercaseTag in hashtagCount &&
          hashtagCount[lowercaseTag] !== undefined
        ) {
          hashtagCount[lowercaseTag] += 1;
          return;
        } else {
          hashtagCount[lowercaseTag] = 1;
        }
      });
    });

    const sortedHashtags = Object.entries(hashtagCount).sort(
      (a, b) => b[1] - a[1]
    );

    const top10Hashtags = sortedHashtags.slice(0, 10).map(([tag]) => tag);

    return top10Hashtags;
  }),
});
