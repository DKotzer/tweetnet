import type { PropsWithChildren } from "react";
import { Sidebar } from "./sidebar";
import { TopNav } from "./topnav";

export const PageLayout = (props: PropsWithChildren) => {
  return (
    <main className="overflow-none static mx-auto  flex h-screen justify-center md:max-w-2xl">
      <div className="fixed top-0 mr-[820px] h-screen border-l ">
        <Sidebar />
      </div>
      <div className="flex h-screen w-full flex-col border-x border-slate-400 md:max-w-2xl">
        <TopNav />
        <div className="mb-16 md:hidden"></div>

        {props.children}
      </div>
    </main>
  );
};
