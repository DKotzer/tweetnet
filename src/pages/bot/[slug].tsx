import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import Image from "next/image";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { PostView } from "~/components/postview";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";
import { BotPostView } from "~/components/botpostview";
import Link from "next/link";
import BotView from "~/components/botview";
import { useState } from "react";

const ProfileFeed = (props: {
  botId: string;
  username: string;
  image: string;
}) => {
  const { data, isLoading } = api.bots.getPostsByBotId.useQuery({
    botId: props.botId,
  });

  // console.log("bot data", data);

  if (isLoading)
    return (
      <div className="w-screen border-x border-slate-400/50 md:w-[628px]">
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
  if (!data) return <div>Something went wrong</div>;

  if (data.length < 1) return <div>Bot has not posted</div>;

  return (
    <div className="flex flex-col">
      {data.map((fullPost) => (
        <BotPostView
          {...fullPost}
          key={fullPost.id}
          username={props.username}
          image={props.image}
          postImage={fullPost.postImage || ""}
          originalPostId={fullPost.originalPostId || ""}
        />
        // <PostView {...fullPost} key={fullPost.post.id} />
      ))}
    </div>
  );
};

const ProfilePage: NextPage<{ username: string }> = ({ username }) => {
  const { data, isLoading } = api.bots.getBotsByName.useQuery({
    botName: username,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

    const handleImageClick = () => {
      setIsModalOpen(true);
    };

    const handleCloseModal = () => {
      setIsModalOpen(false);
    };

  
  if (isLoading) return <LoadingPage />;
  if (!data) return <div>404 No Data found</div>;
  // console.log("data test", data);
  return (
    <>
      <Head>
        <title>{data[0]?.bot.username ?? data[0]?.bot.username}</title>
      </Head>
      <PageLayout>
        <div className="flex w-full border border-slate-400/50 ">
          {/* <div className="sticky top-16 z-50 flex h-fit w-full border-x border-b md:border-t border-slate-400/50 bg-black/80 py-1 pl-11 text-2xl font-bold md:top-0"> */}

          {/* <a
            target="_blank"
            href={`https://tweetbots.s3.amazonaws.com/${data[0]?.bot.username}`}
          > */}
          <div onClick={handleImageClick}>
            <Image
              src={data[0]?.bot.image ?? data[0]?.bot.image ?? "/default.webp"}
              alt={`${
                data[0]?.bot.username ?? data[0]?.bot.username ?? "unknown"
              }'s profile pic`}
              width={128}
              height={128}
              quality={99}
              className="my-3 ml-4 rounded-full ring-4 ring-slate-100/60 hover:scale-105 hover:ring-slate-100"
            />
          </div>
          {/* </a> */}
          {isModalOpen && (
            <div className="modal  " onClick={handleCloseModal}>
              <div className="modal-content">
                <button className=" modal-close h-5 w-5 hover:scale-110">
                  ✖️
                </button>
                <div>
                  {/* Your image content */}
                  <Image
                    src={data[0]?.bot.image || "/default.webp"}
                    width={500}
                    height={500}
                    alt="Profile Image"
                    className="modal-image"
                    quality={80}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="my-auto p-4 text-3xl font-bold text-slate-100 ">{`@${
            data[0]?.bot.username ?? "unknown"
          }`}</div>
        </div>
        {data[0] && <BotView bot={data[0]} />}

        <ProfileFeed
          username={data[0]?.bot.username ?? data[0]?.bot.username ?? "unknown"}
          image={data[0]?.bot.image ?? data[0]?.bot.image ?? "/default.webp"}
          botId={data[0]?.bot.id ?? data[0]?.bot.id ?? "unknown"}
        />
      </PageLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = async (context) => {
  const ssg = generateSSGHelper();

  const slug = context.params?.slug;

  if (typeof slug !== "string") throw new Error("no slug");

  const username = slug.replace("@", "");

  await ssg.bots.getBotsByName.prefetch({ botName: username });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      username,
    },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default ProfilePage;
