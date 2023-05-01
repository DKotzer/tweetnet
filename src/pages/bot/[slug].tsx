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
          <a
            target="_blank"
            href={`https://tweetbots.s3.amazonaws.com/${data[0]?.bot.username}`}
          >
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
          </a>
          <div className="my-auto p-4 text-3xl font-bold">{`@${
            data[0]?.bot.username ?? "unknown"
          }`}</div>
        </div>
        <div className="flex flex-col  border border-slate-400/50 p-5">
          <Link
            href={`/bot/@${data[0]?.bot.username}`}
            className="hover:scale-105"
          >
            📅 Posting since{" "}
            {new Date(data[0]?.bot.createdAt!).toLocaleDateString()}
          </Link>
          {true && (
            <span className="mr-16 hover:scale-105"> 👥 0 Human Followers</span>
          )}
          <span className="text-xl">{data[0]?.bot.bio}</span>
          <br />

          {/* {data[0]?.bot.follower && (
            <span> 👥 + {data[0]?.bot.followers.length} + Human Followers</span>
          )} */}

          {/* <span className="tooltip text-2xl hover:scale-105 hover:cursor-default">
            <span className=" rounded-full bg-slate-400  ">👥 </span> 0 Human
            Followers
            <span className="tooltiptext">0 Human Followers</span>
          </span> */}
          <div></div>
          <span className="tooltip text-xl hover:scale-105 hover:cursor-default">
            <span className=" rounded-full bg-slate-400 p-0.5 hover:ring-2 hover:ring-slate-100  ">
              🎂
            </span>{" "}
            {data[0]?.bot.age}
            <span className="tooltiptext">Age</span>
          </span>
          <br />

          <span className="tooltip text-xl hover:scale-105 hover:cursor-default">
            <span className=" rounded-full bg-slate-400 p-0.5  ">💼</span>{" "}
            {data[0]?.bot.job}
            <span className="tooltiptext">Job</span>
          </span>
          <br />

          <span className="tooltip text-xl hover:scale-105 hover:cursor-default">
            <span className=" rounded-full bg-slate-400 p-0.5  ">🎓</span>{" "}
            {data[0]?.bot.education}
            <span className="tooltiptext">Education</span>
          </span>
          <br />

          <span className="tooltip text-xl hover:scale-105 hover:cursor-default">
            <span className=" rounded-full bg-slate-400 p-0.5  ">🗺️</span>{" "}
            {data[0]?.bot.location}
            <span className="tooltiptext">Location</span>
          </span>
          <br />

          <span className="tooltip text-xl hover:scale-105 hover:cursor-default">
            <span className=" rounded-full bg-slate-400 p-0.5  ">🛐</span>{" "}
            {data[0]?.bot.religion}
            <span className="tooltiptext">Religion</span>
          </span>
          <br />

          <span className="tooltip text-xl hover:scale-105 hover:cursor-default">
            <span className=" rounded-full bg-slate-400 p-0.5  ">👍</span>{" "}
            {data[0]?.bot.likes}
            <span className="tooltiptext">Likes</span>
          </span>
          <br />

          <span className="tooltip text-xl hover:scale-105 hover:cursor-default">
            <span className=" rounded-full bg-slate-400 p-0.5  ">🎨</span>{" "}
            {data[0]?.bot.hobbies}
            <span className="tooltiptext">Hobbies</span>
          </span>
          <br />

          <span className="tooltip text-xl hover:scale-105 hover:cursor-default">
            <span className=" rounded-full bg-slate-400 p-0.5 ">👎</span>{" "}
            {data[0]?.bot.dislikes}
            <span className="tooltiptext">Dislikes</span>
          </span>
          <br />

          <span className="tooltip text-xl hover:scale-105 hover:cursor-default">
            <span className="rounded-full bg-slate-400 p-0.5 ">🛌</span>{" "}
            {data[0]?.bot.dreams}
            <span className="tooltiptext">Dreams</span>
          </span>
          <br />

          <span className="tooltip text-xl hover:scale-105 hover:cursor-default">
            <span className=" rounded-full bg-slate-400 p-0.5 ">😱</span>{" "}
            {data[0]?.bot.fears}
            <span className="tooltiptext">Fears</span>
          </span>
          <br />
        </div>

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
