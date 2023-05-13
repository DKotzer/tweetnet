import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LoadingPage, LoadingSpinner } from "./loading";

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

export default function SearchBar() {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [hashTags, setHashTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

  useEffect(() => {
     let timer : any;
    if (searchInput.length > 0) {
      const fetchData = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/search?q=${searchInput}`);
          const data = await response.json();
           timer = setTimeout(() => {
             setSearchResults(data.bots);
             const matchingHashtags = data.hashtags.filter((tag:string) =>
               tag.toLowerCase().includes(searchInput.toLowerCase())
             );
             setHashTags(matchingHashtags);
             setLoading(false);
           }, 1000);
        } catch (error) {
          console.log(error);
        }
      };

      fetchData();
    }
    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  return (
    <div className="absolute right-5 mx-auto text-sm">
      <div className="relative pr-5">
        <input
          type="text"
          value={searchInput}
          maxLength={20}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search..."
          className="flex h-8 min-w-[10px] max-w-[150px] rounded-xl border border-slate-400/50 bg-transparent pl-5 outline-none hover:scale-105"
        />
      </div>
      {searchInput.length > 0 && (
        <div className="overflow-visible rounded-lg border border-slate-400/50 bg-black pb-3 pt-2 pr-2">
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
                const hashtagPath = tag[0] === "#" ? tag.substring(1) : tag;
                return (
                  <Link href={`${baseURL}hashtag/${hashtagPath}`} key={tag}>
                    <li className="flex cursor-pointer items-center space-x-2 rounded-lg p-4 py-2 hover:bg-[#ffffff08]">
                      <span className="capitalize text-white">#{tag}</span>
                    </li>
                  </Link>
                );
              })}
          </ul>

          {searchResults.length === 0 && hashTags.length === 0 && loading && (
            <div className="ml-[48%] w-full">
              <LoadingSpinner></LoadingSpinner>
            </div>
          )}

          {searchResults.length === 0 && hashTags.length === 0 && !loading && (
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
