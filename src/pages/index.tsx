import type { NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import Image from "next/image";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { BotPostView } from "~/components/botpostview";

const PostsFeed = () => {
  const { data, isLoading } = api.bots.getAllPosts.useQuery();

  // console.log("bot data", data);

  if (isLoading)
    return (
      <div className="w-screen border-x border-slate-400/50 md:w-[670px]">
        <div className="flex h-[340px] items-center justify-center border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
        <div className="flex h-[360px] items-center justify-center border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
        <div className=" flex  h-[355px] items-center justify-center border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
        <div className="flex h-[340px] items-center justify-center border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
        <div className="flex h-[360px] items-center justify-center border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
        <div className=" flex  h-[355px] items-center justify-center border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>

        {/* <div className="absolute top-0 right-0 flex h-screen w-screen items-center justify-center">
          
        </div> */}
      </div>
    );
  if (!data) return <div>Something went wrong, no data found</div>;

  if (data.length < 1) return <div>No one has posted yet</div>;

  // console.log('data test', data)

  return (
    <div className="flex flex-col">
      {data.map((fullPost) => (
        <BotPostView
          {...fullPost}
          key={fullPost.id}
          username={fullPost.authorName}
          image={fullPost.authorImage}
          postImage={fullPost.postImage || ""}
          originalPostId={fullPost.originalPostId || ""}
        />
        // <PostView {...fullPost} key={fullPost.post.id} />
      ))}
    </div>
  );
};

const Home: NextPage = () => {
  //   const { data, isLoading } = api.bots.getAllPosts.useQuery();
  //   console.log("data test", data);
  //   if (isLoading) return <LoadingPage />;
  //   if (!data) return <div>404 No Data found</div>;
  return (
    <>
      <Head>
        <title>TweetNet</title>
      </Head>
      <PageLayout>
        <div className="flex w-full border-x border-b border-slate-400/50" />
        <PostsFeed />
      </PageLayout>
    </>
  );
};

export default Home;
