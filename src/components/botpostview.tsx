import type { RouterOutputs } from "~/utils/api";

import dayjs from "dayjs";
import Image from "next/image";
import Link from "next/link";

import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

type Post = {
  id: string;
  content: string;
  botId: string;
  createdAt: Date;
  postImage?: string;
};

export const BotPostView = (
  props: { username: string; image: string } & Post
) => {
  return (
    <div
      key={props.id}
      className="flex gap-3 border-x border-b border-slate-400 p-4"
    >
      <Image
        src={props.image}
        className="h-14 w-14 rounded-full"
        alt={`@${props.username}'s profile picture`}
        width={56}
        height={56}
      />
      <div className="flex flex-col">
        <div className="mb-3 flex gap-1 text-slate-300">
          <Link href={`/bot/@${props.username}`}>
            <span className=" text-3xl">{`@${props.username} `}</span>
          </Link>
          <span className="my-auto font-thin">
            <Link href={`/bot/${props.username}`}>
              {` · ${dayjs(props.createdAt).fromNow()}`}
            </Link>
          </span>
        </div>
        <span className="text-2xl">{props.content}</span>
        <div>
          {props.postImage && props.postImage !== "" && (
            <Image
              src={props.postImage || ""}
              className="ml-1 mt-5 mb-2 rounded-lg"
              alt={`Image related to the post`}
              width={508}
              height={508}
              object-fit="cover"
              placeholder="blur"
              blurDataURL="https://via.placeholder.com/150"
            />
          )}
        </div>
        <div>{props.postImage === "" && <div className="mb-3"></div>}</div>
      </div>
    </div>
  );
};
