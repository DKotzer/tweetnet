import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/layout";
import Image from "next/image";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
// import { PostView } from "~/components/postview";
import { generateSSGHelper } from "~/server/helpers/ssgHelper";
import { useEffect, useState } from "react";
// import { UserButton, useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import Link from "next/link";
import { BotView } from "~/components/botview";
// import { users } from "@clerk/clerk-sdk-node";
// import { clerkClient } from "@clerk/nextjs/server";
import { useUser } from "@clerk/nextjs";
import ReactPaginate from "react-paginate";
import { BotPostView } from "~/components/botpostview";
import SearchBar from "~/components/search";

const PostsFeed = (props: {hashtag: string}) => {
  const paginationCount = 6;
  const [currentPage, setCurrentPage] = useState(0);
  const postsPerPage = 150;
  const [visiblePosts, setVisiblePosts] = useState(paginationCount);
  const [dylanLog, setDylanLog] = useState(true);


  const { data, isLoading } = api.bots.getPostsByHashTag.useQuery({
    hashtag: props.hashtag,
    page: currentPage + 1,
    per_page: postsPerPage,
  });

//   const { data, isLoading } = api.bots.getAllPosts.useQuery({
//     page: currentPage + 1,
//     per_page: postsPerPage,
//   });

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
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth", // Optional: Add smooth scrolling animation
      });
    }, 1000);
    setCurrentPage(selected);
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

  ("");

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
  if (!data) return <div>Please reload.</div>;

  if (!isLoading && data.length < 1)
    return <div>No one has used this hash tag recently</div>;

  if (!isLoading && data.length > 0)
    return (
      <>
        <div className="flex flex-col">
          {data.slice(0, visiblePosts).map((fullPost) => (
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
        {data.length > 140  && 
        <ReactPaginate
          pageCount={Math.ceil(data.length / postsPerPage)}
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
        />}
      </>
    );

  if (isLoading) return <LoadingSpinner />;

  // console.log('data test', data)

  return (
    <div className="flex flex-col">
      {data.map((fullPost) => (
        <BotPostView
          {...fullPost}
          key={fullPost.id}
          username={fullPost.authorName}
          image={fullPost.authorImage}
          postImage={fullPost.postImage || ""}
          originalPostId={fullPost.originalPostId || ""}
        />
      ))}
      {data.length > 140  && <ReactPaginate
        pageCount={data.length / postsPerPage}
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
      />}
    </div>
  );
};

//   if (!data || data.length === 0)
//     return (
//       <div className="h-full w-full border-x border-slate-400/50 md:w-[628px]">
//         Create your first bot!
//       </div>
//     );

//   // console.log("bots", data);

//   return (
//     <div className="flex flex-col">
//       {data.map((bot) => (
//         <BotView bot={bot} key={bot.bot.username} />
//       ))}
//     </div>
//   );
// };




const HashTagPage: NextPage<{ hashtag: string }> = ({ hashtag }) => {
 
  return (
    <>
      <Head>
        <title>{hashtag}</title>
      </Head>
      <PageLayout>
        <div className="sticky top-16 z-50 flex h-fit w-full border-x border-b md:border-t border-slate-400/50 bg-black/80 py-2.5 pl-11 text-2xl font-bold md:top-0">
          {hashtag}{" "}
          <span className="  relative  ml-auto overflow-visible">
            <SearchBar />
          </span>
        </div>
        <PostsFeed hashtag={hashtag} />
      </PageLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = async (context) => {
  const ssg = generateSSGHelper();

  const slug = context.params?.slug;

  if (typeof slug !== "string") throw new Error("no slug");

//   const hashtag = slug.replace("#", "");
   const hashtag = `#${slug}`

  await ssg.bots.getPostsByHashTag.prefetch({ hashtag });

  return {
    props: {
      trpcState: ssg.dehydrate(),
      hashtag,
    },
  };
};

export const getStaticPaths = () => {
  return { paths: [], fallback: "blocking" };
};

export default HashTagPage;
