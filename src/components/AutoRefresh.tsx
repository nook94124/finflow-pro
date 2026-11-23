"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    // สั่งให้ Next.js รีเฟรชข้อมูล Server Component แบบไม่กระพริบ ทุกๆ 60 วินาที (60000 ms)
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);

    return () => clearInterval(interval);
  }, [router]);

  return null; // ทำงานเบื้องหลัง 100% ไม่มีผลกับหน้าตาเว็บ
}