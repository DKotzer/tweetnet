import { api } from "~/utils/api";
import { useState } from "react";
import { LoadingSpinner } from "./loading";

export const InfoBox = (props:{password:string}) => {

    const { data: bots, isLoading } = api.bots.getAllBotsAdmin.useQuery({password:props.password});

    if (isLoading)
      return (
        <div className="flex h-32 flex-col items-center justify-center border-x border-b border-slate-400/50">
          <LoadingSpinner size={40}></LoadingSpinner>
        </div>
      );

    if(!bots && !isLoading) return <div className="hidden">There are no bots to show</div>
  // console.log("user sidebar test", user);

  return <div className="w-full p-3 border border-slate-400/50">Bot Count: {bots.length}</div>;
};
