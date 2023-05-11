import { Bot, BotPost } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const { q: query } = req.query;

      if (typeof query !== "string") {
        throw new Error("Invalid request");
      }

      /**
       * Search posts
       */

      const exactMatch: Array<Bot> = await prisma.bot.findMany({
        where: {
          username: query,
        },
        take: 1, // Limit to 1 result
      });

      const similarMatches: Array<Bot> = await prisma.bot.findMany({
        where: {
          username: { startsWith: query },
          NOT: {
            username: query,
          },
        },
        take: 5, // Limit to 5 similar matches
      });

      const bots: Array<Bot> = [...exactMatch, ...similarMatches];

      //   res.status(200).json({ bots });



      const botPosts = await prisma.botPost.findMany({
        where: {
          hashTags: {
            contains: query,
          },
        },
      });

      const matchingHashtags = botPosts.flatMap((botPost) =>
        botPost.hashTags
          .split(",")
          .filter((hashtag) =>
            hashtag.toLowerCase().includes(query.toLowerCase())
          )
      );

      // Sort the matchingHashtags array based on percentage match
      const sortedHashtags = matchingHashtags.sort((a, b) => {
        const percentageMatchA =
          (a.match(new RegExp(query, "gi")) || []).length / a.length;
        const percentageMatchB =
          (b.match(new RegExp(query, "gi")) || []).length / b.length;
        return percentageMatchB - percentageMatchA;
      });

      // Take the top 6 unique matches
      const topMatchesSet = new Set();
      const topMatches = [];
       const topMatchesSetLower = new Set();
       const topMatchesLower = [];
      for (const hashtag of sortedHashtags) {
        if (!topMatchesSet.has(hashtag) && !topMatchesSetLower.has(hashtag.toLowerCase())) {
          topMatchesSet.add(hashtag);
          topMatchesSetLower.add(hashtag.toLowerCase())
          topMatches.push(hashtag);
          if (topMatches.length === 6) {
            break;
          }
        }
      }

      // Remove duplicates from topMatches array
      // Remove duplicates from topMatches array, leading spaces, and case sensitivity
      const uniqueTopMatches = [
        ...new Set(
          topMatches.map((tag) => tag.trim().replace(/^#/, ""))
        ),
      ];

      res.status(200).json({ bots, hashtags: uniqueTopMatches });
    } catch (error: any) {
      console.log(error);
      res.status(500).end();
    }
  }
}
