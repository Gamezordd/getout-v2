import type { AppProps } from "next/app";
import { Syne, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "../styles/globals.css";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne", weight: ["400", "600", "700", "800"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["300", "400", "500", "600"] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${syne.variable} ${dmSans.variable} font-sans`}>
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
