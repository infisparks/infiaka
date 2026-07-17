"use client";

import React from "react";

interface PlanSurgeryAdvisedCardProps {
  planSurgeryAdvised: string;
  setPlanSurgeryAdvised: (val: string) => void;
}

export default function PlanSurgeryAdvisedCard({
  planSurgeryAdvised,
  setPlanSurgeryAdvised,
}: PlanSurgeryAdvisedCardProps) {
  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-sm w-full">
      <span className="text-[10px] font-bold text-[#4A5568] uppercase flex items-center gap-1.5 select-none border-b pb-1.5">
        Plan / Surgery Advised
      </span>
      <div className="space-y-1">
        <textarea
          rows={3}
          value={planSurgeryAdvised}
          onChange={(e) => setPlanSurgeryAdvised(e.target.value)}
          placeholder="Enter surgical procedure plan or recommendations advised..."
          className="w-full p-2 border border-[#CBD5E0] rounded-md text-[11px] focus:outline-none"
        />
      </div>
    </section>
  );
}
