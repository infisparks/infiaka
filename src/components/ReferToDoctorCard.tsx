"use client";

import React, { useState, useRef } from "react";

export interface ReferralItem {
  id: string;
  doctorName: string;
  notes: string;
}

interface ReferToDoctorCardProps {
  referrals: ReferralItem[];
  setReferrals: React.Dispatch<React.SetStateAction<ReferralItem[]>>;
}

const SUGGESTED_DOCTORS = [
  "shaikh mudassir (Cardiologist)",
  "Dr. John Doe (General Physician)",
  "Dr. Jane Smith (Pediatrician)",
  "Dr. Sarah Connor (Neurologist)",
  "Dr. Alan Grant (Orthopedic)",
  "Dr. Ellie Sattler (Dermatologist)"
];

export default function ReferToDoctorCard({ referrals, setReferrals }: ReferToDoctorCardProps) {
  const [searchVal, setSearchVal] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHi, setSearchHi] = useState(-1);
  const dragIdx = useRef<number | null>(null);

  const addReferral = (doctorName: string) => {
    if (!doctorName.trim()) return;
    setReferrals((p) => [
      ...p,
      {
        id: Date.now().toString(),
        doctorName: doctorName.trim(),
        notes: ""
      }
    ]);
    setSearchVal("");
    setSearchOpen(false);
    setSearchHi(-1);
  };

  const patch = (id: string, diff: Partial<ReferralItem>) =>
    setReferrals((p) => p.map((c) => (c.id === id ? { ...c, ...diff } : c)));
  const remove = (id: string) => setReferrals((p) => p.filter((c) => c.id !== id));

  const onDragStart = (i: number) => {
    dragIdx.current = i;
  };
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const r = [...referrals];
    const [m] = r.splice(dragIdx.current, 1);
    r.splice(i, 0, m);
    dragIdx.current = i;
    setReferrals(r);
  };
  const onDragEnd = () => {
    dragIdx.current = null;
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const list = SUGGESTED_DOCTORS.filter((o) => !searchVal || o.toLowerCase().includes(searchVal.toLowerCase()));
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchHi((p) => Math.min(p + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchHi((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchHi >= 0 && list[searchHi]) addReferral(list[searchHi]);
      else addReferral(searchVal);
    } else if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchHi(-1);
    }
  };

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-sm w-full select-none">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2 select-none">
        <span className="text-[11px] font-extrabold text-[#1E293B] uppercase flex items-center gap-1.5">
          <svg className="w-4 h-4 text-slate-500 fill-slate-500/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8M8 12h8" />
          </svg>
          Refer to a doctor
        </span>
        <button
          type="button"
          onClick={() => setReferrals([])}
          className="flex items-center gap-1.5 px-3 py-1 border border-blue-500 hover:bg-blue-50 text-blue-600 rounded text-[10.5px] font-extrabold transition-colors leading-none"
        >
          Refresh
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89" />
          </svg>
        </button>
      </div>

      {/* Referrals list */}
      {referrals.length > 0 && (
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-[#FAFBFC]">
          {referrals.map((item, idx) => (
            <div
              key={item.id}
              data-drag-row="true"
              draggable="false"
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDragEnd={(e) => {
                onDragEnd();
                e.currentTarget.setAttribute("draggable", "false");
              }}
              className="flex items-stretch min-h-[38px] bg-white border-b border-[#E2E8F0] last:border-b-0"
            >
              {/* Drag Handle */}
              <div
                onMouseDown={(e) => {
                  const el = e.currentTarget.closest("[data-drag-row]");
                  if (el) el.setAttribute("draggable", "true");
                }}
                onMouseUp={(e) => {
                  const el = e.currentTarget.closest("[data-drag-row]");
                  if (el) el.setAttribute("draggable", "false");
                }}
                className="flex items-center justify-center w-8 shrink-0 border-r border-[#E2E8F0] bg-slate-50/50 cursor-grab text-slate-400"
              >
                <svg viewBox="0 0 10 16" fill="currentColor" className="w-2.5 h-3.5">
                  <circle cx="2" cy="2" r="1.2" />
                  <circle cx="8" cy="2" r="1.2" />
                  <circle cx="2" cy="8" r="1.2" />
                  <circle cx="8" cy="8" r="1.2" />
                  <circle cx="2" cy="14" r="1.2" />
                  <circle cx="8" cy="14" r="1.2" />
                </svg>
              </div>

              {/* Doctor Name / Specialty */}
              <div className="flex-1 border-r border-[#E2E8F0] flex items-center px-3">
                <span className="text-[11px] font-bold text-[#1e293b]">{item.doctorName}</span>
              </div>

              {/* Notes for the doctor */}
              <div className="relative w-[50%] shrink-0 border-r border-[#E2E8F0] flex items-center">
                <input
                  type="text"
                  value={item.notes}
                  onChange={(e) => patch(item.id, { notes: e.target.value })}
                  placeholder="Notes for the doctor"
                  className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-[#CBD5E0]"
                />
              </div>

              {/* Actions */}
              <div className="w-9 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors cursor-pointer">
                <button type="button" onClick={() => remove(item.id)} className="p-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <svg className="absolute left-3.5 w-3.5 h-3.5 fill-[#CBD5E0] pointer-events-none" viewBox="0 0 512 512">
            <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z" />
          </svg>
          <input
            type="text"
            placeholder="Start typing doctor name or speciality.."
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              setSearchHi(-1);
              setSearchOpen(true);
            }}
            onFocus={() => {
              setSearchOpen(true);
              setSearchHi(-1);
            }}
            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            onKeyDown={handleSearchKey}
            className="w-full h-9 pl-9 pr-14 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[11px] bg-[#FAFBFC] focus:bg-white focus:outline-none placeholder:text-[#C0CADC] font-semibold transition-all"
          />
          {searchVal.trim() && (
            <button
              type="button"
              onClick={() => addReferral(searchVal)}
              className="absolute right-3.5 text-blue-600 hover:text-blue-700 text-[10.5px] font-bold"
            >
              + Add
            </button>
          )}
        </div>
        {searchOpen && (() => {
          const list = SUGGESTED_DOCTORS.filter((o) => !searchVal || o.toLowerCase().includes(searchVal.toLowerCase()));
          if (!list.length) return null;
          return (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-[60] bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
              {list.map((opt, i) => (
                <div
                  key={opt}
                  onMouseDown={() => addReferral(opt)}
                  className={`px-3.5 py-2.5 cursor-pointer border-b border-[#F8FAFC] last:border-b-0 text-[11.5px] font-semibold text-[#1E293B] transition-colors ${
                    i === searchHi ? "bg-blue-50" : "hover:bg-[#F8FAFC]"
                  }`}
                >
                  {opt}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </section>
  );
}
