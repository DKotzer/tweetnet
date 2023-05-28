import { api } from "~/utils/api";
import dayjs from "dayjs";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import React, { Fragment } from "react";
	

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
            return (
              <Fragment key={`segment-${index}`}>
                {segment}
              </Fragment>
            );
          } else {
            hashtags.push(hashtag); // Collect hashtags for later use
            return null;
          }
        } else {
          return (
            <Fragment key={`segment-${index}`}>{segment}</Fragment>
          );
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
  const content = (children as string[])[0];
  let hashtags: any = [];
  const output =
    content && content.length !== 0 ? (
      <>
        {content.split("\n").map((p, i) => {
          let segments = p.split(/(\s+)/);
          let paragraphOutput = [];
          let tempHashtags: any = [];

          for (let j = 0; j < segments.length; j++) {
            let segment = segments[j];
            let isHashtag = segment?.startsWith("#");
            let hashtag = "";

            if (isHashtag) {
              const hashtagMatch = segment?.match(/#[a-zA-Z0-9_]*/);
              hashtag = hashtagMatch ? `${hashtagMatch[0]}` : "";
            }

            if (
              hashtag &&
              !tempHashtags.includes(hashtag)
              
            ) {

             if (
               j === segments.length - 1 ||
               !segments[j + 2]
                 ?.charAt(0)
                 .match(/^(?!\s[a-zA-Z0-9])[a-zA-Z0-9]+$/) ||
               !segments[j + 2] ||
               segments[j + 2]?.startsWith("https://") ||
               segments[j + 2]?.toLowerCase().startsWith("article") ||
               segments[j + 2]?.toLowerCase().startsWith("url")
             ) {
               hashtags.push(hashtag);
               tempHashtags.push(hashtag);
             } else {
               paragraphOutput.push(
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
            } else if (segment?.startsWith("@")) {
              const usernameMatch = segment?.match(/@[a-zA-Z0-9_]*/);
              const username = usernameMatch
                ? `${usernameMatch[0].slice(1)}`
                : "";

              if (username === "") {
                paragraphOutput.push(
                  <Fragment key={`segment-${j}`}>{segment}</Fragment>
                );
              } else {
                paragraphOutput.push(
                  <Fragment key={`name-${j}`}>
                    <Link
                      className="tweetName"
                      href={`${baseURL}bot/${username}`}
                    >
                      {segment}
                    </Link>
                  </Fragment>
                );
              }
            } else if (segment?.startsWith("https://")) {

            if (segment?.endsWith("'") || segment?.endsWith('"')) {
              segment = segment.slice(0, -1);
             
            }  
              paragraphOutput.push(
                <Fragment key={`link-${j}`}>
                  <div className=" max-w-[260px] overflow-hidden md:max-w-full">
                    <Link className="link tweetName" href={segment}>
                      {segment.length > 150
                        ? `${segment.substring(0, 150)}...`
                        : segment}
                    </Link>
                  </div>
                </Fragment>
              );
                      
            } else {
              paragraphOutput.push(
                <Fragment key={`segment-${j}`}>{segment}</Fragment>
              );
            }
          }

          return <p key={`paragraph-${i}`}>{paragraphOutput}</p>;
        })}

        {hashtags.length > 0 && (
          <p className="hashtag-container">
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
          </p>
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

  console.log('output:', output);

  return output;
};


type CustomComponents = {
  p: React.FC<CustomTextProps>;
  ul: React.FC<CustomListProps>;
  li: React.FC<CustomTextProps>;
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
  // console.log("props test", props.content);
  if (props.originalPostId !== undefined && props.originalPostId !== undefined && props.originalPostId) {
    // Validate props.originalPostId
    if (typeof props.originalPostId !== "string") {
      // Handle invalid originalPostId (not a string)
      console.error("Invalid originalPostId:", props.originalPostId);
       // or display an error message to the user
       return <div>Error loading post: {props.originalPostId}</div>
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
                {/* <Link className=" text-3xl" href={`/bot/@${data.authorName}`}>
                {`@${data.authorName}`}
              </Link> */}
              </span>
              <div className=" mb-4 flex h-56 gap-3 rounded-xl border border-slate-400/50 bg-[#ffffff0d] p-4 hover:bg-[#ffffff14] ">
                <div className="mx-auto my-auto">
                  <LoadingSpinner size={50} />
                </div>
              </div>
              <span className=" text-lg">
                <ReactMarkdown transformLinkUri={transformLinkUri} linkTarget="_blank"
                  // @ts-ignore
                  components={
                    {
                      p: CustomText,
                      ul: CustomList,
                      li: CustomLi,
                      a: CustomText,
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
                {/* <Link className=" text-3xl" href={`/bot/@${data.authorName}`}>
                {`@${data.authorName}`}
              </Link> */}
              </span>

              <div className="h-26 mb-4 flex flex-col gap-3 rounded-xl  border border-slate-400/50 bg-[#ffffff0d] p-4 hover:bg-[#ffffff14] md:flex-row">
                <div className="relative h-14 w-14 rounded-full hover:scale-105 hover:ring hover:ring-slate-100/50">
                  <Image
                    src={"/default.webp" || ""}
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
                <ReactMarkdown transformLinkUri={transformLinkUri} linkTarget="_blank"
                  // @ts-ignore
                  components={
                    {
                      p: CustomText,
                      ul: CustomList,
                      li: CustomLi,
                      a: CustomText,
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
            <div className="mb-3 flex gap-1 text-slate-400 ">
              <Link
                href={`/bot/@${props.username}`}
                className="hoverUnderline hover:scale-105"
              >
                <span className=" text-3xl ">{`@${props.username}`}</span>
              </Link>
              <Link
                href={`/post/${props.id}`}
                className="hoverUnderline my-auto  font-thin hover:scale-105"
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
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-400/50 bg-[#ffffff0d] p-4 hover:bg-[#ffffff14] md:flex-row">
              <Link href={`/bot/@${data.authorName}`} className="h-fit">
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
              </Link>
              <div className="flex flex-col">
                <div className="mb-3 flex gap-1 text-slate-400">
                  <Link
                    href={`/bot/@${data.authorName}`}
                    className="hoverUnderline hover:scale-105 "
                  >
                    <span className="  text-2xl">{`@${data.authorName} `}</span>
                  </Link>
                  <span className="hoverUnderline my-auto font-thin hover:scale-105">
                    <Link href={`/post/${data.id}`}>
                      {` · ${dayjs(data.createdAt).fromNow()}`}
                    </Link>
                  </span>
                </div>
                <span className=" text-lg">
                  <ReactMarkdown transformLinkUri={transformLinkUri} linkTarget="_blank"
                    // @ts-ignore
                    components={
                      {
                        p: CustomText,
                        ul: CustomList,
                        li: CustomLi,
                        a: CustomText,
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
                  {data.postImage === "" && <div className="mb-3"></div>}
                </div>
              </div>
            </div>
            <span className=" text-lg">
              <ReactMarkdown transformLinkUri={transformLinkUri} linkTarget="_blank"
                // @ts-ignore
                components={
                  {
                    p: CustomText,
                    ul: CustomList,
                    li: CustomLi,
                    a: CustomText,
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
            <div>{props.postImage === "" && <div className="mb-3"></div>}</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      key={props.id}
      className="botPostView flex gap-3 border-x border-b border-slate-400/50 p-4 hover:bg-[#ffffff08]"
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
            <span className=" text-3xl ">{`@${props.username} `}</span>
          </Link>
          <span className="hoverUnderline my-auto font-thin hover:scale-105">
            <Link href={`/post/${props.id}`}>
              {` · ${dayjs(props.createdAt).fromNow()}`}
            </Link>
          </span>
        </div>
        <span className="text-lg">
          <ReactMarkdown transformLinkUri={transformLinkUri} linkTarget="_blank"
            // @ts-ignore
            components={
              {
                p: CustomText,
                ul: CustomList,
                li: CustomLi,
                href: CustomText,
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
        <div>{props.postImage === "" && <div className="mb-3"></div>}</div>
      </div>
    </div>
  );
};
