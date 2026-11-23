"use client";

import React, { useState, useMemo } from "react";

const RETRIEVED = "2026-11-16T08:59:59Z";
const S = {
  e: "https://www.sec.gov/Archives/edgar/data/0000320193/000032019326000024/a8-kex991q4202609262026.htm",
  k: "https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm",
};

type FinRow = [string, string, number[], number?, number?];

interface StockData {
  name: string;
  ticker: string;
  country: string;
  exch: string;
  sector: string;
  is: FinRow[];
  bs: FinRow[];
  cf: FinRow[];
  yr: { h: string[]; rows: FinRow[] };
  mix: [string, number, number, number, number][];
  reg: [string, number, number, number, number][];
}

const DB: Record<string, StockData> = {
  AAPL: {
    name: "Apple Inc.",
    ticker: "AAPL",
    country: "สหรัฐอเมริกา",
    exch: "NASDAQ",
    sector: "เทคโนโลยีสารสนเทศ",
    is: [
      ["Products net sales", "รายได้จากสินค้า", [82904, 73716, 355533, 307003]],
      ["Services net sales", "รายได้จากบริการ", [31573, 28750, 123301, 109158]],
      ["Total net sales", "รายได้รวม", [114477, 102466, 478834, 416161], 0, 1],
      ["Cost of sales: Products", "ต้นทุนขาย: สินค้า", [52064, 47019, 215874, 194116]],
      ["Cost of sales: Services", "ต้นทุนขาย: บริการ", [7593, 7106, 29358, 26844]],
      ["Total cost of sales", "ต้นทุนขายรวม", [59657, 54125, 245232, 220960]],
      ["Gross margin", "กำไรขั้นต้น", [54820, 48341, 233602, 195201], 0, 1],
      ["Research and development", "ค่าวิจัยและพัฒนา", [11730, 8866, 45765, 34550]],
      ["Selling, general and administrative", "ค่าขายและบริหาร", [7459, 7048, 29774, 27601]],
      ["Total operating expenses", "ค่าใช้จ่ายดำเนินงานรวม", [19189, 15914, 75539, 62151]],
      ["Operating income", "กำไรจากการดำเนินงาน", [35631, 32427, 158063, 133050], 0, 1],
      ["Other income/(expense), net", "รายได้/(ค่าใช้จ่าย)อื่นสุทธิ", [504, 377, 1174, -321]],
      ["Income before taxes", "กำไรก่อนภาษี", [36135, 32804, 159237, 132729]],
      ["Provision for income taxes", "ภาษีเงินได้", [5424, 5338, 27062, 20719]],
      ["Net income", "กำไรสุทธิ", [30711, 27466, 132175, 112010], 0, 1],
      ["Basic EPS ($)", "กำไรต่อหุ้นขั้นพื้นฐาน (ดอลลาร์)", [2.11, 1.85, 9.01, 7.49], 2],
      ["Diluted EPS ($)", "กำไรต่อหุ้นปรับลด (ดอลลาร์)", [2.1, 1.85, 8.98, 7.46], 2],
      ["Shares used: Basic (thousands)", "จำนวนหุ้นที่ใช้คำนวณ ขั้นพื้นฐาน (พันหุ้น)", [14570195, 14815307, 14661935, 14948500]],
      ["Shares used: Diluted (thousands)", "จำนวนหุ้นที่ใช้คำนวณ ปรับลด (พันหุ้น)", [14630318, 14863609, 14720306, 15004697]],
    ],
    bs: [
      ["Cash and cash equivalents", "เงินสดและรายการเทียบเท่า", [36305, 35934]],
      ["Marketable securities (current)", "หลักทรัพย์ลงทุน (หมุนเวียน)", [20417, 18763]],
      ["Accounts receivable, net", "ลูกหนี้การค้าสุทธิ", [43817, 39777]],
      ["Vendor non-trade receivables", "ลูกหนี้ผู้ขายส่วนประกอบ", [39896, 33180]],
      ["Inventories", "สินค้าคงเหลือ", [14541, 5718]],
      ["Other current assets", "สินทรัพย์หมุนเวียนอื่น", [18881, 14585]],
      ["Total current assets", "สินทรัพย์หมุนเวียนรวม", [173857, 147957], 0, 1],
      ["Marketable securities (non-current)", "หลักทรัพย์ลงทุน (ไม่หมุนเวียน)", [80213, 77723]],
      ["Property, plant and equipment, net", "ที่ดิน อาคาร อุปกรณ์สุทธิ", [52084, 49834]],
      ["Intangible assets, net", "สินทรัพย์ไม่มีตัวตนสุทธิ", [20278, 11093]],
      ["Other non-current assets", "สินทรัพย์ไม่หมุนเวียนอื่น", [78116, 72634]],
      ["Total non-current assets", "สินทรัพย์ไม่หมุนเวียนรวม", [230691, 211284], 0, 1],
      ["Total assets", "สินทรัพย์รวม", [404548, 359241], 0, 1],
      ["Accounts payable", "เจ้าหนี้การค้า", [82252, 69860]],
      ["Other current liabilities", "หนี้สินหมุนเวียนอื่น", [66124, 66387]],
      ["Deferred revenue", "รายได้รับล่วงหน้า", [9636, 9055]],
      ["Commercial paper", "ตั๋วเงินระยะสั้น", [1997, 7979]],
      ["Term debt (current)", "หนี้ระยะยาวที่ครบใน 1 ปี", [9906, 12350]],
      ["Total current liabilities", "หนี้สินหมุนเวียนรวม", [169915, 165631], 0, 1],
      ["Term debt (non-current)", "หนี้ระยะยาว", [68208, 78328]],
      ["Other non-current liabilities", "หนี้สินไม่หมุนเวียนอื่น", [54332, 41549]],
      ["Total non-current liabilities", "หนี้สินไม่หมุนเวียนรวม", [122540, 119877], 0, 1],
      ["Total liabilities", "หนี้สินรวม", [292455, 285508], 0, 1],
      ["Common stock and APIC", "ทุนและส่วนเกินมูลค่าหุ้น", [104815, 93568]],
      ["Retained earnings/(Accumulated deficit)", "กำไรสะสม/(ขาดทุนสะสม)", [13700, -14264]],
      ["Accumulated other comprehensive loss", "ขาดทุนเบ็ดเสร็จอื่นสะสม", [-6422, -5571]],
      ["Total shareholders' equity", "ส่วนของผู้ถือหุ้นรวม", [112093, 73733], 0, 1],
      ["Total liabilities and shareholders' equity", "หนี้สินและส่วนของผู้ถือหุ้นรวม", [404548, 359241], 0, 1],
    ],
    cf: [
      ["Cash, beginning balance", "เงินสดต้นงวด", [35934, 29943]],
      ["Net income", "กำไรสุทธิ", [132175, 112010]],
      ["Adj: Depreciation and amortization", "ค่าเสื่อมราคาและตัดจำหน่าย", [13423, 11698]],
      ["Adj: Share-based compensation", "ค่าตอบแทนเป็นหุ้น", [13789, 12863]],
      ["Adj: Other", "รายการปรับปรุงอื่น", [568, -89]],
      ["Chg: Accounts receivable", "เปลี่ยนแปลง: ลูกหนี้การค้า", [-3994, -6682]],
      ["Chg: Vendor non-trade receivables", "เปลี่ยนแปลง: ลูกหนี้ผู้ขาย", [-6716, -347]],
      ["Chg: Inventories", "เปลี่ยนแปลง: สินค้าคงเหลือ", [-8905, 1400]],
      ["Chg: Other assets", "เปลี่ยนแปลง: สินทรัพย์อื่น", [-21117, -9197]],
      ["Chg: Accounts payable", "เปลี่ยนแปลง: เจ้าหนี้การค้า", [12171, 902]],
      ["Chg: Other liabilities", "เปลี่ยนแปลง: หนี้สินอื่น", [13703, -11076]],
      ["Cash generated by operating activities", "เงินสดจากการดำเนินงาน", [145097, 111482], 0, 1],
      ["Purchases of marketable securities", "ซื้อหลักทรัพย์ลงทุน", [-54945, -24407]],
      ["Proceeds from maturities of marketable securities", "รับจากหลักทรัพย์ครบกำหนด", [34815, 40907]],
      ["Proceeds from sales of marketable securities", "รับจากการขายหลักทรัพย์", [14280, 12890]],
      ["Payments for acquisition of PP&E", "เงินลงทุนในที่ดิน อาคาร อุปกรณ์", [-9041, -12715]],
      ["Other investing", "อื่น ๆ (ลงทุน)", [-2389, -1480]],
      ["Cash generated by/(used in) investing activities", "เงินสดจากการลงทุนรวม", [-17280, 15195], 0, 1],
      ["Payments for taxes on net share settlement", "ภาษีจากการจ่ายหุ้นพนักงาน", [-6793, -5960]],
      ["Payments for dividends and dividend equivalents", "จ่ายปันผล", [-15721, -15421]],
      ["Repurchases of common stock", "ซื้อหุ้นคืน", [-86390, -90711]],
      ["Proceeds from issuance of term debt, net", "ออกหนี้ระยะยาวใหม่", [0, 4481]],
      ["Repayments of term debt", "ชำระคืนหนี้ระยะยาว", [-12396, -10932]],
      ["Repayments of commercial paper, net", "ชำระคืนตั๋วเงินระยะสั้นสุทธิ", [-5911, -2032]],
      ["Other financing", "อื่น ๆ (จัดหาเงิน)", [-235, -111]],
      ["Cash used in financing activities", "เงินสดจากการจัดหาเงินรวม", [-127446, -120686], 0, 1],
      ["Increase in cash", "เงินสดเพิ่มขึ้น", [371, 5991]],
      ["Cash, ending balance", "เงินสดปลายงวด", [36305, 35934], 0, 1],
    ],
    yr: {
      h: ["ปีงบ 2023", "ปีงบ 2024", "ปีงบ 2025", "ปีงบ 2026*"],
      rows: [
        ["Net income", "กำไรสุทธิ", [96995, 93736, 112010, 132175]],
        ["Cash generated by operating activities", "เงินสดจากการดำเนินงาน", [110543, 118254, 111482, 145097]],
        ["Cash generated by investing activities", "เงินสดจากการลงทุน", [3705, 2935, 15195, -17280]],
        ["Cash used in financing activities", "เงินสดจากการจัดหาเงิน", [-108488, -121983, -120686, -127446]],
        ["Cash, ending balance", "เงินสดปลายงวด", [30737, 29943, 35934, 36305]],
      ],
    },
    mix: [
      ["iPhone", 57583, 49025, 254098, 209586],
      ["Mac", 10792, 8726, 37929, 33708],
      ["iPad", 6229, 6952, 27929, 28023],
      ["Wearables, Home and Accessories", 8300, 9013, 35577, 35686],
      ["Services", 31573, 28750, 123301, 109158],
    ],
    reg: [
      ["Americas", 48680, 44192, 198083, 178353],
      ["Europe", 32008, 28703, 127604, 111032],
      ["Greater China", 17539, 14493, 82378, 64377],
      ["Japan", 6540, 6636, 30908, 28703],
      ["Rest of Asia Pacific", 9710, 8442, 39861, 33696],
    ],
  },
};

const MKT = {
  retrievedAt: "2026-11-16T08:59:59Z",
  items: [
    {
      id: "SP500",
      name: "S&P 500",
      dec: 2,
      vix: 0,
      src: "S&P Dow Jones Indices ผ่าน FRED",
      url: "https://fred.stlouisfed.org/series/SP500",
      s: [
        ["2026-11-09", 7549.94],
        ["2026-11-10", 7520.93],
        ["2026-11-11", 7619.38],
        ["2026-11-12", 7592.4],
        ["2026-11-13", 7561.67],
      ] as [string, number][],
    },
    {
      id: "NASDAQCOM",
      name: "Nasdaq Composite",
      dec: 2,
      vix: 0,
      src: "Nasdaq, Inc. ผ่าน FRED",
      url: "https://fred.stlouisfed.org/series/NASDAQCOM",
      s: [
        ["2026-11-09", 25253.14],
        ["2026-11-10", 25065.87],
        ["2026-11-11", 25466.19],
        ["2026-11-12", 25366.09],
        ["2026-11-13", 25136.27],
      ] as [string, number][],
    },
    {
      id: "VIXCLS",
      name: "VIX (ความผันผวนคาดการณ์ของตลาด)",
      dec: 2,
      vix: 1,
      src: "Cboe ผ่าน FRED",
      url: "https://fred.stlouisfed.org/series/VIXCLS",
      s: [
        ["2026-11-06", 25.64],
        ["2026-11-09", 19.92],
        ["2026-11-10", 19.46],
        ["2026-11-11", 17.49],
        ["2026-11-12", 18.7],
      ] as [string, number][],
    },
  ],
};

const MO = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const TH: Record<string, string> = {
  iPhone: "iPhone",
  Mac: "Mac",
  iPad: "iPad",
  "Wearables, Home and Accessories": "อุปกรณ์สวมใส่ บ้าน และอุปกรณ์เสริม",
  Services: "บริการ (Services)",
  Americas: "อเมริกา",
  Europe: "ยุโรป",
  "Greater China": "จีนใหญ่",
  Japan: "ญี่ปุ่น",
  "Rest of Asia Pacific": "เอเชียแปซิฟิกอื่น",
};

const SECETF: [string, string][] = [
  ["เทคโนโลยีสารสนเทศ", "XLK"],
  ["การเงิน", "XLF"],
  ["สุขภาพ", "XLV"],
  ["สินค้าฟุ่มเฟือย", "XLY"],
  ["สินค้าจำเป็น", "XLP"],
  ["พลังงาน", "XLE"],
  ["อุตสาหกรรม", "XLI"],
  ["วัสดุ", "XLB"],
  ["สาธารณูปโภค", "XLU"],
  ["อสังหาริมทรัพย์", "XLRE"],
  ["บริการสื่อสาร", "XLC"],
];

function fmtN(v: number, d = 0): string {
  const s = Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
  return v < 0 ? `(${s})` : s;
}
function pct(a: number, b: number): number {
  return Math.round((a / b - 1) * 1000) / 10;
}
function r1(x: number): number {
  return Math.round(x * 10) / 10;
}
function sg(x: number): string {
  return `${x >= 0 ? "+" : ""}${x}%`;
}
function thd(s: string): string {
  const a = s.split("-");
  return `${parseInt(a[2], 10)} ${MO[parseInt(a[1], 10) - 1]} ${a[0]}`;
}
function thDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "–"
    : d.toLocaleString("th-TH-u-ca-gregory", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น. (เวลาไทย)";
}
function getV(rows: FinRow[], en: string): number[] {
  const found = rows.find((r) => r[0] === en);
  return found ? found[2] : [0, 0, 0, 0];
}
function preSum(rows: FinRow[], pf: string, j: number): number {
  return rows.filter((r) => r[0].startsWith(pf)).reduce((acc, r) => acc + (r[2][j] || 0), 0);
}

function calcMetrics(d: StockData) {
  const I = d.is,
    B = d.bs,
    F = d.cf;
  const rev = getV(I, "Total net sales"),
    oi = getV(I, "Operating income"),
    ni = getV(I, "Net income"),
    gm = getV(I, "Gross margin"),
    rd = getV(I, "Research and development");
  const cfo = getV(F, "Cash generated by operating activities");
  const cx = getV(F, "Payments for acquisition of PP&E").map((x) => -x);
  const dv = getV(F, "Payments for dividends and dividend equivalents");
  const bb = getV(F, "Repurchases of common stock");
  const ret = [-(dv[0] + bb[0]), -(dv[1] + bb[1])];
  const wc = [preSum(F, "Chg:", 0), preSum(F, "Chg:", 1)];
  const dCFO = cfo[0] - cfo[1];
  const dNI = ni[2] - ni[3];
  const dWC = wc[0] - wc[1];
  const dOth = dCFO - dNI - dWC;

  const cp = getV(B, "Commercial paper"),
    tc = getV(B, "Term debt (current)"),
    tn = getV(B, "Term debt (non-current)");
  const dc = cp[0] + tc[0] + tn[0];
  const dp = cp[1] + tc[1] + tn[1];
  const dd = dc - dp;
  const due = cp[0] + tc[0];

  const ca = getV(B, "Cash and cash equivalents"),
    ms = getV(B, "Marketable securities (current)"),
    mn = getV(B, "Marketable securities (non-current)");
  const cs = ca[0] + ms[0] + mn[0];
  const csp = ca[1] + ms[1] + mn[1];
  const liq = ca[0] + ms[0];

  const inv = getV(B, "Inventories");
  const ar = getV(B, "Accounts receivable, net");
  const ps = getV(I, "Products net sales"),
    ss = getV(I, "Services net sales"),
    pc = getV(I, "Cost of sales: Products"),
    sc = getV(I, "Cost of sales: Services");
  const iss = getV(F, "Proceeds from issuance of term debt, net");
  const rpt = -getV(F, "Repayments of term debt")[0];
  const rpc = -getV(F, "Repayments of commercial paper, net")[0];

  return {
    rev: [rev[2], rev[3]],
    revq: [rev[0], rev[1]],
    ni: [ni[2], ni[3]],
    rd: [rd[2], rd[3]],
    revg: pct(rev[2], rev[3]),
    revgq: pct(rev[0], rev[1]),
    oig: pct(oi[2], oi[3]),
    nig: pct(ni[2], ni[3]),
    rdg: pct(rd[2], rd[3]),
    om: [r1((oi[2] / rev[2]) * 100), r1((oi[3] / rev[3]) * 100)],
    cfo,
    cx,
    ret,
    wc,
    dCFO,
    dNI,
    dWC,
    dOth,
    dc,
    dp,
    dd,
    due,
    cs,
    csp,
    liq,
    inv,
    ar,
    pgm: r1(((ps[2] - pc[2]) / ps[2]) * 100),
    sgm: r1(((ss[2] - sc[2]) / ss[2]) * 100),
    iss,
    rpt,
    rpc,
  };
}

const Q_META = [
  {
    k: "#0f7a4d",
    t: "กำไรเป็นเงินจริงไหม",
    q: "กำไรที่ประกาศ เป็นเงินสดจริงหรือเปล่า",
    tag: "Risk (คุณภาพกำไร)",
    rule: "เงินสดจากการดำเนินงาน ÷ กำไรสุทธิ · 100% ขึ้นไป = ผ่านเกณฑ์ · 70–99% = ควรดูต่อ · ต่ำกว่า 70% หรือเงินสดติดลบ = ระวัง",
    how: ["หากำไรสุทธิในงบกำไรขาดทุน", "หาเงินสดจากการดำเนินงานในงบกระแสเงินสด", "เทียบกัน แล้วแยกว่าเงินสดเพิ่มเพราะกำไร หรือเพราะจังหวะเก็บ-จ่ายเงิน"],
  },
  {
    k: "#128c8c",
    t: "ขยายธุรกิจด้วยเงินตัวเองได้ไหม",
    q: "เงินที่หาได้ พอสำหรับลงทุนไหม",
    tag: "Growth (ความสามารถขยาย)",
    rule: "เงินสดจากการดำเนินงาน ÷ เงินลงทุนในอุปกรณ์ · 1 เท่าขึ้นไป = ผ่านเกณฑ์ · 0.5–1 เท่า = ควรดูต่อ · ต่ำกว่า 0.5 เท่า = ระวัง",
    how: ["หาเงินสดจากการดำเนินงาน", "หาเงินลงทุนในที่ดิน อาคาร อุปกรณ์ ในงบกระแสเงินสด", "เทียบกัน แล้วดูว่าเงินที่เหลือถูกใช้ทำอะไร"],
  },
  {
    k: "#b8860b",
    t: "โตด้วยเงินใคร",
    q: "บริษัทกู้เพิ่มเพื่อโตหรือเปล่า",
    tag: "Risk (ภาระหนี้)",
    rule: "หนี้ที่มีดอกเบี้ยเทียบสิ้นปีงบก่อน · ลดหรือเท่าเดิม = ผ่านเกณฑ์ · เพิ่มแต่น้อยกว่าเงินลงทุน = ควรดูต่อ · เพิ่มมากกว่าเงินลงทุน = ระวัง",
    how: ["รวมตั๋วเงินระยะสั้นและหนี้ระยะยาวทุกส่วนในงบดุล", "เทียบกับสิ้นปีงบก่อนว่าเพิ่มหรือลด", "ดูควบคู่กับเงินลงทุนและรายการชำระหนี้ในงบกระแสเงินสด"],
  },
  {
    k: "#c24a5a",
    t: "จ่ายหนี้ไหวไหม",
    q: "มีเงินสดพอรับมือหนี้ไหม",
    tag: "Risk (ความมั่นคง)",
    rule: "เงินสด + หลักทรัพย์ลงทุน เทียบหนี้ที่มีดอกเบี้ย · มากกว่าหนี้ = ผ่านเกณฑ์ · อย่างน้อยครึ่งหนึ่งของหนี้ = ควรดูต่อ · น้อยกว่านั้น = ระวัง",
    how: ["รวมเงินสดและหลักทรัพย์ลงทุนในงบดุล", "เทียบกับหนี้ที่มีดอกเบี้ย", "ดูหนี้ที่ครบใน 1 ปีเทียบกับเงินสดที่ใช้ได้เร็ว"],
  },
  {
    k: "#6b4fe0",
    t: "ธุรกิจแข็งขึ้นหรืออ่อนลง",
    q: "รายได้และกำไรไปทางไหน",
    tag: "Growth (แนวโน้มธุรกิจ)",
    rule: "รายได้เทียบปีก่อน และอัตรากำไรจากการดำเนินงาน · รายได้โตและอัตรากำไรไม่ลด = ผ่านเกณฑ์ · ดีขึ้นอย่างใดอย่างหนึ่ง = ควรดูต่อ · ลดทั้งคู่ = ระวัง",
    how: ["เทียบรายได้กับปีก่อน", "คำนวณอัตรากำไรจากการดำเนินงาน = กำไรดำเนินงาน ÷ รายได้", "ดูว่าค่าใช้จ่ายหลักโตเร็วกว่ารายได้ไหม"],
  },
];

const LBI: Record<string, string> = { g: "✅ ผ่านเกณฑ์", a: "⚠️ ควรดูต่อ", r: "🚩 ระวัง" };
const COL: Record<string, string> = { g: "#12a150", a: "#e0a100", r: "#e5484d" };

export default function Page() {
  const [query, setQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState<string>("AAPL");
  const [searchMsg, setSearchMsg] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"fin" | "biz" | "mod" | "cmp" | "grw">("fin");
  const [activeQ, setActiveQ] = useState<number>(0);
  const [activeStmt, setActiveStmt] = useState<"is" | "bs" | "cf" | "yr">("is");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const d = DB[selectedTicker] || DB.AAPL;
  const c = useMemo(() => calcMetrics(d), [d]);

  const qResults = useMemo(() => {
    const dwn = (x: number) => (x >= 0 ? "เพิ่มขึ้น" : "ลดลง");
    // Q0
    const x0 = r1((c.cfo[0] / c.ni[0]) * 100),
      y0 = r1((c.cfo[1] / c.ni[1]) * 100),
      lv0 = c.cfo[0] <= 0 || x0 < 70 ? "r" : x0 >= 100 ? "g" : "a";
    const r0 = {
      lv: lv0,
      ans: lv0 === "g" ? "ใช่ — กำไรที่ประกาศ กลายเป็นเงินสดจริงแล้ว" : lv0 === "a" ? "บางส่วน — เงินสดยังตามกำไรไม่ครบ" : "ยัง — กำไรส่วนใหญ่ยังไม่กลายเป็นเงินสด",
      nums: [
        ["กำไรสุทธิ", fmtN(c.ni[0]), "กำไรตามบัญชี หลังหักค่าใช้จ่ายและภาษีแล้ว"],
        ["เงินสดที่ธุรกิจหลักหาได้", fmtN(c.cfo[0]), "เงินสดจากการดำเนินงาน ในงบกระแสเงินสด"],
        ["เงินสดเทียบกำไร (คำนวณ)", `${x0}%`, `ปีก่อน ${y0}% · 100% ขึ้นไป = กำไรกลายเป็นเงินครบ`],
      ],
      bars: [
        ["กำไรสุทธิ ปีงบ 2026", c.ni[0]],
        ["เงินสดที่หาได้ ปีงบ 2026", c.cfo[0]],
        ["กำไรสุทธิ ปีงบ 2025", c.ni[1]],
        ["เงินสดที่หาได้ ปีงบ 2025", c.cfo[1]],
      ] as [string, number][],
      mean: `เงินสดที่หาได้${dwn(c.dCFO)} ${fmtN(Math.abs(c.dCFO))} ล้านดอลลาร์จากปีก่อน แบ่งเป็น กำไรที่${dwn(c.dNI)} ${fmtN(Math.abs(c.dNI))} · จังหวะเก็บ-จ่ายเงิน ${fmtN(c.dWC)} (${r1((c.dWC / c.dCFO) * 100)}% ของส่วนที่เปลี่ยน) · รายการอื่น ${fmtN(c.dOth)} (คำนวณ)`,
      watch: `สินค้าคงเหลือ ${fmtN(c.inv[0])} (สิ้นปีงบ 25: ${fmtN(c.inv[1])}, ${sg(pct(c.inv[0], c.inv[1]))}) และลูกหนี้ ${fmtN(c.ar[0])} (${sg(pct(c.ar[0], c.ar[1]))}) ดูว่าไม่เพิ่มเร็วกว่ารายได้ในงวดถัดไป`,
    };

    // Q1
    const x1 = r1(c.cfo[0] / c.cx[0]),
      y1 = r1(c.cfo[1] / c.cx[1]),
      lv1 = x1 >= 1 ? "g" : x1 >= 0.5 ? "a" : "r",
      ret0 = r1((c.ret[0] / c.cfo[0]) * 100),
      ret2 = r1((c.ret[1] / c.cfo[1]) * 100);
    const r1Res = {
      lv: lv1,
      ans: lv1 === "g" ? "ได้ — เงินที่หาได้ เหลือเฟือเกินค่าลงทุน" : lv1 === "a" ? "ได้แบบตึง — เงินสดพอลงทุนแต่เหลือไม่มาก" : "ยังไม่ — เงินสดไม่พอลงทุน ต้องหาเงินเพิ่ม",
      nums: [
        ["เงินสดที่ธุรกิจหลักหาได้", fmtN(c.cfo[0]), `ปีงบ 2026 · ปีก่อน ${fmtN(c.cfo[1])}`],
        ["เงินที่ใช้ลงทุนซื้อสินทรัพย์", fmtN(c.cx[0]), `ที่ดิน อาคาร อุปกรณ์ · ปีก่อน ${fmtN(c.cx[1])}`],
        ["เงินสดเป็นกี่เท่าของเงินลงทุน (คำนวณ)", `${x1} เท่า`, `ปีก่อน ${y1} เท่า`],
      ],
      bars: [
        ["เงินสดที่หาได้", c.cfo[0]],
        ["เงินที่ใช้ลงทุน", c.cx[0]],
      ] as [string, number][],
      mean: `เงินลงทุน${c.cx[0] < c.cx[1] ? "ลดลง " : "เพิ่มขึ้น "}${Math.abs(pct(c.cx[0], c.cx[1]))}% ขณะที่เงินสดที่หาได้${c.cfo[0] > c.cfo[1] ? "เพิ่มขึ้น " : "ลดลง "}${Math.abs(pct(c.cfo[0], c.cfo[1]))}% เทียบปีก่อน (คำนวณ)`,
      watch: `เงินที่เหลือถูกใช้จ่ายปันผลและซื้อหุ้นคืนรวม ${fmtN(c.ret[0])} = ${ret0}% ของเงินสดที่หาได้ (ปีก่อน ${ret2}%${c.ret[1] > c.cfo[1] ? " ซึ่งมากกว่าเงินสดที่หามาได้" : ""})`,
    };

    // Q2
    const lv2 = c.dd <= 0 ? "g" : c.dd < c.cx[0] ? "a" : "r";
    const r2Res = {
      lv: lv2,
      ans: lv2 === "g" ? "เงินตัวเอง — ไม่ได้กู้เพิ่ม กลับลดหนี้" : lv2 === "a" ? "ผสม — ใช้เงินตัวเองส่วนหนึ่ง กู้เพิ่มส่วนหนึ่ง" : "เงินกู้ — หนี้เพิ่มมากกว่าเงินลงทุน",
      nums: [
        ["หนี้ที่มีดอกเบี้ย ตอนนี้ (คำนวณ)", fmtN(c.dc), "รวมตั๋วเงินและหนี้ระยะยาวทุกส่วน"],
        ["ตอนสิ้นปีงบ 2025 (คำนวณ)", fmtN(c.dp), "จุดเปรียบเทียบ"],
        ["หนี้เปลี่ยนไป (คำนวณ)", `${c.dd < 0 ? "ลด " : "เพิ่ม "}${fmtN(Math.abs(c.dd))}`, sg(pct(c.dc, c.dp))],
      ],
      bars: [
        ["หนี้ ณ 26 ก.ย. 2026", c.dc],
        ["หนี้ ณ 27 ก.ย. 2025", c.dp],
      ] as [string, number][],
      mean: `หนี้ที่มีดอกเบี้ย${c.dd <= 0 ? "ลดลง" : "เพิ่มขึ้น"} ${fmtN(Math.abs(c.dd))} ล้านดอลลาร์ ขณะที่เงินลงทุนในอุปกรณ์ปีนี้ ${fmtN(c.cx[0])}`,
      watch: `ปีนี้ชำระคืนหนี้ระยะยาว ${fmtN(c.rpt)} และตั๋วเงินระยะสั้น ${fmtN(c.rpc)}${c.iss[0] === 0 ? " โดยไม่ออกหนี้ใหม่" : ""} (ปีก่อนออกหนี้ใหม่ ${fmtN(c.iss[1])})`,
    };

    // Q3
    const lv3 = c.cs >= c.dc ? "g" : c.cs >= c.dc / 2 ? "a" : "r";
    const r3Res = {
      lv: lv3,
      ans: lv3 === "g" ? "ไหว — เงินสดและหลักทรัพย์ มากกว่าหนี้ทั้งหมด" : lv3 === "a" ? "พอได้บางส่วน — เงินสดครอบคลุมหนี้ไม่ถึงทั้งหมด" : "เสี่ยง — หนี้มากกว่าเงินสดและหลักทรัพย์มาก",
      nums: [
        ["เงินสด + หลักทรัพย์ลงทุน (คำนวณ)", fmtN(c.cs), `สิ้นปีงบ 25: ${fmtN(c.csp)}`],
        ["หนี้ที่มีดอกเบี้ย (คำนวณ)", fmtN(c.dc), `สิ้นปีงบ 25: ${fmtN(c.dp)}`],
        ["ส่วนที่เหลือหลังหักหนี้ (คำนวณ)", fmtN(c.cs - c.dc), `สิ้นปีงบ 25: ${fmtN(c.csp - c.dp)}`],
      ],
      bars: [
        ["เงินสด + หลักทรัพย์", c.cs],
        ["หนี้ที่มีดอกเบี้ย", c.dc],
      ] as [string, number][],
      mean: `นำเงินสดและหลักทรัพย์ลงทุนทั้งหมดมาเทียบกับหนี้ที่มีดอกเบี้ยทั้งหมด ณ วันที่ในงบ ${c.cs >= c.dc ? "แล้วยังเหลือ " : "ขาดอยู่ "}${fmtN(Math.abs(c.cs - c.dc))} ล้านดอลลาร์`,
      watch: `หนี้ที่ครบใน 1 ปี ${fmtN(c.due)} เทียบเงินสดและหลักทรัพย์หมุนเวียน ${fmtN(c.liq)} · ระบบยังไม่มีตัวเลขดอกเบี้ยจ่าย จึงยังวัดความสามารถจ่ายดอกเบี้ยไม่ได้`,
    };

    // Q4
    const up = c.revg > 0,
      mu = c.om[0] >= c.om[1],
      lv4 = up && mu ? "g" : up || mu ? "a" : "r";
    const r4Res = {
      lv: lv4,
      ans: lv4 === "g" ? "แข็งขึ้น — รายได้โต และเหลือกำไรต่อรายได้มากขึ้น" : lv4 === "a" ? "ดีขึ้นด้านเดียว — รายได้หรือกำไรต่อรายได้อย่างใดอย่างหนึ่งดีขึ้น" : "อ่อนลง — รายได้และกำไรต่อรายได้ลดลงทั้งคู่",
      nums: [
        ["รายได้ เทียบปีก่อน", sg(c.revg), `${fmtN(c.rev[0])} จาก ${fmtN(c.rev[1])} · ไตรมาส 4 ${sg(c.revgq)}`],
        ["กำไรจากการดำเนินงาน ต่อรายได้ (คำนวณ)", `${c.om[0]}%`, `ปีก่อน ${c.om[1]}%`],
        ["กำไรสุทธิ เทียบปีก่อน", sg(c.nig), `${fmtN(c.ni[0])} จาก ${fmtN(c.ni[1])}`],
      ],
      bars: [
        ["รายได้ ปีงบ 2026", c.rev[0]],
        ["รายได้ ปีงบ 2025", c.rev[1]],
      ] as [string, number][],
      mean: `กำไรจากการดำเนินงานโต ${sg(c.oig)} เทียบรายได้ ${sg(c.revg)}${c.oig > c.revg ? " (กำไรโตเร็วกว่ารายได้)" : ""} · ค่าวิจัยและพัฒนาโต ${sg(c.rdg)}${c.rdg > c.revg ? " (เร็วกว่ารายได้)" : ""}`,
      watch: `ไตรมาส 4 บริษัทแจ้งว่ากำไรขั้นต้นรวมผลบวกประมาณ 1 จุดจากการคืนภาษีศุลกากร และกำไรต่อหุ้นได้ผลบวก 0.05 ดอลลาร์ ดูว่างวดถัดไปอัตรากำไรคงอยู่ได้ไหมเมื่อไม่มีรายการนี้`,
    };

    return [r0, r1Res, r2Res, r3Res, r4Res];
  }, [c]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const s = query.trim().toLowerCase();
    if (!s) return;
    const foundKey = Object.keys(DB).find(
      (k) => k.toLowerCase() === s || DB[k].name.toLowerCase().includes(s)
    );
    if (foundKey) {
      setSelectedTicker(foundKey);
      setSearchMsg("");
      document.getElementById("s5")?.scrollIntoView({ behavior: "smooth" });
    } else {
      setSearchMsg(
        `ยังไม่มี "${query.toUpperCase()}" ในคลังตอนนี้ (ปัจจุบันมี ${Object.keys(DB).join(", ")}) — ระบบยึดหลักใช้เฉพาะตัวเลขจากเอกสารทางการ ไม่เดาตัวเลขขึ้นเอง`
      );
    }
  };

  const renderBars = (rows: [string, number][], mx: number) => (
    <div className="space-y-2 my-2">
      {rows.map(([label, val], idx) => (
        <div key={idx} className="grid grid-cols-[minmax(120px,1.4fr)_3fr_minmax(80px,0.8fr)] gap-2 items-center text-xs md:text-sm">
          <span className="truncate">{label}</span>
          <div className="h-3.5 bg-white rounded-full overflow-hidden border border-line">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(2, Math.round((Math.abs(val) / (mx || 1)) * 100))}%`,
                backgroundColor: val < 0 ? "#e5484d" : "#14925a",
              }}
            />
          </div>
          <b className="text-right">{fmtN(val)}</b>
        </div>
      ))}
    </div>
  );

  const renderShareBar = (title: string, hint: string, rows: [string, number, number, number, number][], tot: number) => {
    const pal = ["#0b5d3b", "#2aa86a", "#d4a017", "#128c8c", "#7a56ff"];
    return (
      <div className="bg-hatch rounded-2xl p-4 mt-3">
        <h3 className="font-bold text-base mb-0.5">{title}</h3>
        <p className="text-xs text-mute mb-2">{hint}</p>
        <div className="flex h-10 rounded-xl overflow-hidden my-2">
          {rows.map((r, i) => {
            const pc = (r[3] / tot) * 100;
            return (
              <div
                key={i}
                style={{ width: `${pc}%`, backgroundColor: pal[i % 5] }}
                className="grid place-items-center text-white text-xs font-bold"
              >
                {pc >= 9 ? `${r1(pc)}%` : ""}
              </div>
            );
          })}
        </div>
        <ul className="space-y-1 text-sm mt-2">
          {rows.map((r, i) => (
            <li key={i} className="flex items-baseline gap-2 flex-wrap">
              <span className="w-3 h-3 rounded inline-block flex-none" style={{ backgroundColor: pal[i % 5] }} />
              <b>{TH[r[0]] || r[0]}</b>
              <span>{r1((r[3] / tot) * 100)}%</span>
              <small className="text-mute">
                {fmtN(r[3])} ล้านดอลลาร์ · เทียบปีก่อน {sg(pct(r[3], r[4]))}
              </small>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderTable = (headers: string[], rows: FinRow[]) => (
    <div className="overflow-x-auto mt-2">
      <table className="w-full border-collapse text-xs md:text-sm">
        <thead>
          <tr className="border-b border-line text-mute">
            <th className="text-left py-2 px-2 font-medium">รายการ</th>
            {headers.map((h, i) => (
              <th key={i} className="text-right py-2 px-2 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={`border-b border-line ${r[4] ? "font-bold bg-hatch" : ""}`}>
              <td className="text-left py-2 px-2">
                {r[1]}
                <small className="block text-mute font-normal text-xs">{r[0]}</small>
              </td>
              {r[2].map((v, j) => (
                <td key={j} className="text-right py-2 px-2 whitespace-nowrap">
                  {fmtN(v, r[3] || 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Market summary logic
  const mktTiles = MKT.items.map((m) => {
    const L = m.s[m.s.length - 1];
    const P = m.s[m.s.length - 2];
    const ch = r1((L[1] / P[1] - 1) * 100);
    const up = L[1] > P[1];
    const col = m.vix ? "#e0a100" : up ? "#12a150" : "#e5484d";
    return { ...m, L, ch, up, col };
  });
  const spUp = mktTiles[0].up,
    ncUp = mktTiles[1].up,
    vxUp = mktTiles[2].up;
  const mktLab = !spUp && !ncUp && vxUp ? "ตลาดอ่อนตัว" : spUp && ncUp && !vxUp ? "ตลาดแข็งตัว" : "ทิศทางผสม";
  const mktWhy =
    mktLab === "ตลาดอ่อนตัว"
      ? "ดัชนีหลักปิดลดลง และ VIX (ความผันผวนที่ตลาดคาดไว้) สูงขึ้น"
      : mktLab === "ตลาดแข็งตัว"
      ? "ดัชนีหลักปิดเพิ่มขึ้น และ VIX ลดลง"
      : "ดัชนีหลักกับ VIX ไม่ไปทางเดียวกัน";

  const curQMeta = Q_META[activeQ];
  const curQRes = qResults[activeQ];
  const maxBar = Math.max(...curQRes.bars.map((b) => Math.abs(b[1])), 1);
  const rvTotal = getV(d.is, "Total net sales")[2];
  const okCount = qResults.filter((r) => r.lv === "g").length;

  const navItems = [
    { id: "s1", label: "📊 ภาพรวมตลาด" },
    { id: "s2", label: "💧 เงินไหลไปไหน" },
    { id: "s3", label: "🏭 อุตสาหกรรมเด่น" },
    { id: "s4", label: "👑 หุ้นผู้นำ" },
    { id: "s5", label: "🔍 หุ้นรายตัว" },
    { id: "s6", label: "🧭 Action Plan" },
  ];

  const toggleCheck = (key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-5xl mx-auto p-4 pb-16">
      {/* Hero Search */}
      <section className="bg-gradient-to-br from-hero to-hero2 text-white rounded-3xl p-6 mb-4 shadow-md border-b-4 border-gold grid md:grid-cols-[1.2fr_1fr] gap-4 items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold leading-tight mb-1">จากตลาด สู่หุ้นรายตัว</h1>
          <p className="text-sm text-green-100">อ่านตลาดและงบการเงินแบบเข้าใจง่าย ทุกตัวเลขมีที่มาและวันที่</p>
        </div>
        <div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาหุ้นในคลัง เช่น AAPL"
              className="flex-1 px-4 py-2.5 rounded-xl text-ink bg-white font-medium outline-none focus:ring-2 focus:ring-gold"
            />
            <button
              type="submit"
              className="bg-gold text-yellow-950 font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-400 transition shadow"
            >
              ค้นหา
            </button>
          </form>
          <div className="mt-2 flex items-center gap-2 text-xs text-yellow-200 flex-wrap">
            <span>หุ้นพร้อมดูในคลัง:</span>
            {Object.keys(DB).map((tk) => (
              <button
                key={tk}
                type="button"
                onClick={() => {
                  setQuery(tk);
                  setSelectedTicker(tk);
                  setSearchMsg("");
                  document.getElementById("s5")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-white/20 hover:bg-white/30 text-white font-bold px-2.5 py-0.5 rounded-full transition"
              >
                {tk}
              </button>
            ))}
          </div>
        </div>
        {searchMsg && (
          <div className="md:col-span-2 bg-black/25 text-yellow-200 text-xs px-3 py-2 rounded-xl">
            {searchMsg}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-[200px_1fr] gap-5 items-start">
        {/* Sidebar Rail */}
        <aside className="sticky top-3 z-10 bg-white rounded-2xl p-3 shadow-sm">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" })}
                className="whitespace-nowrap text-left text-xs md:text-sm px-3 py-2 rounded-xl text-mute hover:bg-hatch hover:text-ink font-medium transition"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-hero tracking-wide px-1">
            <span>มองตลาด · จากภาพใหญ่ไปหาหุ้นผู้นำ</span>
            <span className="flex-1 h-0.5 bg-gradient-to-r from-gold to-transparent" />
          </div>

          {/* S1: Market Overview */}
          <section id="s1" className="bg-white rounded-3xl p-5 md:p-6 shadow-sm scroll-mt-16">
            <div className="flex gap-3 items-center mb-3">
              <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-hero2 to-hero grid place-items-center text-xl shadow-sm">
                📊
              </span>
              <div>
                <h2 className="text-lg md:text-xl font-bold">ภาพรวมตลาด</h2>
                <p className="text-xs text-mute">สรุปวันล่าสุดจากแหล่งทางการ</p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-hatch to-transparent border-l-4 border-gold rounded-xl p-3 mb-4">
              <div className="text-lg md:text-xl font-bold">{mktLab}</div>
              <div className="text-xs text-mute">
                {mktWhy} · วันล่าสุด {thd(MKT.items[0].s[MKT.items[0].s.length - 1][0])}
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {mktTiles.map((t) => (
                <div key={t.id} className="bg-hatch rounded-2xl p-4">
                  <small className="block text-mute text-xs">{t.name}</small>
                  <div className="text-2xl font-extrabold my-0.5">{fmtN(t.L[1], t.dec)}</div>
                  <span
                    className="inline-block text-xs font-bold rounded-full px-2.5 py-0.5 text-white"
                    style={{ backgroundColor: t.col }}
                  >
                    {t.up ? "▲ " : "▼ "}
                    {sg(t.ch)}
                  </span>
                  <small className="block text-mute text-xs mt-1">
                    เทียบวันก่อนหน้า · ปิด {thd(t.L[0])}
                  </small>
                </div>
              ))}
            </div>
            <details className="mt-3 bg-hatch rounded-xl p-3 text-xs">
              <summary className="font-bold cursor-pointer">รายละเอียด วิธีสรุป และที่มา</summary>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {MKT.items.map((m) => (
                  <li key={m.id}>
                    <b>{m.name}</b>:{" "}
                    {m.s.map((x) => `${thd(x[0]).replace(" 2026", "")} ${fmtN(x[1], m.dec)}`).join(" · ")} (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="underline">
                      {m.src}
                    </a>
                    )
                  </li>
                ))}
              </ul>
              <div className="mt-2 border-l-4 border-gold pl-2 text-mute">
                อัปเดตล่าสุด: ข้อมูลถึง {thd(MKT.items[0].s[MKT.items[0].s.length - 1][0])} · บันทึกเข้าคลัง{" "}
                {thDate(MKT.retrievedAt)}
              </div>
            </details>
          </section>

          {/* S2: Fund Flow */}
          <section id="s2" className="bg-white rounded-3xl p-5 md:p-6 shadow-sm scroll-mt-16">
            <div className="flex gap-3 items-center mb-3">
              <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-hero2 to-hero grid place-items-center text-xl shadow-sm">
                💧
              </span>
              <div>
                <h2 className="text-lg md:text-xl font-bold">เงินไหลไปไหน (Fund Flow)</h2>
                <p className="text-xs text-mute">Inflow / Outflow รายกลุ่มอุตสาหกรรม</p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-hatch to-transparent border-l-4 border-gold rounded-xl p-3 mb-4">
              <div className="text-lg font-bold">ยังไม่มีข้อมูลเงินไหล</div>
              <div className="text-xs text-mute">กำลังรอแหล่งข้อมูลที่ตรวจแล้ว ระบบจะไม่เดาตัวเลข</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {SECETF.map(([secName, etf]) => {
                const isMe = secName === d.sector;
                return (
                  <div
                    key={etf}
                    className={`rounded-xl p-2.5 text-xs ${
                      isMe ? "bg-yellow-100 ring-2 ring-gold" : "bg-hatch"
                    }`}
                  >
                    <b className="block text-sm">{secName}</b>
                    <span>{etf} · </span>
                    <span className="text-mute bg-white px-2 py-0.5 rounded">รอข้อมูล</span>
                    {isMe && <div className="text-hero font-bold mt-1">กลุ่มของ {d.ticker}</div>}
                  </div>
                );
              })}
            </div>
          </section>

          {/* S3 & S4 */}
          <div className="grid md:grid-cols-2 gap-4">
            <section id="s3" className="bg-white rounded-3xl p-5 shadow-sm scroll-mt-16">
              <div className="flex gap-3 items-center mb-3">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-hero2 to-hero grid place-items-center text-lg">
                  🏭
                </span>
                <div>
                  <h2 className="text-base font-bold">อุตสาหกรรมเด่น</h2>
                  <p className="text-xs text-mute">กลุ่มที่เงินไหลเข้าเด่นที่สุด</p>
                </div>
              </div>
              <div className="bg-hatch rounded-xl p-3 text-sm text-mute">
                ยังไม่จัดอันดับ · จะเรียงจากสถานะ Fund Flow เมื่อมีข้อมูล
              </div>
            </section>

            <section id="s4" className="bg-white rounded-3xl p-5 shadow-sm scroll-mt-16">
              <div className="flex gap-3 items-center mb-3">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-hero2 to-hero grid place-items-center text-lg">
                  👑
                </span>
                <div>
                  <h2 className="text-base font-bold">หุ้นผู้นำ (Leader)</h2>
                  <p className="text-xs text-mute">หุ้นที่มีงบในคลังตอนนี้</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(DB).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setSelectedTicker(k);
                      document.getElementById("s5")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="bg-gold text-yellow-950 font-bold text-xs px-4 py-2 rounded-xl hover:bg-yellow-400 transition shadow-sm"
                  >
                    {k} · {DB[k].name} → ดูหุ้นรายตัว
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-hero tracking-wide px-1 pt-2">
            <span>เจาะหุ้นรายตัว · แล้วสรุปสิ่งที่ต้องทำต่อ</span>
            <span className="flex-1 h-0.5 bg-gradient-to-r from-gold to-transparent" />
          </div>

          {/* S5: Individual Stock */}
          <section id="s5" className="bg-white rounded-3xl p-5 md:p-6 shadow-sm scroll-mt-16">
            <div className="flex gap-3 items-center mb-3">
              <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-hero2 to-hero grid place-items-center text-xl shadow-sm">
                🔍
              </span>
              <div>
                <h2 className="text-lg md:text-xl font-bold">
                  หุ้นรายตัว: {d.name} ({d.ticker})
                </h2>
                <p className="text-xs text-mute">
                  {d.country} · {d.exch} · {d.sector} · หน่วย: ล้านดอลลาร์สหรัฐ
                </p>
              </div>
            </div>

            <div className="bg-hatch border-l-4 border-gold rounded-xl p-3 text-xs text-mute mb-3">
              <b className="text-ink">ข้อมูลล่าสุด: ไตรมาส 4 และทั้งปีงบ 2026</b> (ก.ค.–ก.ย. 2026 สิ้นสุด 26 ก.ย. 2026 ประกาศ 2 พ.ย. 2026) · บันทึกเข้าคลัง: {thDate(RETRIEVED)}
              <br />
              แหล่ง:{" "}
              <a href={S.e} target="_blank" rel="noopener noreferrer" className="underline text-hero font-medium">
                SEC Form 8-K Q4 FY2026
              </a>{" "}
              ·{" "}
              <a href={S.k} target="_blank" rel="noopener noreferrer" className="underline text-hero font-medium">
                SEC 10-K FY2025
              </a>
            </div>

            {/* Sub Tabs */}
            <div className="flex gap-2 flex-wrap my-4">
              {(
                [
                  ["fin", "งบการเงิน"],
                  ["biz", "ประเภทธุรกิจ"],
                  ["mod", "โมเดลหาเงิน"],
                  ["cmp", "คู่แข่งหลัก"],
                  ["grw", "การเติบโต"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                    activeTab === key
                      ? "bg-hero2 text-white shadow-sm"
                      : "bg-hatch text-mute hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab: Financials */}
            {activeTab === "fin" && (
              <div>
                {renderShareBar(
                  "รายได้มาจากไหน (ปีงบ 2026)",
                  "แถบนี้คือรายได้ทั้งหมด 100% แต่ละสีคือหมวดสินค้าหรือบริการ",
                  d.mix,
                  rvTotal
                )}

                <h3 className="text-base font-bold mt-5 mb-1">5 คำถามที่งบตอบได้</h3>
                <p className="text-xs text-mute mb-3">
                  กดคำถาม แล้วอ่านจากบนลงล่าง: คำตอบ → ตัวเลข → ภาพเทียบ → แปลว่าอะไร → ควรจับตาอะไร
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
                  {Q_META.map((qItem, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveQ(idx)}
                      style={{ backgroundColor: qItem.k }}
                      className={`text-left text-white rounded-2xl p-3 transition shadow ${
                        activeQ === idx ? "ring-4 ring-gold scale-[1.02]" : "opacity-90 hover:opacity-100"
                      }`}
                    >
                      <div className="text-xs opacity-90">{qItem.t}</div>
                      <b className="block text-xs md:text-sm leading-snug mt-0.5">{qItem.q}</b>
                      <span className="inline-block mt-2 text-[11px] bg-white/95 text-ink rounded-full px-2 py-0.5 font-medium">
                        {LBI[qResults[idx].lv]}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Selected Question Answer Card */}
                <div
                  className="bg-hatch rounded-2xl p-4 mb-3 border-l-8"
                  style={{ borderColor: COL[curQRes.lv] }}
                >
                  <small className="text-mute text-xs">
                    {curQMeta.q} · {LBI[curQRes.lv]}
                  </small>
                  <div className="text-lg md:text-xl font-extrabold mt-0.5">{curQRes.ans}</div>
                </div>

                <div className="grid sm:grid-cols-3 gap-2.5 my-3">
                  {curQRes.nums.map((f, idx) => (
                    <div
                      key={idx}
                      className="bg-white border-2 border-line border-t-4 rounded-2xl p-3"
                      style={{ borderTopColor: curQMeta.k }}
                    >
                      <small className="block text-mute text-xs">{f[0]}</small>
                      <b className="block text-xl md:text-2xl my-0.5">{f[1]}</b>
                      <span className="text-xs text-mute">{f[2]}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-hatch rounded-2xl p-4 mb-3">
                  <h4 className="font-bold text-sm mb-2">เทียบให้เห็นภาพ (ล้านดอลลาร์)</h4>
                  {renderBars(curQRes.bars, maxBar)}
                </div>

                <div className="grid md:grid-cols-2 gap-3 mb-3">
                  <div className="bg-hatch rounded-2xl p-4">
                    <h4 className="font-bold text-sm mb-1">แปลว่าอะไร</h4>
                    <p className="text-sm">{curQRes.mean}</p>
                  </div>
                  <div className="bg-hatch rounded-2xl p-4">
                    <h4 className="font-bold text-sm mb-1">ควรจับตาอะไรต่อ</h4>
                    <p className="text-sm">{curQRes.watch}</p>
                  </div>
                </div>

                <details className="bg-hatch rounded-2xl p-3 text-xs">
                  <summary className="font-bold cursor-pointer">วิธีอ่านและกฎเกณฑ์ที่ใช้</summary>
                  <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
                    {curQMeta.how.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  <p className="mt-2 text-mute">
                    <b>กฎที่ใช้:</b> {curQMeta.rule} · เชื่อมกับ {curQMeta.tag}
                  </p>
                </details>

                <div className="flex gap-2 flex-wrap mt-3">
                  <button
                    type="button"
                    onClick={() => setActiveQ((activeQ + 1) % Q_META.length)}
                    className="bg-gold text-yellow-950 font-bold text-sm px-4 py-2 rounded-xl hover:bg-yellow-400 transition"
                  >
                    ดูคำถามถัดไป: {Q_META[(activeQ + 1) % Q_META.length].t} →
                  </button>
                </div>

                {/* Full Financial Statements */}
                <details className="mt-4 bg-hatch rounded-2xl p-4" open>
                  <summary className="font-bold text-sm cursor-pointer">งบการเงินฉบับเต็ม (ตรวจตัวเลขที่ใช้ตอบ)</summary>
                  <div className="flex gap-2 flex-wrap my-3">
                    {(
                      [
                        ["is", "งบกำไรขาดทุน"],
                        ["bs", "งบดุล"],
                        ["cf", "งบกระแสเงินสด"],
                        ["yr", "รายปี"],
                      ] as const
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setActiveStmt(k)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                          activeStmt === k ? "bg-hero2 text-white" : "bg-white text-mute"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {activeStmt === "is" &&
                    renderTable(["Q4 ปีงบ 26", "Q4 ปีงบ 25", "ปีงบ 26 (12 เดือน)", "ปีงบ 25 (12 เดือน)"], d.is)}
                  {activeStmt === "bs" && renderTable(["26 ก.ย. 2026", "27 ก.ย. 2025"], d.bs)}
                  {activeStmt === "cf" && renderTable(["ปีงบ 26 (12 เดือน)", "ปีงบ 25 (12 เดือน)"], d.cf)}
                  {activeStmt === "yr" && renderTable(d.yr.h, d.yr.rows)}
                </details>
              </div>
            )}

            {/* Tab: Business */}
            {activeTab === "biz" && (
              <div>
                {renderShareBar("รายได้มาจากสินค้าอะไรบ้าง (ปีงบ 2026)", "สัดส่วนตามหมวดสินค้าและบริการ", d.mix, rvTotal)}
                {renderShareBar("รายได้มาจากภูมิภาคไหนบ้าง (ปีงบ 2026)", "สัดส่วนตามภูมิภาคทั่วโลก", d.reg, rvTotal)}
              </div>
            )}

            {/* Tab: Model */}
            {activeTab === "mod" && (() => {
              const ps = getV(d.is, "Products net sales")[2],
                ss = getV(d.is, "Services net sales")[2],
                pc = getV(d.is, "Cost of sales: Products")[2],
                sc = getV(d.is, "Cost of sales: Services")[2],
                gm = getV(d.is, "Gross margin")[2];
              const pg = ps - pc,
                sgp = ss - sc;
              return (
                <div className="bg-hatch rounded-2xl p-4">
                  <h3 className="font-bold text-base mb-1">เงินมาจากไหน และเหลือกำไรเท่าไร (ปีงบ 2026)</h3>
                  {renderBars(
                    [
                      ["รายได้จากสินค้า", ps],
                      ["กำไรขั้นต้นจากสินค้า (คำนวณ)", pg],
                      ["รายได้จากบริการ", ss],
                      ["กำไรขั้นต้นจากบริการ (คำนวณ)", sgp],
                    ],
                    ps
                  )}
                  <div className="grid sm:grid-cols-3 gap-2.5 mt-3">
                    <div className="bg-white rounded-xl p-3 border-t-4 border-hero">
                      <small className="text-mute text-xs">กำไรขั้นต้น สินค้า</small>
                      <b className="block text-xl">{r1((pg / ps) * 100)}%</b>
                    </div>
                    <div className="bg-white rounded-xl p-3 border-t-4 border-gold">
                      <small className="text-mute text-xs">กำไรขั้นต้น บริการ</small>
                      <b className="block text-xl">{r1((sgp / ss) * 100)}%</b>
                    </div>
                    <div className="bg-white rounded-xl p-3 border-t-4 border-teal-600">
                      <small className="text-mute text-xs">บริการ: รายได้ → กำไรขั้นต้น</small>
                      <b className="block text-xl">
                        {r1((ss / (ps + ss)) * 100)}% → {r1((sgp / gm) * 100)}%
                      </b>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Tab: Competitors */}
            {activeTab === "cmp" && (
              <div className="bg-hatch rounded-2xl p-4">
                <h3 className="font-bold text-base mb-1">คู่แข่งหลัก</h3>
                <p className="text-sm text-mute">
                  รอข้อมูลคู่แข่งจากเอกสารทางการที่ระบุได้ · ปัจจุบันในคลังมี {Object.keys(DB).length} บริษัท
                </p>
              </div>
            )}

            {/* Tab: Growth */}
            {activeTab === "grw" && (
              <div className="bg-hatch rounded-2xl p-4">
                <h3 className="font-bold text-base mb-3">การเติบโต (ปีงบ 2026 เทียบปีงบ 2025)</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-mute mb-1">ตามสินค้า</h4>
                    <ul className="space-y-1 text-sm">
                      {d.mix.map((x, i) => (
                        <li key={i}>
                          <b>{TH[x[0]] || x[0]}</b>: {sg(pct(x[3], x[4]))} (Q4: {sg(pct(x[1], x[2]))})
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-mute mb-1">ตามภูมิภาค</h4>
                    <ul className="space-y-1 text-sm">
                      {d.reg.map((x, i) => (
                        <li key={i}>
                          <b>{TH[x[0]] || x[0]}</b>: {sg(pct(x[3], x[4]))}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* S6: Action Plan */}
          <section id="s6" className="bg-white rounded-3xl p-5 md:p-6 shadow-sm scroll-mt-16">
            <div className="flex gap-3 items-center mb-3">
              <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-hero2 to-hero grid place-items-center text-xl shadow-sm">
                🧭
              </span>
              <div>
                <h2 className="text-lg md:text-xl font-bold">Action Plan: เอาไปใช้ต่อยังไง</h2>
                <p className="text-xs text-mute">ทำตามลำดับจากบนลงล่าง ติ๊กเพื่อจดความคืบหน้าได้</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: "a1",
                  col: "#12a150",
                  title: `อ่านคำตอบ 5 ข้อของงบ (ผ่านเกณฑ์ ${okCount} จาก 5 ข้อ)`,
                  desc: "ตรวจสอบคุณภาพกำไร การลงทุน ภาระหนี้ และแนวโน้มการเติบโตด้านบน",
                },
                {
                  id: "a2",
                  col: "#12a150",
                  title: "ตรวจที่มาของตัวเลขจาก Form 8-K",
                  desc: "เทียบตัวเลขในตารางงบฉบับเต็มกับเอกสารต้นทางของ SEC",
                },
                {
                  id: "a3",
                  col: "#d4a017",
                  title: `ติดตามสินค้าคงเหลือ (${fmtN(c.inv[0])}) และลูกหนี้ (${fmtN(c.ar[0])}) ในงวดถัดไป`,
                  desc: "ดูว่าไม่เพิ่มเร็วกว่ารายได้",
                },
                {
                  id: "a4",
                  col: "#d4a017",
                  title: `ติดตามหนี้ที่มีดอกเบี้ย (${fmtN(c.dc)}) เทียบเงินสด+หลักทรัพย์ (${fmtN(c.cs)})`,
                  desc: "ดูว่ายังรักษาสถานะเงินสดมากกว่าหนี้ได้ต่อเนื่อง",
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="bg-hatch rounded-2xl p-3.5 border-l-4"
                  style={{ borderColor: item.col }}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer font-bold text-sm md:text-base">
                    <input
                      type="checkbox"
                      checked={!!checkedItems[item.id]}
                      onChange={() => toggleCheck(item.id)}
                      className="mt-1 w-4 h-4 accent-hero2"
                    />
                    <span className={checkedItems[item.id] ? "line-through text-mute" : ""}>
                      {item.title}
                    </span>
                  </label>
                  <p className="text-xs text-mute ml-6 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
