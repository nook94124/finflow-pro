"use client";
import React,{useState}from"react";
export interface ProOhlcPoint{date:string;open?:number;high?:number;low?:number;close:number;}
const MO=["\u0e21.\u0e04.","\u0e01.\u0e1e.","\u0e21\u0e35.\u0e04.","\u0e40\u0e21.\u0e22.","\u0e1e.\u0e04.","\u0e21\u0e34.\u0e22.","\u0e01.\u0e04.","\u0e2a.\u0e04.","\u0e01.\u0e22.","\u0e15.\u0e04.","\u0e1e.\u0e22.","\u0e18.\u0e04."];
const fN=(v:number,d=2)=>!isFinite(v)?"0.00":(v<0?"(":"")+Math.abs(v).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d})+(v<0?")":"");
const fS=(x:number,d=2)=>!isFinite(x)?"0.00%":(x>=0?"+":"")+x.toFixed(d)+"%";
const fD=(s:string)=>{if(!s)return"\u0e25\u0e48\u0e32\u0e2a\u0e38\u0e14";if(s.includes(":"))return s+" \u0e19.";if(!s.includes("-"))return s;const p=s.split("-"),m=parseInt(p[1],10)-1,dy=parseInt(p[2],10);return isNaN(m)||isNaN(dy)||m<0||m>11?s:dy+" "+MO[m]+" "+p[0];};
export default function ProChart({history,currency,range,onRangeChange,isLoading,titleOverride}:{history:ProOhlcPoint[];currency:string;range?:string;onRangeChange?:(r:string)=>void;isLoading?:boolean;titleOverride?:string;}){
const[chartType,setChartType]=useState<"candle"|"bar"|"line"|"area">("candle"),[hoverIdx,setHoverIdx]=useState<number|null>(null);
const ranges=[{id:"1d",label:"1D"},{id:"1mo",label:"1M"},{id:"3mo",label:"3M"},{id:"6mo",label:"6M"},{id:"1y",label:"1Y"},{id:"5y",label:"5Y"}];
if(!history||history.length<2)return null;
const fN=(v:number,d=2)=>!isFinite(v)?"0.00":(v<0?"(":"")+Math.abs(v).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d})+(v<0?")":"");
const fS=(x:number,d=2)=>!isFinite(x)?"0.00%":(x>=0?"+":"")+x.toFixed(d)+"%";
const fD=(s:string)=>{if(!s)return"\u0e25\u0e48\u0e32\u0e2a\u0e38\u0e14";if(s.includes(":"))return s+" \u0e19.";if(!s.includes("-"))return s;const p=s.split("-"),m=parseInt(p[1],10)-1,dy=parseInt(p[2],10);return isNaN(m)||isNaN(dy)||m<0||m>11?s:dy+" "+MO[m]+" "+p[0];};
export default function ProChart({history,currency,range,onRangeChange,isLoading,titleOverride}:{history:ProOhlcPoint[];currency:string;range?:string;onRangeChange?:(r:string)=>void;isLoading?:boolean;titleOverride?:string;}){
const[chartType,setChartType]=useState<"candle"|"bar"|"line"|"area">("candle"),[hoverIdx,setHoverIdx]=useState<number|null>(null);
const ranges=[{id:"1d",label:"1D"},{id:"1mo",label:"1M"},{id:"3mo",label:"3M"},{id:"6mo",label:"6M"},{id:"1y",label:"1Y"},{id:"5y",label:"5Y"}];
if(!history||history.length<2)return null;
const first=history[0].open??history[0].close,last=history[history.length-1].close,periodChange=first?((last-first)/first)*100:0,isUp=periodChange>=0,strokeColor=isUp?"#059669":"#e11d48",fillId=isUp?"gradUpPro":"gradDownPro";
const highs=history.map(h=>h.high??h.close),lows=history.map(h=>h.low??h.close),rawMin=Math.min(...lows),rawMax=Math.max(...highs),padSpan=(rawMax-rawMin)*0.06||1,minP=rawMin-padSpan,maxP=rawMax+padSpan,span=maxP-minP||1;
const W=880,H=228,padX=12,rightAxisW=72,padY=14,plotW=W-padX-rightAxisW,plotH=H-padY*2,toY=(v:number)=>padY+(1-(v-minP)/span)*plotH;
let ema=history[0].close;const k=2/(Math.min(12,history.length)+1),emaPts=history.map((pt,i)=>{ema=pt.close*k+ema*(1-k);return((padX+(i/(history.length-1))*plotW).toFixed(1))+","+(toY(ema).toFixed(1));});
const lineCoords=history.map((pt,i)=>({x:padX+(i/(history.length-1))*plotW,y:toY(pt.close)})),polylineStr=lineCoords.map(q=>q.x.toFixed(1)+","+q.y.toFixed(1)).join(" "),areaStr=padX+","+(H-padY)+" "+polylineStr+" "+(padX+plotW)+","+(H-padY),curSym=currency==="USD"?"$":currency?currency+" ":"",slotW=plotW/history.length,candleW=Math.max(3,Math.min(14,slotW*0.62));
const activeIdx=hoverIdx!==null&&hoverIdx>=0&&hoverIdx<history.length?hoverIdx:null,activePt=activeIdx!==null?history[activeIdx]:history[history.length-1],prevPt=activeIdx!==null&&activeIdx>0?history[activeIdx-1]:activeIdx===null&&history.length>=2?history[history.length-2]:null;
const aOpen=activePt.open??activePt.close,aHigh=activePt.high??Math.max(aOpen,activePt.close),aLow=activePt.low??Math.min(aOpen,activePt.close),aClose=activePt.close,aBase=prevPt?prevPt.close:aOpen,aChg=aBase?((aClose-aBase)/aBase)*100:0,aBull=aClose>=aOpen;
const yTicks=[0,0.25,0.5,0.75,1].map(t=>({y:padY+t*plotH,val:maxP-t*span})),lastY=toY(last);
const pickIdx=(svg:SVGSVGElement,cx:number,cy:number)=>{const ctm=svg.getScreenCTM();if(!ctm)return;const pt=svg.createSVGPoint();pt.x=cx;pt.y=cy;const x=pt.matrixTransform(ctm.inverse()).x,rt=Math.max(0,Math.min(1,(x-padX)/plotW));setHoverIdx((chartType==="candle"||chartType==="bar")?Math.min(history.length-1,Math.max(0,Math.floor(rt*history.length))):Math.min(history.length-1,Math.max(0,Math.round(rt*(history.length-1)))));};
