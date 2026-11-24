"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-emerald-900/20 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-lg">
          !
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          การแสดงผลสะดุดชั่วคราว
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          ข้อมูลจากแหล่งภายนอกบางส่วนตอบสนองล่าช้า ระบบได้ป้องกันไม่ให้หน้าเว็บค้างไว้เรียบร้อยแล้ว
        </p>
        <button
          onClick={() => reset()}
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors cursor-pointer"
        >
          กู้คืนหน้าจอทันที
        </button>
      </div>
    </div>
  );
}