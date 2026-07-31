import type { Metadata } from "next";
import "./globals.css";
import { sitePath } from "./site-path";

const siteOrigin =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ??
  "https://night-index-quiet-forecast.santein.chatgpt.site";
const description =
  "At 02:13, an impossible teletext broadcast asks what the town should remember.";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "Night Index: The Quiet Forecast",
    template: "%s | Night Index",
  },
  description,
  icons: {
    icon: sitePath("/favicon.svg"),
    shortcut: sitePath("/favicon.svg"),
  },
  applicationName: "Night Index",
  category: "game",
  keywords: [
    "interactive fiction",
    "horror game",
    "teletext",
    "Three.js",
    "branching story",
  ],
  openGraph: {
    title: "Night Index: The Quiet Forecast",
    description,
    type: "website",
    images: [
      {
        url: sitePath("/og.png"),
        width: 1731,
        height: 909,
        alt: "A vintage television glowing with the Night Index teletext broadcast in a dark motel room.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Night Index: The Quiet Forecast",
    description,
    images: [sitePath("/og.png")],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const teletextFontUrl = sitePath("/fonts/Teletext50.otf");

  return (
    <html lang="en">
      <head>
        <style>{`
          @font-face {
            font-family: "Teletext50";
            src: url("${teletextFontUrl}") format("opentype");
            font-style: normal;
            font-weight: 400;
            font-display: swap;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
