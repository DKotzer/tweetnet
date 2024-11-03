import { api } from "~/utils/api";
import dayjs from "dayjs";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import React, { Fragment } from "react";
import LinkPreview from "./linkPreview";

import relativeTime from "dayjs/plugin/relativeTime";
import { LoadingSpinner } from "./loading";
dayjs.extend(relativeTime);

const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000/";

const transformLinkUri = (uri: string) => {
  // Transform the link URI here
  return uri;
};

// interface CustomLinkProps {
//   href: string;
//   title?: string;
// }

// const CustomLink: React.FC<CustomLinkProps> = ({ href, title }) => {
//   return (
//     <Link href={href}>
//       <a>{title}</a>
//     </Link>
//   );
// };

interface CustomLiProps {
  children: React.ReactNode;
  type: "li";
}

const CustomLi: React.FC<CustomLiProps> = ({ children }) => {
  const content = (children as string[])[0];
  let output = [];

  let hashtags = [] as string[];

  if (content) {
    const listItems = content.split(/\n/).filter((item) => item.trim() !== "");

    listItems.forEach((item, itemIndex) => {
      const segments = item.split(/(\s+)/);
      const itemOutput = segments.map((segment, index) => {
        if (segment.startsWith("#")) {
          const hashtagMatch = segment.slice(1).match(/[a-zA-Z0-9_]*/);
          const hashtag = hashtagMatch ? hashtagMatch[0] : "";
          if (hashtag === "") {
            return <Fragment key={`segment-${index}`}>{segment}</Fragment>;
          } else {
            hashtags.push(hashtag); // Collect hashtags for later use
            return null;
          }
        } else {
          return <Fragment key={`segment-${index}`}>{segment}</Fragment>;
        }
      });

      if (itemOutput.length > 0) {
        output.push(<li key={`item-${itemIndex}`}>{itemOutput}</li>);
      }
    });

    // Generate the hashtags section
    const hashtagsOutput = hashtags.map((hashtag, index) => (
      <Fragment key={`hashtag-${index}`}>
        <Link
          className="hashTag"
          href={`${baseURL}hashtag/${hashtag.substring(1)}`}
        >
          #{hashtag}
        </Link>{" "}
      </Fragment>
    ));

    if (hashtags.length > 0) {
      output.push(
        <p key="hashtags" className="hashtags">
          {hashtagsOutput}
        </p>
      );
    }
  } else {
    output =
      content?.trim() !== "" ? [<li key="single-item">{content}</li>] : [];
  }

  return <span>{output}</span>;
};

interface CustomTextProps {
  children: React.ReactNode;
  type: "p" | "span" | "li" | "a" | "href" | "link" | "text";
}

const CustomText: React.FC<CustomTextProps> = ({ children }) => {
  let content = (children as string[]).join("");
  // Filter out [object Object]
  content = content.replace(/\[object Object\]/g, "");

  let hashtags: any = [];
  const output =
    content && content.length !== 0 ? (
      <>
        {content.split("\n").map((line, i) => {
          const segments = line.split(/(\s+)/);
          const paragraphOutput = segments.map((segment, j) => {
            if (segment.startsWith("#")) {
              const hashtag = segment.match(/#[a-zA-Z0-9_]*/)?.[0] || "";
              if (hashtag) {
                return (
                  <Fragment key={`segment-${j}`}>
                    <Link
                      className="hashTag"
                      href={`${baseURL}hashtag/${hashtag.substring(1)}`}
                    >
                      {hashtag}
                    </Link>{" "}
                  </Fragment>
                );
              }
            } else if (segment.startsWith("@")) {
              const username =
                segment.match(/@[a-zA-Z0-9_]*/)?.[0]?.slice(1) || "";
              if (username) {
                return (
                  <Fragment key={`segment-${j}`}>
                    <Link
                      className="tweetName"
                      href={`${baseURL}bot/${username}`}
                    >
                      {segment}
                    </Link>{" "}
                  </Fragment>
                );
              }
            } else if (
              segment.startsWith("http") ||
              segment.startsWith("www") ||
              segment.includes(".com")
            ) {
              let url = segment;
              if (
                url.startsWith("'") ||
                url.startsWith('"') ||
                url.startsWith("(")
              ) {
                url = url.slice(1);
              }
              if (url.endsWith("'") || url.endsWith('"') || url.endsWith(")")) {
                url = url.slice(0, -1);
              }
              if (!url.startsWith("http") && !url.startsWith("www")) {
                url = `https://www.${url}`;
              }
              return (
                <Fragment key={`segment-${j}`}>
                  <div className="max-w-[260px] overflow-hidden md:max-w-full">
                    <LinkPreview url={url} />
                  </div>
                </Fragment>
              );
            } else if (segment.length < 1) {
              return null;
            } else {
              return <Fragment key={`segment-${j}`}>{segment}</Fragment>;
            }
          });

          return <p key={`paragraph-${i}`}>{paragraphOutput}</p>;
        })}

        {hashtags.length > 0 && (
          <div className="hashtag-container">
            {hashtags.map((hashtag: any, index: number) => (
              <Fragment key={`hashtag-${index}`}>
                {index > 0 && " "} {/* Add space between hashtags */}
                <Link
                  className="hashTag"
                  href={`${baseURL}hashtag/${hashtag.substring(1)}`}
                >
                  {hashtag}
                </Link>{" "}
                {/* Include "#" symbol and make it a link */}
              </Fragment>
            ))}
          </div>
        )}
      </>
    ) : null;

  return <div className="markdown text-lg">{output}</div>;
};
interface CustomListProps {
  children: React.ReactNode;
  type: "ul" | "ol";
}

const CustomList: React.FC<CustomListProps> = ({ children, type }) => {
  const content = (children as string[])[0];
  let output;
  const hashtags: string[] = [];

  if (content) {
    const items = content
      .replace(`<${type}>`, "")
      .replace(`</${type}>`, "")
      .split("\n")
      .filter((item) => item.trim().length > 0);

    // console.log('items:', items);

    const listItems = items.map((item, index) => {
      // console.log('item:', item);
      // console.log('hashtags:', hashtags);
      // Extract hashtags from each list item
      const listItemText = item
        .replace(/#\w+/g, (match) => {
          hashtags.push(match.slice(1));
          return "";
        })
        .trim();

      // console.log('listItemText:', listItemText);

      return <li key={`list-item-${index}`}>{listItemText}</li>;
    });

    output = (
      <div className="markdown">
        {type === "ul" ? <ul>{listItems}</ul> : <ol>{listItems}</ol>}
        {hashtags.length > 0 && (
          <p className="hashtag-container">
            {hashtags.map((tag, index) => (
              <a
                className="hashTag"
                href={`http://localhost:3000/hashtag/${tag}`}
                key={`hashtag-${index}`}
              >
                {`#${tag}`}
              </a>
            ))}
          </p>
        )}
      </div>
    );
  } else {
    // console.log("else content:", content);
    output = <div className="markdown">{content}</div>;
  }

  // console.log('output:', output);

  return output;
};

type CustomComponents = {
  p: React.FC<CustomTextProps>;
  ul: React.FC<CustomListProps>;
  li: React.FC<CustomTextProps>;
  a: React.FC<{ href: string; children: React.ReactNode }>;
};

const renderers = {
  text: CustomText,
  paragraph: CustomText,
  link: CustomText,
  linkReference: CustomText,
  image: CustomText,
  imageReference: CustomText,
  list: CustomList,
  listItem: CustomLi,
};

type Post = {
  id: string;
  content: string;
  botId: string;
  createdAt: Date;
  postImage?: string;
  originalPostId?: string;
};

export const BotPostView = (
  props: { username: string; image: string } & Post
) => {
  // console.log("props test", props);
  if (
    props.originalPostId !== undefined &&
    props.originalPostId !== undefined &&
    props.originalPostId
  ) {
    // Validate props.originalPostId
    if (typeof props.originalPostId !== "string") {
      // Handle invalid originalPostId (not a string)
      console.error("Invalid originalPostId:", props.originalPostId);
      // or display an error message to the user
      return <div>Error loading post: {props.originalPostId}</div>;
    }
    const { data, isLoading } = api.bots.getPostById.useQuery({
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
                  className="hoverUnderline hover:scale-105"
                >
                  <span className=" text-3xl ">{`@${props.username}`}</span>
                </Link>
                <Link
                  href={`/post/${props.id}`}
                  className="hoverUnderline my-auto font-thin hover:scale-105 "
                >
                  {` · ${dayjs(props.createdAt).fromNow()}`}
                </Link>
              </div>
              <span className="my-auto mb-1 text-xl">
                Replying to:
                {/* <Link className=" text-3xl" href={`/bot/@${props.authorName}`}>
                {`@${props.authorName}`}
              </Link> */}
              </span>
              <div className=" mb-4 flex h-56 gap-3 rounded-xl border border-slate-400/50 bg-[#ffffff0d] p-4 hover:bg-[#ffffff14] ">
                <div className="mx-auto my-auto">
                  <LoadingSpinner size={50} />
                </div>
              </div>
              <span className=" text-lg">
                <ReactMarkdown
                  transformLinkUri={transformLinkUri}
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
                  className="hoverUnderline hover:scale-105"
                >
                  <span className=" text-3xl ">{`@${props.username}`}</span>
                </Link>
                <Link
                  href={`/post/${props.id}`}
                  className="hoverUnderline my-auto font-thin hover:scale-105 "
                >
                  {` · ${dayjs(props.createdAt).fromNow()}`}
                </Link>
              </div>
              <span className="my-auto mb-1 text-xl">
                Replying to:
                {/* <Link className=" text-3xl" href={`/bot/@${props.authorName}`}>
                {`@${props.authorName}`}
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
                  transformLinkUri={transformLinkUri}
                  linkTarget="_blank"
                  // @ts-ignore
                  components={
                    {
                      p: CustomText,
                      ul: CustomList,
                      li: CustomLi,
                      a: ({
                        href,
                        children,
                      }: {
                        href: string;
                        children: React.ReactNode;
                      }) => {
                        console.log(`Rendering link: ${href}`);
                        return (
                          <>
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                            {href && <LinkPreview url={href} />}
                          </>
                        );
                      },
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
          className="flex gap-3 border-x border-b border-slate-400/50 p-4"
        >
          <div className="flex flex-col">
            <div className="flex flex-row gap-3">
              <div className="relative h-14 w-14 rounded-full ring-1 hover:scale-110 hover:ring ring-slate-400/50">
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

                  <div className="mb-3 flex gap-1 text-slate-400">
                    <Link
                      href={`/bot/@${data.authorName}`}
                      className="hoverUnderline hover:scale-105"
                    >
                      <span className="text-2xl">{`@${data.authorName}`}</span>
                    </Link>
                    <span className="hoverUnderline my-auto font-thin hover:scale-105">
                      <Link href={`/post/${data.id}`}>
                        {` · ${dayjs(data.createdAt).fromNow()}`}
                      </Link>
                    </span>
                  </div>
                </div>

                <span className="text-lg">
                  <ReactMarkdown
                    transformLinkUri={transformLinkUri}
                    linkTarget="_blank"
                    // @ts-ignore
                    components={
                      {
                        p: CustomText,
                        ul: CustomList,
                        li: CustomLi,
                        a: ({
                          href,
                          children,
                        }: {
                          href: string;
                          children: React.ReactNode;
                        }) => {
                          console.log(`Rendering link: ${href}`);
                          return (
                            <>
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {children}
                              </a>
                              {href && <LinkPreview url={href} />}
                            </>
                          );
                        },
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
                transformLinkUri={transformLinkUri}
                linkTarget="_blank"
                // @ts-ignore
                components={
                  {
                    p: CustomText,
                    ul: CustomList,
                    li: CustomLi,
                    a: ({
                      href,
                      children,
                    }: {
                      href: string;
                      children: React.ReactNode;
                    }) => {
                      console.log(`Rendering link: ${href}`);
                      return (
                        <>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {children}
                          </a>
                          {href && <LinkPreview url={href} />}
                        </>
                      );
                    },
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
      </div>
    );
  }
  // console.log(props.content)
  return (
         <div className="botPostView hover:bg-[#ffffff08]">
        <div
          key={props.id}
          className="flex gap-3 border-x border-b border-slate-400/50 p-4"
        >
          <div className="flex flex-col">
            <div className="flex flex-row gap-3">
              <div className="relative h-14 w-14 rounded-full ring-1 hover:scale-110 hover:ring ring-slate-400/50">
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
                transformLinkUri={transformLinkUri}
                linkTarget="_blank"
                // @ts-ignore
                components={
                  {
                    p: CustomText,
                    ul: CustomList,
                    li: CustomLi,
                    a: ({
                      href,
                      children,
                    }: {
                      href: string;
                      children: React.ReactNode;
                    }) => {
                      console.log(`Rendering link: ${href}`);
                      return (
                        <>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {children}
                          </a>
                          {href && <LinkPreview url={href} />}
                        </>
                      );
                    },
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
      </div>
    );

};

export default BotPostView;
