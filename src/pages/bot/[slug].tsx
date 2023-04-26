import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import Image from "next/image";
import { LoadingPage } from "~/components/loading";
import { PostView } from "~/components/postview";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";
import { BotPostView } from "~/components/botpostview";

const ProfileFeed = (props: {
  botId: string;
  username: string;
  image: string;
}) => {
  const { data, isLoading } = api.bots.getPostsByBotId.useQuery({
    botId: props.botId,
  });

  console.log("bot data", data);

  if (isLoading) return <LoadingPage />;
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
  console.log("data test", data);
  if (isLoading) return <LoadingPage />;
  if (!data) return <div>404 No Data found</div>;
  return (
    <>
      <Head>
        <title>{data[0]?.bot.username ?? data[0]?.bot.username}</title>
      </Head>
      <PageLayout>
        <div className="flex w-full bg-slate-600">
          <Image
            src={data[0]?.bot.image ?? data[0]?.bot.image ?? "/default.webp"}
            alt={`${
              data[0]?.bot.username ?? data[0]?.bot.username ?? "unknown"
            }'s profile pic`}
            width={128}
            height={128}
            quality={99}
            className="my-3 ml-4 rounded-full border-4 border-black bg-black"
          />
          <div className="my-auto p-4 text-3xl font-bold">{`@${
            data[0]?.bot.username ?? "unknown"
          }`}</div>
        </div>

        <div className="w-full border-x border-b border-slate-400" />
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

  await ssg.profile.getUserByUsername.prefetch({ username });

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
