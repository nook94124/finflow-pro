"use client";

import React, { useState, useMemo, useEffect } from "react";

export interface LiveMarketItem {
  price: number;
  prevClose: number;
  changePct: number;
  change5dPct: number;
  dollarVolume: number;
  date: string;
  currency?: string;
  exchangeName?: string;
  sparkline?: { time: string; close: number }[];
  closes?: number[];
}

export interface FredSeriesItem {
  date: string;
  value: number;
  prevValue: number;
  change: number;
  sourceUrl: string;
}

interface SectorNewsItem {
  title: string;
  publisher: string;
  link: string;
}

interface SectorProfile {
  secName: string;
  etf: string;
  newsQuery: string;
  tagline: string;
  summary: string;
  drivers: string;
  leaders: string[];
  sensitivity: string;
}

const SECTOR_PROFILES: SectorProfile[] = [
  {
    secName: "เทคโนโลยี",
    etf: "XLK",
    newsQuery: "XLK technology stocks AI semiconductor",
    tagline: "ซอฟต์แวร์ · เซมิคอนดักเตอร์ · คลาวด์ & AI",
    summary: "กลุ่มที่ขับเคลื่อนการเติบโตของตลาดหุ้นสหรัฐฯ มีค่าความผันผวน (Beta) สูง อ่อนไหวต่อทิศทางอัตราผลตอบแทนพันธบัตร (US 10Y) และงบลงทุนด้าน AI/Data Center",
    drivers: "อัตราดอกเบี้ยนโยบาย, ยอดสั่งซื้อชิปประมวลผล, งบลงทุน Cloud Enterprise",
    leaders: ["AAPL", "NVDA", "MSFT", "AVGO"],
    sensitivity: "อ่อนไหวต่อดอกเบี้ยสูง (ดอกเบี้ยขึ้นมักกดดันมูลค่าหุ้น)",
  },
  {
    secName: "การเงิน",
    etf: "XLF",
    newsQuery: "XLF financial bank stocks interest rates",
    tagline: "ธนาคารพาณิชย์ · วาณิชธนกิจ · ประกันภัย & ชำระเงิน",
    summary: "เป็นชีพจรหลักของระบบเศรษฐกิจ ได้ประโยชน์เมื่อส่วนต่างดอกเบี้ยระยะยาว-สั้น (Yield Curve) กว้างขึ้นและการปล่อยสินเชื่อขยายตัว",
    drivers: "ส่วนต่างดอกเบี้ย (10Y-3M), ปริมาณดีล M&A/IPO, คุณภาพหนี้เสีย (NPL)",
    leaders: ["BRK-B", "JPM", "V", "MA"],
    sensitivity: "ได้ประโยชน์เมื่อเศรษฐกิจฟื้นตัวและเส้นอัตราผลตอบแทนชันขึ้น",
  },
  {
    secName: "อุตสาหกรรม",
    etf: "XLI",
    newsQuery: "XLI industrial manufacturing stocks",
    tagline: "การบินและกลาโหม · เครื่องจักรหนัก · โลจิสติกส์",
    summary: "สะท้อนการลงทุนภาคการผลิตจริง โครงสร้างพื้นฐาน และการขนส่งสินค้าทั่วโลก มักโดดเด่นในช่วงเศรษฐกิจขยายตัวเต็มที่",
    drivers: "ดัชนีผู้จัดการฝ่ายจัดซื้อ (PMI), งบประมาณกลาโหมและโครงสร้างพื้นฐาน",
    leaders: ["GE", "CAT", "RTX", "UNP"],
    sensitivity: "เคลื่อนไหวตามวัฏจักรเศรษฐกิจ (Cyclical) และยอดสั่งซื้อภาคโรงงาน",
  },
  {
    secName: "สื่อสาร",
    etf: "XLC",
    newsQuery: "XLC communication services media stocks",
    tagline: "แพลตฟอร์มดิจิทัล · โฆษณาออนไลน์ · สตรีมมิง & โทรคมนาคม",
    summary: "ผสมผสานระหว่างยักษ์ใหญ่เทคโนโลยีแพลตฟอร์มที่มีกระแสเงินสดสูง กับธุรกิจโทรคมนาคมที่มีความมั่นคงและปันผลสม่ำเสมอ",
    drivers: "งบโฆษณาดิจิทัล, จำนวนสมาชิกสตรีมมิง, การลงทุนโครงข่าย 5G/AI",
    leaders: ["META", "GOOGL", "NFLX", "TMUS"],
    sensitivity: "พึ่งพากำลังซื้อผู้บริโภคและงบการตลาดภาคธุรกิจ",
  },
  {
    secName: "สุขภาพ",
    etf: "XLV",
    newsQuery: "XLV healthcare pharma biotech stocks",
    tagline: "เวชภัณฑ์ยา · เทคโนโลยีชีวภาพ · เครื่องมือแพทย์ & ประกันสุขภาพ",
    summary: "กลุ่ม Defensive คุณภาพสูงที่มีความต้องการใช้จ่ายจำเป็นไม่ว่าเศรษฐกิจจะดีหรือแย่ พร้อมแรงหนุนจากนวัตกรรมยาใหม่และสังคมผู้สูงอายุ",
    drivers: "การอนุมัติยาใหม่จาก FDA, สิทธิบัตรยา, งบประมาณสาธารณสุข",
    leaders: ["LLY", "UNH", "JNJ", "ABBV"],
    sensitivity: "ทนทานต่อภาวะเศรษฐกิจถดถอย (Defensive Growth)",
  },
  {
    secName: "สาธารณูปโภค",
    etf: "XLU",
    newsQuery: "XLU utilities power grid stocks",
    tagline: "โรงไฟฟ้า · โครงข่ายพลังงานสะอาด · น้ำประปา & ก๊าซ",
    summary: "สินทรัพย์หลบภัย (Safe-Haven Equity) ที่จ่ายเงินปันผลสูงสม่ำเสมอ และกำลังได้แรงหนุนใหม่จากความต้องการใช้ไฟฟ้ามหาศาลของ Data Center",
    drivers: "ทิศทางบอนด์ยีลด์ 10 ปี, ความต้องการใช้ไฟฟ้าของศูนย์ข้อมูล AI",
    leaders: ["NEE", "SO", "DUK", "CEG"],
    sensitivity: "เคลื่อนไหวสวนทางกับดอกเบี้ยพันธบัตร (บอนด์ยีลด์ลง = หุ้นไฟฟ้าขึ้น)",
  },
  {
    secName: "สินค้าจำเป็น",
    etf: "XLP",
    newsQuery: "XLP consumer staples retail stocks",
    tagline: "อาหารและเครื่องดื่ม · ของใช้ในครัวเรือน · ค้าปลีกจำเป็น",
    summary: "เกราะป้องกันพอร์ตชั้นดีในช่วงตลาดปรับฐาน (Risk-Off) เพราะผู้บริโภคยังคงต้องซื้อสินค้าอุปโภคบริโภคในชีวิตประจำวันอย่างต่อเนื่อง",
    drivers: "อำนาจการปรับขึ้นราคาสินค้า (Pricing Power), ต้นทุนวัตถุดิบและค่าขนส่ง",
    leaders: ["WMT", "COST", "PG", "KO"],
    sensitivity: "ผันผวนต่ำกว่าตลาดมาก แข็งแกร่งเด่นชัดยามตลาดขาลง",
  },
  {
    secName: "อสังหาฯ",
    etf: "XLRE",
    newsQuery: "XLRE real estate REIT stocks",
    tagline: "ทรัสต์เพื่อการลงทุนในอสังหาฯ (REITs) · คลังสินค้า · เสาสัญญาณ",
    summary: "เน้นสร้างกระแสเงินสดจากค่าเช่าและเงินปันผล อ่อนไหวต่อต้นทุนทางการเงินและอัตราดอกเบี้ยระยะยาวโดยตรง",
    drivers: "อัตราดอกเบี้ยจำนองและพันธบัตร 10 ปี, อัตราการเช่าพื้นที่ (Occupancy Rate)",
    leaders: ["PLD", "AMT", "EQIX", "WELL"],
    sensitivity: "อ่อนไหวต่อดอกเบี้ยสูงมาก (ดอกเบี้ยลดลงจะเป็นบวกทันที)",
  },
  {
    secName: "วัสดุ",
    etf: "XLB",
    newsQuery: "XLB materials mining chemicals stocks",
    tagline: "เหมืองแร่ · เคมีภัณฑ์ · โลหะอุตสาหกรรม & บรรจุภัณฑ์",
    summary: "ต้นน้ำของห่วงโซ่อุปทานโลก เคลื่อนไหวตามราคาสินค้าโภคภัณฑ์ การฟื้นตัวของภาคการผลิตในจีนและสหรัฐฯ รวมถึงแนวโน้มเงินเฟ้อ",
    drivers: "ราคาทองแดง/ทองคำ/ลิเทียม, ดัชนี PMI ภาคการผลิตจีนและโลก",
    leaders: ["LIN", "SHW", "FCX", "NEM"],
    sensitivity: "โดดเด่นช่วงปลายวัฏจักรเศรษฐกิจและช่วงเงินเฟ้อปรับตัวขึ้น",
  },
  {
    secName: "สินค้าฟุ่มเฟือย",
    etf: "XLY",
    newsQuery: "XLY consumer discretionary retail stocks",
    tagline: "อีคอมเมิร์ซ · ยานยนต์ไฟฟ้า · โรงแรมท่องเที่ยว & สินค้าหรู",
    summary: "สะท้อนความเชื่อมั่นและกำลังซื้อส่วนเกินของผู้บริโภคโดยตรง มักปรับตัวขึ้นแรงเมื่ออัตราการว่างงานต่ำและดอกเบี้ยเริ่มผ่อนคลาย",
    drivers: "ยอดค้าปลีกสหรัฐฯ, ความเชื่อมั่นผู้บริโภค, อัตราดอกเบี้ยสินเชื่อ",
    leaders: ["AMZN", "TSLA", "HD", "MCD"],
    sensitivity: "อ่อนไหวต่อภาวะเศรษฐกิจและเงินเฟ้อค่าครองชีพสูง",
  },
  {
    secName: "พลังงาน",
    etf: "XLE",
    newsQuery: "XLE energy oil gas stocks",
    tagline: "สำรวจและผลิตน้ำมันดิบ · ก๊าซธรรมชาติ · โรงกลั่น & ท่อส่ง",
    summary: "เครื่องมือป้องกันความเสี่ยงจากเงินเฟ้อและความตึงเครียดทางภูมิรัฐศาสตร์ มีกระแสเงินสดอิสระสูงและคืนเงินให้ผู้ถือหุ้นผ่านปันผลและซื้อหุ้นคืน",
    drivers: "ราคาน้ำมันดิบ WTI/Brent, กำลังการผลิตกลุ่ม OPEC+, ความเสี่ยงภูมิรัฐศาสตร์",
    leaders: ["XOM", "CVX", "COP", "SLB"],
    sensitivity: "ผันแปรตามราคาน้ำมันดิบโลกและเงินเฟ้อด้านพลังงาน",
  },
];

const QUADRANT_ADVICE: Record<string, { title: string; meaning: string; action: string; badgeBg: string; dotCol: string }> = {
  Leading: {
    title: "Leading · ผู้นำตลาด",
    meaning: "กลุ่มนี้มีผลตอบแทนชนะ S&P 500 อย่างชัดเจนและยังมีแรงส่งเชิงบวกต่อเนื่อง",
    action: "ถือครองหรือเน้นคัดเลือกหุ้นแกนนำในกลุ่ม (Follow the Leader)",
    badgeBg: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dotCol: "bg-emerald-500",
  },
  Weakening: {
    title: "Weakening · เริ่มแผ่ว",
    meaning: "ยังยืนเหนือค่าเฉลี่ยตลาดได้ แต่แรงซื้อเริ่มลดลงและมีโอกาสพักฐาน",
    action: "ทยอยล็อกกำไรบางส่วน ไม่ควรไล่ซื้อเพิ่มจนกว่าโมเมนตัมจะวกกลับขึ้น",
    badgeBg: "bg-amber-50 text-amber-700 border border-amber-200",
    dotCol: "bg-amber-500",
  },
  Lagging: {
    title: "Lagging · อ่อนแอ",
    meaning: "เงินทุนกำลังไหลออกจากกลุ่มนี้ และมีแนวโน้มปรับตัวลงมากกว่าหรือฟื้นตัวช้ากว่าดัชนีหลัก",
    action: "หลีกเลี่ยงการเข้าช้อนซื้อสวนเทรนด์ รอให้เส้นทางโค้งขึ้นเข้าโซน Improving ก่อน",
    badgeBg: "bg-rose-50 text-rose-700 border border-rose-200",
    dotCol: "bg-rose-500",
  },
  Improving: {
    title: "Improving · ฟื้นตัว",
    meaning: "เริ่มมีแรงซื้อกลับเข้ามาจนโมเมนตัมพลิกเป็นบวก แม้อัตราผลตอบแทนสะสมยังไม่ชนะตลาดเต็มที่",
    action: "จุดจับตาสำคัญ — เหมาะสำหรับทยอยสะสมดักรอบขาขึ้นรอบถัดไป",
    badgeBg: "bg-blue-50 text-blue-700 border border-blue-200",
    dotCol: "bg-blue-500",
  },
};

const SAFE_HAVEN_ASSETS = [
  { id: "TLT", name: "พันธบัตรสหรัฐฯ 20+ ปี", sourceName: "NASDAQ", sourceUrl: "https://finance.yahoo.com/quote/TLT" },
  { id: "SHV", name: "ตั๋วเงินคลังระยะสั้น", sourceName: "NASDAQ", sourceUrl: "https://finance.yahoo.com/quote/SHV" },
  { id: "GLD", name: "ทองคำโลก (SPDR Gold)", sourceName: "NYSE Arca", sourceUrl: "https://finance.yahoo.com/quote/GLD" },
  { id: "DX-Y.NYB", name: "ดัชนีดอลลาร์ (DXY)", sourceName: "ICE Futures", sourceUrl: "https://finance.yahoo.com/quote/DX-Y.NYB" },
];

const ECONOMIC_CYCLE_STAGES = [
  { id: "recovery", step: "01", title: "ฟื้นตัว (Early Recovery)", condition: "ส่วนต่างเส้นดอกเบี้ย (10Y-3M) กลับมาเป็นบวก & ดอกเบี้ยเริ่มปรับลด", winners: "XLF · XLY · XLRE" },
  { id: "expansion", step: "02", title: "ขยายตัว (Mid Expansion)", condition: "หุ้นกลุ่มเติบโตนำตลาด & มี Sector ที่เงินไหลเข้ามากกว่า 5 กลุ่ม", winners: "XLK · XLI · XLC" },
  { id: "late", step: "03", title: "ปลายรอบ/เงินเฟ้อ (Late Cycle)", condition: "ราคาน้ำมันดิบ WTI ปรับตัวขึ้นเด่น & กลุ่มพลังงาน/วัสดุนำตลาด", winners: "XLE · XLB · XLV" },
  { id: "recession", step: "04", title: "ชะลอตัว/หลบภัย (Risk-Off)", condition: "หุ้นส่วนใหญ่ติดลบในรอบ 5 วัน & เงินทุนไหลเข้าพันธบัตร/ทองคำ", winners: "XLP · XLU · TLT · GLD" },
];

function fmtN(v: number, d = 0): string {
  if (!isFinite(v)) return "0";
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  return v < 0 ? `(${s})` : s;
}

function sg(x: number, dec = 2): string {
  return `${x >= 0 ? "+" : ""}${x.toFixed(dec)}%`;
}

type QuadrantName = "Leading" | "Weakening" | "Lagging" | "Improving";

interface RrgPoint {
  rsRatio: number;
  rsMom: number;
  quadrant: QuadrantName;
}

interface RrgSectorNode {
  profile: SectorProfile;
  secName: string;
  etf: string;
  newsQuery: string;
  quadrant: QuadrantName;
  trail: RrgPoint[];
  current: RrgPoint;
  svgX: number;
  svgY: number;
  labelX: number;
  labelY: number;
  change1d: number;
  change5d: number;
  price: number;
}

function getQuadrant(rsRatio: number, rsMom: number): QuadrantName {
  if (rsRatio >= 100 && rsMom >= 100) return "Leading";
  if (rsRatio >= 100 && rsMom < 100) return "Weakening";
  if (rsRatio < 100 && rsMom < 100) return "Lagging";
  return "Improving";
}

function computeRrgNodes(liveMarket: Record<string, LiveMarketItem>): RrgSectorNode[] {
  const bench = liveMarket["^GSPC_3M"]?.closes || [];
  if (bench.length < 25) return [];

  const rawNodes: Omit<RrgSectorNode, "svgX" | "svgY" | "labelX" | "labelY">[] = [];
  let maxDeviation = 2.5;

  for (const profile of SECTOR_PROFILES) {
    const live = liveMarket[profile.etf];
    const closes = live?.closes || [];
    const len = Math.min(closes.length, bench.length);
    if (len < 25) continue;

    const sArr = closes.slice(-len);
    const bArr = bench.slice(-len);
    const rs = sArr.map((v, i) => (bArr[i] ? v / bArr[i] : 1));

    const sma = (arr: number[], endIdx: number, win: number) => {
      const start = Math.max(0, endIdx - win + 1);
      const slice = arr.slice(start, endIdx + 1);
      return slice.reduce((a, b) => a + b, 0) / (slice.length || 1);
    };

    const rsRatioSeries: number[] = [];
    for (let i = 15; i < rs.length; i++) {
      const maLong = sma(rs, i, 20);
      const maShort = sma(rs, i, 5);
      const val = maLong ? 100 + ((maShort - maLong) / maLong) * 140 : 100;
      rsRatioSeries.push(val);
    }

    const trail: RrgPoint[] = [];
    const sampleIndices = [
      Math.max(4, rsRatioSeries.length - 12),
      Math.max(4, rsRatioSeries.length - 8),
      Math.max(4, rsRatioSeries.length - 4),
      rsRatioSeries.length - 1,
    ];

    for (const idx of sampleIndices) {
      const rVal = rsRatioSeries[idx] ?? 100;
      const rPrev = rsRatioSeries[Math.max(0, idx - 4)] ?? rVal;
      const mVal = 100 + (rVal - rPrev) * 0.95;
      trail.push({ rsRatio: rVal, rsMom: mVal, quadrant: getQuadrant(rVal, mVal) });
      maxDeviation = Math.max(maxDeviation, Math.abs(rVal - 100), Math.abs(mVal - 100));
    }

    const cur = trail[trail.length - 1] || { rsRatio: 100, rsMom: 100, quadrant: "Leading" };
    rawNodes.push({
      profile,
      secName: profile.secName,
      etf: profile.etf,
      newsQuery: profile.newsQuery,
      quadrant: cur.quadrant,
      trail,
      current: cur,
      change1d: live?.changePct ?? 0,
      change5d: live?.change5dPct ?? 0,
      price: live?.price ?? 0,
    });
  }

  const toX = (r: number) => 48 + ((r - 92) / 16) * 524;
  const toY = (m: number) => 364 - ((m - 92) / 16) * 328;

  const scaleFactor = 6.2 / (maxDeviation || 1);
  const normalized: RrgSectorNode[] = rawNodes.map((n) => {
    const normTrail = n.trail.map((p) => {
      const r = Math.round((100 + (p.rsRatio - 100) * scaleFactor) * 100) / 100;
      const m = Math.round((100 + (p.rsMom - 100) * scaleFactor) * 100) / 100;
      return { rsRatio: r, rsMom: m, quadrant: getQuadrant(r, m) };
    });
    const lastPt = normTrail[normTrail.length - 1];
    const sx = toX(lastPt.rsRatio);
    const sy = toY(lastPt.rsMom);
    return {
      ...n,
      trail: normTrail,
      current: lastPt,
      svgX: sx,
      svgY: sy,
      labelX: sx,
      labelY: sy - 16,
    };
  });

  for (let iter = 0; iter < 35; iter++) {
    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const a = normalized[i];
        const b = normalized[j];
        const dx = b.labelX - a.labelX;
        const dy = b.labelY - a.labelY;
        const minW = 48;
        const minH = 21;
        if (Math.abs(dx) < minW && Math.abs(dy) < minH) {
          const pushX = (minW - Math.abs(dx)) * 0.28 * (dx >= 0 ? 1 : -1);
          const pushY = (minH - Math.abs(dy)) * 0.45 * (dy >= 0 ? 1 : -1);
          a.labelX -= pushX;
          b.labelX += pushX;
          a.labelY -= pushY;
          b.labelY += pushY;
        }
      }
      normalized[i].labelX = Math.max(76, Math.min(544, normalized[i].labelX));
      normalized[i].labelY = Math.max(54, Math.min(346, normalized[i].labelY));
    }
  }

  return normalized;
}

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function SectorRotationPanel({
  liveMarket,
  fred,
  onSelectStock,
}: {
  liveMarket: Record<string, LiveMarketItem>;
  fred?: Record<string, FredSeriesItem | null>;
  onSelectStock?: (ticker: string) => void;
}) {
  const [selectedSectorEtf, setSelectedSectorEtf] = useState<string | null>(null);
  const [quadrantFilter, setQuadrantFilter] = useState<"ALL" | QuadrantName>("ALL");
  const [flowPeriodFilter, setFlowPeriodFilter] = useState<"5d" | "1d">("5d");
  const [sectorViewTab, setSectorViewTab] = useState<"rrg" | "flow" | "macro">("rrg");
  const [sectorNews, setSectorNews] = useState<SectorNewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);

  const rrgNodes = useMemo(() => computeRrgNodes(liveMarket), [liveMarket]);
  const activeNode = rrgNodes.find((n) => n.etf === selectedSectorEtf);

  useEffect(() => {
    if (!activeNode) {
      setSectorNews([]);
      return;
    }
    let cancelled = false;
    setIsLoadingNews(true);
    fetch(`/api/market?newsQuery=${encodeURIComponent(activeNode.newsQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSectorNews(Array.isArray(data?.news) ? data.news : []);
      })
      .catch(() => {
        if (!cancelled) setSectorNews([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingNews(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeNode]);

  const sectorFlows = SECTOR_PROFILES.map((p) => {
    const live = liveMarket[p.etf];
    const metricVal = live ? (flowPeriodFilter === "5d" ? live.change5dPct : live.changePct) : 0;
    return {
      secName: p.secName,
      etf: p.etf,
      hasData: !!live,
      price: live ? live.price : 0,
      etfChange: live ? live.changePct : 0,
      change5dPct: live ? live.change5dPct : 0,
      metricVal,
    };
  });

  const topLeader = [...sectorFlows].filter((s) => s.hasData).sort((a, b) => b.change5dPct - a.change5dPct)[0];
  const inflow5dCount = sectorFlows.filter((s) => s.hasData && s.change5dPct >= 0).length;

  const inflowSectors = [...sectorFlows].filter((s) => s.hasData && s.metricVal >= 0).sort((a, b) => b.metricVal - a.metricVal);
  const outflowSectors = [...sectorFlows].filter((s) => s.hasData && s.metricVal < 0).sort((a, b) => a.metricVal - b.metricVal);
  const maxFlowAbs = Math.max(...sectorFlows.map((s) => Math.abs(s.metricVal)), 1);

  const macroCycleState = useMemo(() => {
    const dgs10 = fred?.DGS10, dgs3m = fred?.DGS3MO, t10y3m = fred?.T10Y3M, wti = fred?.DCOILWTICO;
    const tnxFallback = liveMarket["^TNX"], irxFallback = liveMarket["^IRX"], oilFallback = liveMarket["CL=F"];

    const y10 = dgs10 ? dgs10.value : tnxFallback?.price ?? null;
    const y10Date = dgs10 ? dgs10.date : tnxFallback?.date ?? "";
    const y3m = dgs3m ? dgs3m.value : irxFallback?.price ?? null;
    const spread = t10y3m ? t10y3m.value : y10 !== null && y3m !== null ? Math.round((y10 - y3m) * 100) / 100 : null;
    const oilVal = wti ? wti.value : oilFallback?.price ?? null;
    const oilDate = wti ? wti.date : oilFallback?.date ?? "";

    let activeStageId = "expansion";
    if (inflow5dCount <= 2) activeStageId = "recession";
    else if (topLeader) {
      if (["XLE", "XLB"].includes(topLeader.etf)) activeStageId = "late";
      else if (["XLP", "XLU", "XLV"].includes(topLeader.etf)) activeStageId = "recession";
      else if (["XLF", "XLY", "XLRE"].includes(topLeader.etf)) activeStageId = "recovery";
    }
    return { y10, y10Date, y3m, spread, oilVal, oilDate, activeStageId };
  }, [fred, liveMarket, inflow5dCount, topLeader]);

  const safeHavenAnalysis = useMemo(() => {
    const items = SAFE_HAVEN_ASSETS.map((a) => {
      const live = liveMarket[a.id];
      return {
        ...a,
        hasData: !!live,
        price: live ? live.price : 0,
        change1d: live ? live.changePct : 0,
        change5d: live ? live.change5dPct : 0,
      };
    });
    const sortedBy5d = [...items].filter((x) => x.hasData).sort((a, b) => b.change5d - a.change5d);
    const leader = sortedBy5d[0];
    const headline =
      leader && leader.change5d > 0
        ? `เงินทุน 5D ไหลเข้า ${leader.name} (${leader.id} 5D: ${sg(leader.change5d, 2)})`
        : "หุ้นทั้ง 11 Sector ปรับตัวลดลงพร้อมกันในรอบช่วงเวลานี้";
    return { items, headline };
  }, [liveMarket]);

  const toSvgX = (rsRatio: number) => 48 + ((rsRatio - 92) / 16) * 524;
  const toSvgY = (rsMom: number) => 364 - ((rsMom - 92) / 16) * 328;

  const sp5d = liveMarket["^GSPC_3M"]?.change5dPct ?? liveMarket["^GSPC"]?.change5dPct ?? 0;

  const quadrantCards = [
    { key: "Improving" as const, title: "Improving · ฟื้นตัว", dot: "bg-blue-500", badge: "hover:bg-blue-600" },
    { key: "Leading" as const, title: "Leading · ผู้นำตลาด", dot: "bg-emerald-500", badge: "hover:bg-[#064e3b]" },
    { key: "Lagging" as const, title: "Lagging · อ่อนแอ", dot: "bg-rose-500", badge: "hover:bg-rose-600" },
    { key: "Weakening" as const, title: "Weakening · เริ่มแผ่ว", dot: "bg-amber-500", badge: "hover:bg-amber-600" },
  ].filter((q) => quadrantFilter === "ALL" || q.key === quadrantFilter);

  return (
    <section className="fintech-card rounded-3xl p-6 md:p-8 space-y-5">
      {/* Executive Header + 4 Crisp KPI Pills */}
      <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-[#e5efe9]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Sector & Macro KPIs
            </span>
            {selectedSectorEtf && (
              <button
                type="button"
                onClick={() => setSelectedSectorEtf(null)}
                className="text-xs bg-[#064e3b] text-white px-3 py-0.5 rounded-full font-bold transition"
              >
                ← ดูทั้ง 11 กลุ่ม
              </button>
            )}
          </div>
          <h3 className="font-display text-xl md:text-2xl font-extrabold text-[#091e16] mt-1.5">
            การหมุนเวียน 11 กลุ่ม Sector & วัฏจักร Macro
          </h3>
        </div>

        {/* 4 Actionable KPI Telemetry Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {topLeader && (
            <button
              type="button"
              onClick={() => { setSectorViewTab("rrg"); setSelectedSectorEtf(topLeader.etf); }}
              className="bg-emerald-50 border border-emerald-200 text-[#064e3b] px-3.5 py-2 rounded-2xl font-bold"
            >
              กลุ่มนำ 5D: <b className="num ml-1">{topLeader.etf} ({sg(topLeader.change5dPct, 2)})</b>
            </button>
          )}
          <div className="bg-[#f6faf8] border border-[#dfece5] text-[#091e16] px-3.5 py-2 rounded-2xl font-bold">
            5D Inflow: <b className="num text-[#064e3b] ml-1">{inflow5dCount}/11</b>
          </div>
          <a href="https://fred.stlouisfed.org/series/DGS10" target="_blank" rel="noopener noreferrer" className="bg-[#f6faf8] px-3.5 py-2 rounded-2xl border border-[#dfece5] text-[#091e16]">
            US 10Y: <b className="num text-[#064e3b] ml-1">{macroCycleState.y10 !== null ? `${macroCycleState.y10.toFixed(2)}%` : "–"}</b>
          </a>
          <a href="https://fred.stlouisfed.org/series/T10Y3M" target="_blank" rel="noopener noreferrer" className="bg-[#f6faf8] px-3.5 py-2 rounded-2xl border border-[#dfece5] text-[#091e16]">
            10Y-3M: <b className="num text-[#064e3b] ml-1">{macroCycleState.spread !== null ? `${macroCycleState.spread >= 0 ? "+" : ""}${macroCycleState.spread.toFixed(2)}%` : "–"}</b>
          </a>
        </div>
      </div>

      {/* Main View Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-2xl bg-[#f1f6f3] border border-[#dfece5] flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSectorViewTab("rrg")}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition ${sectorViewTab === "rrg" ? "bg-white text-[#064e3b] shadow-2xs border border-[#dfece5]" : "text-slate-600 hover:text-[#091e16]"}`}
          >
            1. กราฟหมุนเวียน RRG
          </button>
          <button
            type="button"
            onClick={() => setSectorViewTab("flow")}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition ${sectorViewTab === "flow" ? "bg-white text-[#064e3b] shadow-2xs border border-[#dfece5]" : "text-slate-600 hover:text-[#091e16]"}`}
          >
            2. กระแสเงินทุน ({inflowSectors.length > 0 ? `เข้า ${inflowSectors.length} / ออก ${outflowSectors.length}` : "สินทรัพย์ปลอดภัย"})
          </button>
          <button
            type="button"
            onClick={() => setSectorViewTab("macro")}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition ${sectorViewTab === "macro" ? "bg-white text-[#064e3b] shadow-2xs border border-[#dfece5]" : "text-slate-600 hover:text-[#091e16]"}`}
          >
            3. ดอกเบี้ย FRED & วัฏจักรเศรษฐกิจ
          </button>
        </div>

        {/* Context Filter Bar (Changes cleanly per active tab) */}
        {sectorViewTab === "rrg" && !selectedSectorEtf && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-semibold mr-0.5">กรองทิศทาง:</span>
            {(["ALL", "Leading", "Improving", "Weakening", "Lagging"] as const).map((qKey) => (
              <button
                key={qKey}
                type="button"
                onClick={() => setQuadrantFilter(qKey)}
                className={`px-3 py-1 rounded-full font-bold border transition ${
                  quadrantFilter === qKey
                    ? "bg-[#064e3b] text-white border-[#064e3b]"
                    : "bg-white text-slate-600 border-[#dfece5]"
                }`}
              >
                {qKey === "ALL" ? "ทั้งหมด (11)" : qKey}
              </button>
            ))}
          </div>
        )}

        {sectorViewTab === "flow" && (
          <div className="flex items-center gap-1 bg-[#f1f6f3] p-1 rounded-full border border-[#dfece5] text-xs">
            <button
              type="button"
              onClick={() => setFlowPeriodFilter("5d")}
              className={`px-3 py-1 rounded-full font-bold transition ${flowPeriodFilter === "5d" ? "bg-[#064e3b] text-white" : "text-slate-600"}`}
            >
              รอบ 5 วัน (5D)
            </button>
            <button
              type="button"
              onClick={() => setFlowPeriodFilter("1d")}
              className={`px-3 py-1 rounded-full font-bold transition ${flowPeriodFilter === "1d" ? "bg-[#064e3b] text-white" : "text-slate-600"}`}
            >
              วันนี้ (1D)
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: RRG & SECTOR DOSSIER */}
      {sectorViewTab === "rrg" && (
        <div className="grid xl:grid-cols-[1.35fr_1.15fr] gap-8 items-start">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-500 px-1">
              <span>Relative Rotation Graph (เทียบ S&P 500 ย้อนหลัง 4 สัปดาห์)</span>
              <span>จุดเล็ก = 3 สัปดาห์ก่อน → จุดใหญ่ = ล่าสุด</span>
            </div>

            <div className="bg-[#fbfdfc] rounded-2xl p-3 border border-[#e5efe9]">
              {rrgNodes.length === 0 ? (
                <div className="h-80 grid place-items-center text-xs text-slate-400">กำลังคำนวณเส้นทาง RRG...</div>
              ) : (
                <svg viewBox="0 0 620 410" className="w-full h-auto select-none">
                  <rect x="48" y="36" width="262" height="164" fill="#f4f8ff" />
                  <rect x="310" y="36" width="262" height="164" fill="#f0fdf7" />
                  <rect x="48" y="200" width="262" height="164" fill="#fff5f7" />
                  <rect x="310" y="200" width="262" height="164" fill="#fffbf0" />

                  <line x1="179" y1="36" x2="179" y2="364" stroke="#cbd5e1" strokeWidth="0.6" strokeDasharray="3 3" />
                  <line x1="441" y1="36" x2="441" y2="364" stroke="#cbd5e1" strokeWidth="0.6" strokeDasharray="3 3" />
                  <line x1="48" y1="118" x2="572" y2="118" stroke="#cbd5e1" strokeWidth="0.6" strokeDasharray="3 3" />
                  <line x1="48" y1="282" x2="572" y2="282" stroke="#cbd5e1" strokeWidth="0.6" strokeDasharray="3 3" />

                  <text x="62" y="58" fontSize="11" fontWeight="800" fill="#2563eb">IMPROVING (ฟื้นตัว)</text>
                  <text x="558" y="58" textAnchor="end" fontSize="11" fontWeight="800" fill="#059669">LEADING (ผู้นำตลาด)</text>
                  <text x="62" y="350" fontSize="11" fontWeight="800" fill="#e11d48">LAGGING (อ่อนแอ)</text>
                  <text x="558" y="350" textAnchor="end" fontSize="11" fontWeight="800" fill="#d97706">WEAKENING (เริ่มแผ่ว)</text>

                  <line x1="310" y1="36" x2="310" y2="364" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="4 4" />
                  <line x1="48" y1="200" x2="572" y2="200" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="4 4" />
                  <rect x="48" y="36" width="524" height="328" rx="12" fill="none" stroke="#dbe7e0" strokeWidth="1.2" />

                  <text x="310" y="392" textAnchor="middle" fontSize="11" fontWeight="600" fill="#475569">← อ่อนแอกว่าตลาด | ความแข็งแกร่งสัมพัทธ์ (RS-Ratio) | แข็งแกร่งกว่าตลาด →</text>
                  <text x="16" y="200" textAnchor="middle" fontSize="11" fontWeight="600" fill="#475569" transform="rotate(-90 16 200)">โมเมนตัม (RS-Momentum)</text>

                  {rrgNodes.map((node) => {
                    const qColor = node.quadrant === "Leading" ? "#10b981" : node.quadrant === "Improving" ? "#3b82f6" : node.quadrant === "Weakening" ? "#f59e0b" : "#f43f5e";
                    const isSelected = selectedSectorEtf === node.etf;
                    const matchesFilter = quadrantFilter === "ALL" || node.quadrant === quadrantFilter;
                    const isDimmed = (selectedSectorEtf !== null && !isSelected) || (selectedSectorEtf === null && !matchesFilter);
                    const svgPts = node.trail.map((p) => ({ x: toSvgX(p.rsRatio), y: toSvgY(p.rsMom) }));
                    const smoothD = buildSmoothPath(svgPts);

                    return (
                      <g key={`tail-${node.etf}`} style={{ opacity: isDimmed ? 0.12 : 1 }} className="transition-opacity duration-200">
                        <path d={smoothD} fill="none" stroke={qColor} strokeWidth={isSelected ? "3.2" : "1.8"} strokeLinecap="round" opacity={isSelected ? 1 : 0.72} />
                        {svgPts.slice(0, -1).map((pt, idx) => (
                          <circle key={idx} cx={pt.x} cy={pt.y} r={isSelected ? 3.5 : 2.2} fill={qColor} opacity={0.55 + idx * 0.2} />
                        ))}
                      </g>
                    );
                  })}

                  {rrgNodes.map((node) => {
                    const qColor = node.quadrant === "Leading" ? "#10b981" : node.quadrant === "Improving" ? "#3b82f6" : node.quadrant === "Weakening" ? "#f59e0b" : "#f43f5e";
                    const isSelected = selectedSectorEtf === node.etf;
                    const matchesFilter = quadrantFilter === "ALL" || node.quadrant === quadrantFilter;
                    const isDimmed = (selectedSectorEtf !== null && !isSelected) || (selectedSectorEtf === null && !matchesFilter);
                    const dist = Math.hypot(node.labelX - node.svgX, node.labelY - node.svgY);

                    return (
                      <g
                        key={`node-${node.etf}`}
                        onClick={() => setSelectedSectorEtf(isSelected ? null : node.etf)}
                        className="cursor-pointer transition-opacity duration-200"
                        style={{ opacity: isDimmed ? 0.2 : 1 }}
                      >
                        {dist > 14 && (
                          <line
                            x1={node.svgX}
                            y1={node.svgY}
                            x2={node.labelX}
                            y2={node.labelY}
                            stroke={qColor}
                            strokeWidth="1"
                            strokeOpacity="0.5"
                            strokeDasharray="2 2"
                          />
                        )}
                        <circle cx={node.svgX} cy={node.svgY} r={isSelected ? 8 : 5.5} fill={qColor} stroke="#ffffff" strokeWidth="2.4" />
                        <rect x={node.labelX - 22} y={node.labelY - 10} width="44" height="17" rx="8.5" fill={isSelected ? "#064e3b" : "#ffffff"} stroke={qColor} strokeWidth="1.4" />
                        <text x={node.labelX} y={node.labelY + 2} textAnchor="middle" fontSize="10" fontWeight="800" fill={isSelected ? "#ffffff" : "#0f172a"}>{node.etf}</text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          {/* Right Column: Sector Dossier or Filtered Quadrant Cards */}
          <div className="space-y-4">
            {activeNode ? (() => {
              const qAdv = QUADRANT_ADVICE[activeNode.quadrant];
              return (
                <div className="bg-[#f9fcfa] rounded-2xl p-5 border border-[#dfece5] space-y-4">
                  <div className="flex items-start justify-between gap-2 pb-3.5 border-b border-[#e5efe9]">
                    <div>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block ${qAdv.badgeBg}`}>
                        {qAdv.title}
                      </span>
                      <h4 className="font-display text-xl font-extrabold text-[#091e16] mt-2">
                        กลุ่ม{activeNode.secName} ({activeNode.etf})
                      </h4>
                      <p className="text-xs font-medium text-emerald-700 mt-0.5">{activeNode.profile.tagline}</p>
                      <p className="text-xs text-slate-600 mt-1.5 num">
                        ราคา: <b className="text-[#091e16]">${fmtN(activeNode.price, 2)}</b> · 1D: <b className={activeNode.change1d >= 0 ? "text-emerald-600" : "text-rose-600"}>{sg(activeNode.change1d, 2)}</b> · 5D: <b className={activeNode.change5d >= 0 ? "text-emerald-600" : "text-rose-600"}>{sg(activeNode.change5d, 2)}</b> (S&P 500 5D: {sg(sp5d, 2)})
                      </p>
                    </div>
                    <a
                      href={`https://finance.yahoo.com/quote/${encodeURIComponent(activeNode.etf)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#064e3b] border border-[#dfece5] bg-white px-3 py-1.5 rounded-xl font-bold shrink-0"
                    >
                      NYSE Arca ↗
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3.5 rounded-2xl border border-[#e5efe9]">
                      <span className="text-slate-500 block text-xs">RS-Ratio (vs S&P 500)</span>
                      <b className="num text-[#091e16] text-lg mt-0.5 block">{activeNode.current.rsRatio.toFixed(2)}</b>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-[#e5efe9]">
                      <span className="text-slate-500 block text-xs">RS-Momentum (แรงส่ง)</span>
                      <b className="num text-[#091e16] text-lg mt-0.5 block">{activeNode.current.rsMom.toFixed(2)}</b>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-[#e5efe9] space-y-2.5 text-xs">
                    <div>
                      <span className="font-bold text-[#064e3b] block mb-0.5">ลักษณะธุรกิจและบทบาทในตลาด</span>
                      <p className="text-slate-600 leading-relaxed">{activeNode.profile.summary}</p>
                    </div>
                    <div className="pt-2 border-t border-[#f0f6f3]">
                      <span className="font-bold text-[#064e3b] block mb-0.5">การอ่านสัญญาณ RRG & กลยุทธ์</span>
                      <p className="text-slate-600 leading-relaxed">{qAdv.meaning} — <b className="text-[#091e16]">{qAdv.action}</b></p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 pt-2 border-t border-[#f0f6f3]">
                      <div>
                        <span className="font-bold text-emerald-700 block">ปัจจัยขับเคลื่อนหลัก</span>
                        <span className="text-slate-600">{activeNode.profile.drivers}</span>
                      </div>
                      <div>
                        <span className="font-bold text-emerald-700 block">ความอ่อนไหว Macro</span>
                        <span className="text-slate-600">{activeNode.profile.sensitivity}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-3.5 border border-[#e5efe9] flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#091e16]">หุ้นแกนนำในกลุ่ม (คลิกเจาะงบ):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeNode.profile.leaders.map((tk) => (
                        <button
                          key={tk}
                          type="button"
                          onClick={() => onSelectStock?.(tk)}
                          className="num text-xs font-bold px-2.5 py-1 rounded-xl bg-[#f1f6f3] text-[#064e3b]"
                        >
                          {tk} ↗
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-[#091e16]">
                      ข่าวล่าสุดของกลุ่ม{activeNode.secName} ({activeNode.etf})
                    </div>
                    {isLoadingNews ? (
                      <div className="text-xs text-slate-400">กำลังโหลดข่าว...</div>
                    ) : sectorNews.length === 0 ? (
                      <div className="text-xs text-slate-400">ไม่มีพาดหัวข่าวใหม่ในขณะนี้</div>
                    ) : (
                      <div className="space-y-2">
                        {sectorNews.map((n, i) => (
                          <a
                            key={i}
                            href={n.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 rounded-2xl bg-white border border-[#e5efe9]"
                          >
                            <div className="text-xs font-bold text-[#091e16] line-clamp-2 leading-snug">{n.title}</div>
                            <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">{n.publisher} ↗</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : (
              <div className={`grid gap-3.5 ${quadrantFilter === "ALL" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                {quadrantCards.map((qBox) => {
                  const list = rrgNodes.filter((n) => n.quadrant === qBox.key);
                  return (
                    <div key={qBox.key} className="bg-[#f9fcfa] rounded-2xl p-4 border border-[#e5efe9] space-y-3">
                      <div className="flex items-center justify-between text-xs md:text-sm font-bold text-[#091e16]">
                        <span className="inline-flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${qBox.dot}`} />
                          <span>{qBox.title}</span>
                        </span>
                        <span className="num text-xs text-slate-400">{list.length} กลุ่ม</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {list.length === 0 ? (
                          <span className="text-xs text-slate-400">— ไม่มีกลุ่มในโซนนี้ —</span>
                        ) : (
                          list.map((item) => (
                            <button
                              key={item.etf}
                              type="button"
                              onClick={() => setSelectedSectorEtf(item.etf)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-xl bg-white text-[#091e16] border border-[#dfece5] ${qBox.badge}`}
                            >
                              {item.etf} · {item.secName} ({sg(item.change5d, 1)})
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MONEY FLOW WITH PERIOD FILTER */}
      {sectorViewTab === "flow" && (
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {inflowSectors.length > 0 ? (
            <div className="bg-[#f9fcfa] border border-[#e5efe9] rounded-2xl p-5 space-y-3">
              <h4 className="font-display font-bold text-[#091e16] text-base">
                กระแสเงินไหลเข้า {flowPeriodFilter.toUpperCase()} ({inflowSectors.length} กลุ่ม)
              </h4>
              <div className="space-y-2.5">
                {inflowSectors.map((sec) => {
                  const barPct = Math.max(8, Math.round((Math.abs(sec.metricVal) / maxFlowAbs) * 100));
                  return (
                    <button
                      key={sec.etf}
                      type="button"
                      onClick={() => { setSectorViewTab("rrg"); setSelectedSectorEtf(sec.etf); }}
                      className="w-full text-left bg-white rounded-2xl p-3.5 border border-[#e5efe9]"
                    >
                      <div className="flex justify-between items-center text-xs md:text-sm mb-1.5">
                        <span className="font-bold text-[#091e16]">{sec.etf} · {sec.secName}</span>
                        <span className="num font-extrabold text-emerald-600">{flowPeriodFilter.toUpperCase()}: {sg(sec.metricVal, 2)}</span>
                      </div>
                      <div className="h-1.5 bg-emerald-50 rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${barPct}%` }} /></div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="fintech-hero-gradient text-white rounded-2xl p-6 space-y-4">
              <div>
                <span className="text-xs font-bold text-emerald-300">หุ้นทั้ง 11 กลุ่มติดลบในช่วงนี้ (0 Inflow)</span>
                <h4 className="font-display text-lg font-bold text-white mt-1">{safeHavenAnalysis.headline}</h4>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {safeHavenAnalysis.items.map((asset) => {
                  const val = flowPeriodFilter === "5d" ? asset.change5d : asset.change1d;
                  const isPos = val >= 0;
                  return (
                    <a key={asset.id} href={asset.sourceUrl} target="_blank" rel="noopener noreferrer" className="block rounded-2xl p-3.5 bg-white text-[#091e16]">
                      <div className="flex justify-between items-center text-xs md:text-sm">
                        <b>{asset.name}</b>
                        <span className={`num font-extrabold ${isPos ? "text-emerald-600" : "text-rose-600"}`}>
                          {flowPeriodFilter.toUpperCase()}: {asset.hasData ? sg(val, 2) : "–"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 num">
                        {asset.id} · ${fmtN(asset.price, 2)}
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-[#f9fcfa] border border-[#e5efe9] rounded-2xl p-5 space-y-3">
            <h4 className="font-display font-bold text-[#091e16] text-base">
              กระแสเงินไหลออก {flowPeriodFilter.toUpperCase()} ({outflowSectors.length} กลุ่ม)
            </h4>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {outflowSectors.map((sec) => {
                const barPct = Math.max(8, Math.round((Math.abs(sec.metricVal) / maxFlowAbs) * 100));
                return (
                  <button
                    key={sec.etf}
                    type="button"
                    onClick={() => { setSectorViewTab("rrg"); setSelectedSectorEtf(sec.etf); }}
                    className="w-full text-left bg-white rounded-2xl p-3.5 border border-[#e5efe9]"
                  >
                    <div className="flex justify-between items-center text-xs md:text-sm mb-1.5">
                      <span className="font-bold text-[#091e16] truncate">{sec.etf} · {sec.secName}</span>
                      <span className="num font-extrabold text-rose-600">{flowPeriodFilter.toUpperCase()}: {sg(sec.metricVal, 2)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-rose-500" style={{ width: `${barPct}%` }} /></div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FRED MACRO */}
      {sectorViewTab === "macro" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <a href="https://fred.stlouisfed.org/series/DGS10" target="_blank" rel="noopener noreferrer" className="bg-[#f9fcfa] border border-[#e5efe9] rounded-2xl p-4 block">
              <small className="text-xs text-slate-500 block">US 10-Year Treasury (DGS10)</small>
              <b className="num text-2xl text-[#091e16] block mt-1">{macroCycleState.y10 !== null ? `${macroCycleState.y10.toFixed(2)}%` : "–"}</b>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">FRED · {macroCycleState.y10Date || "ล่าสุด"} ↗</span>
            </a>
            <a href="https://fred.stlouisfed.org/series/DGS3MO" target="_blank" rel="noopener noreferrer" className="bg-[#f9fcfa] border border-[#e5efe9] rounded-2xl p-4 block">
              <small className="text-xs text-slate-500 block">US 3-Month Treasury (DGS3MO)</small>
              <b className="num text-2xl text-[#091e16] block mt-1">{macroCycleState.y3m !== null ? `${macroCycleState.y3m.toFixed(2)}%` : "–"}</b>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">Federal Reserve Board ↗</span>
            </a>
            <a href="https://fred.stlouisfed.org/series/T10Y3M" target="_blank" rel="noopener noreferrer" className="bg-[#f9fcfa] border border-[#e5efe9] rounded-2xl p-4 block">
              <small className="text-xs text-slate-500 block">Yield Curve Spread (T10Y3M)</small>
              <b className="num text-2xl text-[#091e16] block mt-1">{macroCycleState.spread !== null ? `${macroCycleState.spread >= 0 ? "+" : ""}${macroCycleState.spread.toFixed(2)}%` : "–"}</b>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">{macroCycleState.spread !== null && macroCycleState.spread < 0 ? "Inverted Curve" : "Normal Curve"} ↗</span>
            </a>
            <a href="https://fred.stlouisfed.org/series/DCOILWTICO" target="_blank" rel="noopener noreferrer" className="bg-[#f9fcfa] border border-[#e5efe9] rounded-2xl p-4 block">
              <small className="text-xs text-slate-500 block">Crude Oil WTI (DCOILWTICO)</small>
              <b className="num text-2xl text-[#091e16] block mt-1">{macroCycleState.oilVal !== null ? `$${macroCycleState.oilVal.toFixed(2)}` : "–"}</b>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">FRED · {macroCycleState.oilDate || "ล่าสุด"} ↗</span>
            </a>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {ECONOMIC_CYCLE_STAGES.map((st) => {
              const isCurrentStage = macroCycleState.activeStageId === st.id;
              return (
                <div key={st.id} className={`rounded-2xl p-4 border transition ${isCurrentStage ? "fintech-hero-gradient text-white border-transparent shadow-md" : "bg-[#f9fcfa] text-[#091e16] border-[#e5efe9]"}`}>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className={`num text-xs font-extrabold ${isCurrentStage ? "text-emerald-300" : "text-emerald-700"}`}>STAGE {st.step}</span>
                    {isCurrentStage && <span className="text-[10px] bg-emerald-400 text-[#022c22] font-extrabold px-2.5 py-0.5 rounded-full">สภาวะปัจจุบัน</span>}
                  </div>
                  <div className="font-display font-bold text-sm md:text-base mb-1">{st.title}</div>
                  <p className={`text-xs mb-2.5 leading-relaxed ${isCurrentStage ? "text-emerald-100/85" : "text-slate-600"}`}>{st.condition}</p>
                  <div className={`text-xs font-bold ${isCurrentStage ? "text-white" : "text-emerald-700"}`}>กลุ่มเด่น: {st.winners}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}