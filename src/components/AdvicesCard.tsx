"use client";

import React from "react";

interface AdvicesCardProps {
  advicesInput: string;
  setAdvicesInput: (v: string) => void;
  advRest: boolean;
  setAdvRest: (v: boolean) => void;
  advWater: boolean;
  setAdvWater: (v: boolean) => void;
}

export default function AdvicesCard({
  advicesInput,
  setAdvicesInput,
  advRest,
  setAdvRest,
  advWater,
  setAdvWater,
}: AdvicesCardProps) {
  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-sm w-full">
      <span className="text-[10px] font-bold text-[#4A5568] uppercase flex items-center gap-1.5 select-none border-b pb-1.5">
        Advices
      </span>

      <div className="space-y-2">
        {/* Formatting bar mockup */}
        <div className="flex gap-1.5 text-[10px] font-bold text-[#718096] border-b pb-1 mb-1.5 select-none">
          <button type="button" className="px-1.5 py-0.5 hover:bg-slate-100 rounded">B</button>
          <button type="button" className="px-1.5 py-0.5 hover:bg-slate-100 rounded italic">I</button>
          <button type="button" className="px-1.5 py-0.5 hover:bg-slate-100 rounded">Bullet List</button>
        </div>

        <textarea
          rows={2}
          value={advicesInput}
          onChange={(e) => setAdvicesInput(e.target.value)}
          placeholder="Enter medical advice..."
          className="w-full p-2 border border-[#CBD5E0] rounded-md text-[11px] focus:outline-none"
        />

        {/* Templates checkboxes */}
        <div className="flex flex-col gap-1.5 select-none text-[10.5px] font-bold text-[#4A5568]">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={advRest}
              onChange={(e) => setAdvRest(e.target.checked)}
              className="rounded text-primary border-gray-300 w-3.5 h-3.5"
            />
            Please take some rest.
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={advWater}
              onChange={(e) => setAdvWater(e.target.checked)}
              className="rounded text-primary border-gray-300 w-3.5 h-3.5"
            />
            Drink plenty of water.
          </label>
        </div>
      </div>
    </section>
  );
}
