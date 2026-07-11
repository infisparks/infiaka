"use client";

import React from "react";

interface FollowUpCardProps {
  followUpVal: string;
  setFollowUpVal: (v: string) => void;
  followUpNotes: string;
  setFollowUpNotes: (v: string) => void;
  refDoctorInput: string;
  setRefDoctorInput: (v: string) => void;
}

export default function FollowUpCard({
  followUpVal,
  setFollowUpVal,
  followUpNotes,
  setFollowUpNotes,
  refDoctorInput,
  setRefDoctorInput,
}: FollowUpCardProps) {
  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-sm w-full flex flex-col justify-between">
      <div>
        <span className="text-[10px] font-bold text-[#4A5568] uppercase flex items-center gap-1.5 select-none border-b pb-1.5">
          Follow Up
        </span>
        
        <div className="flex gap-2 items-center pt-2.5 select-none">
          <input
            type="text"
            value={followUpVal}
            onChange={(e) => setFollowUpVal(e.target.value)}
            className="w-20 h-7 border rounded text-[11px] text-center focus:outline-none"
          />
          <button type="button" className="px-2.5 h-7 border bg-slate-50 rounded text-[10px] font-bold">Book Slot</button>
          <label className="flex items-center gap-1 text-[10px] font-bold text-[#718096] cursor-pointer ml-auto">
            <input type="checkbox" className="rounded text-primary border-gray-300 w-3.5 h-3.5" />
            Auto Fill from Rx
          </label>
        </div>

        <div className="space-y-1 mt-3">
          <label className="text-[9px] font-bold text-[#718096] uppercase select-none">Follow-up Notes</label>
          <textarea
            rows={2}
            value={followUpNotes}
            onChange={(e) => setFollowUpNotes(e.target.value)}
            placeholder="Follow up instructions..."
            className="w-full p-2 border border-[#CBD5E0] rounded-md text-[11px] focus:outline-none"
          />
        </div>
      </div>

      {/* Refer a Doctor search input */}
      <div className="space-y-1 mt-3">
        <label className="text-[9px] font-bold text-[#718096] uppercase select-none">Refer to a Doctor</label>
        <input
          type="text"
          placeholder="Start typing doctor name or speciality..."
          value={refDoctorInput}
          onChange={(e) => setRefDoctorInput(e.target.value)}
          className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-[#F9FAFB] focus:outline-none placeholder:text-[#A0AEC0]"
        />
      </div>
    </section>
  );
}
