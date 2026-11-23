import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SEC_HEADERS = {
  "User-Agent": "FlowSystemDashboard/11.0 (contact@flowsystem.app)",
  Accept: "application/json",
};

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

interface FredObservation {
  date: string;
  value: number;
  prevValue: number;
  change: number;
  sourceUrl: string;
}

async function fetchFredSeries(seriesId: string): Promise<FredObservation | null> {
  try {
    const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "FlowSystemDashboard/11.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split("\n").slice(1);
    const valid: { date: string; val: number }[] = [];
    for (let i = Math.max(0, lines.length - 15); i < lines.length; i++) {
      const [dt, raw] = lines[i].split(",");
      const num = parseFloat(raw);
      if (dt && isFinite(num)) valid.push({ date: dt.trim(), val: num });
    }
    if (valid.length === 0) return null;
    const last = valid[valid.length - 1];
    const prev = valid.length >= 2 ? valid[valid.length - 2] : last;
    return {
      date: last.date,
      value: Math.round(last.val * 100) / 100,
      prevValue: Math.round(prev.val * 100) / 100,
      change: Math.round((last.val - prev.val) * 100) / 100,
      sourceUrl: `https://fred.stlouisfed.org/series/${seriesId}`,
    };
  } catch {
    return null;
  }
}

let cachedSecTickers: Record<string, { cik: string; title: string }> | null = null;

async function resolveSecCik(ticker: string) {
  if (!cachedSecTickers) {
    const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: SEC_HEADERS,
      next: { revalidate: 86400 },
    });
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
      const form = item.form || "";
      if (!["10-K", "10-Q", "20-F", "40-F"].includes(form)) continue;

      if (!item.start) {
        const existing = instantMap[item.end];
        if (!existing || (item.filed || "") >= existing.filed) {
          instantMap[item.end] = { end: item.end, val: item.val, filed: item.filed || "" };
        }
      } else {
        const days = (new Date(item.end).getTime() - new Date(item.start).getTime()) / 86400000;
        if (days >= 330 && days <= 380) {
          const yrKey = item.end.slice(0, 4);
          const existing = annualMap[yrKey];
          if (!existing || (item.filed || "") >= existing.filed) {
            annualMap[yrKey] = { end: item.end, val: item.val, filed: item.filed || "" };
          }
        } else if (days >= 75 && days <= 105) {
          const existing = quarterMap[item.end];
          if (!existing || (item.filed || "") >= existing.filed) {
            quarterMap[item.end] = { end: item.end, val: item.val, filed: item.filed || "" };
          }
        }
      }
    }
    if (Object.keys(annualMap).length >= 2 || Object.keys(instantMap).length >= 2) break;
  }

  const annuals = Object.values(annualMap).sort((a, b) => b.end.localeCompare(a.end));
  const quarters = Object.values(quarterMap).sort((a, b) => b.end.localeCompare(a.end));
  const instants = Object.values(instantMap).sort((a, b) => b.end.localeCompare(a.end));
  return { annuals, quarters, instants };
}

async function fetchSecOfficialData(ticker: string) {
  try {
    const entry = await resolveSecCik(ticker);
    if (!entry) return null;

    const [subRes, factsRes] = await Promise.all([
      fetch(`https://data.sec.gov/submissions/CIK${entry.cik}.json`, {
        headers: SEC_HEADERS,
        next: { revalidate: 3600 },
      }),
      fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${entry.cik}.json`, {
        headers: SEC_HEADERS,
        next: { revalidate: 3600 },
      }),
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
      const docUrl =
        accClean && primaryDocs[idx]
          ? `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accClean}/${primaryDocs[idx]}`
          : `https://www.sec.gov/edgar/browse/?CIK=${entry.cik}`;

      secFiling = {
        cik: entry.cik,
        entityName: sub?.name || entry.title,
        edgarUrl: `https://www.sec.gov/edgar/browse/?CIK=${entry.cik}`,
        latestForm: forms[idx] || "SEC Filing",
        filingDate: filingDates[idx] || "",
        reportDate: reportDates[idx] || "",
        documentUrl: docUrl,
      };
    }

    if (!factsRes.ok) return { secFiling, secSummary: null };

    const factsJson = await factsRes.json();
    const gaap = factsJson?.facts?.["us-gaap"] || {};

    const revS = extractSecFactSeries(gaap, [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
      "SalesRevenueNet",
      "RevenueFromContractWithCustomerIncludingAssessedTax",
    ]);
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

    const y0End = revS.annuals[0]?.end || niS.annuals[0]?.end || "";
    const y1End = revS.annuals[1]?.end || niS.annuals[1]?.end || "";
    const q0End = revS.quarters[0]?.end || niS.quarters[0]?.end || "";
    const q1End = revS.quarters[1]?.end || niS.quarters[1]?.end || "";
    const b0End = totAssetS.instants[0]?.end || cashS.instants[0]?.end || "";
    const b1End = totAssetS.instants[1]?.end || cashS.instants[1]?.end || "";

    const raw = (v?: number) => (typeof v === "number" && isFinite(v) ? { raw: v } : undefined);

    const rev0 = revS.annuals[0]?.val || 0;
    const rev1 = revS.annuals[1]?.val || 0;
    const cost0 = costS.annuals[0]?.val || 0;
    const cost1 = costS.annuals[1]?.val || 0;
    const gm0 = gmS.annuals[0]?.val || (rev0 && cost0 ? rev0 - cost0 : 0);
    const gm1 = gmS.annuals[1]?.val || (rev1 && cost1 ? rev1 - cost1 : 0);

    const qRev0 = revS.quarters[0]?.val || 0;
    const qRev1 = revS.quarters[1]?.val || 0;
    const qCost0 = costS.quarters[0]?.val || 0;
    const qCost1 = costS.quarters[1]?.val || 0;
    const qGm0 = gmS.quarters[0]?.val || (qRev0 && qCost0 ? qRev0 - qCost0 : 0);
    const qGm1 = gmS.quarters[1]?.val || (qRev1 && qCost1 ? qRev1 - qCost1 : 0);

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
          {
            endDate: { fmt: y0End },
            totalRevenue: raw(rev0),
            costOfRevenue: raw(cost0),
            grossProfit: raw(gm0),
            researchDevelopment: raw(rdS.annuals[0]?.val),
            sellingGeneralAdministrative: raw(sgaS.annuals[0]?.val),
            totalOperatingExpenses: raw((rdS.annuals[0]?.val || 0) + (sgaS.annuals[0]?.val || 0)),
            operatingIncome: raw(oiS.annuals[0]?.val),
            incomeBeforeTax: raw((niS.annuals[0]?.val || 0) + (taxS.annuals[0]?.val || 0)),
            incomeTaxExpense: raw(taxS.annuals[0]?.val),
            netIncome: raw(niS.annuals[0]?.val),
          },
          {
            endDate: { fmt: y1End },
            totalRevenue: raw(rev1),
            costOfRevenue: raw(cost1),
            grossProfit: raw(gm1),
            researchDevelopment: raw(rdS.annuals[1]?.val),
            sellingGeneralAdministrative: raw(sgaS.annuals[1]?.val),
            totalOperatingExpenses: raw((rdS.annuals[1]?.val || 0) + (sgaS.annuals[1]?.val || 0)),
            operatingIncome: raw(oiS.annuals[1]?.val),
            incomeBeforeTax: raw((niS.annuals[1]?.val || 0) + (taxS.annuals[1]?.val || 0)),
            incomeTaxExpense: raw(taxS.annuals[1]?.val),
            netIncome: raw(niS.annuals[1]?.val),
          },
        ],
      },
      incomeStatementHistoryQuarterly: {
        incomeStatementHistory: [
          {
            endDate: { fmt: q0End },
            totalRevenue: raw(qRev0),
            costOfRevenue: raw(qCost0),
            grossProfit: raw(qGm0),
            researchDevelopment: raw(rdS.quarters[0]?.val),
            sellingGeneralAdministrative: raw(sgaS.quarters[0]?.val),
            totalOperatingExpenses: raw((rdS.quarters[0]?.val || 0) + (sgaS.quarters[0]?.val || 0)),
            operatingIncome: raw(oiS.quarters[0]?.val),
            incomeBeforeTax: raw((niS.quarters[0]?.val || 0) + (taxS.quarters[0]?.val || 0)),
            incomeTaxExpense: raw(taxS.quarters[0]?.val),
            netIncome: raw(niS.quarters[0]?.val),
          },
          {
            endDate: { fmt: q1End },
            totalRevenue: raw(qRev1),
            costOfRevenue: raw(qCost1),
            grossProfit: raw(qGm1),
            researchDevelopment: raw(rdS.quarters[1]?.val),
            sellingGeneralAdministrative: raw(sgaS.quarters[1]?.val),
            totalOperatingExpenses: raw((rdS.quarters[1]?.val || 0) + (sgaS.quarters[1]?.val || 0)),
            operatingIncome: raw(oiS.quarters[1]?.val),
            incomeBeforeTax: raw((niS.quarters[1]?.val || 0) + (taxS.quarters[1]?.val || 0)),
            incomeTaxExpense: raw(taxS.quarters[1]?.val),
            netIncome: raw(niS.quarters[1]?.val),
          },
        ],
      },
      balanceSheetHistory: {
        balanceSheetStatements: [
          {
            endDate: { fmt: b0End },
            cash: raw(cashS.instants[0]?.val),
            shortTermInvestments: raw(stInvS.instants[0]?.val),
            netReceivables: raw(arS.instants[0]?.val),
            inventory: raw(invS.instants[0]?.val),
            totalCurrentAssets: raw(curAssetS.instants[0]?.val),
            totalAssets: raw(totAssetS.instants[0]?.val),
            accountsPayable: raw(apS.instants[0]?.val),
            shortLongTermDebt: raw((cpS.instants[0]?.val || 0) + (stDebtS.instants[0]?.val || 0)),
            longTermDebt: raw(ltDebtS.instants[0]?.val),
            totalCurrentLiabilities: raw(curLiabS.instants[0]?.val),
            totalLiab: raw(totLiabS.instants[0]?.val),
            totalStockholderEquity: raw(eqS.instants[0]?.val),
          },
          {
            endDate: { fmt: b1End },
            cash: raw(cashS.instants[1]?.val),
            shortTermInvestments: raw(stInvS.instants[1]?.val),
            netReceivables: raw(arS.instants[1]?.val),
            inventory: raw(invS.instants[1]?.val),
            totalCurrentAssets: raw(curAssetS.instants[1]?.val),
            totalAssets: raw(totAssetS.instants[1]?.val),
            accountsPayable: raw(apS.instants[1]?.val),
            shortLongTermDebt: raw((cpS.instants[1]?.val || 0) + (stDebtS.instants[1]?.val || 0)),
            longTermDebt: raw(ltDebtS.instants[1]?.val),
            totalCurrentLiabilities: raw(curLiabS.instants[1]?.val),
            totalLiab: raw(totLiabS.instants[1]?.val),
            totalStockholderEquity: raw(eqS.instants[1]?.val),
          },
        ],
      },
      cashflowStatementHistory: {
        cashflowStatements: [
          {
            endDate: { fmt: y0End },
            totalCashFromOperatingActivities: raw(cfoS.annuals[0]?.val),
            depreciation: raw(depS.annuals[0]?.val),
            capitalExpenditures: raw(capexS.annuals[0]?.val ? -Math.abs(capexS.annuals[0].val) : 0),
            totalCashflowsFromInvestingActivities: raw(cfiS.annuals[0]?.val),
            dividendsPaid: raw(divS.annuals[0]?.val ? -Math.abs(divS.annuals[0].val) : 0),
            repurchaseOfStock: raw(bbS.annuals[0]?.val ? -Math.abs(bbS.annuals[0].val) : 0),
            netBorrowings: raw(debtRepayS.annuals[0]?.val ? -Math.abs(debtRepayS.annuals[0].val) : 0),
            totalCashFromFinancingActivities: raw(cffS.annuals[0]?.val),
          },
          {
            endDate: { fmt: y1End },
            totalCashFromOperatingActivities: raw(cfoS.annuals[1]?.val),
            depreciation: raw(depS.annuals[1]?.val),
            capitalExpenditures: raw(capexS.annuals[1]?.val ? -Math.abs(capexS.annuals[1].val) : 0),
            totalCashflowsFromInvestingActivities: raw(cfiS.annuals[1]?.val),
            dividendsPaid: raw(divS.annuals[1]?.val ? -Math.abs(divS.annuals[1].val) : 0),
            repurchaseOfStock: raw(bbS.annuals[1]?.val ? -Math.abs(bbS.annuals[1].val) : 0),
            netBorrowings: raw(debtRepayS.annuals[1]?.val ? -Math.abs(debtRepayS.annuals[1].val) : 0),
            totalCashFromFinancingActivities: raw(cffS.annuals[1]?.val),
          },
        ],
      },
    };

    return { secFiling, secSummary: rev0 > 0 || niS.annuals.length > 0 ? secSummary : null };
  } catch {
    return null;
  }
}

async function fetchYahooFinancialsFallback(symbol: string) {
  try {
    const cookieRes = await fetch("https://fc.yahoo.com", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      cache: "no-store",
    });
    const setCookie = cookieRes.headers.get("set-cookie") || "";
    const cookie = setCookie.split(";")[0];

    const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": "Mozilla/5.0", Cookie: cookie },
      cache: "no-store",
    });
    const crumb = await crumbRes.text();

    const modules = [
      "assetProfile",
      "summaryDetail",
      "financialData",
      "defaultKeyStatistics",
      "incomeStatementHistory",
      "incomeStatementHistoryQuarterly",
      "balanceSheetHistory",
      "cashflowStatementHistory",
    ].join(",");

    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Cookie: cookie },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.quoteSummary?.result?.[0] || null;
  } catch {
    return null;
  }
}

async function fetchTickerChartData(
  tk: string,
  range = "1mo",
  interval = "1d",
  includeSparkline = false,
  includeCloses = false
) {
  try {
    const dailyRes = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(tk)}?interval=1d&range=${includeSparkline ? "1mo" : "5d"}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
    );
    if (!dailyRes.ok) return null;
    const dailyJson = await dailyRes.json();
    const d0 = dailyJson?.chart?.result?.[0];
    if (!d0) return null;

    const meta = d0.meta;
    const dQuote = d0.indicators?.quote?.[0] || {};
    const dCloses: number[] = (dQuote.close || []).filter((v: number | null): v is number => typeof v === "number" && isFinite(v));
    const dVolumes: number[] = (dQuote.volume || []).filter((v: number | null): v is number => typeof v === "number" && isFinite(v));

    const price = meta.regularMarketPrice ?? dCloses[dCloses.length - 1] ?? 0;

    let prevClose = meta.regularMarketPreviousClose;
    if (!prevClose || Math.abs(prevClose - price) < 0.0001) {
      if (dCloses.length >= 2 && Math.abs(dCloses[dCloses.length - 1] - price) < 0.05) {
        prevClose = dCloses[dCloses.length - 2];
      } else if (dCloses.length >= 1 && Math.abs(dCloses[dCloses.length - 1] - price) >= 0.05) {
        prevClose = dCloses[dCloses.length - 1];
      } else {
        prevClose = meta.chartPreviousClose ?? price;
      }
    }

    const last5 = dCloses.slice(-5);
    const first5dClose = last5.length >= 2 ? last5[0] : meta.chartPreviousClose ?? prevClose;
    const changePct = prevClose ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0;
    const change5dPct = first5dClose ? Math.round(((price - first5dClose) / first5dClose) * 10000) / 100 : 0;

    const lastVol = meta.regularMarketVolume ?? dVolumes[dVolumes.length - 1] ?? 0;
    const dollarVolume = Math.round(price * lastVol);

    const ts = meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

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

      // Fallback สำหรับดัชนีตลาดหุ้นไทย (^SET.BK) ที่ Yahoo จำกัดแท่งย้อนหลัง ใช้กองทุนอ้างอิงดัชนีตลาดหุ้นไทย (TDEX.BK) ปรับสเกลเทียบระดับ SET Index
      if (sparkline.length < 2 && tk === "^SET.BK") {
        const thProxy = await fetchTickerChartData("TDEX.BK", "1mo", "1d", true, false);
        if (thProxy && thProxy.sparkline.length >= 2) {
          const lastProxyClose = thProxy.sparkline[thProxy.sparkline.length - 1].close;
          const scale = lastProxyClose > 0 && price > 0 ? price / lastProxyClose : 1;
          sparkline = thProxy.sparkline.map((pt) => ({
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
      const sRes = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(tk)}?interval=1d&range=3mo`,
        { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
      );
      if (sRes.ok) {
        const sJson = await sRes.json();
        const s0 = sJson?.chart?.result?.[0];
        if (s0) {
          const sCloses: (number | null)[] = s0.indicators?.quote?.[0]?.close || [];
          const valid3m = sCloses.filter((v): v is number => typeof v === "number" && isFinite(v));
          closesOut = valid3m.slice(-45).map((v) => Math.round(v * 100) / 100);
        }
      }
    }

    return {
      price,
      prevClose,
      changePct,
      change5dPct,
      dollarVolume,
      date: ts,
      currency: meta.currency || "USD",
      exchangeName: meta.fullExchangeName || meta.exchangeName || "Market Exchange",
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      sparkline,
      closes: closesOut,
    };
  } catch {
    return null;
  }
}

async function fetchYahooNewsByQuery(q: string, count = 3) {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&newsCount=${count + 3}&quotesCount=0`,
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
    );
    if (!r.ok) return [];
    const j = await r.json();
    const newsList = j?.news || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return newsList.slice(0, count).map((n: any) => ({
      title: n.title || "",
      publisher: n.publisher || "Yahoo Finance",
      link: n.link || "https://finance.yahoo.com",
      providerPublishTime: n.providerPublishTime || 0,
    }));
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const watchParam = searchParams.get("watch");
  const newsQuery = searchParams.get("newsQuery");
  const rangeParam = searchParams.get("range") || "3mo";

  const validRanges: Record<string, string> = {
    "1d": "15m",
    "1mo": "1d",
    "3mo": "1d",
    "6mo": "1d",
    "1y": "1wk",
    "5y": "1mo",
  };
  const range = validRanges[rangeParam] ? rangeParam : "3mo";
  const interval = validRanges[range] || "1d";

  try {
    if (newsQuery) {
      const news = await fetchYahooNewsByQuery(newsQuery, 3);
      return NextResponse.json({ news, retrievedAt: new Date().toISOString() }, { headers: NO_CACHE_HEADERS });
    }

    if (watchParam) {
      const watchTickers = watchParam
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 15);
      const watchResults: Record<string, Awaited<ReturnType<typeof fetchTickerChartData>>> = {};
      await Promise.all(
        watchTickers.map(async (tk) => {
          const info = await fetchTickerChartData(tk, "1mo", "1d", true, false);
          if (info) watchResults[tk] = info;
        })
      );
      return NextResponse.json({ watchlist: watchResults, retrievedAt: new Date().toISOString() }, { headers: NO_CACHE_HEADERS });
    }

    if (symbol) {
      const [chartRes, secData, yahooFallback, stockNews] = await Promise.all([
        fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
            symbol
          )}?interval=${interval}&range=${range}`,
          { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
        ),
        fetchSecOfficialData(symbol),
        fetchYahooFinancialsFallback(symbol),
        fetchYahooNewsByQuery(`${symbol} stock earnings`, 3),
      ]);

      if (!chartRes.ok) {
        return NextResponse.json({ error: "ไม่พบข้อมูลหุ้นนี้ในระบบตลาด" }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      const data = await chartRes.json();
      const result = data?.chart?.result?.[0];
      if (!result) {
        return NextResponse.json({ error: "ไม่พบข้อมูลราคาหุ้น" }, { status: 404, headers: NO_CACHE_HEADERS });
      }

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
          const dStr =
            range === "1d"
              ? dt.toLocaleTimeString("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" })
              : dt.toISOString().split("T")[0];
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

      return NextResponse.json(
        {
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
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const usCoreTickers = ["^DJI", "^GSPC", "^IXIC", "^RUT", "^VIX"];
    const globalTickers = ["000001.SS", "^HSI", "^KS11", "^N225", "^SET.BK", "^STOXX50E"];
    const sectorTickers = ["XLK", "XLF", "XLI", "XLC", "XLV", "XLU", "XLP", "XLRE", "XLB", "XLY", "XLE"];
    const macroAndSafeHavenTickers = ["TLT", "SHV", "GLD", "DX-Y.NYB", "^TNX", "^IRX", "CL=F"];

    const results: Record<string, Awaited<ReturnType<typeof fetchTickerChartData>>> = {};

    const [, , , , , news, fred10y, fred3m, fredSpread, fredWti] = await Promise.all([
      Promise.all(
        usCoreTickers.map(async (tk) => {
          const info = await fetchTickerChartData(tk, "1mo", "1d", true, false);
          if (info) results[tk] = info;
        })
      ),
      fetchTickerChartData("^GSPC", "3mo", "1d", false, true).then((info) => {
        if (info) results["^GSPC_3M"] = info;
      }),
      Promise.all(
        globalTickers.map(async (tk) => {
          const info = await fetchTickerChartData(tk, "1mo", "1d", true, false);
          if (info) results[tk] = info;
        })
      ),
      Promise.all(
        sectorTickers.map(async (tk) => {
          const info = await fetchTickerChartData(tk, "3mo", "1d", false, true);
          if (info) results[tk] = info;
        })
      ),
      Promise.all(
        macroAndSafeHavenTickers.map(async (tk) => {
          const info = await fetchTickerChartData(tk, "5d", "1d", false, false);
          if (info) results[tk] = info;
        })
      ),
      fetchYahooNewsByQuery("stock market federal reserve wall street", 3),
      fetchFredSeries("DGS10"),
      fetchFredSeries("DGS3MO"),
      fetchFredSeries("T10Y3M"),
      fetchFredSeries("DCOILWTICO"),
    ]);

    return NextResponse.json(
      {
        market: results,
        fred: {
          DGS10: fred10y,
          DGS3MO: fred3m,
          T10Y3M: fredSpread,
          DCOILWTICO: fredWti,
        },
        news,
        retrievedAt: new Date().toISOString(),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูลตลาด" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}