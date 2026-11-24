import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FINFLOW PRO — Market & Financial Dashboard",
    short_name: "FINFLOW PRO",
    description: "Real-time Global Market, 11 Sectors RRG & SEC Financial Dashboard",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1120",
    theme_color: "#064e3b",
    icons: [
      {
        src: "/icon.jpg",
        sizes: "512x512",
        type: "image/jpeg",
      },
    ],
  };
}