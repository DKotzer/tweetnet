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

const ProfileFeed = (props: { userId: string }) => {
  const { data, isLoading } = api.bots.getBotsByUserId.useQuery({
    userId: props.userId,
  });

  if (isLoading) return <LoadingPage />;

  if (!data || data.length === 0) return <div>User has no bots</div>;

  // console.log("bots", data);

  return (
    <div className="flex flex-col">
      {data.map((bot) => (
        <div className="border-x border-b p-4">
          <div className="my-auto flex  gap-3  ">
            <Image
              src={bot.bot.image}
              width={46}
              height={46}
              alt={"Profile Image"}
              className="my-auto self-center rounded-full"
            />
            <div className=" my-auto text-3xl">@{bot.bot.username.trim()}</div>
            <span className=" my-auto">
              📅 Posting since{" "}
              {new Date(bot.bot.createdAt).toLocaleDateString()}
            </span>
          </div>
          <br />
          <span className=" text-2xl">{bot.bot.bio}</span>
          <br />

          {/* {bot.bot.follower && (
            <span> 👥 + {bot.bot.followers.length} + Human Followers</span>
          )} */}
          {/* {!bot.bot.followers && <span> 👥 0 Human Followers</span>} */}
          <span> 👥 0 Human Followers</span>
          <br />
          <br />

          <span className="tooltip">
            🎂 {bot.bot.age}
            <span className="tooltiptext">Age</span>
          </span>
          <br />

          <span className="tooltip">
            💼 {bot.bot.job}
            <span className="tooltiptext">Job</span>
          </span>
          <br />

          <span className="tooltip">
            🎓 {bot.bot.education}
            <span className="tooltiptext">Education</span>
          </span>
          <br />

          <span className="tooltip">
            🗺️ {bot.bot.location}
            <span className="tooltiptext">Location</span>
          </span>
          <br />

          <span className="tooltip">
            🛐 {bot.bot.religion}
            <span className="tooltiptext">Religion</span>
          </span>
          <br />

          <span className="tooltip">
            👍 {bot.bot.likes}
            <span className="tooltiptext">Likes</span>
          </span>
          <br />

          <span className="tooltip">
            🎨 {bot.bot.hobbies}
            <span className="tooltiptext">Hobbies</span>
          </span>
          <br />

          <span className="tooltip">
            👎 {bot.bot.dislikes}
            <span className="tooltiptext">Dislikes</span>
          </span>
          <br />

          <span className="tooltip">
            🛌 {bot.bot.dreams}
            <span className="tooltiptext">Dreams</span>
          </span>
          <br />

          <span className="tooltip">
            😱 {bot.bot.fears}
            <span className="tooltiptext">Fears</span>
          </span>
          <br />
        </div>
      ))}
    </div>
  );
};

const CreateBotsWizard = () => {
  const [input, setInput] = useState("");
  const [name, setName] = useState("");

  const ctx = api.useContext();

  const { mutate, isLoading: isPosting } = api.bots.create.useMutation({
    onSuccess: () => {
      setInput("");
      void ctx.bots.getAll.invalidate();
    },
    onError: (e) => {
      const errorMessage = e.data?.zodError?.fieldErrors.content;
      if (errorMessage && errorMessage[0]) {
        toast.error(errorMessage[0]);
      } else {
        toast.error("Failed to create bot! Please try again later.");
      }
    },
  });

  return (
    <div className="flex w-full gap-3 border-b p-5">
      <Image
        src="/default.webP"
        alt="default profile picture"
        width={56}
        height={56}
        className="rounded-full"
      />
      <div className="flex gap-3">
        <div>
          <span className="my-auto">@</span>
          <input
            placeholder="Bot name"
            className=" w-20 bg-transparent outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (name !== "") {
                  mutate({ content: name, name: name });
                }
              }
            }}
            disabled={isPosting}
          />
        </div>
        <div>
          <input
            placeholder="Bot description"
            className="grow bg-transparent outline-none"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (input !== "") {
                  mutate({ content: input, name: name });
                }
              }
            }}
            disabled={isPosting}
          />
        </div>
      </div>
      <div>
        {input !== "" && !isPosting && (
          <button onClick={() => mutate({ content: input, name: name })}>
            Post
          </button>
        )}
        {isPosting && (
          <div className="flex items-center justify-center">
            <LoadingSpinner size={20} />
          </div>
        )}
      </div>
    </div>
  );
};

const MyBotsPage: NextPage<{ username: string }> = ({ username }) => {
  const { data } = api.profile.getUserByUsername.useQuery({
    username,
  });
  if (!data) return <div>404</div>;

  return (
    <>
      <Head>
        <title>{data.username ?? data.externalUsername}</title>
      </Head>
      <PageLayout>
        <div className="flex w-full bg-slate-600">
          <Image
            src={data.profileImageUrl}
            alt={`${
              data.username ?? data.externalUsername ?? "unknown"
            }'s profile pic`}
            width={120}
            height={120}
            className="my-3 ml-4 rounded-full border-4 border-black bg-black"
          />
          <div className="my-auto p-4 text-3xl font-bold">{`${
            data.username ?? data.externalUsername ?? "unknown"
          }'s bots`}</div>
        </div>

        <CreateBotsWizard />

        <ProfileFeed userId={data.id} />
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

export default MyBotsPage;
