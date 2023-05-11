import { RouterOutputs, api } from "~/utils/api";

import dayjs from "dayjs";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown, { Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { visit } from "unist-util-visit";
import React, { Fragment } from "react";
import Linkify from "linkify-react";
import "linkify-plugin-hashtag";


import relativeTime from "dayjs/plugin/relativeTime";
import { LoadingSpinner } from "./loading";
dayjs.extend(relativeTime);

const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000/";


const transformSpanToP = () => {
  return (tree: any) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName === "span") {
        node.tagName = "p";
      }
    });
  };
};

// const options = {
//   formatHref: {
//     hashtag: (href) => "https://twitter.com/hashtag/" + href.substr(1),
//   },
// };

// const renderLink = ({ attributes, content }) => {
//   const { href, ...props } = attributes;
//   return (
//     <Link to={href} {...props}>
//       {content}
//     </Link>
//   );
// };

// const options = {
//   formatHref: {
//     hashtag: (href:any) => `https://${baseURL}hashtag/` + href.substr(1),
//   },
//    render: {hashtag: renderLink}, 
// };


interface CustomTextProps {
  children: React.ReactNode;
}

const CustomText: React.FC<CustomTextProps> = ({ children }) => {
  const content = (children as string[])[0];
  let output;

  if (content) {
    const paragraphs = content.split("\n\n"); // Split content into paragraphs

    output = paragraphs.map((paragraph, paragraphIndex) => {
      if (paragraph.startsWith("<ol>") && paragraph.endsWith("</ol>")) {
        // Handle ordered list
        const items = paragraph
          .replace("<ol>", "")
          .replace("</ol>", "")
          .split("\n")
          .filter((item) => item.trim().length > 0);

        const listOutput = items.map((item, index) => {
          return <li key={`list-item-${index}`}>{item}</li>;
        });

        return <ol key={`ordered-list-${paragraphIndex}`}>{listOutput}</ol>;
      } else if (paragraph.startsWith("<ul>") && paragraph.endsWith("</ul>")) {
        // Handle unordered list
        const items = paragraph
          .replace("<ul>", "")
          .replace("</ul>", "")
          .split("\n")
          .filter((item) => item.trim().length > 0);

        const listOutput = items.map((item, index) => {
          return <li key={`list-item-${index}`}>{item}</li>;
        });

        return <ul key={`unordered-list-${paragraphIndex}`}>{listOutput}</ul>;
      } else {
        // Handle regular paragraphs
        const segments = paragraph.split(/(\s+)/); // Split each paragraph on whitespace
        const paragraphOutput = segments.map((segment, index) => {
          if (segment.startsWith("@")) {
            const match = segment.slice(1).match(/[a-zA-Z0-9_]*/);
            const username = match ? match[0] : "";
            if (username === "")
              return (
                <React.Fragment key={`segment-${index}`}>
                  {segment}
                </React.Fragment>
              );
            return (
              <React.Fragment key={`name-${index}`}>
                <a className="tweetName" href={`${baseURL}bot/@${username}`}>
                  {segment}
                </a>
              </React.Fragment>
            );
          } else if (segment.startsWith("#")) {
            const hashtagMatch = segment.slice(1).match(/[a-zA-Z0-9_]*/);
            const hashtag = hashtagMatch ? hashtagMatch[0] : "";
            if (hashtag === "")
              return (
                <React.Fragment key={`segment-${index}`}>
                  {segment}
                </React.Fragment>
              );
            return (
              <React.Fragment key={`hashtag-${index}`}>
                <a className="hashTag" href={`${baseURL}hashtag/${hashtag}`}>
                  {segment}
                </a>
              </React.Fragment>
            );
          } else {
            return (
              <React.Fragment key={`segment-${index}`}>
                {segment}
              </React.Fragment>
            );
          }
        });

        return <p key={`paragraph-${paragraphIndex}`}>{paragraphOutput}</p>;
      }
    });
  } else {
    output = <React.Fragment>{content}</React.Fragment>;
  }

  // Wrap the entire output in a span instead of a fragment
  return <span className="text-lg">{output}</span>;
};


interface CustomListProps {
  children: React.ReactNode;
  type: "ul" | "ol";
}

const CustomList: React.FC<CustomListProps> = ({ children, type }) => {
  const content = (children as string[])[0];
  let output;

  if (content) {
    const items = content
      .replace(`<${type}>`, "")
      .replace(`</${type}>`, "")
      .split("\n")
      .filter((item) => item.trim().length > 0);

    const listItems = items.map((item, index) => {
      // Remove hashtags from each list item
      const listItemText = item.replace(/#\w+/g, "").trim();
      return <li key={`list-item-${index}`}>{listItemText}</li>;
    });

    const hashtags = content.match(/#\w+/g);
    const extractedHashtags = hashtags ? hashtags.map((tag) => tag) : [];

    output = (
      <React.Fragment>
        {type === "ul" ? <ul>{listItems}</ul> : <ol>{listItems}</ol>}
        {extractedHashtags.length > 0 && <p>{extractedHashtags.join(" ")}</p>}
      </React.Fragment>
    );
  } else {
    output = <React.Fragment>{content}</React.Fragment>;
  }

  return output;
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
  if (props.originalPostId !== undefined && props.originalPostId) {
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
                <ReactMarkdown
                  components={{ p: CustomText, ul: CustomList, ol: CustomList } as Components}
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
                <ReactMarkdown
                  components={
                    {
                      p: CustomText,
                      ul: CustomList,
                      
                    } as Components
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
              <Link href={`/bot/@${data.authorName}`}>
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
                  <ReactMarkdown
                    components={
                      {
                        p: CustomText,
                        ul: CustomList,
                        
                      } as Components
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
              <ReactMarkdown
                components={
                  {
                    p: CustomText,
                    ul: CustomList,
                    
                  } as Components
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
          {/* <Linkify as="div" options={options}>
            {props.content} dylan@gmail.com @bob #test
          </Linkify> */}

          <ReactMarkdown
            components={
              { p: CustomText, ul: CustomList} as Components
            }
            // rehypePlugins={[transformSpanToP]}
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
