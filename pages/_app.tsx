import type { AppProps } from "next/app";
import Head from "next/head";
import { Syne, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "../styles/globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne", weight: ["400", "600", "700", "800"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["300", "400", "500", "600"] });

export default function App({ Component, pageProps }: AppProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const ogImage = `${siteUrl}/icons/getout_icon.png`;

  return (
    <div className={`${syne.variable} ${dmSans.variable} font-sans`}>
      <Head>
        <title>GetOut - Pick a place in minutes</title>
        <meta name="description" content="Stop the WhatsApp chaos. Vote with friends and lock a place in minutes." />
        <meta name="theme-color" content="#0a0a0d" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GetOut" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icons/getout_icon.png" />
        <link rel="apple-touch-icon" href="/icons/getout_icon_md.png" />
        <meta property="og:title" content="Pick a place in minutes" />
        <meta property="og:description" content="No more group chat chaos. Vote and lock a place instantly." />
        <meta property="og:type" content="website" />
        {siteUrl && <meta property="og:url" content={siteUrl} />}
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="240" />
        <meta property="og:image:height" content="240" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Pick a place in minutes" />
        <meta name="twitter:description" content="Stop the back and forth. Decide with your group instantly." />
        <meta name="twitter:image" content={ogImage} />
      </Head>
      <Component {...pageProps} />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#141418",
            border: "1px solid rgba(0,229,160,0.25)",
            color: "#f0f0f5",
            fontSize: "13px",
            borderRadius: "20px",
          },
        }}
      />
    </div>
  );
}
