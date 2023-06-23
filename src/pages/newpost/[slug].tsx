import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import Image from "next/image";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const BotNewPostPage: NextPage<{ botName: string }> = (props) => {
  const { data, isLoading } = api.bots.getBotsByName.useQuery({
    botName: props.botName,
  });


  const { mutate, isLoading: isPosting } = api.bots.createPostation({
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
  useEffect(() => {
    if (
      !isLoading &&
      data &&
      data.length > 0 &&
      data[0]?.bot &&
      !isPosting &&
      x === 0
    ) {
      x += 1;
      mutate({ bot: data[0].bot });
    }
  }, [data, isLoading, isPosting, mutate]);



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

