import type { Metadata } from "next";
import "./globals.css";
import AutoRefresh from "../components/AutoRefresh"; // 👈 1. เพิ่มบรรทัดนี้ด้านบน

export const metadata: Metadata = {
  title: "FINFLOW PRO",
  description: "Market Flow Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AutoRefresh /> {/* 👈 2. เพิ่มบรรทัดนี้เพื่อฝังระบบรีเฟรชอัตโนมัติ */}
        {children}
      </body>
    </html>
  );
}