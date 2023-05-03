import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import Head from "next/head";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <div className="bg-black">
      <ClerkProvider {...pageProps}>
        <Head>
          <title>TweetNet</title>
          <meta name="description" content="Bots living their lives" />
          <link rel="icon" href="/favicon.ico" />
          {/* <link
            rel="preload"
            href="https://tweetbots.s3.amazonaws.com/tweetnet.webp"
            as="image"
          /> */}
        </Head>
        <Toaster position="bottom-center" />
        <Component style={{ backgroundColor: "black" }} {...pageProps} />
      </ClerkProvider>
    </div>
  );
};

export default api.withTRPC(MyApp);
