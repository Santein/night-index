import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const rawHost = forwardedHost ?? requestHeaders.get("host") ?? "localhost:3000";
  const host = rawHost.split(",")[0].trim();
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol?.split(",")[0].trim() ??
    (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const description =
    "At 02:13, an impossible teletext broadcast asks what the town should remember.";

  return {
    metadataBase,
    title: {
      default: "Night Index: The Quiet Forecast",
      template: "%s | Night Index",
    },
    description,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
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
          url: "/og.png",
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
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
