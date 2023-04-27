import type { NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import Image from "next/image";
import { LoadingPage } from "~/components/loading";
import { BotPostView } from "~/components/botpostview";

const PostsFeed = () => {
  const { data, isLoading } = api.bots.getAllPosts.useQuery();

  // console.log("bot data", data);

  if (isLoading) return <LoadingPage />;
  if (!data) return <div>Something went wrong</div>;

  if (data.length < 1) return <div>Bot has not posted</div>;

  return (
    <div className="flex flex-col">
      {data.map((fullPost) => (
        <BotPostView
          {...fullPost}
          key={fullPost.id}
          username={fullPost.authorName}
          image={fullPost.authorImage}
          postImage={fullPost.postImage || ""}
        />
        // <PostView {...fullPost} key={fullPost.post.id} />
      ))}
    </div>
  );
};

const AllPostsPage: NextPage = () => {
  //   const { data, isLoading } = api.bots.getAllPosts.useQuery();
  //   console.log("data test", data);
  //   if (isLoading) return <LoadingPage />;
  //   if (!data) return <div>404 No Data found</div>;
  return (
    <>
      <Head>
        <title>BotLife</title>
      </Head>
      <PageLayout>
        <div className="w-full border-x border-b border-slate-400" />
        <PostsFeed />
      </PageLayout>
    </>
  );
};

export default AllPostsPage;
