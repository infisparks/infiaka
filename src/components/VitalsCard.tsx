"use client";

import React from "react";

interface VitalsCardProps {
  bp: string;
  setBp: (v: string) => void;
  pulse: string;
  setPulse: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  spo2: string;
  setSpo2: (v: string) => void;
  sugar: string;
  setSugar: (v: string) => void;
}

export default function VitalsCard({
  bp,
  setBp,
  pulse,
  setPulse,
  weight,
  setWeight,
  spo2,
  setSpo2,
  sugar,
  setSugar,
}: VitalsCardProps) {
  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-sm w-full select-none font-sans">
      <div className="flex justify-between items-center border-b pb-2 select-none">
        <span className="text-[11px] font-extrabold text-[#1E293B] uppercase flex items-center gap-1.5">
          <svg className="w-4 h-4 text-red-500 fill-red-500/10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Vitals
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {/* bp */}
        <div className="flex flex-col justify-between border border-[#E5E7EB] rounded-lg p-2.5 bg-white shadow-2xs w-full space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[#94A3B8] text-xs">💧</span>
            <span className="font-semibold text-[11px] text-[#475569]">bp</span>
          </div>
          <div className="flex items-center justify-between gap-1.5 w-full">
            <input
              type="text"
              value={bp}
              onChange={(e) => setBp(e.target.value)}
              placeholder="0"
              className="w-full h-7 font-bold text-[11px] border border-[#CBD5E0] focus:border-primary rounded focus:outline-none bg-white placeholder-slate-350 px-2"
            />
            <span className="text-[9px] text-[#94A3B8] font-bold shrink-0">mmHg</span>
          </div>
        </div>

        {/* pulse */}
        <div className="flex flex-col justify-between border border-[#E5E7EB] rounded-lg p-2.5 bg-white shadow-2xs w-full space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[#94A3B8] text-xs">💓</span>
            <span className="font-semibold text-[11px] text-[#475569]">pulse</span>
          </div>
          <div className="flex items-center justify-between gap-1.5 w-full">
            <input
              type="text"
              value={pulse}
              onChange={(e) => setPulse(e.target.value)}
              placeholder="0"
              className="w-full h-7 font-bold text-[11px] border border-[#CBD5E0] focus:border-primary rounded focus:outline-none bg-white placeholder-slate-350 px-2"
            />
            <span className="text-[9px] text-[#94A3B8] font-bold shrink-0">/min</span>
          </div>
        </div>

        {/* weight */}
        <div className="flex flex-col justify-between border border-[#E5E7EB] rounded-lg p-2.5 bg-white shadow-2xs w-full space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[#94A3B8] text-xs">⚖️</span>
            <span className="font-semibold text-[11px] text-[#475569]">weight</span>
          </div>
          <div className="flex items-center justify-between gap-1.5 w-full">
            <input
              type="text"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
              className="w-full h-7 font-bold text-[11px] border border-[#CBD5E0] focus:border-primary rounded focus:outline-none bg-white placeholder-slate-350 px-2"
            />
            <span className="text-[9px] text-[#94A3B8] font-bold shrink-0">kg</span>
          </div>
        </div>

        {/* spo2 */}
        <div className="flex flex-col justify-between border border-[#E5E7EB] rounded-lg p-2.5 bg-white shadow-2xs w-full space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[#94A3B8] text-xs">🫁</span>
            <span className="font-semibold text-[11px] text-[#475569]">spo2</span>
          </div>
          <div className="flex items-center justify-between gap-1.5 w-full">
            <input
              type="text"
              value={spo2}
              onChange={(e) => setSpo2(e.target.value)}
              placeholder="0"
              className="w-full h-7 font-bold text-[11px] border border-[#CBD5E0] focus:border-primary rounded focus:outline-none bg-white placeholder-slate-350 px-2"
            />
            <span className="text-[9px] text-[#94A3B8] font-bold shrink-0">%</span>
          </div>
        </div>

        {/* sugar */}
        <div className="flex flex-col justify-between border border-[#E5E7EB] rounded-lg p-2.5 bg-white shadow-2xs w-full space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[#94A3B8] text-xs">🩸</span>
            <span className="font-semibold text-[11px] text-[#475569]">sugar</span>
          </div>
          <div className="flex items-center justify-between gap-1.5 w-full">
            <input
              type="text"
              value={sugar}
              onChange={(e) => setSugar(e.target.value)}
              placeholder="0"
              className="w-full h-7 font-bold text-[11px] border border-[#CBD5E0] focus:border-primary rounded focus:outline-none bg-white placeholder-slate-350 px-2"
            />
            <span className="text-[9px] text-[#94A3B8] font-bold shrink-0">mg/dL</span>
          </div>
        </div>
      </div>
    </section>
  );
}
