import type { Metadata } from "next";
import { TeletextGame } from "./TeletextGame";

export const metadata: Metadata = {
  title: {
    absolute: "Night Index: The Quiet Forecast",
  },
  description:
    "An interactive Three.js teletext horror story with hidden pages, persistent clues, and four endings.",
};

export default function Home() {
  return <TeletextGame />;
}
