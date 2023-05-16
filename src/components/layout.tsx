import type { PropsWithChildren } from "react";
import { Sidebar } from "./sidebar";
import { TopNav } from "./topnav";


export const PageLayout = (props: PropsWithChildren) => {
  return (
    <main className="overflow-none  mx-auto justify-center md:max-w-3xl">
      <div className="flex  md:ml-[-60px]">
        <div className="top-0 z-0 hidden h-screen w-[200px] border-x border-slate-400/50 md:fixed md:block">
          <Sidebar />
        </div>
        <div className="ml-0 w-full md:ml-[200px]">
          <div className=" h-fit flex-col   border-slate-400 md:max-w-3xl">
            <TopNav />
            <div className="mb-16 w-full md:w-auto md:hidden"></div>
            {props.children}
          </div>
        </div>
      </div>
    </main>
  );
};
