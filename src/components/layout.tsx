import type { PropsWithChildren } from "react";
import { Sidebar } from "./sidebar";
import { TopNav } from "./topnav";

export const PageLayout = (props: PropsWithChildren) => {
  return (
    <main className="overflow-none  mx-auto justify-center md:max-w-2xl">
      <div className="flex  md:ml-[-60px]">
        <div className="z-10 h-screen border-l border-slate-400">
          <Sidebar />
        </div>
        <div className="">
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
