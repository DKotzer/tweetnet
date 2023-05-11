import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

export default function SearchBar() {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [hashTags, setHashTags] = useState<any[]>([]);

  useEffect(() => {
    if (searchInput.length > 0) {
      const fetchData = async () => {
        try {
          const response = await fetch(`/api/search?q=${searchInput}`);
          const data = await response.json();
          setSearchResults(data.bots);
          const matchingHashtags = data.hashtags.filter((tag : string) =>
            tag.toLowerCase().includes(searchInput.toLowerCase())
          );
          setHashTags(matchingHashtags);
        } catch (error) {
          console.log(error);
        }
      };

      fetchData();
    }
  }, [searchInput]);

  return (
    <div className="mx-auto text-sm">
      <div className="relative pr-5">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search..."
          className="flex h-8 min-w-[10px] max-w-[150px] rounded-xl border border-slate-400/50 bg-transparent pl-5 outline-none"
        />
      </div>
      {searchInput.length > 0 && (
        <div className="overflow-visible pb-3 pt-2 pr-2">
          <ul className="pt-1">
            {searchResults.length > 0 &&
              searchResults.map((bot) => (
                <Link href={`${baseURL}bot/${bot.username}`} key={bot.id}>
                  <li className="flex cursor-pointer items-center space-x-2 rounded-lg p-4 py-2 hover:bg-[#ffffff08]">
                    <Image
                      alt={bot.username}
                      width={55}
                      height={55}
                      src={bot.image}
                      className="h-8 w-8 rounded-full"
                    />
                    <span className="text-white">{bot.username}</span>
                  </li>
                </Link>
              ))}
          </ul>
          <ul className="pt-1">
            {hashTags.length > 0 &&
              hashTags.map((tag) => {
                const hashtagPath =
                  tag[0] === "#" ? tag.substring(1) : tag;
                return (
                  <Link href={`${baseURL}hashtag/${hashtagPath}`} key={tag}>
                    <li className="flex cursor-pointer items-center space-x-2 rounded-lg p-4 py-2 hover:bg-[#ffffff08]">
                      <span className="text-white capitalize">#{tag}</span>
                    </li>
                  </Link>
                );
              })}
          </ul>
          {searchResults.length === 0 && hashTags.length === 0 && (
            <div className="pl-5">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}

{
  /* <input
  placeholder="Bot name"
  className=" flex w-[95%] bg-transparent outline-none"
  value={name}
  onChange={(e) => setName(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (name !== "" && input !== "") {
        mutate({ content: name, name: name });
      }
    }
  }}
  disabled={isPosting}
/>; */
}
