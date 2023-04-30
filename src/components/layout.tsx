import type { PropsWithChildren } from "react";
import { Sidebar } from "./sidebar";
import { TopNav } from "./topnav";

// export const PageLayout = (props: PropsWithChildren) => {
//   return (
//     <main className="overflow-none mx-auto justify-center md:max-w-2xl">
//       <div className="content flex md:ml-[-60px]">
//         <div className="fixed top-0 z-10 h-screen w-[200px] border-l border-slate-400/50">
//           <Sidebar />
//         </div>
//         <div className="">
//           <div className="h-screen flex-col border-slate-400/50 md:max-w-2xl">
//             <TopNav />
//             <div className="mb-16 md:hidden"></div>
//             {props.children}
//           </div>
//         </div>
//       </div>
//     </main>
//   );
// };

export const PageLayout = (props: PropsWithChildren) => {
  return (
    <main className="overflow-none  mx-auto justify-center md:max-w-2xl">
      <div className="flex  md:ml-[-60px]">
        <div className="fixed top-0 z-10 h-screen w-[200px] border-l border-slate-400/50">
          <Sidebar />
        </div>
        <div className="md:ml-[200px] ml-0">
          <div className=" h-screen flex-col  border-slate-400 md:max-w-2xl">
            <TopNav />
            <div className="mb-16 md:hidden"></div>
            {props.children}
          </div>
        </div>
      </div>
    </main>
  );
};

// export const PageLayout = (props: PropsWithChildren) => {
//   return (
//     <main className="overflow-none mx-auto justify-center md:max-w-2xl">
//       <div className="flex md:ml-[-60px]">
//         <div className="fixed top-0 z-10 h-screen w-[200px] border-l border-slate-400/50">
//           <Sidebar />
//         </div>
//         <div className="ml-48">
//           <div className="h-screen flex-col border-slate-400/50 md:max-w-2xl">
//             <TopNav />
//             <div className="mb-16 md:hidden"></div>
//             {props.children}
//           </div>
//         </div>
//       </div>
//     </main>
//   );
// };
