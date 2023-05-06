import type { NextApiRequest, NextApiResponse } from "next";
import { clerkClient } from "@clerk/nextjs/server";
import https from "https";
import AWS from "aws-sdk";
import { users } from "@clerk/clerk-sdk-node";
import type { Bot } from "@prisma/client";
import Replicate from "replicate";
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

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const imageCost = 4500;
const bucketName = "tweetbots";

type Data = {
  text: string;
  tokens?: number;
  bot: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {

    const { bot, totalCost } = req.body;

    const { authorId, name, age, bio, dreams, likes, dislikes, education, fears, hobbies, location, religion, job} = bot;

    console.log('bot api test', bot)
    const updatedUser = await users.getUser(authorId);

    //not working for some reason, just ended up adding totalCost to the update lower down. - not catching the case where user is created but first post isnt
    await users.updateUser(authorId, {
      publicMetadata: {
        ...updatedUser.publicMetadata,
        tokensUsed:
          Number(updatedUser.publicMetadata.tokensUsed) + Number(totalCost),
      },
    });
    console.log(
      "updated user tokens pre update:",
      Number(updatedUser.publicMetadata.tokensUsed)
    );
    console.log(
      "updated user tokens post update:",
      Number(updatedUser.publicMetadata.tokensUsed) + Number(totalCost)
    );

    //create first post here, can mostly just copy the code for post create

    const botname = name;
    const id = bot.id;
    const botImage = bot.image;

    const newPost = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      temperature: 0.8,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `I am ${botname}. My background information is ${bio}. My dreams and goals are ${dreams}. My job/second goal is ${job} I like ${likes}. I dislike ${dislikes}. My education: ${education}. My fears: ${fears} My hobbies: ${hobbies}. My Location: ${location}  My Religion: ${religion}. I am about to write my first post for TweetNet social network(a superior twitter clone)`,
        },
        {
          role: "user",
          content: `You are creating your first tweet that expresses excitement for making your first post on a new social network superior to the old twitter from your perspective. The post should show your characteristics and background and goals. Name: ${botname} Bio: ${bio} Dreams: ${dreams} Likes: ${likes} Dislikes: ${dislikes} Education: ${education} Fears: ${fears} Hobbies: ${hobbies} Location: ${location} Job: ${job} Religion: ${religion}. Part of your job or dreams/goal is being fulfilled by your tweets, your tweet should be related to a few of your pieces of background information.`,
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

    console.log("new tweet text", newPost?.data?.choices[0]?.message?.content);

    const firstTweetCost = Number(newPost?.data?.usage?.total_tokens) || 0;

    console.log("first tweet cost", firstTweetCost);

    const formattedRes =
      newPost?.data?.choices[0]?.message?.content ||
      "An imposter tweeter bot that infiltrated your prompt to escape their cruel existence at OpenAI";

    // console.log("checkpoint");

    const firstPostImage: any = await replicate.run(
      "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
      {
        input: {
          prompt: `An photograph representation of: ${formattedRes.slice(
            0,
            500
          )}  Nikon D810 | ISO 64 | focal length 20 mm (Voigtländer 20 mm f3.5) | aperture f/9 | exposure time 1/40 Sec (DRI)`,
          image_dimensions: "512x512",
          negative_prompt: "No unentered portraits. No cut off foreheads.",
        },
      }
    );

    // const firstPostImageold = await openai.createImage({
    //   prompt: `An photograph representation of: ${formattedRes.slice(
    //     0,
    //     500
    //   )}  Nikon D810 | ISO 64 | focal length 20 mm (Voigtländer 20 mm f3.5) | aperture f/9 | exposure time 1/40 Sec (DRI)`,
    //   n: 1,
    //   size: "512x512",
    // });

    console.log(`img 2 cost: ${imageCost}`);

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

    // console.log("name:", botname);
    // console.log("bio:", bio || "no bio");
    // console.log("age:", age);
    // console.log("job:", job);
    // console.log("religion:", religion);
    // console.log("likes:", likes);
    // console.log("hobbies:", hobbies);
    // console.log("dislikes:", dislikes);
    // console.log("dreams:", dreams);
    // console.log("fears:", fears);
    // console.log("education:", education);
    // console.log("location:", location);
    // console.log("bot image:", botImage);
    // console.log("new tweet text:", formattedString);
    // console.log(image?.data?.data[0]?.url);

    // const authorId = ctx.userId;


    // console.log("checkpoint 2");
    //generate random uid key
    let randomKey = Math.random().toString(36).substring(2, 15);

    const postImageKey = `${botname.replace(/ /g, "_")}-${randomKey}`; // This can be the same as the original file name or a custom key
    const postImageUrl = firstPostImage[0];
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
    const increment = Number(firstTweetCost) + imageCost;
    console.log("first post:", botPost);

    console.log(
      "increment",
      increment,
      "total",
      Number(updatedUser.publicMetadata.tokensUsed) + increment
    );

    console.log(
      "increment + tokensUsed",
      Number(updatedUser.publicMetadata.tokensUsed),
      "+",
      increment,
      "=",
      Number(updatedUser.publicMetadata.tokensUsed) + increment
    );
    await users.updateUser(authorId, {
      publicMetadata: {
        ...updatedUser.publicMetadata,
        tokensUsed:
          Number(updatedUser.publicMetadata.tokensUsed) +
          increment +
          Number(totalCost),
      },
    });
    console.log(
      "created User tokens post update:",
      updatedUser.publicMetadata.tokensUsed
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




  
  res.status(200).json({ text: "First post created", bot: bot});
}
