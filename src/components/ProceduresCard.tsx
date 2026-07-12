"use client";

import React, { useState, useRef } from "react";

export interface ProcedureItem {
  id: string;
  name: string;
  duration: string;
  note: string;
}

interface ProceduresCardProps {
  procedures: ProcedureItem[];
  setProcedures: React.Dispatch<React.SetStateAction<ProcedureItem[]>>;
}

const SUGGESTED_PROCEDURES = [
  "Actinotherapy",
  "APTT",
  "Electrocardiography (ECG)",
  "Echocardiography (ECHO)",
  "Urinalysis",
  "Suture Removal",
  "Wound Dressing Change",
  "Intravenous (IV) Cannulation",
  "Blood Sugar Monitoring",
  "Nebulization"
];

const SUGGESTED_DURATIONS = [
  "After 1 Day",
  "After 2 Days",
  "After 3 Days",
  "After 5 Days",
  "After 1 Week",
  "After 2 Weeks",
  "After 1 Month"
];

export default function ProceduresCard({ procedures, setProcedures }: ProceduresCardProps) {
  const [searchVal, setSearchVal] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHi, setSearchHi] = useState(-1);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusField, setFocusField] = useState<string | null>(null);
  const [rowHi, setRowHi] = useState(-1);
  const dragIdx = useRef<number | null>(null);

  const addProcedure = (name: string) => {
    if (!name.trim()) return;
    setProcedures((p) => [
      ...p,
      {
        id: Date.now().toString(),
        name: name.trim(),
        duration: "After 3 Days",
        note: ""
      }
    ]);
    setSearchVal("");
    setSearchOpen(false);
    setSearchHi(-1);
  };

  const patch = (id: string, diff: Partial<ProcedureItem>) =>
    setProcedures((p) => p.map((c) => (c.id === id ? { ...c, ...diff } : c)));
  const remove = (id: string) => setProcedures((p) => p.filter((c) => c.id !== id));

  const onDragStart = (i: number) => {
    dragIdx.current = i;
  };
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const r = [...procedures];
    const [m] = r.splice(dragIdx.current, 1);
    r.splice(i, 0, m);
    dragIdx.current = i;
    setProcedures(r);
  };
  const onDragEnd = () => {
    dragIdx.current = null;
  };

  const InlineDD = ({ id, field, opts, val }: { id: string; field: string; opts: string[]; val: string }) => {
    if (focusId !== id || focusField !== field) return null;
    const list = opts.filter((o) => !val || o.toLowerCase().includes(val.toLowerCase()));
    if (!list.length) return null;
    return (
      <div className="absolute left-0 top-full mt-0.5 z-40 w-full min-w-[140px] bg-white border border-[#E2E8F0] rounded-lg shadow-xl overflow-hidden max-h-44 overflow-y-auto text-left">
        {list.map((opt, i) => (
          <div
            key={opt}
            onMouseDown={() => {
              patch(id, { [field]: opt });
              setFocusId(null);
              setFocusField(null);
              setRowHi(-1);
            }}
            className={`px-3 py-[7px] text-[11px] font-semibold cursor-pointer border-b border-[#F8FAFC] last:border-b-0 transition-colors ${
              i === rowHi ? "bg-blue-50 text-blue-700" : "hover:bg-[#F1F5F9] text-[#334155]"
            }`}
          >
            {opt}
          </div>
        ))}
      </div>
    );
  };

  const handleRowKey = (e: React.KeyboardEvent, id: string, field: string, opts: string[], val: string) => {
    const list = opts.filter((o) => !val || o.toLowerCase().includes(val.toLowerCase()));
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setRowHi((p) => Math.min(p + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setRowHi((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter" && rowHi >= 0 && list[rowHi]) {
      e.preventDefault();
      patch(id, { [field]: list[rowHi] });
      setFocusId(null);
      setFocusField(null);
      setRowHi(-1);
    } else if (e.key === "Escape") {
      setFocusId(null);
      setFocusField(null);
      setRowHi(-1);
    }
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const list = SUGGESTED_PROCEDURES.filter((o) => !searchVal || o.toLowerCase().includes(searchVal.toLowerCase()));
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchHi((p) => Math.min(p + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchHi((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchHi >= 0 && list[searchHi]) addProcedure(list[searchHi]);
      else addProcedure(searchVal);
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
          <span className="text-sm">🩺</span>
          Procedures
        </span>
        <div className="flex items-center gap-2">
          {/* Floppy save master icon */}
          <button
            type="button"
            className="p-1 hover:bg-[#F1F5F9] rounded text-slate-500 hover:text-indigo-600 transition-colors"
            title="Save Template"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V8l-4-4H8zm2 0v5h4V4H10zm-1 9h6v6H9v-6z" />
            </svg>
          </button>
          {/* Templates icon */}
          <button
            type="button"
            className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[#F1F5F9] rounded text-slate-500 hover:text-indigo-600 text-[10px] font-bold transition-colors"
          >
            <span>T</span>
            <span className="text-[8px] font-bold lowercase">pr</span>
          </button>
        </div>
      </div>

      {/* Procedures Table */}
      {procedures.length > 0 && (
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-[#FAFBFC]">
          {procedures.map((item, idx) => (
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

              {/* Procedure Name */}
              <div className="relative flex-1 border-r border-[#E2E8F0] flex items-center">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => patch(item.id, { name: e.target.value })}
                  placeholder="Procedure Name"
                  className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-bold text-[#1e293b] bg-transparent outline-none"
                />
              </div>

              {/* Duration / Timeline */}
              <div className="relative w-[30%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-transparent px-3 gap-1">
                <input
                  type="text"
                  value={item.duration}
                  onChange={(e) => patch(item.id, { duration: e.target.value })}
                  onFocus={() => {
                    setFocusId(item.id);
                    setFocusField("duration");
                    setRowHi(-1);
                  }}
                  onBlur={() =>
                    setTimeout(() => {
                      setFocusId(null);
                      setFocusField(null);
                      setRowHi(-1);
                    }, 160)
                  }
                  onKeyDown={(e) => handleRowKey(e, item.id, "duration", SUGGESTED_DURATIONS, item.duration)}
                  placeholder="Duration"
                  className="w-full h-full border-0 focus:ring-0 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-[#CBD5E0]"
                />
                <svg
                  className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <InlineDD id={item.id} field="duration" opts={SUGGESTED_DURATIONS} val={item.duration} />
              </div>

              {/* Note */}
              <div className="relative w-[35%] shrink-0 border-r border-[#E2E8F0] flex items-center">
                <input
                  type="text"
                  value={item.note}
                  onChange={(e) => patch(item.id, { note: e.target.value })}
                  placeholder="Note"
                  className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none"
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

      {/* Autocomplete Input at bottom */}
      <div className="relative">
        <div className="relative flex items-center">
          <svg className="absolute left-3.5 w-3.5 h-3.5 fill-[#CBD5E0] pointer-events-none" viewBox="0 0 512 512">
            <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z" />
          </svg>
          <input
            type="text"
            placeholder="Start typing a procedure..."
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
              onClick={() => addProcedure(searchVal)}
              className="absolute right-3.5 text-blue-600 hover:text-blue-700 text-[10.5px] font-bold"
            >
              + Add
            </button>
          )}
        </div>
        {searchOpen && (() => {
          const list = SUGGESTED_PROCEDURES.filter((o) => !searchVal || o.toLowerCase().includes(searchVal.toLowerCase()));
          if (!list.length) return null;
          return (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-[60] bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
              {list.map((opt, i) => (
                <div
                  key={opt}
                  onMouseDown={() => addProcedure(opt)}
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
