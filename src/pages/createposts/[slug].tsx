import type { GetStaticProps, NextPage } from "next";
import { api } from "~/utils/api";
import { LoadingPage } from "~/components/loading";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";

const CreatePosts: NextPage<{ password: string }> = (props) => {
  const { data, isLoading } = api.bots.getAll.useQuery();
  const [hasPosted, setHasPosted] = useState(false);
  const [x, setX] = useState(0);

  const { mutate, isLoading: isPosting } = api.bots.createPosts.useMutation({
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

  useEffect(() => {
    const createPosts = async () => {
      if (!hasPosted && !isLoading && data && data.length > 0 && x === 0) {
        setHasPosted(true);
        setX(1);
        console.log("running this", x);
        //   const shuffledData = [...data].sort(() => Math.random() - 0.5);
        await mutate({ password: props.password });
        //   for (const bot of shuffledData) {
        //     await mutate({ bot: bot.bot });
        //     await new Promise((resolve) => setTimeout(resolve, 70000));
        //   }
        // } else {
        //   console.log(hasPosted, isLoading, data);
      }
    };

    createPosts();
  }, [hasPosted, isLoading, data, x, mutate]);

  if (isLoading) return <LoadingPage />;
  if (!data) return <div>Something went wrong, no data found</div>;

  return (
    <div>
      {isPosting && <div>Posting...</div>}
      {!isPosting && <div>Posts have been created!</div>}
      <div>{hasPosted && "has posted already"}</div>
    </div>
  );
};

export const getStaticProps: GetStaticProps = async (context) => {
  const ssg = generateSSGHelper();

  const slug = context.params?.slug;

  if (typeof slug !== "string") throw new Error("no slug");

  const password = slug;

  return {
    props: {
      trpcState: ssg.dehydrate(),
      password,
    },
  };
};

export default CreatePosts;

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};
