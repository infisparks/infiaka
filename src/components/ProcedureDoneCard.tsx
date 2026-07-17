"use client";

import React from "react";

interface ProcedureDoneCardProps {
  procedureDone: string;
  setProcedureDone: (val: string) => void;
}

export default function ProcedureDoneCard({
  procedureDone,
  setProcedureDone,
}: ProcedureDoneCardProps) {
  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-sm w-full">
      <span className="text-[10px] font-bold text-[#4A5568] uppercase flex items-center gap-1.5 select-none border-b pb-1.5">
        Procedure Done (If any)
      </span>
      <div className="space-y-1">
        <textarea
          rows={3}
          value={procedureDone}
          onChange={(e) => setProcedureDone(e.target.value)}
          placeholder="Enter surgical or clinical procedures performed..."
          className="w-full p-2 border border-[#CBD5E0] rounded-md text-[11px] focus:outline-none"
        />
      </div>
    </section>
  );
}
