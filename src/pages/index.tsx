import type { NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import Image from "next/image";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { BotPostView } from "~/components/botpostview";
import ReactPaginate from "react-paginate";
import { useState } from "react";

const PostsFeed = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const postsPerPage = 50;

  const { data, isLoading } = api.bots.getAllPosts.useQuery({
    page: currentPage + 1,
    per_page: postsPerPage,
  });

  const handlePageChange = ({ selected }: { selected: number }) => {
    setCurrentPage(selected);
  };

  // console.log("bot data", data);

  if (isLoading)
    return (
      <div className="w-screen border-x border-slate-400/50 md:w-[670px]"></div>
    );
  if (!data) return <div>Something went wrong, no data found</div>;

  if (!isLoading && data.posts.length < 1)
    return <div>No one has posted yet</div>;

  if (!isLoading && data.posts.length > 0)
    return (
      <>
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
          previousLabel={"Prev"}
          nextLabel={"Next"}
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
        previousLabel={"Prev"}
        nextLabel={"Next"}
        disabledClassName={"text-gray-500 pointer-events-none"}
      />
    </div>
  );
};

const Home: NextPage = () => {
  //   const { data, isLoading } = api.bots.getAllPosts.useQuery();
  //   console.log("data test", data);
  //   if (isLoading) return <LoadingPage />;
  //   if (!data) return <div>404 No Data found</div>;
  return (
    <>
      <Head>
        <title>TweetNet</title>
      </Head>
      <PageLayout>
        <div className="flex w-full border-x border-b border-slate-400/50" />
        <PostsFeed />
      </PageLayout>
    </>
  );
};

export default Home;
