"use client";

import React from "react";

interface ExaminationFindingsCardProps {
  examinationFindings: string;
  setExaminationFindings: (val: string) => void;
}

export default function ExaminationFindingsCard({
  examinationFindings,
  setExaminationFindings,
}: ExaminationFindingsCardProps) {
  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-sm w-full">
      <span className="text-[10px] font-bold text-[#4A5568] uppercase flex items-center gap-1.5 select-none border-b pb-1.5">
        Examination Findings
      </span>
      <div className="space-y-1">
        <textarea
          rows={3}
          value={examinationFindings}
          onChange={(e) => setExaminationFindings(e.target.value)}
          placeholder="Enter examination findings (symptoms details, observations)..."
          className="w-full p-2 border border-[#CBD5E0] rounded-md text-[11px] focus:outline-none"
        />
      </div>
    </section>
  );
}
