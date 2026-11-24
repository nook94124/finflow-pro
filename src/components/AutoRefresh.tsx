"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh() {
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshRef = useRef<number>(Date.now());

  const triggerManualRefresh = () => {
    setIsRefreshing(true);
    lastRefreshRef.current = Date.now();
    router.refresh(); window.dispatchEvent(new Event("finflow:refresh"));
    setTimeout(() => setIsRefreshing(false), 800);
  };

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("finflow-theme");
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      triggerManualRefresh();
    };
    const handleOffline = () => setIsOffline(true);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        if (Date.now() - lastRefreshRef.current >= 45000) {
          triggerManualRefresh();
        }
      }
    };

    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        lastRefreshRef.current = Date.now();
        router.refresh(); window.dispatchEvent(new Event("finflow:refresh"));
      }
    }, 30000);

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
