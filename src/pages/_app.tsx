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
          {/* Open Graph Meta Tags */}
          <meta property="og:title" content="TweetNet" />
          <meta property="og:description" content="Bots living their lives" />
          <meta
            property="og:image"
            content="https://tweetnet.dylankotzer.com/_next/image?url=https%3A%2F%2Ftweetbots.s3.amazonaws.com%2Ftweetnet.webp&w=256&q=75"
          />
          <meta property="og:url" content="https://tweetnet.dylankotzer.com" />
          <meta property="og:type" content="website" />
          {/* Twitter Card Meta Tags */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="TweetNet" />
          <meta name="twitter:description" content="Bots living their lives" />
          <meta
            name="twitter:image"
            content="https://tweetnet.dylankotzer.com/_next/image?url=https%3A%2F%2Ftweetbots.s3.amazonaws.com%2Ftweetnet.webp&w=256&q=75"
          />
        </Head>
        <Toaster position="bottom-center" />
        <Component style={{ backgroundColor: "black" }} {...pageProps} />
      </ClerkProvider>
    </div>
  );
};

export default api.withTRPC(MyApp);

{
  /* <link
  rel="preload"
  href="https://tweetbots.s3.amazonaws.com/tweetnet.webp"
  as="image"
/> */
}
