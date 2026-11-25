"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import SectorRotationPanel, { LiveMarketItem, FredSeriesItem } from "../components/SectorRotationPanel";
import ProChart from "../components/ProChart";

const RETRIEVED = new Date().toISOString();

type FinRow = [string, string, number[], number?, number?];

interface KeyMetrics {
  marketCap?: string;
  trailingPE?: string;
  forwardPE?: string;
  dividendYield?: string;
  fiftyTwoWeekRange?: string;
  targetMeanPrice?: string;
}

interface SecFilingInfo {
  cik: string;
  entityName: string;
  edgarUrl: string;
  latestForm: string;
  filingDate: string;
  reportDate: string;
  documentUrl: string;
}

interface StockData {
  name: string;
  ticker: string;
  country: string;
  exch: string;
  sector: string;
  currency?: string;
  periodLabel?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  metrics?: KeyMetrics;
  isHeaders?: string[];
  bsHeaders?: string[];
  cfHeaders?: string[];
  is: FinRow[];
  bs: FinRow[];
  cf: FinRow[];
  yr: { h: string[]; rows: FinRow[] };
  mix: [string, number, number, number, number][];
}

interface OhlcPoint {
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
}

interface LiveQuote {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  prevClose: number;
  changePct: number;
  updatedAt: string;
  history: OhlcPoint[];
}

interface NewsItem {
  title: string;
  publisher: string;
  link: string;
}

const US_CORE_INDICES = [
  { id: "^DJI", name: "Dow Jones", code: "US", vix: false },
  { id: "^GSPC", name: "S&P 500", code: "US", vix: false },
  { id: "^IXIC", name: "Nasdaq", code: "US", vix: false },
  { id: "^RUT", name: "Russell 2000", code: "US", vix: false },
  { id: "^VIX", name: "CBOE VIX", code: "VIX", vix: true },
];

const GLOBAL_INDICES = [
  { id: "000001.SS", country: "จีน", name: "SSE Composite", code: "CN" },
  { id: "^HSI", country: "ฮ่องกง", name: "Hang Seng", code: "HK" },
  { id: "^KS11", country: "เกาหลีใต้", name: "KOSPI", code: "KR" },
  { id: "^N225", country: "ญี่ปุ่น", name: "Nikkei 225", code: "JP" },
  { id: "^SET.BK", country: "ไทย", name: "SET Index", code: "TH" },
  { id: "^STOXX50E", country: "ยุโรป", name: "EURO STOXX 50", code: "EU" },
];

function MarketBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full overflow-hidden shadow-xs ring-1 ring-black/10 shrink-0 bg-white">
      {code === "US" && (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <rect width="24" height="24" fill="#ffffff" />
          <rect y="0" width="24" height="3.5" fill="#dc2626" />
          <rect y="7" width="24" height="3.5" fill="#dc2626" />
          <rect y="14" width="24" height="3.5" fill="#dc2626" />
          <rect y="20.5" width="24" height="3.5" fill="#dc2626" />
          <rect width="12" height="13" fill="#1e3a8a" />
          <circle cx="4" cy="4.5" r="1" fill="#ffffff" />
          <circle cx="8" cy="4.5" r="1" fill="#ffffff" />
          <circle cx="6" cy="7" r="1" fill="#ffffff" />
          <circle cx="4" cy="9.5" r="1" fill="#ffffff" />
          <circle cx="8" cy="9.5" r="1" fill="#ffffff" />
        </svg>
      )}
      {code === "VIX" && (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <rect width="24" height="24" fill="#fef3c7" />
          <path d="M13 3L6 14h5.5l-1 7L18 10h-5.5L13 3z" fill="#d97706" />
        </svg>
      )}
      {code === "CN" && (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <rect width="24" height="24" fill="#de2910" />
          <polygon points="6.5,4.5 7.4,7.2 10.2,7.2 7.9,8.8 8.8,11.5 6.5,9.8 4.2,11.5 5.1,8.8 2.8,7.2 5.6,7.2" fill="#ffde00" />
          <circle cx="12.5" cy="4.5" r="1" fill="#ffde00" />
          <circle cx="14.2" cy="6.8" r="1" fill="#ffde00" />
          <circle cx="14.2" cy="9.8" r="1" fill="#ffde00" />
          <circle cx="12.5" cy="12" r="1" fill="#ffde00" />
        </svg>
      )}
      {code === "HK" && (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <rect width="24" height="24" fill="#de2910" />
          <circle cx="12" cy="8.2" r="2.3" fill="#ffffff" />
          <circle cx="15.6" cy="10.8" r="2.3" fill="#ffffff" />
          <circle cx="14.2" cy="15" r="2.3" fill="#ffffff" />
          <circle cx="9.8" cy="15" r="2.3" fill="#ffffff" />
          <circle cx="8.4" cy="10.8" r="2.3" fill="#ffffff" />
          <circle cx="12" cy="12" r="1.5" fill="#de2910" />
        </svg>
      )}
      {code === "KR" && (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <rect width="24" height="24" fill="#ffffff" />
          <circle cx="12" cy="12" r="5.5" fill="#cd2e3a" />
          <path d="M6.5 12a5.5 5.5 0 0 0 11 0a2.75 2.75 0 0 0-5.5 0a2.75 2.75 0 0 1-5.5 0z" fill="#0047a0" />
          <rect x="4" y="5" width="3.5" height="1.2" transform="rotate(-35 4 5)" fill="#111827" />
          <rect x="16.5" y="4.5" width="3.5" height="1.2" transform="rotate(35 16.5 4.5)" fill="#111827" />
          <rect x="4" y="18" width="3.5" height="1.2" transform="rotate(35 4 18)" fill="#111827" />
          <rect x="16.5" y="18.5" width="3.5" height="1.2" transform="rotate(-35 16.5 18.5)" fill="#111827" />
        </svg>
      )}
      {code === "JP" && (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <rect width="24" height="24" fill="#ffffff" />
          <circle cx="12" cy="12" r="5.5" fill="#bc002d" />
        </svg>
      )}
      {code === "TH" && (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <rect y="0" width="24" height="4" fill="#a51931" />
          <rect y="4" width="24" height="4" fill="#f4f5f8" />
          <rect y="8" width="24" height="8" fill="#2d2a4a" />
          <rect y="16" width="24" height="4" fill="#f4f5f8" />
          <rect y="20" width="24" height="4" fill="#a51931" />
        </svg>
      )}
      {code === "EU" && (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <rect width="24" height="24" fill="#003399" />
          <circle cx="12" cy="5.5" r="1" fill="#ffcc00" />
          <circle cx="15.3" cy="6.4" r="1" fill="#ffcc00" />
          <circle cx="17.6" cy="8.7" r="1" fill="#ffcc00" />
          <circle cx="18.5" cy="12" r="1" fill="#ffcc00" />
          <circle cx="17.6" cy="15.3" r="1" fill="#ffcc00" />
          <circle cx="15.3" cy="17.6" r="1" fill="#ffcc00" />
          <circle cx="12" cy="18.5" r="1" fill="#ffcc00" />
          <circle cx="8.7" cy="17.6" r="1" fill="#ffcc00" />
          <circle cx="6.4" cy="15.3" r="1" fill="#ffcc00" />
          <circle cx="5.5" cy="12" r="1" fill="#ffcc00" />
          <circle cx="6.4" cy="8.7" r="1" fill="#ffcc00" />
          <circle cx="8.7" cy="6.4" r="1" fill="#ffcc00" />
        </svg>
      )}
    </span>
  );
}

const SECTOR_MAP_TH: Record<string, string> = {
  Technology: "เทคโนโลยี", "Financial Services": "การเงิน", Healthcare: "สุขภาพ",
  "Consumer Cyclical": "สินค้าฟุ่มเฟือย", "Consumer Defensive": "สินค้าจำเป็น", Energy: "พลังงาน",
  Industrials: "อุตสาหกรรม", "Basic Materials": "วัสดุ", Utilities: "สาธารณูปโภค",
  "Real Estate": "อสังหาฯ", "Communication Services": "สื่อสาร",
};

const DEFAULT_WATCHLIST = ["AAPL", "LLY", "PFE", "NVDA", "MSFT", "TSLA"];
const MO = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const TH: Record<string, string> = {
  "Cost of Revenue": "ต้นทุนขาย (COGS)",
  "Operating Expenses": "ค่าใช้จ่ายดำเนินงาน (OpEx)",
  "Tax & Other": "ภาษีและรายการอื่น",
  "Net Income": "กำไรสุทธิ (Net Income)",
};

function fmtN(v: number, d = 0): string {
  if (!isFinite(v)) return "0";
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  return v < 0 ? `(${s})` : s;
}
function fmtCap(raw?: number): string {
  if (!raw || !isFinite(raw)) return "–";
  if (raw >= 1e12) return `$${(raw / 1e12).toFixed(2)}T`;
  if (raw >= 1e9) return `$${(raw / 1e9).toFixed(2)}B`;
  if (raw >= 1e6) return `$${(raw / 1e6).toFixed(2)}M`;
  return `$${fmtN(raw)}`;
}
function pct(a: number, b: number): number { return b ? Math.round((a / b - 1) * 1000) / 10 : 0; }
function r1(x: number): number { return isFinite(x) ? Math.round(x * 10) / 10 : 0; }
function sg(x: number, dec?: number): string {
  const valStr = typeof dec === "number" ? x.toFixed(dec) : String(x);
  return `${x >= 0 ? "+" : ""}${valStr}%`;
}
function thd(s: string): string {
  if (!s) return "ล่าสุด";
  if (s.includes(":")) return `${s} น.`;
  if (!s.includes("-")) return s;
  const a = s.split("-");
  return `${parseInt(a[2], 10)} ${MO[parseInt(a[1], 10) - 1]} ${a[0]}`;
}
function thDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "–" : d.toLocaleString("th-TH-u-ca-gregory", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " น.";
}
function getV(rows: FinRow[], en: string): number[] { const found = rows.find((r) => r[0] === en); return found ? found[2] : [0, 0, 0, 0]; }
function preSum(rows: FinRow[], pf: string, j: number): number { return rows.filter((r) => r[0].startsWith(pf)).reduce((acc, r) => acc + (r[2][j] || 0), 0); }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMetrics(summary: any, currency = "USD"): KeyMetrics {
  const sd = summary?.summaryDetail || {}, fd = summary?.financialData || {}, ks = summary?.defaultKeyStatistics || {};
  const curSym = currency === "USD" ? "$" : `${currency} `;
  const lo52 = sd.fiftyTwoWeekLow?.raw, hi52 = sd.fiftyTwoWeekHigh?.raw;
  return {
    marketCap: fmtCap(sd.marketCap?.raw),
    trailingPE: sd.trailingPE?.raw ? `${sd.trailingPE.raw.toFixed(2)}x` : "–",
    forwardPE: sd.forwardPE?.raw ? `${sd.forwardPE.raw.toFixed(2)}x` : ks.forwardPE?.raw ? `${ks.forwardPE.raw.toFixed(2)}x` : "–",
    dividendYield: sd.dividendYield?.raw ? `${(sd.dividendYield.raw * 100).toFixed(2)}%` : "–",
    fiftyTwoWeekRange: lo52 && hi52 ? `${curSym}${lo52.toFixed(2)} – ${curSym}${hi52.toFixed(2)}` : "–",
    targetMeanPrice: fd.targetMeanPrice?.raw ? `${curSym}${fd.targetMeanPrice.raw.toFixed(2)}` : "–",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapYahooToStockData(quote: LiveQuote, summary: any, secFiling?: SecFilingInfo | null): StockData {
  const M = 1_000_000;
  const valM = (obj: { raw?: number } | undefined) => (obj?.raw ? Math.round(obj.raw / M) : 0);
  const prof = summary?.assetProfile || {}, fin = summary?.financialData || {};
  const isArr = summary?.incomeStatementHistory?.incomeStatementHistory || [];
  const isQArr = summary?.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];
  const bsArr = summary?.balanceSheetHistory?.balanceSheetStatements || [];
  const cfArr = summary?.cashflowStatementHistory?.cashflowStatements || [];

  const is0 = isArr[0] || {}, is1 = isArr[1] || is0, q0 = isQArr[0] || {}, q1 = isQArr[1] || q0;
  const bs0 = bsArr[0] || {}, bs1 = bsArr[1] || bs0, cf0 = cfArr[0] || {}, cf1 = cfArr[1] || cf0;

  const yr0Label = is0.endDate?.fmt ? `FY ${is0.endDate.fmt.slice(0, 4)}` : "ปีล่าสุด";
  const yr1Label = is1.endDate?.fmt ? `FY ${is1.endDate.fmt.slice(0, 4)}` : "ปีก่อน";
  const q0Label = q0.endDate?.fmt ? `Q ล่าสุด (${q0.endDate.fmt})` : "ไตรมาสล่าสุด";
  const q1Label = q1.endDate?.fmt ? `Q ก่อนหน้า (${q1.endDate.fmt})` : "ไตรมาสก่อน";
  const bs0Label = bs0.endDate?.fmt || "งวดล่าสุด", bs1Label = bs1.endDate?.fmt || "งวดก่อน";

  const revY0 = valM(is0.totalRevenue) || valM(fin.totalRevenue), revY1 = valM(is1.totalRevenue) || revY0;
  const revQ0 = valM(q0.totalRevenue), revQ1 = valM(q1.totalRevenue);
  const costY0 = valM(is0.costOfRevenue), costY1 = valM(is1.costOfRevenue);
  const gmY0 = valM(is0.grossProfit) || (fin.grossMargins?.raw ? Math.round(revY0 * fin.grossMargins.raw) : revY0 - costY0);
  const gmY1 = valM(is1.grossProfit) || revY1 - costY1;
  const effCostY0 = costY0 || Math.max(0, revY0 - gmY0), effCostY1 = costY1 || Math.max(0, revY1 - gmY1);

  const rdY0 = valM(is0.researchDevelopment), rdY1 = valM(is1.researchDevelopment);
  const sgaY0 = valM(is0.sellingGeneralAdministrative), sgaY1 = valM(is1.sellingGeneralAdministrative);
  const opexY0 = valM(is0.totalOperatingExpenses) || rdY0 + sgaY0, opexY1 = valM(is1.totalOperatingExpenses) || rdY1 + sgaY1;
  const oiY0 = valM(is0.operatingIncome) || (fin.operatingMargins?.raw ? Math.round(revY0 * fin.operatingMargins.raw) : gmY0 - opexY0);
  const oiY1 = valM(is1.operatingIncome) || gmY1 - opexY1;
  const niY0 = valM(is0.netIncome) || valM(fin.netIncomeToCommon), niY1 = valM(is1.netIncome) || niY0;

  const cash0 = valM(bs0.cash) || valM(fin.totalCash), cash1 = valM(bs1.cash);
  const stInv0 = valM(bs0.shortTermInvestments), stInv1 = valM(bs1.shortTermInvestments);
  const ar0 = valM(bs0.netReceivables), ar1 = valM(bs1.netReceivables);
  const inv0 = valM(bs0.inventory), inv1 = valM(bs1.inventory);
  const curAssets0 = valM(bs0.totalCurrentAssets), curAssets1 = valM(bs1.totalCurrentAssets);
  const totAssets0 = valM(bs0.totalAssets), totAssets1 = valM(bs1.totalAssets);
  const stDebt0 = valM(bs0.shortLongTermDebt), stDebt1 = valM(bs1.shortLongTermDebt);
  const ltDebt0 = valM(bs0.longTermDebt) || Math.max(0, valM(fin.totalDebt) - stDebt0), ltDebt1 = valM(bs1.longTermDebt);
  const curLiab0 = valM(bs0.totalCurrentLiabilities), curLiab1 = valM(bs1.totalCurrentLiabilities);
  const totLiab0 = valM(bs0.totalLiab), totLiab1 = valM(bs1.totalLiab);
  const equity0 = valM(bs0.totalStockholderEquity), equity1 = valM(bs1.totalStockholderEquity);

  const cfo0 = valM(cf0.totalCashFromOperatingActivities) || valM(fin.operatingCashflow), cfo1 = valM(cf1.totalCashFromOperatingActivities) || cfo0;
  const capex0 = valM(cf0.capitalExpenditures), capex1 = valM(cf1.capitalExpenditures);
  const cfi0 = valM(cf0.totalCashflowsFromInvestingActivities), cfi1 = valM(cf1.totalCashflowsFromInvestingActivities);
  const div0 = valM(cf0.dividendsPaid), div1 = valM(cf1.dividendsPaid);
  const bb0 = valM(cf0.repurchaseOfStock), bb1 = valM(cf1.repurchaseOfStock);
  const iss0 = valM(cf0.issuanceOfStock) || 0, iss1 = valM(cf1.issuanceOfStock) || 0;
  const cff0 = valM(cf0.totalCashFromFinancingActivities), cff1 = valM(cf1.totalCashFromFinancingActivities);

  const opexCleanY0 = Math.max(0, gmY0 - oiY0), opexCleanY1 = Math.max(0, gmY1 - oiY1);
  const taxAndOthY0 = Math.max(0, revY0 - effCostY0 - opexCleanY0 - Math.max(0, niY0));
  const taxAndOthY1 = Math.max(0, revY1 - effCostY1 - opexCleanY1 - Math.max(0, niY1));

  return {
    name: quote.name, ticker: quote.symbol, country: prof.country || "US / Global", exch: quote.exchange,
    sector: SECTOR_MAP_TH[prof.sector] || prof.sector || "หุ้นรายตัว", currency: `ล้าน ${quote.currency}`,
    periodLabel: secFiling?.filingDate
      ? `ยื่น Form ${secFiling.latestForm} ล่าสุดวันที่ ${secFiling.filingDate}`
      : `งบการเงินรอบล่าสุด (${yr0Label})`,
    sourceLabel: secFiling
      ? `SEC EDGAR (CIK ${secFiling.cik})`
      : `${quote.exchange} (${quote.symbol})`,
    sourceUrl: secFiling?.documentUrl || `https://finance.yahoo.com/quote/${encodeURIComponent(quote.symbol)}/financials`,
    metrics: extractMetrics(summary, quote.currency),
    isHeaders: [q0Label, q1Label, yr0Label, yr1Label], bsHeaders: [bs0Label, bs1Label], cfHeaders: [yr0Label, yr1Label],
    is: [
      ["Products net sales", "รายได้หลักจากการดำเนินงาน", [revQ0, revQ1, revY0, revY1]],
      ["Services net sales", "รายได้อื่น", [0, 0, 0, 0]],
      ["Total net sales", "รายได้รวม (Total Revenue)", [revQ0, revQ1, revY0, revY1], 0, 1],
      ["Cost of sales: Products", "ต้นทุนขาย (COGS)", [valM(q0.costOfRevenue), valM(q1.costOfRevenue), effCostY0, effCostY1]],
      ["Cost of sales: Services", "ต้นทุนอื่น", [0, 0, 0, 0]],
      ["Total cost of sales", "ต้นทุนรวม", [valM(q0.costOfRevenue), valM(q1.costOfRevenue), effCostY0, effCostY1]],
      ["Gross margin", "กำไรขั้นต้น (Gross Profit)", [valM(q0.grossProfit), valM(q1.grossProfit), gmY0, gmY1], 0, 1],
      ["Research and development", "ค่าวิจัยและพัฒนา (R&D)", [valM(q0.researchDevelopment), valM(q1.researchDevelopment), rdY0, rdY1]],
      ["Selling, general and administrative", "ค่าขายและบริหาร (SG&A)", [valM(q0.sellingGeneralAdministrative), valM(q1.sellingGeneralAdministrative), sgaY0, sgaY1]],
      ["Total operating expenses", "ค่าใช้จ่ายดำเนินงานรวม (OpEx)", [valM(q0.totalOperatingExpenses), valM(q1.totalOperatingExpenses), opexY0, opexY1]],
      ["Operating income", "กำไรจากการดำเนินงาน (Operating Income)", [valM(q0.operatingIncome), valM(q1.operatingIncome), oiY0, oiY1], 0, 1],
      ["Income before taxes", "กำไรก่อนภาษี (EBT)", [valM(q0.incomeBeforeTax), valM(q1.incomeBeforeTax), valM(is0.incomeBeforeTax), valM(is1.incomeBeforeTax)]],
      ["Provision for income taxes", "ภาษีเงินได้ (Income Tax)", [valM(q0.incomeTaxExpense), valM(q1.incomeTaxExpense), valM(is0.incomeTaxExpense), valM(is1.incomeTaxExpense)]],
      ["Net income", "กำไรสุทธิ (Net Income)", [valM(q0.netIncome), valM(q1.netIncome), niY0, niY1], 0, 1],
    ],
    bs: [
      ["Cash and cash equivalents", "เงินสดและรายการเทียบเท่าเงินสด", [cash0, cash1]],
      ["Marketable securities (current)", "เงินลงทุนระยะสั้น", [stInv0, stInv1]],
      ["Accounts receivable, net", "ลูกหนี้การค้าสุทธิ", [ar0, ar1]],
      ["Inventories", "สินค้าคงเหลือ", [inv0, inv1]],
      ["Total current assets", "สินทรัพย์หมุนเวียนรวม", [curAssets0, curAssets1], 0, 1],
      ["Marketable securities (non-current)", "เงินลงทุนระยะยาว", [0, 0]],
      ["Property, plant and equipment, net", "ที่ดิน อาคาร และอุปกรณ์สุทธิ", [valM(bs0.propertyPlantEquipment), valM(bs1.propertyPlantEquipment)]],
      ["Total assets", "สินทรัพย์รวม (Total Assets)", [totAssets0, totAssets1], 0, 1],
      ["Accounts payable", "เจ้าหนี้การค้า", [valM(bs0.accountsPayable), valM(bs1.accountsPayable)]],
      ["Commercial paper", "ตั๋วเงินระยะสั้น", [0, 0]],
      ["Term debt (current)", "หนี้สินระยะสั้น / ครบกำหนดใน 1 ปี", [stDebt0, stDebt1]],
      ["Total current liabilities", "หนี้สินหมุนเวียนรวม", [curLiab0, curLiab1], 0, 1],
      ["Term debt (non-current)", "หนี้สินระยะยาว (Long-Term Debt)", [ltDebt0, ltDebt1]],
      ["Total liabilities", "หนี้สินรวม (Total Liabilities)", [totLiab0, totLiab1], 0, 1],
      ["Total shareholders' equity", "ส่วนของผู้ถือหุ้นรวม", [equity0, equity1], 0, 1],
    ],
    cf: [
      ["Net income", "กำไรสุทธิ (Net Income)", [niY0, niY1]],
      ["Adj: Depreciation and amortization", "ค่าเสื่อมราคาและตัดจำหน่าย", [valM(cf0.depreciation), valM(cf1.depreciation)]],
      ["Chg: Working capital", "การเปลี่ยนแปลงเงินทุนหมุนเวียน", [valM(cf0.changeInWorkingCapital), valM(cf1.changeInWorkingCapital)]],
      ["Cash generated by operating activities", "กระแสเงินสดจากการดำเนินงาน (CFO)", [cfo0, cfo1], 0, 1],
      ["Payments for acquisition of PP&E", "รายจ่ายลงทุน (CapEx)", [capex0, capex1]],
      ["Cash generated by/(used in) investing activities", "กระแสเงินสดจากการลงทุน (CFI)", [cfi0, cfi1], 0, 1],
      ["Payments for dividends and dividend equivalents", "จ่ายเงินปันผล", [div0, div1]],
      ["Repurchases of common stock", "ซื้อหุ้นคืน (Share Buyback)", [bb0, bb1]],
      ["Proceeds from issuance of term debt, net", "ออกตราสารทุน/หนี้ใหม่", [iss0, iss1]],
      ["Repayments of term debt", "ชำระคืนหนี้สิน", [valM(cf0.netBorrowings), valM(cf1.netBorrowings)]],
      ["Repayments of commercial paper, net", "หนี้ระยะสั้นสุทธิ", [0, 0]],
      ["Cash used in financing activities", "กระแสเงินสดจากการจัดหาเงิน (CFF)", [cff0, cff1], 0, 1],
    ],
    yr: {
      h: [yr1Label, yr0Label],
      rows: [
        ["Total revenue", "รายได้รวม (Total Revenue)", [revY1, revY0]],
        ["Operating income", "กำไรจากการดำเนินงาน (Operating Income)", [oiY1, oiY0]],
        ["Net income", "กำไรสุทธิ (Net Income)", [niY1, niY0]],
        ["Cash generated by operating activities", "กระแสเงินสดจากการดำเนินงาน (CFO)", [cfo1, cfo0]],
      ],
    },
    mix: [
      ["Cost of Revenue", valM(q0.costOfRevenue), valM(q1.costOfRevenue), effCostY0, effCostY1],
      ["Operating Expenses", valM(q0.totalOperatingExpenses), valM(q1.totalOperatingExpenses), opexCleanY0, opexCleanY1],
      ["Tax & Other", 0, 0, taxAndOthY0, taxAndOthY1],
      ["Net Income", valM(q0.netIncome), valM(q1.netIncome), Math.max(0, niY0), Math.max(0, niY1)],
    ],
  };
}

function calcMetrics(d: StockData) {
  const I = d.is, B = d.bs, F = d.cf;
  const rev = getV(I, "Total net sales"), oi = getV(I, "Operating income"), ni = getV(I, "Net income"), rd = getV(I, "Research and development");
  const cfo = getV(F, "Cash generated by operating activities");
  const cx = getV(F, "Payments for acquisition of PP&E").map((x) => Math.abs(x));
  const dv = getV(F, "Payments for dividends and dividend equivalents");
  const bb = getV(F, "Repurchases of common stock");
  const ret = [Math.abs(dv[0]) + Math.abs(bb[0]), Math.abs(dv[1]) + Math.abs(bb[1])];
  const wc = [preSum(F, "Chg:", 0), preSum(F, "Chg:", 1)];
  const dCFO = cfo[0] - cfo[1], dNI = ni[2] - ni[3], dWC = wc[0] - wc[1], dOth = dCFO - dNI - dWC;
  const cp = getV(B, "Commercial paper"), tc = getV(B, "Term debt (current)"), tn = getV(B, "Term debt (non-current)");
  const dc = cp[0] + tc[0] + tn[0], dp = cp[1] + tc[1] + tn[1], dd = dc - dp, due = cp[0] + tc[0];
  const ca = getV(B, "Cash and cash equivalents"), ms = getV(B, "Marketable securities (current)"), mn = getV(B, "Marketable securities (non-current)");
  const cs = ca[0] + ms[0] + mn[0], csp = ca[1] + ms[1] + mn[1], liq = ca[0] + ms[0];
  const inv = getV(B, "Inventories"), ar = getV(B, "Accounts receivable, net");

  return {
    rev: [rev[2], rev[3]], ni: [ni[2], ni[3]], rd: [rd[2], rd[3]],
    revg: pct(rev[2], rev[3]), oig: pct(oi[2], oi[3]), nig: pct(ni[2], ni[3]),
    om: [rev[2] ? r1((oi[2] / rev[2]) * 100) : 0, rev[3] ? r1((oi[3] / rev[3]) * 100) : 0],
    cfo, cx, ret, wc, dCFO, dNI, dWC, dOth, dc, dp, dd, due, cs, csp, liq, inv, ar,
  };
}

const Q_META = [
  { t: "01 · Operating Cash Flow", q: "กระแสเงินสดดำเนินงาน เทียบกำไรสุทธิ", rule: "CFO ÷ Net Income: ≥ 100% ผ่าน · 70–99% ดูต่อ · < 70% ระวัง" },
  { t: "02 · Free Cash Flow", q: "กระแสเงินสดดำเนินงาน เทียบรายจ่ายลงทุน", rule: "CFO ÷ CapEx: ≥ 1x ผ่าน · 0.5–0.99x ดูต่อ · < 0.5x ระวัง" },
  { t: "03 · Debt Discipline", q: "หนี้สินที่มีภาระดอกเบี้ย เทียบงวดก่อน", rule: "หนี้สิน: ลด/คงที่ ผ่าน · เพิ่ม < CapEx ดูต่อ · เพิ่ม > CapEx ระวัง" },
  { t: "04 · Net Cash Position", q: "เงินสดและเงินลงทุน เทียบหนี้สินรวม", rule: "Cash ÷ Debt: ≥ 100% ผ่าน · 50–99% ดูต่อ · < 50% ระวัง" },
  { t: "05 · Growth & Margin", q: "การเติบโตของรายได้ และอัตรากำไรดำเนินงาน", rule: "Rev & OPM: ดีขึ้นทั้งคู่ ผ่าน · ด้านเดียว ดูต่อ · ลดทั้งคู่ ระวัง" },
];

const LBI: Record<string, string> = { g: "ผ่านเกณฑ์", a: "ควรดูต่อ", r: "ระวัง" };
const BADGE_CLS: Record<string, string> = {
  g: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  a: "bg-amber-50 text-amber-700 border border-amber-200",
  r: "bg-rose-50 text-rose-700 border border-rose-200",
};
const COL: Record<string, string> = { g: "#059669", a: "#d97706", r: "#e11d48" };
const DOT_COL: Record<string, string> = { g: "bg-emerald-500", a: "bg-amber-500", r: "bg-rose-500" };

function ScoreRing({ passed, total = 5 }: { passed: number; total?: number }) {
  const pctVal = Math.round((passed / total) * 100);
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pctVal / 100) * circ;
  return (
    <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 54 54">
        <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4.5" />
        <circle
          cx="27"
          cy="27"
          r={r}
          fill="none"
          stroke="#34d399"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="num absolute text-xs font-extrabold text-white">
        {passed}/{total}
      </span>
    </div>
  );
}

function MiniSparkline({ points, isUp }: { points?: { close: number }[]; isUp: boolean }) {
  if (!points || points.length < 2) return null;
  const recent = points.slice(-10);
  const vals = recent.map((p) => p.close);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const W = 100, H = 28;
  const poly = vals.map((v, i) => `${((i / (vals.length - 1)) * W).toFixed(1)},${(3 + (1 - (v - min) / span) * (H - 6)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-7 overflow-visible">
      <polyline fill="none" stroke={isUp ? "#10b981" : "#f43f5e"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={poly} />
    </svg>
  );
}

function PriceChart({history,currency,range,onRangeChange,isLoading,titleOverride}:{history:OhlcPoint[];currency:string;range?:string;onRangeChange?:(r:string)=>void;isLoading?:boolean;titleOverride?:string;}){return(<ProChart history={history} currency={currency} range={range} onRangeChange={onRangeChange} isLoading={isLoading} titleOverride={titleOverride}/>);}

export default function Page() {
  const [mainView, setMainView] = useState<"market" | "stock">("market");
  const [query, setQuery] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [watchQuotes, setWatchQuotes] = useState<Record<string, LiveMarketItem>>({});
  const [isAddingWatch, setIsAddingWatch] = useState(false);
  const [newWatchTicker, setNewWatchTicker] = useState("");
  const [selectedIndexId, setSelectedIndexId] = useState<string>("^DJI");
  const [showGlobalDrawer, setShowGlobalDrawer] = useState<boolean>(false);
  const [selectedTicker, setSelectedTicker] = useState<string>("AAPL");
  const [liveStockData, setLiveStockData] = useState<StockData | null>(null);
  const [secFiling, setSecFiling] = useState<SecFilingInfo | null>(null);
  const [stockNews, setStockNews] = useState<NewsItem[]>([]);
  const [searchMsg, setSearchMsg] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(true);
  const [chartRange, setChartRange] = useState<string>("3mo");
  const [liveQuote, setLiveQuote] = useState<LiveQuote | null>(null);
  const [liveMarket, setLiveMarket] = useState<Record<string, LiveMarketItem>>({});
  const [fredData, setFredData] = useState<Record<string, FredSeriesItem | null>>({});
  const [marketNews, setMarketNews] = useState<NewsItem[]>([]);
  const [marketUpdatedAt, setMarketUpdatedAt] = useState<string>(RETRIEVED);
  const [activeTab, setActiveTab] = useState<"q5" | "stmt" | "mix" | "plan">("q5");
  const [activeQ, setActiveQ] = useState<number>(0);
  const [activeStmt, setActiveStmt] = useState<"is" | "bs" | "cf" | "yr">("is");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const liveRef = useRef({ ticker: "AAPL", range: "3mo", watch: DEFAULT_WATCHLIST });
  liveRef.current = { ticker: selectedTicker, range: chartRange, watch: watchlist };

  const selectStock = async (tickerInput: string, rangeOverride?: string, stayOnCurrentView?: boolean) => {
    const s = tickerInput.trim().toUpperCase();
    if (!s) return;
    const targetRange = rangeOverride || chartRange;
    setIsSearching(true);
    setSearchMsg("");
    if (!stayOnCurrentView) {
      setMainView("stock");
      setActiveTab("q5");
      setActiveQ(0);
      setActiveStmt("is");
    }

    try {
      const res = await fetch(`/api/market?symbol=${encodeURIComponent(s)}&range=${encodeURIComponent(targetRange)}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.price) {
        const quoteObj: LiveQuote = {
          symbol: data.symbol, name: data.name, exchange: data.exchange, currency: data.currency,
          price: data.price, prevClose: data.prevClose, changePct: data.changePct,
          updatedAt: data.updatedAt, history: data.history || [],
        };
        setLiveQuote(quoteObj);
        setSecFiling(data.secFiling || null);
        setStockNews(Array.isArray(data.stockNews) ? data.stockNews : []);
        setSelectedTicker(data.symbol);

        if (data.summary) {
          setLiveStockData(mapYahooToStockData(quoteObj, data.summary, data.secFiling));
        } else {
          setLiveStockData(null);
          setSearchMsg(`ดึงราคาสดของ ${data.symbol} สำเร็จ แต่ตลาดหลักทรัพย์ยังไม่เปิดเผยงบการเงินแบบละเอียดสำหรับรหัสนี้`);
        }
        if (!stayOnCurrentView) window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setSearchMsg(data.error || `ไม่พบข้อมูลหุ้น "${s}" ในตลาดโลก`);
      }
    } catch {
      setSearchMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ข้อมูลตลาดได้ในขณะนี้");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    let initialList = DEFAULT_WATCHLIST;
    try {
      const saved = localStorage.getItem("flow_watchlist_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) { initialList = parsed; setWatchlist(parsed); }
      }
    } catch {}

    fetch("/api/market", { cache: "no-store" }).then((res) => res.json()).then((data) => {
      if (data?.market) { setLiveMarket(data.market); if (data.retrievedAt) setMarketUpdatedAt(data.retrievedAt); }
      if (data?.fred) setFredData(data.fred);
      if (Array.isArray(data?.news)) setMarketNews(data.news);
    }).catch(() => {});

    fetch(`/api/market?watch=${encodeURIComponent(initialList.join(","))}`, { cache: "no-store" }).then((res) => res.json()).then((data) => {
      if (data?.watchlist) setWatchQuotes(data.watchlist);
    }).catch(() => {});

    selectStock("AAPL", "3mo", true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveWatchlist = (next: string[]) => {
    setWatchlist(next);
    try { localStorage.setItem("flow_watchlist_v1", JSON.stringify(next)); } catch {}
    if (next.length > 0) {
      fetch(`/api/market?watch=${encodeURIComponent(next.join(","))}`, { cache: "no-store" }).then((res) => res.json()).then((data) => { if (data?.watchlist) setWatchQuotes(data.watchlist); }).catch(() => {});
    }
  };

  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault();
    const tk = newWatchTicker.trim().toUpperCase();
    if (tk && !watchlist.includes(tk)) saveWatchlist([...watchlist, tk]);
    setNewWatchTicker("");
    setIsAddingWatch(false);
  };

  const handleTogglePinWatch = (tk: string) => {
    if (watchlist.includes(tk)) {
      saveWatchlist(watchlist.filter((item) => item !== tk));
    } else {
      saveWatchlist([...watchlist, tk]);
    }
  };

  const d: StockData | null = liveStockData;
  const c = useMemo(() => (d ? calcMetrics(d) : null), [d]);

  const qResults = useMemo(() => {
    if (!c) return [];
    const dwn = (x: number) => (x >= 0 ? "เพิ่มขึ้น" : "ลดลง");
    const x0 = c.ni[0] ? r1((c.cfo[0] / c.ni[0]) * 100) : 0, y0 = c.ni[1] ? r1((c.cfo[1] / c.ni[1]) * 100) : 0;
    const lv0 = c.cfo[0] <= 0 || x0 < 70 ? "r" : x0 >= 100 ? "g" : "a";
    const r0 = {
      lv: lv0,
      ans: lv0 === "g" ? "ผ่านเกณฑ์ — กระแสเงินสดจากการดำเนินงานสูงกว่ากำไรสุทธิ" : lv0 === "a" ? "ควรดูต่อ — กระแสเงินสดจากการดำเนินงานต่ำกว่ากำไรสุทธิเล็กน้อย" : "ระวัง — กระแสเงินสดจากการดำเนินงานต่ำกว่ากำไรมากหรือติดลบ",
      nums: [["กำไรสุทธิ (Net Income)", fmtN(c.ni[0]), "งบกำไรขาดทุน"], ["กระแสเงินสดดำเนินงาน (CFO)", fmtN(c.cfo[0]), "งบกระแสเงินสด"], ["สัดส่วน CFO / Net Income", `${x0}%`, `ปีก่อน ${y0}%`]],
      bars: [["กำไรสุทธิ (Net Income) ล่าสุด", c.ni[0]], ["กระแสเงินสดดำเนินงาน (CFO) ล่าสุด", c.cfo[0]], ["กำไรสุทธิ ปีก่อน", c.ni[1]], ["กระแสเงินสดดำเนินงาน ปีก่อน", c.cfo[1]]] as [string, number][],
      mean: `กระแสเงินสดจากการดำเนินงาน${dwn(c.dCFO)} ${fmtN(Math.abs(c.dCFO))} ล้านเทียบปีก่อน`,
      watch: `สินค้าคงเหลือ ${fmtN(c.inv[0])} และลูกหนี้การค้า ${fmtN(c.ar[0])}`,
    };

    const x1 = c.cx[0] ? r1(c.cfo[0] / c.cx[0]) : c.cfo[0] > 0 ? 99 : 0, y1 = c.cx[1] ? r1(c.cfo[1] / c.cx[1]) : 0;
    const lv1 = x1 >= 1 ? "g" : x1 >= 0.5 ? "a" : "r", ret0 = c.cfo[0] ? r1((c.ret[0] / c.cfo[0]) * 100) : 0;
    const r1Res = {
      lv: lv1,
      ans: lv1 === "g" ? "ผ่านเกณฑ์ — กระแสเงินสดดำเนินงานสูงกว่ารายจ่ายลงทุน (Free Cash Flow เป็นบวก)" : lv1 === "a" ? "ควรดูต่อ — กระแสเงินสดดำเนินงานครอบคลุมรายจ่ายลงทุนได้บางส่วน" : "ระวัง — กระแสเงินสดดำเนินงานต่ำกว่ารายจ่ายลงทุน (CapEx)",
      nums: [["กระแสเงินสดดำเนินงาน (CFO)", fmtN(c.cfo[0]), `ปีก่อน ${fmtN(c.cfo[1])}`], ["รายจ่ายลงทุน (CapEx)", fmtN(c.cx[0]), `ปีก่อน ${fmtN(c.cx[1])}`], ["อัตราส่วน CFO / CapEx", `${x1} เท่า`, `ปีก่อน ${y1} เท่า`]],
      bars: [["กระแสเงินสดดำเนินงาน (CFO)", c.cfo[0]], ["รายจ่ายลงทุน (CapEx)", c.cx[0]]] as [string, number][],
      mean: `รายจ่ายลงทุน (CapEx) ${c.cx[0] < c.cx[1] ? "ลดลง " : "เพิ่มขึ้น "}${Math.abs(pct(c.cx[0], c.cx[1]))}% เทียบปีก่อน`,
      watch: `จ่ายปันผลและซื้อหุ้นคืนรวม ${fmtN(c.ret[0])} (${ret0}% ของ CFO)`,
    };

    const lv2 = c.dd <= 0 ? "g" : c.dd < c.cx[0] ? "a" : "r";
    const r2Res = {
      lv: lv2,
      ans: lv2 === "g" ? "ผ่านเกณฑ์ — หนี้สินที่มีภาระดอกเบี้ยลดลงหรือคงที่" : lv2 === "a" ? "ควรดูต่อ — หนี้สินเพิ่มขึ้นน้อยกว่ารายจ่ายลงทุน (CapEx)" : "ระวัง — หนี้สินเพิ่มขึ้นสูงกว่ารายจ่ายลงทุน (CapEx)",
      nums: [["หนี้สินที่มีดอกเบี้ยล่าสุด", fmtN(c.dc), "หนี้ระยะสั้น + ระยะยาว"], ["หนี้สินที่มีดอกเบี้ยงวดก่อน", fmtN(c.dp), "ฐานเปรียบเทียบ"], ["ส่วนต่างหนี้สิน (YoY)", `${c.dd < 0 ? "ลด " : "เพิ่ม "}${fmtN(Math.abs(c.dd))}`, sg(pct(c.dc, c.dp))]],
      bars: [["หนี้สินที่มีดอกเบี้ย ล่าสุด", c.dc], ["หนี้สินที่มีดอกเบี้ย งวดก่อน", c.dp]] as [string, number][],
      mean: `หนี้สินที่มีภาระดอกเบี้ย${c.dd <= 0 ? "ลดลงหรือคงที่" : "เพิ่มขึ้น"} ${fmtN(Math.abs(c.dd))} ล้าน`,
      watch: `เทียบภาระหนี้รวมกับกระแสเงินสดดำเนินงาน (${fmtN(c.cfo[0])})`,
    };

    const lv3 = c.cs >= c.dc ? "g" : c.cs >= c.dc / 2 ? "a" : "r";
    const r3Res = {
      lv: lv3,
      ans: lv3 === "g" ? "ผ่านเกณฑ์ — เงินสดและเงินลงทุนสูงกว่าหนี้สินรวม (Net Cash)" : lv3 === "a" ? "ควรดูต่อ — เงินสดและเงินลงทุนครอบคลุมหนี้สินได้เกิน 50%" : "ระวัง — หนี้สินที่มีดอกเบี้ยสูงกว่าเงินสดที่มีอยู่มาก",
      nums: [["เงินสด + เงินลงทุนระยะสั้น", fmtN(c.cs), `งวดก่อน ${fmtN(c.csp)}`], ["หนี้สินที่มีดอกเบี้ยรวม", fmtN(c.dc), `งวดก่อน ${fmtN(c.dp)}`], ["เงินสดสุทธิ (Net Cash)", fmtN(c.cs - c.dc), `งวดก่อน ${fmtN(c.csp - c.dp)}`]],
      bars: [["เงินสด + เงินลงทุน", c.cs], ["หนี้สินที่มีดอกเบี้ยรวม", c.dc]] as [string, number][],
      mean: `เงินสดเทียบหนี้สินรวม ${c.cs >= c.dc ? "สูงกว่า " : "ต่ำกว่า "}${fmtN(Math.abs(c.cs - c.dc))} ล้าน`,
      watch: `หนี้ครบกำหนดใน 1 ปี ${fmtN(c.due)} เทียบสภาพคล่องหมุนเวียน ${fmtN(c.liq)}`,
    };

    const up = c.revg > 0, mu = c.om[0] >= c.om[1], lv4 = up && mu ? "g" : up || mu ? "a" : "r";
    const r4Res = {
      lv: lv4,
      ans: lv4 === "g" ? "ผ่านเกณฑ์ — รายได้เติบโตและอัตรากำไรจากการดำเนินงานขยายตัว" : lv4 === "a" ? "ควรดูต่อ — รายได้หรืออัตรากำไรดำเนินงานดีขึ้นเพียงด้านเดียว" : "ระวัง — รายได้และอัตรากำไรจากการดำเนินงานลดลงทั้งคู่",
      nums: [["การเติบโตของรายได้ (YoY)", sg(c.revg), `${fmtN(c.rev[0])} จาก ${fmtN(c.rev[1])}`], ["อัตรากำไรดำเนินงาน (OPM)", `${c.om[0]}%`, `ปีก่อน ${c.om[1]}%`], ["การเติบโตกำไรสุทธิ (YoY)", sg(c.nig), `${fmtN(c.ni[0])} จาก ${fmtN(c.ni[1])}`]],
      bars: [["รายได้รวม (Revenue) ล่าสุด", c.rev[0]], ["รายได้รวม (Revenue) ปีก่อน", c.rev[1]]] as [string, number][],
      mean: `กำไรจากการดำเนินงานโต ${sg(c.oig)} เทียบรายได้ ${sg(c.revg)}`,
      watch: `ติดตามการรักษาอัตรากำไรดำเนินงาน (${c.om[0]}%) ในงวดถัดไป`,
    };

    return [r0, r1Res, r2Res, r3Res, r4Res];
  }, [c]);

  const handleRangeChange = (newRange: string) => { setChartRange(newRange); selectStock(selectedTicker, newRange, true); };
  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); selectStock(query); };

  const renderBars = (rows: [string, number, string?][], mx: number) => (
    <div className="space-y-3 my-1">
      {rows.map(([label, val, extra], idx) => (
        <div key={idx} className="grid grid-cols-[minmax(150px,1.3fr)_3fr_minmax(120px,0.9fr)] gap-3 items-center text-xs md:text-sm">
          <span className="truncate font-semibold text-[#091e16]">{label}</span>
          <div className="h-2.5 bg-emerald-50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${val < 0 ? "bg-rose-500" : "bg-emerald-600"}`}
              style={{ width: `${Math.max(3, Math.round((Math.abs(val) / (mx || 1)) * 100))}%` }}
            />
          </div>
          <b className="num text-right whitespace-nowrap text-[#091e16]">{fmtN(val)} {extra ? <span className="text-emerald-700 font-bold text-xs">{extra}</span> : ""}</b>
        </div>
      ))}
    </div>
  );

  const renderShareBar = (title: string, hint: string, rows: [string, number, number, number, number][], tot: number) => {
    const pal = ["#064e3b", "#059669", "#10b981", "#34d399", "#a7f3d0"];
    const safeTot = tot || rows.reduce((acc, r) => acc + Math.max(0, r[3]), 0) || 1;
    return (
      <div className="bg-[#f9fcfa] rounded-2xl p-5 border border-[#e5efe9]">
        <h3 className="font-display font-bold text-sm md:text-base text-[#091e16]">{title}</h3>
        <p className="text-xs text-slate-500 mb-3.5">{hint}</p>
        <div className="flex h-8 rounded-xl overflow-hidden my-2">
          {rows.map((r, i) => {
            const pc = (Math.max(0, r[3]) / safeTot) * 100;
            return <div key={i} style={{ width: `${pc}%`, backgroundColor: pal[i % 5] }} className="num grid place-items-center text-white text-xs font-bold">{pc >= 8 ? `${r1(pc)}%` : ""}</div>;
          })}
        </div>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs md:text-sm mt-3.5">
          {rows.map((r, i) => (
            <li key={i} className="bg-white rounded-2xl p-3 flex items-baseline gap-2 flex-wrap border border-[#e5efe9]">
              <span className="w-2.5 h-2.5 rounded-full inline-block flex-none" style={{ backgroundColor: pal[i % 5] }} />
              <b className="text-[#091e16]">{TH[r[0]] || r[0]}</b>
              <span className="num font-bold text-emerald-600">{r1((Math.max(0, r[3]) / safeTot) * 100)}%</span>
              <small className="num text-slate-500 w-full pl-4">{fmtN(r[3])} ล้าน {r[4] ? `(${sg(pct(r[3], r[4]))})` : ""}</small>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderTable = (headers: string[], rows: FinRow[]) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs md:text-sm">
        <thead>
          <tr className="border-b border-[#dfece5] text-slate-500 bg-[#f9fcfa]">
            <th className="text-left py-3 px-4 font-bold">รายการ</th>
            {headers.map((h, i) => <th key={i} className="text-right py-3 px-4 font-bold whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.filter((r) => r[2].some((v) => v !== 0) || r[4]).map((r, i) => (
            <tr key={i} className={`border-b border-[#f0f6f3] ${r[4] ? "font-bold bg-emerald-50/60 text-[#064e3b]" : "hover:bg-[#fbfdfc] text-slate-700"}`}>
              <td className="text-left py-2.5 px-4">{r[1]}<small className="block text-slate-400 font-normal text-xs">{r[0]}</small></td>
              {r[2].slice(0, headers.length).map((v, j) => <td key={j} className="num text-right py-2.5 px-4 whitespace-nowrap">{fmtN(v, r[3] || 0)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const djiData = liveMarket["^DJI"], gspcData = liveMarket["^GSPC"], ixicData = liveMarket["^IXIC"], vixData = liveMarket["^VIX"];
  const allIndicesLookup = [
    ...US_CORE_INDICES.map((x) => ({ id: x.id, label: x.name, code: x.code })),
    ...GLOBAL_INDICES.map((g) => ({ id: g.id, label: `${g.country} · ${g.name}`, code: g.code })),
  ];
  const activeIdxMeta = allIndicesLookup.find((x) => x.id === selectedIndexId) || allIndicesLookup[0];
  const activeIdxLive = liveMarket[activeIdxMeta.id];
  const activeIdxHistory: OhlcPoint[] = (activeIdxLive?.sparkline || []).map((p) => ({
    date: p.time,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    open: (p as any).open ?? p.close,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    high: (p as any).high ?? p.close,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    low: (p as any).low ?? p.close,
    close: p.close,
  }));

  const marketMood = useMemo(() => {
    const spCh = gspcData?.changePct ?? 0, nqCh = ixicData?.changePct ?? 0, djCh = djiData?.changePct ?? 0;
    const vxVal = vixData?.price ?? 18;
    if (spCh >= 0 && nqCh >= 0 && djCh >= 0) return { label: "Risk-On", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (spCh < 0 && nqCh < 0 && djCh < 0) return { label: `Risk-Off · VIX ${vxVal.toFixed(1)}`, pill: "bg-rose-50 text-rose-700 border-rose-200" };
    return { label: `Mixed · VIX ${vxVal.toFixed(1)}`, pill: "bg-amber-50 text-amber-700 border-amber-200" };
  }, [djiData, gspcData, ixicData, vixData]);

  const curQMeta = Q_META[activeQ];
  const curQRes = qResults[activeQ];
  const maxBar = curQRes ? Math.max(...curQRes.bars.map((b) => Math.abs(b[1])), 1) : 1;
  const rvTotal = d ? getV(d.is, "Total net sales")[2] : 0;
  const okCount = qResults.filter((r) => r.lv === "g").length;
  const warnCount = qResults.filter((r) => r.lv === "a").length;

  const healthVerdict = okCount >= 4
    ? { label: "งบแข็งแกร่งมาก", badge: "bg-emerald-400 text-[#022c22]" }
    : okCount + warnCount >= 3
    ? { label: "งบระดับปานกลาง", badge: "bg-white/15 text-white border border-white/25" }
    : { label: "มีจุดควรระวัง", badge: "bg-rose-500 text-white" };

  const toggleCheck = (key: string) => setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  const isPinned = watchlist.includes(selectedTicker);

  return (
    <div className="min-h-screen text-[#091e16] pb-20">
      {/* CLEAN FLOATING TOP BAR WITH 2 MAIN WORKSPACE MODES */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#e2ece7]">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#064e3b] flex items-center justify-center shadow-xs">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 21C10 13.5 14.5 9.5 24 9" stroke="#34d399" strokeWidth="3.2" strokeLinecap="round" />
                <circle cx="24" cy="9" r="3.5" fill="#ffffff" />
              </svg>
            </div>
            <span className="font-display font-extrabold text-lg tracking-tight text-[#091e16]">
              FINFLOW <span className="text-emerald-600">PRO</span>
            </span>
            <span className={`num text-[11px] font-bold px-2.5 py-0.5 rounded-full border hidden sm:inline-block ${marketMood.pill}`}>
              {marketMood.label}
            </span>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-sm flex items-center gap-1.5">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาหุ้น (AAPL, NVDA, PTT.BK)..."
              className="w-full pl-3.5 pr-3 py-1.5 rounded-full bg-[#f4f8f6] border border-[#dfece5] focus:border-emerald-500 focus:bg-white text-xs md:text-sm font-medium outline-none transition"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="bg-[#064e3b] text-white font-bold px-4 py-1.5 rounded-full text-xs shrink-0 disabled:opacity-50"
            >
              {isSearching ? "..." : "เจาะงบ"}
            </button>
          </form>

          {/* 2-MODE SEGMENTED SWITCHER */}
          <div className="flex items-center gap-1 bg-[#f1f6f3] p-1 rounded-full border border-[#dfece5]">
            <button
              type="button"
              onClick={() => setMainView("market")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                mainView === "market" ? "bg-[#064e3b] text-white shadow-xs" : "text-slate-600 hover:text-[#091e16]"
              }`}
            >
              1. ตลาดโลก & 11 Sector
            </button>
            <button
              type="button"
              onClick={() => setMainView("stock")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                mainView === "stock" ? "bg-[#064e3b] text-white shadow-xs" : "text-slate-600 hover:text-[#091e16]"
              }`}
            >
              2. งบ {selectedTicker} & Watchlist
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1340px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {searchMsg && (
          <div className="fintech-card border-l-4 border-l-emerald-600 text-[#064e3b] text-xs md:text-sm px-4 py-3 rounded-2xl font-semibold">
            {searchMsg}
          </div>
        )}

        {/* =================================================================== */}
        {/* VIEW 1: MARKET OVERVIEW & 11-SECTOR ROTATION                        */}
        {/* =================================================================== */}
        {mainView === "market" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-lg md:text-xl font-extrabold text-[#091e16]">ภาพรวมตลาด & การหมุนเวียน 11 Sector</h1>
                <p className="text-xs text-slate-400 num">อัปเดตล่าสุด: {thDate(marketUpdatedAt)}</p>
              </div>

              <button
                type="button"
                onClick={() => setShowGlobalDrawer(!showGlobalDrawer)}
                className="text-xs bg-white text-[#091e16] font-bold px-4 py-2 rounded-full border border-[#dfece5]"
              >
                {showGlobalDrawer ? "ซ่อนกราฟดัชนีโลก & ข่าว ▲" : "ดูกราฟดัชนีโลก (เอเชีย/ยุโรป) & ข่าว ▼"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {US_CORE_INDICES.map((idx) => {
                const live = liveMarket[idx.id], isSelected = selectedIndexId === idx.id && showGlobalDrawer, ch = live?.changePct ?? 0, up = ch >= 0;
                const isGood = idx.vix ? !up : up;
                return (
                  <button
                    key={idx.id}
                    type="button"
                    onClick={() => { setSelectedIndexId(idx.id); setShowGlobalDrawer(true); }}
                    className={`fintech-card fintech-card-hover text-left rounded-2xl p-4 ${
                      isSelected ? "ring-2 ring-emerald-500 border-emerald-500" : ""
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs gap-1">
                      <span className="inline-flex items-center gap-2 font-bold text-slate-700 truncate">
                        <MarketBadge code={idx.code} />
                        <span className="truncate">{idx.name}</span>
                      </span>
                      <span className={`num text-[11px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${isGood ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {live ? sg(ch, 2) : "–"}
                      </span>
                    </div>
                    <div className="num text-2xl font-extrabold text-[#091e16] my-1.5">{live ? fmtN(live.price, 2) : "–"}</div>
                    <div className="w-full"><MiniSparkline points={live?.sparkline} isUp={isGood} /></div>
                  </button>
                );
              })}
            </div>

            {showGlobalDrawer && (
              <div id="index-chart-box" className="fintech-card rounded-3xl p-5 md:p-6 space-y-5">
                {activeIdxHistory.length >= 2 && (
                  <PriceChart
                    history={activeIdxHistory}
                    currency=""
                    titleOverride={`กราฟรายวัน: ${activeIdxMeta.label} (${activeIdxMeta.id})`}
                  />
                )}

                <div>
                  <div className="text-xs font-bold text-[#091e16] mb-2.5">ดัชนีเอเชียและยุโรป (คลิกที่ประเทศเพื่อดูกราฟด้านบน)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {GLOBAL_INDICES.map((g) => {
                      const live = liveMarket[g.id], ch = live?.changePct ?? 0, up = ch >= 0, isSelected = selectedIndexId === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setSelectedIndexId(g.id)}
                          className={`text-left rounded-2xl p-3.5 transition border ${
                            isSelected
                              ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500"
                              : "bg-[#f9fcfa] border-[#e5efe9]"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-[#091e16]">
                            <MarketBadge code={g.code} />
                            <span className="truncate">{g.country}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-1">{g.name}</div>
                          <div className="flex items-baseline justify-between mt-2 num">
                            <span className="font-extrabold text-xs md:text-sm text-[#091e16]">{live ? fmtN(live.price, 0) : "–"}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${!live ? "bg-slate-100 text-slate-500" : up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{live ? sg(ch, 2) : "–"}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {marketNews.length > 0 && (
                  <div className="border-t border-[#e5efe9] pt-4">
                    <div className="text-xs font-bold text-[#091e16] mb-2.5">พาดหัวข่าวสำคัญของตลาด</div>
                    <div className="grid md:grid-cols-3 gap-3">
                      {marketNews.map((item, i) => (
                        <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="bg-[#f9fcfa] rounded-2xl p-3.5 border border-[#e5efe9] block">
                          <div className="text-xs font-bold text-[#091e16] line-clamp-2 leading-snug">{item.title}</div>
                          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">{item.publisher} ↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <SectorRotationPanel
              liveMarket={liveMarket}
              fred={fredData}
              onSelectStock={(tk) => { setQuery(tk); selectStock(tk); }}
            />
          </div>
        )}

        {/* =================================================================== */}
        {/* VIEW 2: WATCHLIST & SINGLE-STOCK FUNDAMENTAL ANALYSIS               */}
        {/* =================================================================== */}
        {mainView === "stock" && (
          <div className="space-y-6">
            {/* Compact Watchlist Strip */}
            <section className="fintech-card rounded-3xl p-5 space-y-3.5">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h2 className="font-display text-sm md:text-base font-extrabold text-[#091e16]">เรดาร์หุ้นติดตาม (Watchlist)</h2>

                {isAddingWatch ? (
                  <form onSubmit={handleAddWatch} className="flex items-center gap-1.5">
                    <input type="text" value={newWatchTicker} onChange={(e) => setNewWatchTicker(e.target.value)} placeholder="เช่น META, PTT.BK" autoFocus className="w-36 px-3 py-1 rounded-full bg-[#f6faf8] border border-emerald-500 text-xs font-bold outline-none" />
                    <button type="submit" className="bg-[#064e3b] text-white font-bold text-xs px-3 py-1 rounded-full">บันทึก</button>
                    <button type="button" onClick={() => setIsAddingWatch(false)} className="text-xs text-slate-500 px-2">ยกเลิก</button>
                  </form>
                ) : (
                  <button type="button" onClick={() => setIsAddingWatch(true)} className="text-xs bg-[#f6faf8] text-[#064e3b] font-bold px-3.5 py-1 rounded-full border border-[#dfece5]">
                    + เพิ่มหุ้นติดตาม
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {watchlist.map((tk) => {
                  const q = watchQuotes[tk], ch = q?.changePct ?? 0, up = ch >= 0, isActive = selectedTicker === tk;
                  return (
                    <div
                      key={tk}
                      className={`relative rounded-2xl p-3.5 transition border ${
                        isActive
                          ? "bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500"
                          : "bg-[#f9fcfa] border-[#e5efe9]"
                      }`}
                    >
                      <button type="button" onClick={() => handleTogglePinWatch(tk)} title="นำออก" className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white text-slate-400 hover:bg-rose-500 hover:text-white text-xs font-bold grid place-items-center border border-[#e5efe9]">×</button>
                      <button type="button" onClick={() => { setQuery(tk); selectStock(tk); }} className="w-full text-left pr-4">
                        <div className="font-display font-extrabold text-sm text-[#091e16]">{tk}</div>
                        <div className="num text-base font-extrabold text-[#091e16] mt-0.5">{q ? `${q.currency === "USD" ? "$" : `${q.currency} `}${fmtN(q.price, 2)}` : "–"}</div>
                        <span className={`num inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${!q ? "bg-slate-100 text-slate-500" : up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{q ? sg(ch, 2) : "–"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Single-Stock Fundamental Card */}
            <section className="fintech-card rounded-3xl p-5 md:p-7 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-display text-lg md:text-xl font-extrabold text-[#091e16]">
                  วิเคราะห์งบการเงิน: {liveQuote?.name || d?.name || selectedTicker} ({selectedTicker})
                </h2>
                <button
                  type="button"
                  onClick={() => handleTogglePinWatch(selectedTicker)}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-full border ${
                    isPinned ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-[#f6faf8] text-slate-600 border-[#dfece5]"
                  }`}
                >
                  {isPinned ? "★ อยู่ใน Watchlist แล้ว" : "☆ ปักหมุดเข้า Watchlist"}
                </button>
              </div>

              {liveQuote && (
                <div className="fintech-hero-gradient text-white rounded-3xl p-5 md:p-6 space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      {d && <ScoreRing passed={okCount} total={5} />}
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-display text-xl md:text-2xl font-extrabold tracking-tight">{liveQuote.name} ({liveQuote.symbol})</span>
                          {d && (
                            <span className={`text-xs font-bold px-3 py-0.5 rounded-full ${healthVerdict.badge}`}>
                              {healthVerdict.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-emerald-100/80 mt-1">
                          {d?.country || "Global Market"} · {liveQuote.exchange} · {d?.sector || "Equity"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="num text-3xl md:text-4xl font-extrabold">
                        {liveQuote.currency === "USD" ? "$" : `${liveQuote.currency} `}{fmtN(liveQuote.price, 2)} <span className="text-xs font-normal opacity-75">{liveQuote.currency}</span>
                      </div>
                      <span className={`num inline-block text-xs font-bold px-3 py-0.5 rounded-full mt-1 ${liveQuote.changePct >= 0 ? "bg-emerald-400 text-[#022c22]" : "bg-rose-500 text-white"}`}>
                        {liveQuote.changePct >= 0 ? "▲ " : "▼ "}{sg(liveQuote.changePct, 2)}
                      </span>
                    </div>
                  </div>

                  {d?.metrics && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3.5 border-t border-white/15 text-xs">
                      <div className="bg-white/10 rounded-2xl p-3"><span className="text-emerald-100/75 block text-[11px]">Market Cap</span><b className="num text-sm">{d.metrics.marketCap}</b></div>
                      <div className="bg-white/10 rounded-2xl p-3"><span className="text-emerald-100/75 block text-[11px]">Trailing P/E</span><b className="num text-sm">{d.metrics.trailingPE}</b></div>
                      <div className="bg-white/10 rounded-2xl p-3"><span className="text-emerald-100/75 block text-[11px]">Forward P/E</span><b className="num text-sm">{d.metrics.forwardPE}</b></div>
                      <div className="bg-white/10 rounded-2xl p-3"><span className="text-emerald-100/75 block text-[11px]">Dividend Yield</span><b className="num text-sm">{d.metrics.dividendYield}</b></div>
                      <div className="bg-white/10 rounded-2xl p-3"><span className="text-emerald-100/75 block text-[11px]">52-Week Range</span><b className="num text-xs">{d.metrics.fiftyTwoWeekRange}</b></div>
                      <div className="bg-white/10 rounded-2xl p-3"><span className="text-emerald-100/75 block text-[11px]">Target Price</span><b className="num text-sm">{d.metrics.targetMeanPrice}</b></div>
                    </div>
                  )}
                </div>
              )}

              {(secFiling || d) && (
                <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-[#091e16] bg-[#f9fcfa] px-4 py-3 rounded-2xl border border-[#e5efe9]">
                  <div>
                    <b className="text-[#064e3b]">แหล่งอ้างอิงงบทางการ: {secFiling ? `SEC EDGAR (CIK ${secFiling.cik})` : d?.sourceLabel}</b>
                    <span className="text-slate-500"> · {secFiling?.filingDate ? `Form ${secFiling.latestForm} (${secFiling.filingDate})` : d?.periodLabel}</span>
                  </div>
                  <div className="flex gap-4">
                    <a href={secFiling?.documentUrl || d?.sourceUrl || "#"} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline font-bold">
                      เปิดเอกสารต้นฉบับ SEC ↗
                    </a>
                    {secFiling?.edgarUrl && (
                      <a href={secFiling.edgarUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline font-semibold">
                        แฟ้มบริษัท sec.gov ↗
                      </a>
                    )}
                  </div>
                </div>
              )}

              {liveQuote && (
                <PriceChart history={liveQuote.history} currency={liveQuote.currency} range={chartRange} onRangeChange={handleRangeChange} isLoading={isSearching} />
              )}

              {!d && isSearching && (
                <div className="py-10 text-center text-sm font-bold text-emerald-700 animate-pulse">
                  กำลังประมวลผลงบการเงินสดของ {selectedTicker}...
                </div>
              )}

              {d && c && curQRes && (
                <div className="space-y-5">
                  <div className="flex gap-1.5 flex-wrap bg-[#f1f6f3] p-1.5 rounded-2xl border border-[#dfece5]">
                    {([
                      ["q5", "1. ตรวจสุขภาพงบ 5 ข้อ"],
                      ["stmt", "2. งบการเงินฉบับเต็ม"],
                      ["mix", "3. โครงสร้างรายได้ & อัตรากำไร"],
                      ["plan", "4. Action Plan & ข่าวหุ้น"],
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={`flex-1 min-w-[140px] px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition ${
                          activeTab === key ? "bg-white text-[#064e3b] shadow-2xs border border-[#dfece5]" : "text-slate-600 hover:text-[#091e16]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {activeTab === "q5" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {Q_META.map((qItem, idx) => {
                          const isSel = activeQ === idx;
                          const lv = qResults[idx].lv;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveQ(idx)}
                              className={`text-left rounded-2xl p-4 transition border ${
                                isSel
                                  ? "bg-[#064e3b] text-white border-[#064e3b] shadow-sm"
                                  : "bg-[#f9fcfa] text-[#091e16] border-[#e5efe9]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className={`num text-[11px] font-bold ${isSel ? "text-emerald-300" : "text-slate-400"}`}>{qItem.t}</span>
                                <span className={`w-2 h-2 rounded-full ${DOT_COL[lv]}`} />
                              </div>
                              <div className="font-display font-bold text-xs md:text-sm mt-1.5 leading-snug">{qItem.q}</div>
                              <span className={`inline-block mt-3 text-[11px] rounded-full px-2.5 py-0.5 font-bold ${
                                isSel ? "bg-white/15 text-white" : BADGE_CLS[lv]
                              }`}>
                                {LBI[lv]}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="bg-[#f9fcfa] rounded-2xl p-5 md:p-6 border border-[#e5efe9] space-y-5">
                        <div className="flex flex-wrap justify-between items-start gap-2 pb-4 border-b border-[#e5efe9]">
                          <div>
                            <div className="text-xs font-bold text-slate-400">{curQMeta.t}</div>
                            <h4 className="font-display text-base md:text-lg font-extrabold mt-0.5" style={{ color: COL[curQRes.lv] }}>{curQRes.ans}</h4>
                          </div>
                          <span className="text-xs bg-white text-slate-600 px-3.5 py-1 rounded-full border border-[#e5efe9] font-medium">
                            {curQMeta.rule}
                          </span>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-3.5">
                          {curQRes.nums.map((f, idx) => (
                            <div key={idx} className="bg-white border border-[#e5efe9] rounded-2xl p-4">
                              <small className="block text-slate-500 text-xs font-medium">{f[0]}</small>
                              <b className="num block text-xl md:text-2xl text-[#091e16] my-1">{f[1]}</b>
                              <span className="text-xs text-slate-400">{f[2]}</span>
                            </div>
                          ))}
                        </div>

                        <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#e5efe9]">
                          {renderBars(curQRes.bars, maxBar)}
                        </div>

                        <div className="grid md:grid-cols-2 gap-3.5 text-xs md:text-sm">
                          <div className="bg-white rounded-2xl p-4 border border-[#e5efe9]">
                            <span className="font-bold text-[#064e3b] block mb-1">สรุปการเปลี่ยนแปลง</span>
                            <p className="text-slate-600">{curQRes.mean}</p>
                          </div>
                          <div className="bg-white rounded-2xl p-4 border border-[#e5efe9]">
                            <span className="font-bold text-emerald-700 block mb-1">รายการที่ต้องติดตามต่อ</span>
                            <p className="text-slate-600">{curQRes.watch}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "stmt" && (
                    <div className="bg-[#f9fcfa] rounded-2xl p-5 border border-[#e5efe9]">
                      <div className="flex gap-2 flex-wrap mb-4">
                        {([["is", "งบกำไรขาดทุน"], ["bs", "งบดุล"], ["cf", "งบกระแสเงินสด"], ["yr", "สรุปรายปี"]] as const).map(([k, label]) => (
                          <button key={k} type="button" onClick={() => setActiveStmt(k)} className={`px-4 py-2 rounded-full text-xs font-bold transition ${activeStmt === k ? "bg-[#064e3b] text-white" : "bg-white text-slate-600 border border-[#dfece5]"}`}>{label}</button>
                        ))}
                      </div>
                      <div className="bg-white rounded-2xl border border-[#e5efe9] overflow-hidden">
                        {activeStmt === "is" && renderTable(d.isHeaders || ["ไตรมาสล่าสุด", "ไตรมาสปีก่อน", "12 เดือนล่าสุด", "12 เดือนปีก่อน"], d.is)}
                        {activeStmt === "bs" && renderTable(d.bsHeaders || ["งวดล่าสุด", "งวดปีก่อน"], d.bs)}
                        {activeStmt === "cf" && renderTable(d.cfHeaders || ["12 เดือนล่าสุด", "12 เดือนปีก่อน"], d.cf)}
                        {activeStmt === "yr" && renderTable(d.yr.h, d.yr.rows)}
                      </div>
                    </div>
                  )}

                  {activeTab === "mix" && (
                    <div className="space-y-4">
                      {renderShareBar(
                        `โครงสร้างรายได้รวม 100% ของ ${d.ticker} (${fmtN(rvTotal)} ${d.currency})`,
                        "สัดส่วนการแบ่งรายได้รวมออกเป็นต้นทุนขาย ค่าใช้จ่ายดำเนินงาน ภาษี และกำไรสุทธิคงเหลือ",
                        d.mix,
                        rvTotal
                      )}
                      {(() => {
                        const revVal = getV(d.is, "Total net sales")[2], gmVal = getV(d.is, "Gross margin")[2], oiVal = getV(d.is, "Operating income")[2], niVal = getV(d.is, "Net income")[2];
                        return (
                          <div className="bg-[#f9fcfa] rounded-2xl p-5 border border-[#e5efe9]">
                            <h4 className="font-display font-bold text-sm md:text-base text-[#091e16] mb-3">อัตรากำไรเทียบกับรายได้รวม ({d.ticker})</h4>
                            <div className="bg-white rounded-2xl p-4 border border-[#e5efe9]">
                              {renderBars(
                                [
                                  ["รายได้รวม (Total Revenue)", revVal, "(100%)"],
                                  ["กำไรขั้นต้น (Gross Profit)", gmVal, revVal ? `(${r1((gmVal / revVal) * 100)}%)` : ""],
                                  ["กำไรดำเนินงาน (Operating Income)", oiVal, revVal ? `(${r1((oiVal / revVal) * 100)}%)` : ""],
                                  ["กำไรสุทธิ (Net Income)", niVal, revVal ? `(${r1((niVal / revVal) * 100)}%)` : ""],
                                ],
                                revVal
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {activeTab === "plan" && (
                    <div className="space-y-5">
                      <div className="grid md:grid-cols-2 gap-3.5">
                        {[
                          { id: `${d.ticker}-a1`, title: `สรุปเกณฑ์งบการเงิน ${d.ticker} (ผ่าน ${okCount}/5 ข้อ)`, desc: "ตรวจสอบกระแสเงินสดดำเนินงาน (CFO) และความสามารถในการทำกำไร" },
                          { id: `${d.ticker}-a2`, title: `เปรียบเทียบในกลุ่ม ${d.sector}`, desc: `Operating Margin ${c.om[0]}% · Revenue Growth ${sg(c.revg)}` },
                          { id: `${d.ticker}-a3`, title: `ติดตามสินค้าคงเหลือ (${fmtN(c.inv[0])}) และลูกหนี้ (${fmtN(c.ar[0])})`, desc: "ควบคุมเงินทุนหมุนเวียนไม่ให้บวมเร็วกว่ารายได้" },
                          { id: `${d.ticker}-a4`, title: `ติดตามหนี้สินรวม (${fmtN(c.dc)}) เทียบเงินสด (${fmtN(c.cs)})`, desc: "ประเมินสภาพคล่องและฐานะเงินสดสุทธิ (Net Cash)" },
                        ].map((item) => (
                          <div key={item.id} className="bg-[#f9fcfa] rounded-2xl p-4 border border-[#e5efe9]">
                            <label className="flex items-start gap-2.5 cursor-pointer font-bold text-sm text-[#091e16]">
                              <input type="checkbox" checked={!!checkedItems[item.id]} onChange={() => toggleCheck(item.id)} className="mt-1 accent-emerald-600" />
                              <span className={checkedItems[item.id] ? "line-through text-slate-400" : ""}>{item.title}</span>
                            </label>
                            <p className="text-xs text-slate-500 ml-6 mt-1">{item.desc}</p>
                          </div>
                        ))}
                      </div>

                      {stockNews.length > 0 && (
                        <div className="space-y-2.5">
                          <div className="text-xs font-bold text-[#091e16]">ข่าวล่าสุดของ {d.name} ({d.ticker})</div>
                          <div className="grid md:grid-cols-3 gap-3.5">
                            {stockNews.map((n, i) => (
                              <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className="bg-[#f9fcfa] rounded-2xl p-4 border border-[#e5efe9] block">
                                <div className="text-xs md:text-sm font-bold text-[#091e16] line-clamp-2 leading-snug">{n.title}</div>
                                <span className="text-xs text-emerald-700 font-semibold mt-1.5 block">{n.publisher} ↗</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}