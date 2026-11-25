"use client";
import React,{useState}from"react";
export interface ProOhlcPoint{date:string;open?:number;high?:number;low?:number;close:number;}
const sg=(x:number,d=2)=>`${x>=0?"+":""}${x.toFixed(d)}%`;
const thd=(s:string)=>s||"ล่าสุด";

export default function ProChart({
  history,
  currency,
  range,
  onRangeChange,
  isLoading,
  titleOverride,
}: {
  history: ProOhlcPoint[];
  currency: string;
  range?: string;
  onRangeChange?: (r: string) => void;
  isLoading?: boolean;
  titleOverride?: string;
}) {
  const [chartType, setChartType] = useState<"candle" | "bar" | "line" | "area">("candle");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const ranges = [
    { id: "1d", label: "1D" },
    { id: "1mo", label: "1M" },
    { id: "3mo", label: "3M" },
    { id: "6mo", label: "6M" },
    { id: "1y", label: "1Y" },
    { id: "5y", label: "5Y" },
  ];
  if (!history || history.length < 2) return null;

  const first = history[0].open ?? history[0].close;
  const last = history[history.length - 1].close;
  const periodChange = first ? ((last - first) / first) * 100 : 0;
  const isUp = periodChange >= 0;
  const strokeColor = isUp ? "#059669" : "#e11d48";
  const fillId = isUp ? "gradUpFintech" : "gradDownFintech";

  const highs = history.map((h) => h.high ?? h.close);
  const lows = history.map((h) => h.low ?? h.close);
  const minP = Math.min(...lows);
  const maxP = Math.max(...highs);
  const span = maxP - minP || 1;

  const W = 820;
  const H = 195;
  const padX = 16;
  const padY = 16;
  const plotW = W - padX * 2;
  const plotH = H - padY * 2;
  const toY = (val: number) => padY + (1 - (val - minP) / span) * plotH;

  const emaPts: string[] = [];
  let emaVal = history[0].close;
  const k = 2 / (Math.min(12, history.length) + 1);
  history.forEach((pt, i) => {
    emaVal = pt.close * k + emaVal * (1 - k);
    const x = padX + (i / (history.length - 1)) * plotW;
    emaPts.push(`${x.toFixed(1)},${toY(emaVal).toFixed(1)}`);
  });

  const lineCoords = history.map((pt, i) => ({
    x: padX + (i / (history.length - 1)) * plotW,
    y: toY(pt.close),
  }));
  const polylineStr = lineCoords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaStr = `${padX},${H - padY} ${polylineStr} ${W - padX},${H - padY}`;
  const curSym = currency === "USD" ? "$" : currency ? `${currency} ` : "";

  const slotW = plotW / history.length;
  const candleW = Math.max(3, Math.min(14, slotW * 0.62));
  const activeIdx = hoverIdx !== null && hoverIdx >= 0 && hoverIdx < history.length ? hoverIdx : null;
  const activePt = activeIdx !== null ? history[activeIdx] : history[history.length - 1];
  const prevPt = activeIdx !== null && activeIdx > 0 ? history[activeIdx - 1] : activeIdx === null && history.length >= 2 ? history[history.length - 2] : null;
  const aOpen = activePt.open ?? activePt.close, aHigh = activePt.high ?? Math.max(aOpen, activePt.close), aLow = activePt.low ?? Math.min(aOpen, activePt.close), aClose = activePt.close;
  const aBase = prevPt ? prevPt.close : aOpen, aChg = aBase ? ((aClose - aBase) / aBase) * 100 : 0, aBull = aClose >= aOpen;

  return (
    <div className="bg-[#fbfdfc] rounded-2xl p-4 md:p-5 border border-[#e5efe9]">
      <div className="flex flex-wrap justify-between items-center gap-2.5 mb-3.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-display font-bold text-sm text-[#091e16]">
            {titleOverride || (range === "1d" ? "ราคาระหว่างวัน" : "กราฟรายวัน")}
          </span>
          <span
            className={`num text-xs font-bold px-2.5 py-0.5 rounded-full ${
              isUp ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {isUp ? "▲ " : "▼ "}
            {sg(periodChange, 2)} ({thd(history[0].date)} – {thd(history[history.length - 1].date)})
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-[#f1f6f3] p-1 rounded-xl border border-[#dfece5]">
            {([
              ["candle", "แท่งเทียน"],
              ["bar", "บาร์ชาร์ต"],
              ["line", "เส้น"],
              ["area", "พื้นที่"],
            ] as const).map(([tKey, tLabel]) => (
              <button
                key={tKey}
                type="button"
                onClick={() => setChartType(tKey)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  chartType === tKey ? "bg-[#064e3b] text-white shadow-2xs" : "text-slate-600 hover:text-[#091e16]"
                }`}
              >
                {tLabel}
              </button>
            ))}
          </div>

          {range && onRangeChange && (
            <div className="flex gap-1 bg-[#f1f6f3] p-1 rounded-xl border border-[#dfece5]">
              {ranges.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => onRangeChange(r.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    range === r.id ? "bg-white text-[#064e3b] shadow-2xs" : "text-slate-500 hover:text-[#091e16]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 mb-3 rounded-xl border text-xs transition-colors ${activeIdx !== null ? "bg-emerald-50/80 border-emerald-300 shadow-2xs" : "bg-[#f4f8f6] border-[#e2ece7]"}`}><div className="flex items-center gap-2 font-bold text-[#091e16]"><span className={`px-2 py-0.5 rounded-md text-[11px] ${activeIdx !== null ? "bg-[#064e3b] text-white" : "bg-white text-slate-600 border border-[#dfece5]"}`}>{activeIdx !== null ? "แท่งที่ชี้" : "แท่งล่าสุด"}</span><span>{thd(activePt.date)}</span></div><div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 num"><span className="text-slate-500">เปิด: <b className="text-[#091e16]">{curSym}{fmtN(aOpen, 2)}</b></span><span className="text-slate-500">สูง: <b className="text-emerald-700">{curSym}{fmtN(aHigh, 2)}</b></span><span className="text-slate-500">ต่ำ: <b className="text-rose-600">{curSym}{fmtN(aLow, 2)}</b></span><span className="text-slate-500">ปิด: <b className={aBull ? "text-emerald-700" : "text-rose-600"}>{curSym}{fmtN(aClose, 2)}</b></span><span className={`font-extrabold px-2 py-0.5 rounded-full text-[11px] ${aChg >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>{sg(aChg, 2)}</span></div></div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={(e)=>{const r=e.currentTarget.getBoundingClientRect();if(!r.width)return;const rx=((e.clientX-r.left)/r.width)*W;const rt=Math.max(0,Math.min(1,(rx-padX)/plotW));setHoverIdx((chartType==="candle"||chartType==="bar")?Math.min(history.length-1,Math.max(0,Math.floor(rt*history.length))):Math.min(history.length-1,Math.max(0,Math.round(rt*(history.length-1)))));}} onTouchMove={(e)=>{const t=e.touches[0];if(!t)return;const r=e.currentTarget.getBoundingClientRect();if(!r.width)return;const rx=((t.clientX-r.left)/r.width)*W;const rt=Math.max(0,Math.min(1,(rx-padX)/plotW));setHoverIdx((chartType==="candle"||chartType==="bar")?Math.min(history.length-1,Math.max(0,Math.floor(rt*history.length))):Math.min(history.length-1,Math.max(0,Math.round(rt*(history.length-1)))));}} onMouseLeave={()=>setHoverIdx(null)} className="w-full h-44 md:h-52 overflow-visible cursor-crosshair">
          <defs>
            <linearGradient id="gradUpFintech" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="gradDownFintech" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <line x1={padX} y1={padY} x2={W - padX} y2={padY} stroke="#e2ece7" strokeDasharray="4 4" />
          <line x1={padX} y1={padY + plotH * 0.5} x2={W - padX} y2={padY + plotH * 0.5} stroke="#eef4f1" strokeDasharray="3 3" />
          <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke="#e2ece7" strokeDasharray="4 4" />

          {chartType === "line" && (
            <>
              <polyline fill="none" stroke={strokeColor} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" points={polylineStr} />
              {lineCoords.length <= 35 &&
                lineCoords.map((p, idx) => (
                  <circle key={idx} cx={p.x} cy={p.y} r="2.6" fill="#ffffff" stroke={strokeColor} strokeWidth="1.8" />
                ))}
            </>
          )}

          {chartType === "area" && (
            <>
              <polygon points={areaStr} fill={`url(#${fillId})`} />
              <polyline fill="none" stroke={strokeColor} strokeWidth="2.6" strokeLinejoin="round" points={polylineStr} />
            </>
          )}

          {chartType === "candle" && (
            <>
              <polyline fill="none" stroke="#c6a87c" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.85" points={emaPts.join(" ")} />
              {history.map((pt, i) => {
                const o = pt.open ?? pt.close;
                const c = pt.close;
                const h = pt.high ?? Math.max(o, c);
                const l = pt.low ?? Math.min(o, c);
                const bull = c >= o;
                const col = bull ? "#059669" : "#e11d48";
                const cx = padX + (i + 0.5) * slotW;
                const yHigh = toY(h);
                const yLow = toY(l);
                const yTop = toY(Math.max(o, c));
                const yBot = toY(Math.min(o, c));
                const bodyH = Math.max(2.2, yBot - yTop);
                return (
                  <g key={i}>
                    <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={col} strokeWidth="1.4" />
                    <rect
                      x={cx - candleW / 2}
                      y={yTop}
                      width={candleW}
                      height={bodyH}
                      rx="1.2"
                      fill={bull ? "#10b981" : "#f43f5e"}
                      stroke={col}
                      strokeWidth="0.8"
                    />
                  </g>
                );
              })}
            </>
          )}

          {chartType === "bar" && (
            <>
              <polyline fill="none" stroke="#c6a87c" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.85" points={emaPts.join(" ")} />
              {history.map((pt, i) => {
                const o = pt.open ?? pt.close;
                const c = pt.close;
                const h = pt.high ?? Math.max(o, c);
                const l = pt.low ?? Math.min(o, c);
                const bull = c >= o;
                const col = bull ? "#059669" : "#e11d48";
                const cx = padX + (i + 0.5) * slotW;
                const tickW = Math.max(3, candleW * 0.55);
                return (
                  <g key={i}>
                    <line x1={cx} y1={toY(h)} x2={cx} y2={toY(l)} stroke={col} strokeWidth="1.8" strokeLinecap="round" />
                    <line x1={cx - tickW} y1={toY(o)} x2={cx} y2={toY(o)} stroke={col} strokeWidth="1.8" strokeLinecap="round" />
                    <line x1={cx} y1={toY(c)} x2={cx + tickW} y2={toY(c)} stroke={col} strokeWidth="1.8" strokeLinecap="round" />
                  </g>
                );
              })}
            </>
          )}
        </svg>

        <div className="flex flex-wrap justify-between items-center text-xs text-slate-500 mt-2 num gap-2">
          <span>
            ต่ำสุด: <b className="text-[#091e16]">{curSym}{fmtN(minP, 2)}</b>
          </span>
          {(chartType === "candle" || chartType === "bar") && (
            <span className="inline-flex items-center gap-3 text-[11px] font-sans">
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" /> ปิดสูงกว่าเปิด</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" /> ปิดต่ำกว่าเปิด</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-[#c6a87c] inline-block" /> เส้น EMA</span>
            </span>
          )}
          <span>
            สูงสุด: <b className="text-[#091e16]">{curSym}{fmtN(maxP, 2)}</b>
          </span>
        </div>
      </div>
    </div>
  );
}

