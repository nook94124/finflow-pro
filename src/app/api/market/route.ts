import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SEC_HEADERS = {
  "User-Agent": process.env.SEC_USER_AGENT || "FinFlowPro/1.1 (contact@finflow.app)",
  Accept: "application/json",
};

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// ============================================================================
// 1. IN-MEMORY TTL CACHE + STALE FALLBACK
// ============================================================================
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const gCache = globalThis as unknown as { __finflowCache?: Map<string, CacheEntry<unknown>> };
const memoryCache = gCache.__finflowCache ?? new Map<string, CacheEntry<unknown>>();
if (!gCache.__finflowCache) gCache.__finflowCache = memoryCache;

function getFreshCache<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  return entry && Date.now() < entry.expiresAt ? entry.data : null;
}

function getStaleCache<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  return entry ? entry.data : null;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ============================================================================
// 2. SMART TIMEOUT FETCH (ตัดการรออัตโนมัติหากแหล่งข้อมูลภายนอกตอบช้า)
// ============================================================================
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface FredObservation {
  date: string;
  value: number;
  prevValue: number;
  change: number;
  sourceUrl: string;
}

async function fetchFredSeries(seriesId: string): Promise<FredObservation | null> {
  const cacheKey = `fred:${seriesId}`;
  const fresh = getFreshCache<FredObservation>(cacheKey);
  if (fresh) return fresh;

  const apiKey = process.env.FRED_API_KEY?.trim();
  if (apiKey) {
    try {
      const apiUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(
        seriesId
      )}&api_key=${encodeURIComponent(apiKey)}&file_type=json&sort_order=desc&limit=10`;
      const res = await fetchWithTimeout(apiUrl, { cache: "no-store" }, 4500);
      if (res.ok) {
        const json = await res.json();
        const valid = (json?.observations || [])
          .map((o: { date: string; value: string }) => ({ date: o.date, val: parseFloat(o.value) }))
          .filter((o: { date: string; val: number }) => o.date && isFinite(o.val));
        if (valid.length > 0) {
          const last = valid[0];
          const prev = valid.length >= 2 ? valid[1] : last;
          const result: FredObservation = {
            date: last.date,
            value: Math.round(last.val * 100) / 100,
            prevValue: Math.round(prev.val * 100) / 100,
            change: Math.round((last.val - prev.val) * 100) / 100,
            sourceUrl: `https://fred.stlouisfed.org/series/${seriesId}`,
          };
          setCache(cacheKey, result, 15 * 60 * 1000);
          return result;
        }
      }
    } catch {
      // สลับไปใช้ช่องทาง CSV สาธารณะด้านล่าง
    }
  }

  try {
    const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": "FinFlowPro/1.1" }, cache: "no-store" }, 5000);
    if (!res.ok) return getStaleCache<FredObservation>(cacheKey);
    const lines = (await res.text()).trim().split("\n").slice(1);
    const valid: { date: string; val: number }[] = [];
    for (let i = Math.max(0, lines.length - 15); i < lines.length; i++) {
      const [dt, raw] = lines[i].split(",");
      const num = parseFloat(raw);
      if (dt && isFinite(num)) valid.push({ date: dt.trim(), val: num });
    }
    if (valid.length === 0) return getStaleCache<FredObservation>(cacheKey);
    const last = valid[valid.length - 1];
    const prev = valid.length >= 2 ? valid[valid.length - 2] : last;
    const result: FredObservation = {
      date: last.date,
      value: Math.round(last.val * 100) / 100,
      prevValue: Math.round(prev.val * 100) / 100,
      change: Math.round((last.val - prev.val) * 100) / 100,
      sourceUrl: `https://fred.stlouisfed.org/series/${seriesId}`,
    };
    setCache(cacheKey, result, 15 * 60 * 1000);
    return result;
  } catch {
    return getStaleCache<FredObservation>(cacheKey);
  }
}

let cachedSecTickers: Record<string, { cik: string; title: string }> | null = null;

async function resolveSecCik(ticker: string) {
  if (!cachedSecTickers) {
    try {
      const res = await fetchWithTimeout(
        "https://www.sec.gov/files/company_tickers.json",
        { headers: SEC_HEADERS, next: { revalidate: 86400 } },
        6000
      );
      if (res.ok) {
        const json = await res.json();
        const map: Record<string, { cik: string; title: string }> = {};
        for (const key of Object.keys(json)) {
          const item = json[key];
          if (item?.ticker && item?.cik_str) {
            map[String(item.ticker).toUpperCase()] = {
              cik: String(item.cik_str).padStart(10, "0"),
              title: item.title || item.ticker,
            };
          }
        }
        cachedSecTickers = map;
      }
    } catch {
      return null;
    }
  }
  const cleanTicker = ticker.replace(/\..*$/, "").toUpperCase();
  return cachedSecTickers?.[cleanTicker] || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSecFactSeries(usGaap: any, tags: string[]) {
  const annualMap: Record<string, { end: string; val: number; filed: string }> = {};
  const quarterMap: Record<string, { end: string; val: number; filed: string }> = {};
  const instantMap: Record<string, { end: string; val: number; filed: string }> = {};

  for (const tag of tags) {
    const units = usGaap?.[tag]?.units?.USD;
    if (!Array.isArray(units)) continue;
    for (const item of units) {
      if (typeof item.val !== "number" || !item.end) continue;
      if (!["10-K", "10-Q", "20-F", "40-F"].includes(item.form || "")) continue;
      if (!item.start) {
        const ex = instantMap[item.end];
        if (!ex || (item.filed || "") >= ex.filed) instantMap[item.end] = { end: item.end, val: item.val, filed: item.filed || "" };
      } else {
        const days = (new Date(item.end).getTime() - new Date(item.start).getTime()) / 86400000;
        if (days >= 330 && days <= 380) {
          const yrKey = item.end.slice(0, 4);
          const ex = annualMap[yrKey];
          if (!ex || (item.filed || "") >= ex.filed) annualMap[yrKey] = { end: item.end, val: item.val, filed: item.filed || "" };
        } else if (days >= 75 && days <= 105) {
          const ex = quarterMap[item.end];
          if (!ex || (item.filed || "") >= ex.filed) quarterMap[item.end] = { end: item.end, val: item.val, filed: item.filed || "" };
        }
      }
    }
    if (Object.keys(annualMap).length >= 2 || Object.keys(instantMap).length >= 2) break;
  }

  return {
    annuals: Object.values(annualMap).sort((a, b) => b.end.localeCompare(a.end)),
    quarters: Object.values(quarterMap).sort((a, b) => b.end.localeCompare(a.end)),
    instants: Object.values(instantMap).sort((a, b) => b.end.localeCompare(a.end)),
  };
}

async function fetchSecOfficialData(ticker: string) {
  const cacheKey = `sec:${ticker.toUpperCase()}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fresh = getFreshCache<any>(cacheKey);
  if (fresh) return fresh;

  try {
    const entry = await resolveSecCik(ticker);
    if (!entry) return null;

    const [subRes, factsRes] = await Promise.all([
      fetchWithTimeout(`https://data.sec.gov/submissions/CIK${entry.cik}.json`, { headers: SEC_HEADERS, next: { revalidate: 3600 } }, 6000),
      fetchWithTimeout(`https://data.sec.gov/api/xbrl/companyfacts/CIK${entry.cik}.json`, { headers: SEC_HEADERS, next: { revalidate: 3600 } }, 6500),
    ]);

    let secFiling = {
      cik: entry.cik,
      entityName: entry.title,
      edgarUrl: `https://www.sec.gov/edgar/browse/?CIK=${entry.cik}`,
      latestForm: "10-K / 10-Q",
      filingDate: "",
      reportDate: "",
      documentUrl: `https://www.sec.gov/edgar/browse/?CIK=${entry.cik}`,
    };

    if (subRes.ok) {
      const sub = await subRes.json();
      const recent = sub?.filings?.recent || {};
      const forms: string[] = recent.form || [];
      const accNums: string[] = recent.accessionNumber || [];
      const filingDates: string[] = recent.filingDate || [];
      const reportDates: string[] = recent.reportDate || [];
      const primaryDocs: string[] = recent.primaryDocument || [];
      let idx = forms.findIndex((f) => f === "10-K" || f === "10-Q");
      if (idx === -1) idx = 0;

      const accClean = (accNums[idx] || "").replace(/-/g, "");
      const cikNum = String(parseInt(entry.cik, 10));
      secFiling = {
        cik: entry.cik,
        entityName: sub?.name || entry.title,
        edgarUrl: `https://www.sec.gov/edgar/browse/?CIK=${entry.cik}`,
        latestForm: forms[idx] || "SEC Filing",
        filingDate: filingDates[idx] || "",
        reportDate: reportDates[idx] || "",
        documentUrl:
          accClean && primaryDocs[idx]
            ? `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accClean}/${primaryDocs[idx]}`
            : `https://www.sec.gov/edgar/browse/?CIK=${entry.cik}`,
      };
    }

    if (!factsRes.ok) {
      const partial = { secFiling, secSummary: null };
      setCache(cacheKey, partial, 10 * 60 * 1000);
      return partial;
    }

    const gaap = (await factsRes.json())?.facts?.["us-gaap"] || {};
    const revS = extractSecFactSeries(gaap, ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet", "RevenueFromContractWithCustomerIncludingAssessedTax"]);
    const costS = extractSecFactSeries(gaap, ["CostOfGoodsAndServicesSold", "CostOfRevenue", "CostOfGoodsSold"]);
    const gmS = extractSecFactSeries(gaap, ["GrossProfit"]);
    const rdS = extractSecFactSeries(gaap, ["ResearchAndDevelopmentExpense"]);
    const sgaS = extractSecFactSeries(gaap, ["SellingGeneralAndAdministrativeExpense"]);
    const oiS = extractSecFactSeries(gaap, ["OperatingIncomeLoss"]);
    const taxS = extractSecFactSeries(gaap, ["IncomeTaxExpenseBenefit"]);
    const niS = extractSecFactSeries(gaap, ["NetIncomeLoss", "ProfitLoss"]);

    const cashS = extractSecFactSeries(gaap, ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"]);
    const stInvS = extractSecFactSeries(gaap, ["MarketableSecuritiesCurrent", "ShortTermInvestments", "AvailableForSaleSecuritiesDebtSecuritiesCurrent"]);
    const arS = extractSecFactSeries(gaap, ["AccountsReceivableNetCurrent", "ReceivablesNetCurrent"]);
    const invS = extractSecFactSeries(gaap, ["InventoryNet"]);
    const curAssetS = extractSecFactSeries(gaap, ["AssetsCurrent"]);
    const totAssetS = extractSecFactSeries(gaap, ["Assets"]);
    const apS = extractSecFactSeries(gaap, ["AccountsPayableCurrent"]);
    const cpS = extractSecFactSeries(gaap, ["CommercialPaper", "ShortTermBorrowings"]);
    const stDebtS = extractSecFactSeries(gaap, ["LongTermDebtCurrent", "DebtCurrent"]);
    const ltDebtS = extractSecFactSeries(gaap, ["LongTermDebtNoncurrent", "LongTermDebt"]);
    const curLiabS = extractSecFactSeries(gaap, ["LiabilitiesCurrent"]);
    const totLiabS = extractSecFactSeries(gaap, ["Liabilities"]);
    const eqS = extractSecFactSeries(gaap, ["StockholdersEquity"]);

    const cfoS = extractSecFactSeries(gaap, ["NetCashProvidedByUsedInOperatingActivities"]);
    const depS = extractSecFactSeries(gaap, ["DepreciationDepletionAndAmortization", "DepreciationAndAmortization"]);
    const capexS = extractSecFactSeries(gaap, ["PaymentsToAcquirePropertyPlantAndEquipment"]);
    const cfiS = extractSecFactSeries(gaap, ["NetCashProvidedByUsedInInvestingActivities"]);
    const divS = extractSecFactSeries(gaap, ["PaymentsOfDividendsCommonStock", "PaymentsOfDividends"]);
    const bbS = extractSecFactSeries(gaap, ["PaymentsForRepurchaseOfCommonStock"]);
    const debtRepayS = extractSecFactSeries(gaap, ["RepaymentsOfLongTermDebt"]);
    const cffS = extractSecFactSeries(gaap, ["NetCashProvidedByUsedInFinancingActivities"]);

    const raw = (v?: number) => (typeof v === "number" && isFinite(v) ? { raw: v } : undefined);
    const rev0 = revS.annuals[0]?.val || 0, rev1 = revS.annuals[1]?.val || 0;
    const cost0 = costS.annuals[0]?.val || 0, cost1 = costS.annuals[1]?.val || 0;
    const gm0 = gmS.annuals[0]?.val || (rev0 && cost0 ? rev0 - cost0 : 0);
    const gm1 = gmS.annuals[1]?.val || (rev1 && cost1 ? rev1 - cost1 : 0);
    const qRev0 = revS.quarters[0]?.val || 0, qRev1 = revS.quarters[1]?.val || 0;
    const qCost0 = costS.quarters[0]?.val || 0, qCost1 = costS.quarters[1]?.val || 0;
    const qGm0 = gmS.quarters[0]?.val || (qRev0 && qCost0 ? qRev0 - qCost0 : 0);
    const qGm1 = gmS.quarters[1]?.val || (qRev1 && qCost1 ? qRev1 - qCost1 : 0);

    const buildIs = (idx: number, rv: number, cs: number, gp: number, endStr: string) => ({
      endDate: { fmt: endStr },
      totalRevenue: raw(rv),
      costOfRevenue: raw(cs),
      grossProfit: raw(gp),
      researchDevelopment: raw(idx < 2 ? rdS.annuals[idx]?.val : rdS.quarters[idx - 2]?.val),
      sellingGeneralAdministrative: raw(idx < 2 ? sgaS.annuals[idx]?.val : sgaS.quarters[idx - 2]?.val),
      totalOperatingExpenses: raw(
        ((idx < 2 ? rdS.annuals[idx]?.val : rdS.quarters[idx - 2]?.val) || 0) +
          ((idx < 2 ? sgaS.annuals[idx]?.val : sgaS.quarters[idx - 2]?.val) || 0)
      ),
      operatingIncome: raw(idx < 2 ? oiS.annuals[idx]?.val : oiS.quarters[idx - 2]?.val),
      incomeBeforeTax: raw(
        ((idx < 2 ? niS.annuals[idx]?.val : niS.quarters[idx - 2]?.val) || 0) +
          ((idx < 2 ? taxS.annuals[idx]?.val : taxS.quarters[idx - 2]?.val) || 0)
      ),
      incomeTaxExpense: raw(idx < 2 ? taxS.annuals[idx]?.val : taxS.quarters[idx - 2]?.val),
      netIncome: raw(idx < 2 ? niS.annuals[idx]?.val : niS.quarters[idx - 2]?.val),
    });

    const buildBs = (idx: number) => ({
      endDate: { fmt: totAssetS.instants[idx]?.end || cashS.instants[idx]?.end || "" },
      cash: raw(cashS.instants[idx]?.val),
      shortTermInvestments: raw(stInvS.instants[idx]?.val),
      netReceivables: raw(arS.instants[idx]?.val),
      inventory: raw(invS.instants[idx]?.val),
      totalCurrentAssets: raw(curAssetS.instants[idx]?.val),
      totalAssets: raw(totAssetS.instants[idx]?.val),
      accountsPayable: raw(apS.instants[idx]?.val),
      shortLongTermDebt: raw((cpS.instants[idx]?.val || 0) + (stDebtS.instants[idx]?.val || 0)),
      longTermDebt: raw(ltDebtS.instants[idx]?.val),
      totalCurrentLiabilities: raw(curLiabS.instants[idx]?.val),
      totalLiab: raw(totLiabS.instants[idx]?.val),
      totalStockholderEquity: raw(eqS.instants[idx]?.val),
    });

    const buildCf = (idx: number) => ({
      endDate: { fmt: revS.annuals[idx]?.end || niS.annuals[idx]?.end || "" },
      totalCashFromOperatingActivities: raw(cfoS.annuals[idx]?.val),
      depreciation: raw(depS.annuals[idx]?.val),
      capitalExpenditures: raw(capexS.annuals[idx]?.val ? -Math.abs(capexS.annuals[idx].val) : 0),
      totalCashflowsFromInvestingActivities: raw(cfiS.annuals[idx]?.val),
      dividendsPaid: raw(divS.annuals[idx]?.val ? -Math.abs(divS.annuals[idx].val) : 0),
      repurchaseOfStock: raw(bbS.annuals[idx]?.val ? -Math.abs(bbS.annuals[idx].val) : 0),
      netBorrowings: raw(debtRepayS.annuals[idx]?.val ? -Math.abs(debtRepayS.annuals[idx].val) : 0),
      totalCashFromFinancingActivities: raw(cffS.annuals[idx]?.val),
    });

    const secSummary = {
      assetProfile: { country: "United States (SEC Registered)" },
      financialData: {
        totalRevenue: raw(rev0),
        totalCash: raw((cashS.instants[0]?.val || 0) + (stInvS.instants[0]?.val || 0)),
        totalDebt: raw((cpS.instants[0]?.val || 0) + (stDebtS.instants[0]?.val || 0) + (ltDebtS.instants[0]?.val || 0)),
        operatingCashflow: raw(cfoS.annuals[0]?.val),
        netIncomeToCommon: raw(niS.annuals[0]?.val),
      },
      incomeStatementHistory: {
        incomeStatementHistory: [
          buildIs(0, rev0, cost0, gm0, revS.annuals[0]?.end || niS.annuals[0]?.end || ""),
          buildIs(1, rev1, cost1, gm1, revS.annuals[1]?.end || niS.annuals[1]?.end || ""),
        ],
      },
      incomeStatementHistoryQuarterly: {
        incomeStatementHistory: [
          buildIs(2, qRev0, qCost0, qGm0, revS.quarters[0]?.end || niS.quarters[0]?.end || ""),
          buildIs(3, qRev1, qCost1, qGm1, revS.quarters[1]?.end || niS.quarters[1]?.end || ""),
        ],
      },
      balanceSheetHistory: { balanceSheetStatements: [buildBs(0), buildBs(1)] },
      cashflowStatementHistory: { cashflowStatements: [buildCf(0), buildCf(1)] },
    };

    const payload = { secFiling, secSummary: rev0 > 0 || niS.annuals.length > 0 ? secSummary : null };
    setCache(cacheKey, payload, 15 * 60 * 1000);
    return payload;
  } catch {
    return getStaleCache(cacheKey);
  }
}

async function fetchYahooFinancialsFallback(symbol: string) {
  const cacheKey = `yfin:${symbol.toUpperCase()}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fresh = getFreshCache<any>(cacheKey);
  if (fresh) return fresh;

  try {
    const cookieRes = await fetchWithTimeout("https://fc.yahoo.com", { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }, 4000);
    const cookie = (cookieRes.headers.get("set-cookie") || "").split(";")[0];
    const crumbRes = await fetchWithTimeout("https://query1.finance.yahoo.com/v1/test/getcrumb", { headers: { "User-Agent": "Mozilla/5.0", Cookie: cookie }, cache: "no-store" }, 4000);
    const crumb = await crumbRes.text();

    const modules = [
      "assetProfile", "summaryDetail", "financialData", "defaultKeyStatistics",
      "incomeStatementHistory", "incomeStatementHistoryQuarterly", "balanceSheetHistory", "cashflowStatementHistory",
    ].join(",");

    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0", Cookie: cookie }, next: { revalidate: 3600 } }, 5500);
    if (!res.ok) return getStaleCache(cacheKey);
    const result = (await res.json())?.quoteSummary?.result?.[0] || null;
    if (result) setCache(cacheKey, result, 10 * 60 * 1000);
    return result;
  } catch {
    return getStaleCache(cacheKey);
  }
}

async function fetchTickerChartData(tk: string, range = "1mo", interval = "1d", includeSparkline = false, includeCloses = false) {
  const cacheKey = `chart:${tk}:${range}:${interval}:${includeSparkline ? 1 : 0}:${includeCloses ? 1 : 0}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fresh = getFreshCache<any>(cacheKey);
  if (fresh) return fresh;

  try {
    const effectiveRange = includeSparkline ? range : "5d";
    const dailyRes = await fetchWithTimeout(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(tk)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(effectiveRange)}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" },
      5000
    );
    if (!dailyRes.ok) return getStaleCache(cacheKey);
    const d0 = (await dailyRes.json())?.chart?.result?.[0];
    if (!d0) return getStaleCache(cacheKey);

    const meta = d0.meta;
    const dQuote = d0.indicators?.quote?.[0] || {};
    const dCloses: number[] = (dQuote.close || []).filter((v: number | null): v is number => typeof v === "number" && isFinite(v));
    const dVolumes: number[] = (dQuote.volume || []).filter((v: number | null): v is number => typeof v === "number" && isFinite(v));

    const price = meta.regularMarketPrice ?? dCloses[dCloses.length - 1] ?? 0;
    let prevClose = meta.regularMarketPreviousClose;
    if (!prevClose || Math.abs(prevClose - price) < 0.0001) {
      if (dCloses.length >= 2 && Math.abs(dCloses[dCloses.length - 1] - price) < 0.05) prevClose = dCloses[dCloses.length - 2];
      else if (dCloses.length >= 1 && Math.abs(dCloses[dCloses.length - 1] - price) >= 0.05) prevClose = dCloses[dCloses.length - 1];
      else prevClose = meta.chartPreviousClose ?? price;
    }

    const last5 = dCloses.slice(-5);
    const first5dClose = last5.length >= 2 ? last5[0] : meta.chartPreviousClose ?? prevClose;
    const changePct = prevClose ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0;
    const change5dPct = first5dClose ? Math.round(((price - first5dClose) / first5dClose) * 10000) / 100 : 0;
    const dollarVolume = Math.round(price * (meta.regularMarketVolume ?? dVolumes[dVolumes.length - 1] ?? 0));
    const ts = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

    let sparkline: { time: string; open: number; high: number; low: number; close: number }[] = [];
    let closesOut: number[] | undefined = undefined;

    if (includeSparkline) {
      const dTs: number[] = d0.timestamp || [];
      const rawOpens: (number | null)[] = dQuote.open || [];
      const rawHighs: (number | null)[] = dQuote.high || [];
      const rawLows: (number | null)[] = dQuote.low || [];
      const rawCloses: (number | null)[] = dQuote.close || [];
      for (let i = 0; i < dTs.length; i++) {
        const cVal = rawCloses[i];
        if (typeof cVal === "number" && isFinite(cVal)) {
          const dt = new Date(dTs[i] * 1000);
          const oVal = typeof rawOpens[i] === "number" && isFinite(rawOpens[i]!) ? rawOpens[i]! : cVal;
          const hVal = typeof rawHighs[i] === "number" && isFinite(rawHighs[i]!) ? rawHighs[i]! : Math.max(oVal, cVal);
          const lVal = typeof rawLows[i] === "number" && isFinite(rawLows[i]!) ? rawLows[i]! : Math.min(oVal, cVal);
          sparkline.push({
            time: dt.toISOString().split("T")[0],
            open: Math.round(oVal * 100) / 100,
            high: Math.round(hVal * 100) / 100,
            low: Math.round(lVal * 100) / 100,
            close: Math.round(cVal * 100) / 100,
          });
        }
      }

      if (sparkline.length < 2 && tk === "^SET.BK") {
        const thProxy = await fetchTickerChartData("TDEX.BK", "1mo", "1d", true, false);
        if (thProxy && thProxy.sparkline.length >= 2) {
          const lastProxyClose = thProxy.sparkline[thProxy.sparkline.length - 1].close;
          const scale = lastProxyClose > 0 && price > 0 ? price / lastProxyClose : 1;
          sparkline = thProxy.sparkline.map((pt: { time: string; open: number; high: number; low: number; close: number }) => ({
            time: pt.time,
            open: Math.round(pt.open * scale * 100) / 100,
            high: Math.round(pt.high * scale * 100) / 100,
            low: Math.round(pt.low * scale * 100) / 100,
            close: Math.round(pt.close * scale * 100) / 100,
          }));
        }
      }
    }

    if (includeCloses) {
      const sRes = await fetchWithTimeout(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(tk)}?interval=1d&range=3mo`, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }, 5000);
      if (sRes.ok) {
        const s0 = (await sRes.json())?.chart?.result?.[0];
        if (s0) {
          const sCloses: (number | null)[] = s0.indicators?.quote?.[0]?.close || [];
          closesOut = sCloses.filter((v): v is number => typeof v === "number" && isFinite(v)).slice(-45).map((v) => Math.round(v * 100) / 100);
        }
      }
    }

    const out = {
      price, prevClose, changePct, change5dPct, dollarVolume, date: ts,
      currency: meta.currency || "USD",
      exchangeName: meta.fullExchangeName || meta.exchangeName || "Market Exchange",
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      sparkline,
      closes: closesOut,
    };
    setCache(cacheKey, out, 60 * 1000);
    return out;
  } catch {
    return getStaleCache(cacheKey);
  }
}

async function fetchYahooNewsByQuery(q: string, count = 3) {
  const cacheKey = `news:${q}:${count}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fresh = getFreshCache<any[]>(cacheKey);
  if (fresh) return fresh;

  try {
    const r = await fetchWithTimeout(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&newsCount=${count + 3}&quotesCount=0`, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }, 4500);
    if (!r.ok) return getStaleCache<unknown[]>(cacheKey) || [];
    const newsList = (await r.json())?.news || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = newsList.slice(0, count).map((n: any) => ({
      title: n.title || "",
      publisher: n.publisher || "Yahoo Finance",
      link: n.link || "https://finance.yahoo.com",
      providerPublishTime: n.providerPublishTime || 0,
    }));
    setCache(cacheKey, out, 3 * 60 * 1000);
    return out;
  } catch {
    return getStaleCache<unknown[]>(cacheKey) || [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const watchParam = searchParams.get("watch");
  const newsQuery = searchParams.get("newsQuery");
  const rangeParam = searchParams.get("range") || "3mo";

  const validRanges: Record<string, string> = { "1d": "15m", "1mo": "1d", "3mo": "1d", "6mo": "1d", "1y": "1wk", "5y": "1mo" };
  const range = validRanges[rangeParam] ? rangeParam : "3mo";
  const interval = validRanges[range] || "1d";

  try {
    if (newsQuery) {
      const news = await fetchYahooNewsByQuery(newsQuery, 3);
      return NextResponse.json({ news, retrievedAt: new Date().toISOString() }, { headers: NO_CACHE_HEADERS });
    }

    if (watchParam) {
      const watchTickers = watchParam.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean).slice(0, 15);
      const watchResults: Record<string, unknown> = {};
      await Promise.all(
        watchTickers.map(async (tk) => {
          const info = await fetchTickerChartData(tk, "1mo", "1d", true, false);
          if (info) watchResults[tk] = info;
        })
      );
      return NextResponse.json({ watchlist: watchResults, retrievedAt: new Date().toISOString() }, { headers: NO_CACHE_HEADERS });
    }

    if (symbol) {
      const symCacheKey = `sym-full:${symbol}:${range}`;
      const [chartRes, secData, yahooFallback, stockNews] = await Promise.all([
        fetchWithTimeout(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`,
          { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" },
          5500
        ).catch(() => null),
        fetchSecOfficialData(symbol),
        fetchYahooFinancialsFallback(symbol),
        fetchYahooNewsByQuery(`${symbol} stock earnings`, 3),
      ]);

      if (!chartRes || !chartRes.ok) {
        const staleSym = getStaleCache(symCacheKey);
        if (staleSym) return NextResponse.json(staleSym, { headers: NO_CACHE_HEADERS });
        return NextResponse.json({ error: "ไม่พบข้อมูลหุ้นนี้ในระบบตลาด" }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      const result = (await chartRes.json())?.chart?.result?.[0];
      if (!result) return NextResponse.json({ error: "ไม่พบข้อมูลราคาหุ้น" }, { status: 404, headers: NO_CACHE_HEADERS });

      const meta = result.meta;
      const price = meta.regularMarketPrice;
      const prevClose = meta.regularMarketPreviousClose ?? meta.chartPreviousClose ?? meta.previousClose;
      const changePct = prevClose ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0;

      const timestamps: number[] = result.timestamp || [];
      const qObj = result.indicators?.quote?.[0] || {};
      const opens: (number | null)[] = qObj.open || [];
      const highs: (number | null)[] = qObj.high || [];
      const lows: (number | null)[] = qObj.low || [];
      const closes: (number | null)[] = qObj.close || [];
      const history: { date: string; open: number; high: number; low: number; close: number }[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        const cVal = closes[i];
        if (typeof cVal === "number" && isFinite(cVal)) {
          const dt = new Date(timestamps[i] * 1000);
          const dStr = range === "1d" ? dt.toLocaleTimeString("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" }) : dt.toISOString().split("T")[0];
          const oVal = typeof opens[i] === "number" && isFinite(opens[i]!) ? opens[i]! : cVal;
          const hVal = typeof highs[i] === "number" && isFinite(highs[i]!) ? highs[i]! : Math.max(oVal, cVal);
          const lVal = typeof lows[i] === "number" && isFinite(lows[i]!) ? lows[i]! : Math.min(oVal, cVal);
          history.push({
            date: dStr,
            open: Math.round(oVal * 100) / 100,
            high: Math.round(hVal * 100) / 100,
            low: Math.round(lVal * 100) / 100,
            close: Math.round(cVal * 100) / 100,
          });
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mergedSummary: any = secData?.secSummary || yahooFallback || null;
      if (mergedSummary) {
        mergedSummary.summaryDetail = {
          ...(yahooFallback?.summaryDetail || {}),
          fiftyTwoWeekLow: yahooFallback?.summaryDetail?.fiftyTwoWeekLow || (meta.fiftyTwoWeekLow ? { raw: meta.fiftyTwoWeekLow } : undefined),
          fiftyTwoWeekHigh: yahooFallback?.summaryDetail?.fiftyTwoWeekHigh || (meta.fiftyTwoWeekHigh ? { raw: meta.fiftyTwoWeekHigh } : undefined),
        };
      }

      const responsePayload = {
        symbol: meta.symbol,
        name: meta.longName || meta.shortName || secData?.secFiling?.entityName || meta.symbol,
        exchange: meta.fullExchangeName || meta.exchangeName || "US Market",
        currency: meta.currency || "USD",
        price,
        prevClose,
        changePct,
        updatedAt: new Date().toISOString(),
        history,
        summary: mergedSummary,
        secFiling: secData?.secFiling || null,
        stockNews,
      };
      setCache(symCacheKey, responsePayload, 90 * 1000);
      return NextResponse.json(responsePayload, { headers: NO_CACHE_HEADERS });
    }

    const overviewCacheKey = "market:overview:all";
    const freshOverview = getFreshCache(overviewCacheKey);
    if (freshOverview) return NextResponse.json(freshOverview, { headers: NO_CACHE_HEADERS });

    const usCoreTickers = ["^DJI", "^GSPC", "^IXIC", "^RUT", "^VIX"];
    const globalTickers = ["000001.SS", "^HSI", "^KS11", "^N225", "^SET.BK", "^STOXX50E"];
    const sectorTickers = ["XLK", "XLF", "XLI", "XLC", "XLV", "XLU", "XLP", "XLRE", "XLB", "XLY", "XLE"];
    const macroAndSafeHavenTickers = ["TLT", "SHV", "GLD", "DX-Y.NYB", "^TNX", "^IRX", "CL=F"];
    const results: Record<string, unknown> = {};

    const [, , , , , news, fred10y, fred3m, fredSpread, fredWti] = await Promise.all([
      Promise.all(usCoreTickers.map(async (tk) => { const info = await fetchTickerChartData(tk, "1mo", "1d", true, false); if (info) results[tk] = info; })),
      fetchTickerChartData("^GSPC", "3mo", "1d", false, true).then((info) => { if (info) results["^GSPC_3M"] = info; }),
      Promise.all(globalTickers.map(async (tk) => { const info = await fetchTickerChartData(tk, "1mo", "1d", true, false); if (info) results[tk] = info; })),
      Promise.all(sectorTickers.map(async (tk) => { const info = await fetchTickerChartData(tk, "3mo", "1d", false, true); if (info) results[tk] = info; })),
      Promise.all(macroAndSafeHavenTickers.map(async (tk) => { const info = await fetchTickerChartData(tk, "5d", "1d", false, false); if (info) results[tk] = info; })),
      fetchYahooNewsByQuery("stock market federal reserve wall street", 3),
      fetchFredSeries("DGS10"),
      fetchFredSeries("DGS3MO"),
      fetchFredSeries("T10Y3M"),
      fetchFredSeries("DCOILWTICO"),
    ]);

    const overviewPayload = {
      market: results,
      fred: { DGS10: fred10y, DGS3MO: fred3m, T10Y3M: fredSpread, DCOILWTICO: fredWti },
      news,
      retrievedAt: new Date().toISOString(),
    };
    setCache(overviewCacheKey, overviewPayload, 60 * 1000);
    return NextResponse.json(overviewPayload, { headers: NO_CACHE_HEADERS });
  } catch {
    const staleOverview = getStaleCache("market:overview:all");
    if (staleOverview) return NextResponse.json(staleOverview, { headers: NO_CACHE_HEADERS });
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูลตลาด" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}