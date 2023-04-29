import type { PropsWithChildren } from "react";
import { Sidebar } from "./sidebar";
import { TopNav } from "./topnav";

export const PageLayout = (props: PropsWithChildren) => {
  return (
    <main className="overflow-none  mx-auto h-screen justify-center md:max-w-2xl">
      <div className="absolute  flex md:ml-[-60px]">
        <div className="relative left-20 top-0 z-10 md:left-0">
          <div>
            <Sidebar />
          </div>
        </div>
        <div className="flex h-screen flex-col border-slate-400 md:max-w-2xl">
          <TopNav />
          <div className="mb-16 md:hidden"></div>

          {props.children}
        </div>
      </div>
    </main>
  );
};
