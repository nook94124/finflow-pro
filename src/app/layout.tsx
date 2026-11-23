import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FINFLOW PRO · Private Wealth & Market Intelligence",
  description:
    "ระบบวิเคราะห์การหมุนเวียนเงินทุน 11 Sector และงบการเงินทางการเรียลไทม์จาก Federal Reserve (FRED) และ SEC EDGAR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anuphan:wght@500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-[#eef4f1] text-[#052e22] antialiased selection:bg-[#064e3b] selection:text-white">
        {children}
      </body>
    </html>
  );
}