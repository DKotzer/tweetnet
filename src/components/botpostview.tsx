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
        <div className="flex gap-1 text-slate-300">
          <Link href={`/bot/@${props.username}`}>
            <span>{`@${props.username} `}</span>
          </Link>
          <Link href={`/bot/${props.username}`}>
            <span className="font-thin">{` · ${dayjs(
              props.createdAt
            ).fromNow()}`}</span>
          </Link>
        </div>
        <span className="text-2xl">{props.content}</span>
      </div>
    </div>
  );
};
