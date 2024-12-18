import Link from "next/link";
import { api } from "~/utils/api";

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

export default function HotTopicsList() {
  //   const [loading, setLoading] = useState(false);

  const { data, isLoading } = api.bots.getHotHashTags.useQuery();

  if (isLoading)
    return (
      <div className="mx-auto my-auto h-24 border-x  border-b border-slate-400/50 text-sm md:border-0"></div>
    );

  if (!data) return <div className="hidden"></div>;

  return (
    <div className="border-x border-b border-slate-400/50 text-sm md:border-0">
      {data.length > 0 && (
        <div className="flex flex-col overflow-visible rounded-lg pb-3 pt-2 pr-2 md:flex-row">
          <ul className="mx-auto flex flex-wrap justify-center pt-1 md:block md:justify-start">
            <li className="flex list-none whitespace-nowrap p-4 py-2 text-lg font-semibold capitalize text-white">
              🔥️Topics🔥️
            </li>
            {data.slice(0, 8).map((hashtag, index) => (
              <Link
                href={`${baseURL}hashtag/${hashtag.substring(1)}`}
                key={hashtag}
              >
                <li className="flex cursor-pointer items-center space-x-2 rounded-lg p-4 py-2 text-base hover:bg-[#ffffff08]">
                  <span className="capitalize text-white">{hashtag}</span>
                </li>
              </Link>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
