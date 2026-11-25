const fs=require('fs');
const head=`'use client';
import React,{useState}from'react';
export interface ProOhlcPoint{date:string;open?:number;high?:number;low?:number;close:number;}
const MO=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
`;
const fns=`const fN=(v:number,d=2)=>!isFinite(v)?'0.00':(v<0?'(':'')+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})+(v<0?')':'');
const fS=(x:number,d=2)=>!isFinite(x)?'0.00%':(x>=0?'+':'')+x.toFixed(d)+'%';
`;
const fDfn=`const fD=(s:string)=>{if(!s)return'ล่าสุด';if(s.includes(':'))return s+' น.';if(!s.includes('-'))return s;const a=s.split('-'),m=parseInt(a[1],10)-1,dy=parseInt(a[2],10);return isNaN(m)||isNaN(dy)||m<0||m>11?s:dy+' '+MO[m]+' '+a[0];};
`;
