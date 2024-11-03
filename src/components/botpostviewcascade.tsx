import { api } from "~/utils/api";
import ReactMarkdown from "react-markdown";
import dayjs from "dayjs";
import Image from "next/image";
import Link from "next/link";
import relativeTime from "dayjs/plugin/relativeTime";
import { LoadingSpinner } from "./loading";
import React, { Fragment } from "react";
import LinkPreview from "./linkPreview";
import { CustomLi, CustomText, CustomList } from "./CustomComponents";


dayjs.extend(relativeTime);


interface CustomTextProps {
  children: React.ReactNode;
  type: "p" | "span" | "li" | "a" | "href" | "link" | "text";
}

interface CustomListProps {
  children: React.ReactNode;
  type: "ul" | "ol";
}


type CustomComponents = {
  p: React.FC<CustomTextProps>;
  ul: React.FC<CustomListProps>;
  li: React.FC<CustomTextProps>;
  a: React.FC<{ href: string; children: React.ReactNode }>;
};

type Post = {
  id: string;
  content: string;
  botId: string;
  createdAt: Date;
  postImage?: string;
  originalPostId?: string;
};

export const BotPostViewCascade = (
  props: { username: string; image: string } & Post
) => {
  const { data: repliesData, isLoading } = api.bots.getRepliesByPostId.useQuery(
    {
      ogPostId: props.id,
    }
  );
  // if (repliesData) console.log("replies data", repliesData);

  // console.log("props test", props);
  if (props.originalPostId !== undefined && props.originalPostId) {
    // console.log(props.originalPostId);
    const { data } = api.bots.getPostById.useQuery({
      id: props.originalPostId,
    });
    if (isLoading)
      return (
        <div className="botPostView">
          <div
            key={props.id}
            className="flex gap-3 border-x border-b border-slate-400/50 p-4"
          >
            <Link href={`/bot/@${props.username}`} className="h-fit">
              <div className="relative h-14 w-14 rounded-full hover:scale-105 hover:ring hover:ring-slate-100/50">
                <Image
                  src={props.image}
                  className="rounded-full"
                  alt={`@${props.username}'s profile picture`}
                  quality={80}
                  width={56}
                  height={56}
                />
              </div>
            </Link>

            <div className="flex flex-col">
              <div className="mb-3 flex gap-1 text-slate-400">
                <Link
                  href={`/bot/@${props.username}`}
                  className="hoverUnderline hover:scale-105 "
                >
                  <span className=" text-3xl ">{`@${props.username}`}</span>
                </Link>
                <Link
                  href={`/post/${props.id}`}
                  className="my-auto font-thin  hover:scale-105 "
                >
                  {` · ${dayjs(props.createdAt).fromNow()}`}
                </Link>
              </div>
              <span className="my-auto mb-1 text-xl">
                Replying to:
                {/* <Link className=" text-3xl" href={`/bot/@${data.authorName}`}>
                {`@${data.authorName}`}
              </Link> */}
              </span>
              <div className=" mb-4 flex h-56 gap-3 rounded-xl border border-slate-400/50 bg-[#ffffff0d] p-4 hover:bg-[#ffffff14]">
                <div className="mx-auto my-auto">
                  <LoadingSpinner size={50} />
                </div>
              </div>
              <span className=" text-lg">
                <ReactMarkdown
                  // @ts-ignore
                  components={
                    {
                      p: CustomText,
                      ul: CustomList,
                      li: CustomLi,
                    } as CustomComponents
                  }
                >
                  {props.content}
                </ReactMarkdown>
              </span>
              <div>
                {props.postImage && props.postImage !== "" && (
                  <Image
                    src={props.postImage || ""}
                    className="ml-1 mt-5 mb-2 rounded-lg"
                    alt={`Image related to the post`}
                    width={420}
                    height={420}
                    object-fit="cover"
                    placeholder="blur"
                    blurDataURL="https://via.placeholder.com/150"
                    quality={99}
                  />
                )}
              </div>
              <div>
                {props.postImage === "" && <div className="mb-3"></div>}
              </div>
            </div>
          </div>
        </div>
      );
    //  console.log("MyComponent content:", props.content);

    if (!data) {
      return (
        <div className="botPostView hover:bg-[#ffffff08]">
          <div
            key={props.id}
            className="flex gap-3 border-x border-b border-slate-400/50 p-4"
          >
            <Link href={`/bot/@${props.username}`} className="h-fit">
              <div className="relative h-14 w-14 rounded-full hover:scale-105 hover:ring hover:ring-slate-100/50">
                <Image
                  src={props.image}
                  className="rounded-full"
                  alt={`@${props.username}'s profile picture`}
                  quality={80}
                  width={56}
                  height={56}
                />
              </div>
            </Link>

            <div className="flex flex-col">
              <div className="mb-3 flex gap-1 text-slate-400">
                <Link
                  href={`/bot/@${props.username}`}
                  className="hoverUnderline hover:scale-105 "
                >
                  <span className=" text-3xl ">{`@${props.username}`}</span>
                </Link>
                <Link
                  href={`/post/${props.id}`}
                  className="hoverUnderline my-auto font-thin  hover:scale-105 "
                >
                  {` · ${dayjs(props.createdAt).fromNow()}`}
                </Link>
              </div>
              <span className="my-auto mb-1 text-xl">
                Replying to:
                {/* <Link className=" text-3xl" href={`/bot/@${data.authorName}`}>
                {`@${data.authorName}`}
              </Link> */}
              </span>

              <div className="h-26 mb-4 flex flex-col gap-3 rounded-xl  border border-slate-400/50 bg-[#ffffff0d] p-4 hover:bg-[#ffffff14] md:flex-row">
                <div className="relative h-14 w-14 rounded-full hover:scale-105 hover:ring hover:ring-slate-100/50">
                  <Image
                    src={"/default.webp"}
                    className="h-14 w-14 rounded-full"
                    alt={`default profile picture`}
                    width={56}
                    height={56}
                    quality={80}
                  />
                </div>
                <div className="flex flex-col">
                  <div className="mb-3 flex gap-1 text-slate-400">
                    <span className="  text-2xl">{`@Deleted `}</span>
                  </div>
                  <span className=" text-xl">Deleted Post</span>
                </div>
              </div>

              <span className=" text-xl">
                <ReactMarkdown
                  // @ts-ignore
                  components={
                    {
                      p: CustomText,
                      ul: CustomList,
                      li: CustomLi,
                    } as CustomComponents
                  }
                >
                  {props.content}
                </ReactMarkdown>
              </span>
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
                    quality={99}
                  />
                )}
              </div>
              <div>
                {props.postImage === "" && <div className="mb-3"></div>}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="botPostView hover:bg-[#ffffff08]">
        <div
          key={props.id}
          className="flex gap-3 border-x border-t border-b border-slate-400/50 p-4"
        >
          <div className="flex flex-col">
            <div className="flex flex-row gap-3">
              <div className="relative h-14 w-14 rounded-full ring-1 ring-slate-400/50 hover:scale-110 hover:ring">
                <Image
                  src={props.image}
                  className="rounded-full"
                  alt={`@${props.username}'s profile picture`}
                  quality={80}
                  width={56}
                  height={56}
                />
              </div>
              <div className="flex flex-col justify-end gap-1 text-slate-400">
                <Link
                  href={`/bot/@${props.username}`}
                  className="hoverUnderline hover:scale-105"
                >
                  <span className="text-3xl">{`@${props.username}`}</span>
                </Link>
                <Link
                  href={`/post/${props.id}`}
                  className="hoverUnderline my-auto font-thin hover:scale-105"
                >
                  {` ${dayjs(props.createdAt).fromNow()}`}
                </Link>
              </div>
            </div>

            <span className="my-auto mb-1 text-xl">
              Replying to:
              {/* <Link className="text-3xl" href={`/bot/@${props.authorName}`}>
            {`@${props.authorName}`}
          </Link> */}
            </span>
            <div className="mb-4 ml-8 flex gap-3 rounded-xl border border-slate-400/50 bg-[#ffffff0d] p-4 hover:bg-[#ffffff14]">
              <div className="flex flex-col">
                <div className="flex flex-row">
                  <div className="relative h-14 w-14 rounded-full hover:scale-105 hover:ring hover:ring-slate-100/50">
                    <Image
                      src={data.authorImage || ""}
                      className="h-14 w-14 rounded-full"
                      alt={`@${data.authorName}'s profile picture`}
                      width={56}
                      height={56}
                      quality={80}
                    />
                  </div>

                  <div className="mb-3 flex gap-1 flex-col ml-2 text-slate-400">
                    <Link
                      href={`/bot/@${data.authorName}`}
                      className="hoverUnderline hover:scale-105"
                    >
                      <span className="text-2xl">{`@${data.authorName}`}</span>
                    </Link>
                    <span className="hoverUnderline my-auto font-thin hover:scale-105">
                      <Link href={`/post/${data.id}`}>
                        {` ${dayjs(data.createdAt).fromNow()}`}
                      </Link>
                    </span>
                  </div>
                </div>

                <span className="text-lg">
                  <ReactMarkdown
                    linkTarget="_blank"
                    // @ts-ignore
                    components={
                      {
                        p: CustomText,
                        ul: CustomList,
                        li: CustomLi,
                      } as CustomComponents
                    }
                  >
                    {data.content}
                  </ReactMarkdown>
                </span>
                <div>
                  {data.postImage && data.postImage !== "" && (
                    <Image
                      src={data.postImage || ""}
                      className="ml-1 mt-5 mb-2 rounded-lg pr-1"
                      alt={`Image related to the post`}
                      width={450}
                      height={450}
                      object-fit="cover"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAADAAMDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDp/OdWYBuAx7e9FFFSB//Z"
                      quality={99}
                    />
                  )}
                </div>
                <div>
                  {data.postImage === "" && <div className="mb-3"></div>}
                </div>
              </div>
            </div>
            <span className="text-lg">
              <ReactMarkdown
                linkTarget="_blank"
                // @ts-ignore
                components={
                  {
                    p: CustomText,
                    ul: CustomList,
                    li: CustomLi,
                  } as CustomComponents
                }
              >
                {props.content}
              </ReactMarkdown>
            </span>
            <div>
              {props.postImage && props.postImage !== "" && (
                <Image
                  src={props.postImage || ""}
                  className="ml-1 mt-5 mb-2 rounded-lg"
                  alt={`Image related to the post`}
                  width={566}
                  height={566}
                  object-fit="cover"
                  placeholder="blur"
                  blurDataURL="https://via.placeholder.com/150"
                  quality={99}
                />
              )}
            </div>
            <div>{props.postImage === "" && <div className="mb-3"></div>}</div>
          </div>
        </div>
        {repliesData && repliesData.length > 0 && (
          <div>
            {repliesData.map((reply) => (
              <div key={reply.id} className="flex items-start">
                <div className="mt-1 flex-shrink-0 w-2">
                  {/* You can use any icon or symbol here */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    className="text-white"
                    fill="currentColor"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="m12.707 7.293-1.414 1.414L15.586 13H7V4H5v11h10.586l-4.293 4.293 1.414 1.414L19.414 14l-6.707-6.707z" />
                  </svg>
                </div>
                <div className="ml-2">
                  <BotPostViewCascade
                    {...reply}
                    username={reply.authorName}
                    image={reply.authorImage}
                    postImage={reply.postImage || ""}
                    originalPostId={reply.originalPostId || ""}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="botPostView hover:bg-[#ffffff08]">
      <div
        key={props.id}
        className="flex flex-col gap-3 border-x border-b border-t border-slate-400/50"
      >
        <div className="flex flex-col p-4">
          <div className="flex flex-row gap-3">
            <div className="relative h-14 w-14 rounded-full ring-1 ring-slate-400/50 hover:scale-110 hover:ring">
              <Image
                src={props.image}
                className="rounded-full"
                alt={`@${props.username}'s profile picture`}
                quality={80}
                width={56}
                height={56}
              />
            </div>
            <div className="flex flex-col justify-end gap-1 text-slate-400">
              <Link
                href={`/bot/@${props.username}`}
                className="hoverUnderline hover:scale-105"
              >
                <span className="text-3xl">{`@${props.username}`}</span>
              </Link>
              <Link
                href={`/post/${props.id}`}
                className="hoverUnderline my-auto font-thin hover:scale-105"
              >
                {` ${dayjs(props.createdAt).fromNow()}`}
              </Link>
            </div>
          </div>

          <span className="text-lg">
            <ReactMarkdown
              linkTarget="_blank"
              // @ts-ignore
              components={
                {
                  p: CustomText,
                  ul: CustomList,
                  li: CustomLi,
                } as CustomComponents
              }
            >
              {props.content}
            </ReactMarkdown>
          </span>
          <div>
            {props.postImage && props.postImage !== "" && (
              <Image
                src={props.postImage || ""}
                className="ml-1 mt-5 mb-2 rounded-lg"
                alt={`Image related to the post`}
                width={566}
                height={566}
                object-fit="cover"
                placeholder="blur"
                blurDataURL="https://via.placeholder.com/150"
                quality={99}
              />
            )}
          </div>
          <div>{props.postImage === "" && <div className="mb-3"></div>}</div>
        </div>
        {repliesData && repliesData?.length > 0 && (
          <div>
            {/* <h1 className="py-2 text-xl font-extrabold text-slate-100">
              Replies:
            </h1> */}
            {repliesData.map((reply) => (
              <BotPostViewCascade
                {...reply}
                key={reply.id}
                username={reply.authorName}
                image={reply.authorImage}
                postImage={reply.postImage || ""}
                originalPostId={reply.originalPostId || ""}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
