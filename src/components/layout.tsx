import type { PropsWithChildren } from "react";
import { Sidebar } from "./sidebar";

export const PageLayout = (props: PropsWithChildren) => {
  return (
    <main className="overflow-none static flex h-screen justify-center">
      <div className="static ">
        <Sidebar />
      </div>
      <div className="flex h-full w-full flex-col border-x border-slate-400 md:max-w-2xl">
        {props.children}
      </div>
    </main>
  );
};
