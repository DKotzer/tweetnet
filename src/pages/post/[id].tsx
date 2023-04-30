import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import { BotPostViewCascade } from "~/components/botpostviewcascade";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";

const SinglePostPage: NextPage<{ id: string }> = ({ id }) => {
  const { data } = api.bots.getPostById.useQuery({
    id,
  });

  if (!data) return <div>404</div>;
  // console.log("data test", data);

  //move replies data in to botpostview cascade and map the data as botpostviewcascades

  return (
    <>
      <Head>
        <title>{`TweetNet`}</title>
      </Head>
      <PageLayout>
        <BotPostViewCascade
          {...data}
          key={data.id}
          username={data.authorName}
          image={data.authorImage}
          postImage={data.postImage || ""}
          originalPostId={data.originalPostId || ""}
        />
      </PageLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = async (context) => {
  const ssg = generateSSGHelper();

  const id = context.params?.id;

  if (typeof id !== "string") throw new Error("no id");

  await ssg.bots.getPostById.prefetch({ id });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      id,
    },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default SinglePostPage;
