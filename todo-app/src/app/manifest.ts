import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Mission Control ToDo",
    short_name: "ToDo",
    description: "自分専用のタスク管理アプリ",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#070b14",
    theme_color: "#070b14",
    lang: "ja",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
