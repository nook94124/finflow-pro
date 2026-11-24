"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh() {
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshRef = useRef<number>(Date.now());

  // โหลดธีมที่เคยเลือกไว้
  useEffect(() => {
    const savedTheme = localStorage.getItem("finflow-theme");
    if (savedTheme === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("finflow-theme", next ? "dark" : "light");
      return next;
    });
  };

  const triggerManualRefresh = () => {
    setIsRefreshing(true);
    lastRefreshRef.current = Date.now();
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      triggerManualRefresh();
    };
    const handleOffline = () => setIsOffline(true);

    // ดึงข้อมูลใหม่เฉพาะตอนกลับมาเปิดดูแท็บนี้
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        if (Date.now() - lastRefreshRef.current >= 45000) {
          triggerManualRefresh();
        }
      }
    };

    // รีเฟรชอัตโนมัติทุก 60 วินาทีเฉพาะตอนเปิดจอค้างไว้
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        lastRefreshRef.current = Date.now();
        router.refresh();
      }
    }, 60000);

    // คีย์ลัดระดับเทอร์มินัล (/, D, R)
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.querySelector("input");
        if (searchInput) {
          searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
          searchInput.focus();
        }
      } else if (e.key === "d" || e.key === "D") {
        toggleDarkMode();
      } else if (e.key === "r" || e.key === "R") {
        if (!e.ctrlKey && !e.metaKey) {
          triggerManualRefresh();
        }
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [router]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {isOffline && (
        <div className="flex items-center gap-2 rounded-full bg-amber-950/95 px-4 py-1.5 text-xs font-medium text-amber-200 shadow-lg border border-amber-700/60">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>เน็ตหลุด — แสดงข้อมูลล่าสุดในเครื่อง</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/90 backdrop-blur-md px-3 py-1.5 text-xs text-emerald-100 shadow-lg border border-emerald-700/50">
        <button
          onClick={toggleDarkMode}
          title="สลับโหมดมืด/สว่าง (กด D)"
          className="flex items-center gap-1 rounded-full px-2.5 py-1 font-medium hover:bg-emerald-800/70 transition-colors cursor-pointer"
        >
          <span>{isDark ? "☀️ โหมดสว่าง" : "🌙 โหมดมืด"}</span>
          <kbd className="hidden sm:inline rounded bg-emerald-900 px-1.5 py-0.5 text-[10px] text-emerald-300">D</kbd>
        </button>

        <span className="h-3.5 w-[1px] bg-emerald-800" />

        <button
          onClick={triggerManualRefresh}
          title="อัปเดตข้อมูลเดี๋ยวนี้ (กด R)"
          className="flex items-center gap-1 rounded-full px-2.5 py-1 font-medium hover:bg-emerald-800/70 transition-colors cursor-pointer"
        >
          <span className={isRefreshing ? "inline-block animate-spin" : ""}>↻</span>
          <span>รีเฟรช</span>
          <kbd className="hidden sm:inline rounded bg-emerald-900 px-1.5 py-0.5 text-[10px] text-emerald-300">R</kbd>
        </button>

        <span className="hidden md:inline text-[11px] text-emerald-300/80 pl-1 pr-1.5">
          | กด <kbd className="rounded bg-emerald-900 px-1.5 py-0.5 text-[10px] text-emerald-200">/</kbd> ค้นหาหุ้น
        </span>
      </div>
    </div>
  );
}