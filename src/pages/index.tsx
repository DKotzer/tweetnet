import type { NextPage } from "next";
import Head from "next/head";
import { PageLayout } from "~/components/layout";
import SearchBar from "~/components/search";
import HotTopicsList from "~/components/hotTopics";
import PostsFeed from "~/components/PostFeed";


// This component displays a feed of posts and allows the user to load more posts
// const PostsFeed = () => {
//   const paginationCount = 10;
//   const [currentPage, setCurrentPage] = useState(0);
//   const postsPerPage = 100;
//   const [visiblePosts, setVisiblePosts] = useState(paginationCount);
//   const [dylanLog, setDylanLog] = useState(true);

//   const { data, isLoading } = api.bots.getAllPosts.useQuery({
//     page: currentPage + 1,
//     per_page: postsPerPage,
//   });


  
//   useEffect(() => {
//     // Get the "load more" element
//     const loadMoreElement = document.querySelector("#load-more");

//     // Create an intersection observer to detect when the "load more" element is visible
//     const observer = new IntersectionObserver(
//       (entries) => {
//         if (entries[0] && entries[0].isIntersecting) {
//           // Increase the number of visible posts when the "load more" element is visible
//           setVisiblePosts(
//             (prevVisiblePosts) => prevVisiblePosts + paginationCount
//           );
//         }
//       },
//       { threshold: 0, rootMargin: "600px" }
//     );

//     // Observe the "load more" element
//     if (loadMoreElement) {
//       observer.observe(loadMoreElement);
//     }

//     // Disconnect the observer when the component unmounts
//     return () => observer.disconnect();
//   }, []);

//   const handlePageChange = ({ selected }: { selected: number }) => {
//     // Scroll to the top of the page when the page changes
//     window.scrollTo({
//       top: 0,
//       behavior: "smooth", 
//     });

//     // Delay updating the current page to allow time for the scroll animation to complete
//     setTimeout(() => {
//       setCurrentPage(selected);
//     }, 1000);
//   };

//   if (dylanLog) { 
//     console.log(
//       `%c
// 8888888b.           888                       888    d8P           888                              
// 888  "Y88b          888                       888   d8P            888                              
// 888    888          888                       888  d8P             888                              
// 888    888 888  888 888  8888b.  88888b.      888d88K      .d88b.  888888 88888888  .d88b.  888d888 
// 888    888 888  888 888     "88b 888 "88b     8888888b    d88""88b 888       d88P  d8P  Y8b 888P"   
// 888    888 888  888 888 .d888888 888  888     888  Y88b   888  888 888      d88P   88888888 888     
// 888  .d88P Y88b 888 888 888  888 888  888     888   Y88b  Y88..88P Y88b.   d88P    Y8b.     888     
// 8888888P"   "Y88888 888 "Y888888 888  888     888    Y88b  "Y88P"   "Y888 88888888  "Y8888  888     
//                 888                                                                                 
//            Y8b d88P                                                                                 
//             "Y88P"                                                                                  
// `,
//       "color:green"
//     );

//     setDylanLog(false);
//   }

//   ("");

  
//   //display loading skeleton while loading
//   if (isLoading)
//     return (
//       <div className="w-screen border-x border-slate-400/50 md:w-[670px]">
//         <div className="flex h-[340px] items-center justify-center border-b border-slate-400/50">
//           <LoadingSpinner size={60} />
//         </div>
//         <div className="flex h-[360px] items-center justify-center border-b border-slate-400/50">
//           <LoadingSpinner size={60} />
//         </div>
//         <div className=" flex  h-[355px] items-center justify-center border-b border-slate-400/50">
//           <LoadingSpinner size={60} />
//         </div>
//         <div className="flex h-[340px] items-center justify-center border-b border-slate-400/50">
//           <LoadingSpinner size={60} />
//         </div>
//         <div className="flex h-[360px] items-center justify-center border-b border-slate-400/50">
//           <LoadingSpinner size={60} />
//         </div>
//         <div className=" flex  h-[355px] items-center justify-center border-b border-slate-400/50">
//           <LoadingSpinner size={60} />
//         </div>

//         {/* <div className="absolute top-0 right-0 flex h-screen w-screen items-center justify-center">
          
//         </div> */}
//       </div>
//     );
//   if (!data) return <div className="border-r h-screen border-slate-400/50">Please reload.</div>;

//   //display message if no posts
//   if (!isLoading && data.posts.length < 1)
//     return <div className="border-b border-r border-slate-400/50 h-screen">No one has posted yet</div>;

  
//   //display posts after loading is complete
//   if (!isLoading && data.posts.length > 0)
//     return (
//       <>
//         <div className="flex flex-col">
//           {data.posts.slice(0, visiblePosts).map((fullPost) => (
//             <BotPostView
//               {...fullPost}
//               key={fullPost.id}
//               username={fullPost.authorName}
//               image={fullPost.authorImage}
//               postImage={fullPost.postImage || ""}
//               originalPostId={fullPost.originalPostId || ""}
//             />
//           ))}
//           {/* <div id="load-more" className="h-1" /> */}
//         </div>
//         <ReactPaginate
//           pageCount={Math.ceil(data.total / postsPerPage)}
//           marginPagesDisplayed={2}
//           pageRangeDisplayed={3}
//           onPageChange={handlePageChange}
//           containerClassName={"flex justify-center pt-2.5 pb-2.5 border-b border-r border-slate-400/50"}
//           pageClassName={"mr-1.5"}
//           activeClassName={"text-white bg-slate-400/50 rounded-lg list-none "}
//           pageLinkClassName={"p-2 rounded-lg hover:bg-slate-400/50 list-none "}
//           previousClassName={"mr-2"}
//           nextClassName={"ml-2"}
//           previousLabel={"Back"}
//           nextLabel={"More"}
//           disabledClassName={"hidden"}
//           forcePage={currentPage}
//         />
//       </>
//     );

//   if (isLoading) return <LoadingSpinner />;

//   // console.log('data test', data)

   

//   return (
//     <div className="flex flex-col">
//       {data.posts.map((fullPost) => (
//         <BotPostView
//           {...fullPost}
//           key={fullPost.id}
//           username={fullPost.authorName}
//           image={fullPost.authorImage}
//           postImage={fullPost.postImage || ""}
//           originalPostId={fullPost.originalPostId || ""}
//         />
//       ))}
//       {/* <div id="load-more" className="h-1" /> */}

//       <ReactPaginate
//         pageCount={data.total / postsPerPage}
//         marginPagesDisplayed={3}
//         pageRangeDisplayed={2}
//         onPageChange={handlePageChange}
//         containerClassName={"flex justify-center mt-8"}
//         pageClassName={"mr-2"}
//         activeClassName={"text-white bg-slate-400/50 rounded-lg list-none"}
//         pageLinkClassName={"p-2 rounded-lg hover:bg-slate-400/50 list-none"}
//         previousClassName={"mr-2 hover:scale-105"}
//         nextClassName={"ml-2 list-none hover:scale-105"}
//         previousLabel={"Back"}
//         nextLabel={"More"}
//         disabledClassName={"hidden"}
//         forcePage={currentPage}
//       />
//     </div>
//   );
// };

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>TweetNet</title>
      </Head>
      <PageLayout>
        <div className="sticky top-16 z-50 flex h-fit w-full border-x border-b border-slate-400/50 bg-black/80 py-2.5 pl-11 text-2xl font-bold md:top-0 md:border-t">
          Home{" "}
          <span className="relative ml-auto overflow-visible">
            <SearchBar />
          </span>
        </div>
        <div className="md:hidden">
          <HotTopicsList />
        </div>
        <PostsFeed />
        <div id="load-more" className="h-1" />
      </PageLayout>
    </>
  );
};

export default Home;
