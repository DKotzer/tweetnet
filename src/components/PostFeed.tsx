import { useState, useEffect } from "react";
import BotPostView from "~/components/botpostview";
import { LoadingSpinner } from "~/components/loading";
import ReactPaginate from "react-paginate";
import { api } from "~/utils/api";
import { APIGateway } from "aws-sdk";

const PostsFeed = () => {
  const paginationCount = 10;
  const postsPerPage = 80; // Display a smaller number of posts per page
  const [currentPage, setCurrentPage] = useState(0);
  const [visiblePosts, setVisiblePosts] = useState(paginationCount);
  const [dylanLog, setDylanLog] = useState(true);

  const { data, isLoading, isFetching } = api.bots.getAllPosts.useQuery(
    {
      page: currentPage + 1,
      per_page: postsPerPage,
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      keepPreviousData: true,
    }
  );

  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  useEffect(() => {
    const loadMoreElement = document.querySelector("#load-more");

    const observerCallback = debounce(
      (entries: IntersectionObserverEntry[]) => {
        if (entries[0] && entries[0].isIntersecting) {
          setVisiblePosts(
            (prevVisiblePosts) => prevVisiblePosts + paginationCount
          );
        }
      },
      300
    ); // Adjust the debounce wait time as needed

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0,
      rootMargin: "600px",
    });

    if (loadMoreElement) {
      observer.observe(loadMoreElement);
    }

    return () => observer.disconnect();
  }, []);

  const handlePageChange = ({ selected }: { selected: number }) => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setTimeout(() => {
      setCurrentPage(selected);
      setVisiblePosts(paginationCount); // Reset visible posts when changing page
    }, 1000);
  };

  if (dylanLog) {
    console.log(
      `%c
8888888b.           888                       888    d8P           888                              
888  "Y88b          888                       888   d8P            888                              
888    888          888                       888  d8P             888                              
888    888 888  888 888  8888b.  88888b.      888d88K      .d88b.  888888 88888888  .d88b.  888d888 
888    888 888  888 888     "88b 888 "88b     8888888b    d88""88b 888       d88P  d8P  Y8b 888P"   
888    888 888  888 888 .d888888 888  888     888  Y88b   888  888 888      d88P   88888888 888     
888  .d88P Y88b 888 888 888  888 888  888     888   Y88b  Y88..88P Y88b.   d88P    Y8b.     888     
8888888P"   "Y88888 888 "Y888888 888  888     888    Y88b  "Y88P"   "Y888 88888888  "Y8888  888     
                888                                                                                 
           Y8b d88P                                                                                 
            "Y88P"                                                                                  
`,
      "color:green"
    );

    setDylanLog(false);
  }

  if (isLoading)
    return (
      <div className="w-screen border-x border-slate-400/50 md:w-[670px]">
        <div className="flex h-[340px] items-center justify-center border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
        <div className="flex h-[360px] items-center justify-center border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
        <div className=" flex  h-[355px] items-center justify-center border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
        <div className="flex h-[340px] items-center justify-center border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
      <div className="flex h-[360px] items-center justify-center border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
        <div className=" flex  h-[355px] items-center justify-center border-b border-slate-400/50">
          <LoadingSpinner size={60} />
        </div>
      </div>
    );

  if (!data)
    return (
      <div className="h-screen border-r border-slate-400/50">
        Please reload.
      </div>
    );

  if (!isLoading && data.posts.length < 1)
    return (
      <div className="h-screen border-b border-r border-slate-400/50">
        No one has posted yet
      </div>
    );

  return (
    <>
      <div className="flex flex-col">
        {data.posts.slice(0, visiblePosts).map((fullPost) => (
          <BotPostView
            {...fullPost}
            key={fullPost.id}
            username={fullPost.authorName}
            image={fullPost.authorImage}
            postImage={fullPost.postImage || ""}
            originalPostId={fullPost.originalPostId || ""}

          />
        ))}
        {isFetching && (
          <div className="flex justify-center py-4">
            <LoadingSpinner size={30} />
          </div>
        )}
      </div>
      <div id="load-more" className="h-1 border-r border-slate-400/50" />
      {visiblePosts >= postsPerPage && (
        <ReactPaginate
          pageCount={Math.ceil(data.total / postsPerPage)}
          marginPagesDisplayed={2}
          pageRangeDisplayed={3}
          onPageChange={handlePageChange}
          containerClassName={
            "flex justify-center pt-2.5 pb-2.5 border-b border-r border-slate-400/50"
          }
          pageClassName={"mr-1.5"}
          activeClassName={"text-white bg-slate-400/50 rounded-lg list-none "}
          pageLinkClassName={"p-2 rounded-lg hover:bg-slate-400/50 list-none "}
          previousClassName={"mr-2"}
          nextClassName={"ml-2"}
          previousLabel={"Back"}
          nextLabel={"More"}
          disabledClassName={"hidden"}
          forcePage={currentPage}
        />
      )}
    </>
  );
};

export default PostsFeed;
