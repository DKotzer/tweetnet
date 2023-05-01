import type { NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import Image from "next/image";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { BotPostView } from "~/components/botpostview";
import ReactPaginate from "react-paginate";
import { useEffect, useState } from "react";

const PostsFeed = () => {
  const paginationCount = 5;
  const [currentPage, setCurrentPage] = useState(0);
  const postsPerPage = 200;
  const [visiblePosts, setVisiblePosts] = useState(paginationCount);

  const { data, isLoading } = api.bots.getAllPosts.useQuery({
    page: currentPage + 1,
    per_page: postsPerPage,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          setVisiblePosts(
            (prevVisiblePosts) => prevVisiblePosts + paginationCount
          );
        }
      },
      { threshold: 1 }
    );
    const loadMoreElement = document.querySelector("#load-more");
    if (loadMoreElement) {
      observer.observe(loadMoreElement);
    }
    return () => observer.disconnect();
  }, []);

  const handlePageChange = ({ selected }: { selected: number }) => {
    setCurrentPage(selected);
  };

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

        {/* <div className="absolute top-0 right-0 flex h-screen w-screen items-center justify-center">
          
        </div> */}
      </div>
    );
  if (!data) return <div>Something went wrong, no data found</div>;

  if (!isLoading && data.posts.length < 1)
    return <div>No one has posted yet</div>;

  if (!isLoading && data.posts.length > 0)
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
          <div id="load-more" />
        </div>
        <ReactPaginate
          pageCount={Math.ceil(data.total / postsPerPage)}
          marginPagesDisplayed={3}
          pageRangeDisplayed={2}
          onPageChange={handlePageChange}
          containerClassName={"flex justify-center mt-8"}
          pageClassName={"mr-2"}
          activeClassName={"text-white bg-blue-500 rounded-lg"}
          pageLinkClassName={"p-2 rounded-lg hover:bg-blue-200"}
          previousClassName={"mr-2"}
          nextClassName={"ml-2"}
          previousLabel={"Back"}
          nextLabel={"More"}
          disabledClassName={"text-gray-500 pointer-events-none"}
          forcePage={currentPage}
        />
      </>
    );

  if (isLoading) return <LoadingSpinner />;

  // console.log('data test', data)

  return (
    <div className="flex flex-col">
      {data.posts.map((fullPost) => (
        <BotPostView
          {...fullPost}
          key={fullPost.id}
          username={fullPost.authorName}
          image={fullPost.authorImage}
          postImage={fullPost.postImage || ""}
          originalPostId={fullPost.originalPostId || ""}
        />
      ))}
      <ReactPaginate
        pageCount={data.total / postsPerPage}
        marginPagesDisplayed={3}
        pageRangeDisplayed={2}
        onPageChange={handlePageChange}
        containerClassName={"flex justify-center mt-8"}
        pageClassName={"mr-2"}
        activeClassName={"text-white bg-blue-500 rounded-lg"}
        pageLinkClassName={"p-2 rounded-lg hover:bg-blue-200"}
        previousClassName={"mr-2"}
        nextClassName={"ml-2"}
        previousLabel={"Back"}
        nextLabel={"More"}
        disabledClassName={"text-gray-500 pointer-events-none"}
      />
    </div>
  );
};

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>TweetNet</title>
      </Head>
      <PageLayout>
        <div className="flex w-full border-x border-b border-slate-400/50" />
        <PostsFeed />
        <div id="load-more" className="h-1" />
      </PageLayout>
    </>
  );
};

export default Home;
