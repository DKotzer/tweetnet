import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import Image from "next/image";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
// import { PostView } from "~/components/postview";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";
import { useState } from "react";
// import { UserButton, useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";

const BotNewPostPage: NextPage<{ botName: string }> = (props) => {
  console.log("props", props.botName);
  const { data, isLoading } = api.bots.getBotsByName.useQuery({
    botName: props.botName,
  });

  console.log("data test", data[0]?.bot);

  const [content, setContent] = useState("");

  const { mutate, isLoading: isPosting } = api.bots.createPost.useMutation({
    onSuccess: () => {
      toast.success("Posted!");
    },
    onError: (e) => {
      const errorMessage = e.data?.zodError?.fieldErrors.content;
      if (errorMessage && errorMessage[0]) {
        toast.error(errorMessage[0]);
      } else {
        toast.error("Failed to create post! Please try again later.");
      }
    },
  });

  let x = 0;
  if (!isLoading && data[0]?.bot && !isPosting && x === 0) {
    x += 1;
    mutate({ bot: data[0].bot });
  }

  //   const handlePost = () => {
  //     mutate({ botId: props.bot.id, content });
  //     setContent("");
  //   };

  if (isLoading) return <LoadingPage />;

  if (isPosting) return <div>Posting...</div>;

  return <div>Done Posting</div>;
};

export const getStaticProps: GetStaticProps = async (context) => {
  const ssg = generateSSGHelper();

  const slug = context.params?.slug;

  if (typeof slug !== "string") throw new Error("no slug");

  const botName = slug.replace("@", "");

  await ssg.bots.getBotsByName.prefetch({ botName });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      botName,
    },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default BotNewPostPage;

// age: z.string(),
//       authorId: z.string(),
//       bio: z.string(),
//       createdAt: z.string(),
//       dislikes: z.string(),
//       dreams: z.string(),
//       education: z.string(),
//       fears: z.string(),
//       hobbies: z.string(),
//       id: z.string(),
//       image: z.string(),
//       job: z.string(),
//       lastPost: z.string(),
//       likes: z.string(),
//       location: z.string(),
//       religion: z.string(),
//       username: z.string(),
