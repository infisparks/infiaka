"use client";

import React from "react";

interface NotesCardProps {
  notesForPatient: string;
  setNotesForPatient: (v: string) => void;
  privateNotes: string;
  setPrivateNotes: (v: string) => void;
}

export default function NotesCard({
  notesForPatient,
  setNotesForPatient,
  privateNotes,
  setPrivateNotes,
}: NotesCardProps) {
  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-sm w-full">
      <span className="text-[10px] font-bold text-[#4A5568] uppercase flex items-center gap-1.5 select-none border-b pb-1.5">
        Notes
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-[#718096] uppercase select-none">Notes for Patient (Treatment/Surgical/Others)</label>
          <textarea
            rows={3}
            value={notesForPatient}
            onChange={(e) => setNotesForPatient(e.target.value)}
            placeholder="Enter instructions or medical notes for the patient..."
            className="w-full p-2 border border-[#CBD5E0] rounded-md text-[11px] focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-[#718096] uppercase select-none">Private Notes (These will not be printed)</label>
          <textarea
            rows={3}
            value={privateNotes}
            onChange={(e) => setPrivateNotes(e.target.value)}
            placeholder="Clinical reminders, diagnostic notes..."
            className="w-full p-2 border border-[#CBD5E0] rounded-md text-[11px] focus:outline-none bg-slate-50/50"
          />
        </div>
      </div>
    </section>
  );
}
