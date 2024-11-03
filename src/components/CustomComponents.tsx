import React, { Fragment } from "react";
import Link from "next/link";
import LinkPreview from "./linkPreview"; // Adjust the import based on your actual setup

interface CustomLiProps {
  children: React.ReactNode;
  type: "li";
}
const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000/";
export const CustomLi: React.FC<CustomLiProps> = ({ children }) => {
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

export const CustomText: React.FC<CustomTextProps> = ({ children }) => {
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
                  <div className=" max-w-full overflow-hidden">
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

export const CustomList: React.FC<CustomListProps> = ({ children, type }) => {
  const content = (children as string[])[0];
  let output;
  const hashtags: string[] = [];

  if (content) {
    const items = content
      .replace(`<${type}>`, "")
      .replace(`</${type}>`, "")
      .split("\n")
      .filter((item) => item.trim().length > 0);

    const listItems = items.map((item, index) => {
      // Extract hashtags from each list item
      const listItemText = item
        .replace(/#\w+/g, (match) => {
          hashtags.push(match.slice(1));
          return "";
        })
        .trim();

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
    output = <div className="markdown">{content}</div>;
  }

  return output;
};
