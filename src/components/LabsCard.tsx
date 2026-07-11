"use client";

import React, { useState, useRef } from "react";

/* ─── Static suggestion lists ────────────────────────────────────── */
const SUGGESTED_INVESTIGATIONS = [
  "Liver Function Test (LFT)",
  "Cone Beam CT Scan (CBCT) Temporomandibular Joint (Both)",
  "Complete Blood Count (CBC)",
  "Kidney Function Test (KFT)",
  "Lipid Profile",
  "Thyroid Profile (T3, T4, TSH)",
  "Urine Routine & Microscopy",
  "Chest X-Ray",
  "Electrocardiogram (ECG)",
  "Ultrasonography (USG) Abdomen"
];

const SUGGESTED_TEST_ON = [
  "Today",
  "Tomorrow",
  "Today / After 3 Days",
  "After 3 Days",
  "After 1 Week",
  "After 2 Weeks",
  "After 1 Month"
];

const SUGGESTED_REPEAT_ON = [
  "After 3 Days",
  "After 1 Week",
  "After 2 Weeks",
  "After 1 Month",
  "After 3 Months",
  "After 6 Months",
  "Every Year"
];

const SUGGESTED_REMARKS = [
  "Instructions",
  "Empty stomach",
  "Fasting for 12 hours",
  "Before breakfast",
  "Fasting required",
  "Drink plenty of water"
];

/* ─── Helpers ────────────────────────────────────────────────────── */
const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/* ─── Types ──────────────────────────────────────────────────────── */
interface Lab {
  id: string;
  name: string;
  testOn: string;
  repeatOn: string;
  remarks: string;
}

interface LabsCardProps {
  labs: Lab[];
  setLabs: React.Dispatch<React.SetStateAction<Lab[]>>;
}

/* ═══════════════════════════════════════════════════════════════════
   LabsCard Component
═══════════════════════════════════════════════════════════════════ */
export default function LabsCard({ labs, setLabs }: LabsCardProps) {
  /* search bar */
  const [searchVal, setSearchVal]   = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHi, setSearchHi]     = useState(-1);

  /* inline cell highlight dropdowns */
  const [focusId, setFocusId]       = useState<string | null>(null);
  const [focusField, setFocusField] = useState<string | null>(null);
  const [rowHi, setRowHi]           = useState(-1);

  /* drag */
  const dragIdx = useRef<number | null>(null);

  /* ─── helpers ─── */
  const addLab = (name: string) => {
    if (!name.trim()) return;
    const newLab = {
      id: Date.now().toString(),
      name: name.trim(),
      testOn: "Today / After 3 Days",
      repeatOn: "After 3 Days",
      remarks: ""
    };
    setLabs((p) => [...p, newLab]);
    setSearchVal("");
    setSearchOpen(false);
    setSearchHi(-1);
  };

  const patch  = (id: string, diff: Partial<Lab>) => setLabs((p) => p.map((l) => (l.id === id ? { ...l, ...diff } : l)));
  const remove = (id: string) => setLabs((p) => p.filter((l) => l.id !== id));

  /* drag reorder */
  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const r = [...labs]; const [m] = r.splice(dragIdx.current, 1); r.splice(i, 0, m);
    dragIdx.current = i; setLabs(r);
  };
  const onDragEnd = () => { dragIdx.current = null; };

  /* inline dropdown component */
  const InlineDD = ({ id, field, opts, val }: { id: string; field: string; opts: string[]; val: string }) => {
    if (focusId !== id || focusField !== field) return null;
    const list = opts.filter((o) => !val || o.toLowerCase().includes(val.toLowerCase()));
    if (!list.length) return null;
    return (
      <div className="absolute left-0 top-full mt-0.5 z-40 w-full min-w-[120px] bg-white border border-[#E2E8F0] rounded-lg shadow-xl overflow-hidden max-h-44 overflow-y-auto text-left">
        {list.map((opt, i) => (
          <div key={opt}
            onMouseDown={() => { patch(id, { [field]: opt }); setFocusId(null); setFocusField(null); setRowHi(-1); }}
            className={`px-3 py-[7px] text-[11px] font-semibold cursor-pointer border-b border-[#F8FAFC] last:border-b-0 transition-colors
              ${i === rowHi ? "bg-blue-50 text-blue-700" : "hover:bg-[#F1F5F9] text-[#334155]"}`}
          >{opt}</div>
        ))}
      </div>
    );
  };

  const handleRowKey = (e: React.KeyboardEvent, id: string, field: string, opts: string[], val: string) => {
    const list = opts.filter((o) => !val || o.toLowerCase().includes(val.toLowerCase()));
    if (e.key === "ArrowDown") { e.preventDefault(); setRowHi((p) => Math.min(p + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setRowHi((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (rowHi >= 0 && list[rowHi]) { patch(id, { [field]: list[rowHi] }); setFocusId(null); setFocusField(null); setRowHi(-1); }
    }
    else if (e.key === "Escape") { setFocusId(null); setFocusField(null); setRowHi(-1); }
  };

  /* search key actions */
  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const list = SUGGESTED_INVESTIGATIONS.filter((o) => !searchVal || o.toLowerCase().includes(searchVal.toLowerCase()));
    if (e.key === "ArrowDown") { e.preventDefault(); setSearchHi((p) => Math.min(p + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSearchHi((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (searchHi >= 0 && list[searchHi]) addLab(list[searchHi]);
      else addLab(searchVal);
    }
    else if (e.key === "Escape") { setSearchOpen(false); setSearchHi(-1); }
  };

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm w-full select-none overflow-visible">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2.5 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-yellow-600 to-yellow-800 flex items-center justify-center text-white text-xs shadow-sm">
            🧪
          </div>
          <span className="text-[12px] font-bold text-[#1E293B] tracking-tight">Lab Investigations</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-7 h-7 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-slate-500 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-slate-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          <button className="w-7 h-7 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center transition-colors">
            <svg className="w-3 h-3 fill-[#94A3B8]" viewBox="0 0 448 512">
              <path d="M224 256c-35.2 0-64 28.8-64 64s28.8 64 64 64 64-28.8 64-64-28.8-64-64-64zm209.1-127L349.2 45.1C341.1 37.1 328.8 32 316.1 32H64C28.7 32 0 60.7 0 96v320c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64V163.9c0-12.7-5.1-25-14.9-34.9zM128 80h144v80H128V80zM400 416c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16h16v88c0 13.3 10.7 24 24 24h192c13.3 0 24-10.7 24-24V85.5l78.3 78.3c.8.8 1.7 2.4 1.7 4.1V416z"/>
            </svg>
          </button>
          <button className="w-8 h-7 rounded-lg bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 flex flex-col items-center justify-center text-yellow-700 transition-colors">
            <span className="text-[9px] font-extrabold">TPanel</span>
          </button>
        </div>
      </div>

      {/* Grid Headers Row */}
      <div className="flex items-stretch border-b border-[#E2E8F0] bg-slate-50/50 text-[9px] font-bold text-[#718096] uppercase select-none">
        {/* drag grip blank */}
        <div className="w-7 shrink-0 border-r border-[#E2E8F0]" />
        
        {/* Col 1: Investigation Name */}
        <div className="w-[40%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">
          Investigation Name
        </div>

        {/* Col 2: Test On */}
        <div className="w-[18%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">
          Test On
        </div>

        {/* Col 3: Repeat On */}
        <div className="w-[18%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">
          Repeat On
        </div>

        {/* Col 4: Remarks */}
        <div className="w-[18%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">
          Remarks
        </div>

        {/* Action Column */}
        <div className="flex-1" />
      </div>

      {/* Row list */}
      {labs.length > 0 && (
        <div className="p-3 space-y-2">
          {labs.map((row, idx) => (
            <div key={row.id}
              data-drag-row="true"
              draggable="false"
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDragEnd={(e) => { onDragEnd(); e.currentTarget.setAttribute("draggable", "false"); }}
              className="group flex flex-col w-full text-left"
            >
              <div className="flex items-stretch border border-[#E2E8F0] rounded-lg bg-white overflow-visible min-h-[46px]">
                
                {/* drag handle */}
                <div
                  onMouseDown={(e) => { const rEl = e.currentTarget.closest("[data-drag-row]"); if (rEl) rEl.setAttribute("draggable", "true"); }}
                  onMouseUp={(e) => { const rEl = e.currentTarget.closest("[data-drag-row]"); if (rEl) rEl.setAttribute("draggable", "false"); }}
                  className="flex items-center justify-center w-7 shrink-0 border-r border-[#E2E8F0] bg-slate-50/50 cursor-grab active:cursor-grabbing text-slate-400"
                >
                  <svg viewBox="0 0 10 16" fill="currentColor" className="w-2.5 h-3.5">
                    <circle cx="2" cy="2" r="1.2"/><circle cx="8" cy="2" r="1.2"/>
                    <circle cx="2" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/>
                    <circle cx="2" cy="14" r="1.2"/><circle cx="8" cy="14" r="1.2"/>
                  </svg>
                </div>

                {/* Col 1: Investigation Name */}
                <div className="relative w-[40%] shrink-0 border-r border-[#E2E8F0] bg-white px-3 py-1 flex flex-col justify-between overflow-visible">
                  <input type="text" value={row.name}
                    onChange={(e) => patch(row.id, { name: e.target.value })}
                    onFocus={() => { setFocusId(row.id); setFocusField("name"); setRowHi(-1); }}
                    onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                    onKeyDown={(e) => handleRowKey(e, row.id, "name", SUGGESTED_INVESTIGATIONS, row.name)}
                    placeholder="Investigation Name"
                    className="w-full border-0 focus:ring-0 text-[11px] font-bold text-[#1e293b] bg-transparent outline-none p-0 placeholder:text-slate-300"
                  />
                  <div className="flex items-center justify-between w-full text-slate-350 pt-0.5">
                    <span className="cursor-pointer hover:text-slate-500 transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                        <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/>
                      </svg>
                    </span>
                  </div>
                  <InlineDD id={row.id} field="name" opts={SUGGESTED_INVESTIGATIONS} val={row.name} />
                </div>

                {/* Col 2: Test On */}
                <div className="relative w-[18%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible">
                  <input type="text" value={row.testOn}
                    onChange={(e) => patch(row.id, { testOn: e.target.value })}
                    onFocus={() => { setFocusId(row.id); setFocusField("testOn"); setRowHi(-1); }}
                    onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                    onKeyDown={(e) => handleRowKey(e, row.id, "testOn", SUGGESTED_TEST_ON, row.testOn)}
                    placeholder="Today / After 3 Days"
                    className="w-full h-full border-0 focus:ring-0 pl-3 pr-8 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-slate-300"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </span>
                  <InlineDD id={row.id} field="testOn" opts={SUGGESTED_TEST_ON} val={row.testOn} />
                </div>

                {/* Col 3: Repeat On */}
                <div className="relative w-[18%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible">
                  <input type="text" value={row.repeatOn}
                    onChange={(e) => patch(row.id, { repeatOn: e.target.value })}
                    onFocus={() => { setFocusId(row.id); setFocusField("repeatOn"); setRowHi(-1); }}
                    onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                    onKeyDown={(e) => handleRowKey(e, row.id, "repeatOn", SUGGESTED_REPEAT_ON, row.repeatOn)}
                    placeholder="After 3 Days"
                    className="w-full h-full border-0 focus:ring-0 pl-3 pr-8 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-slate-300"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </span>
                  <InlineDD id={row.id} field="repeatOn" opts={SUGGESTED_REPEAT_ON} val={row.repeatOn} />
                </div>

                {/* Col 4: Remarks */}
                <div className="relative w-[18%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible">
                  <input type="text" value={row.remarks}
                    onChange={(e) => patch(row.id, { remarks: e.target.value })}
                    onFocus={() => { setFocusId(row.id); setFocusField("remarks"); setRowHi(-1); }}
                    onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                    onKeyDown={(e) => handleRowKey(e, row.id, "remarks", SUGGESTED_REMARKS, row.remarks)}
                    placeholder="Instructions"
                    className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-slate-300"
                  />
                  <InlineDD id={row.id} field="remarks" opts={SUGGESTED_REMARKS} val={row.remarks} />
                </div>

                {/* Trash */}
                <div className="flex-1 flex items-center justify-center bg-white text-slate-300 hover:text-red-500 transition-colors cursor-pointer">
                  <button type="button" onClick={() => remove(row.id)} className="p-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Search Bar */}
      <div className="relative px-3 py-2.5 border-t border-[#F8FAFC]">
        <div className="relative flex items-center">
          <svg className="absolute left-2.5 w-3 h-3 fill-[#CBD5E0] pointer-events-none" viewBox="0 0 512 512">
            <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z"/>
          </svg>
          <input
            type="text"
            placeholder="Start typing Lab test / Radiology"
            value={searchVal}
            onChange={(e) => { setSearchVal(e.target.value); setSearchHi(-1); setSearchOpen(true); }}
            onFocus={() => { setSearchOpen(true); setSearchHi(-1); }}
            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            onKeyDown={handleSearchKey}
            className="w-full h-8.5 pl-8 pr-14 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[11px] bg-[#FAFBFC] focus:bg-white focus:outline-none placeholder:text-[#C0CADC] font-medium transition-all"
          />
          {searchVal.trim() && (
            <button type="button" onClick={() => addLab(searchVal)}
              className="absolute right-2 text-blue-600 hover:text-blue-700 text-[10px] font-bold tracking-wide">+ Add</button>
          )}
        </div>

        {/* Autocomplete Search suggestions */}
        {searchOpen && (() => {
          const list = SUGGESTED_INVESTIGATIONS.filter((o) => !searchVal || o.toLowerCase().includes(searchVal.toLowerCase()));
          if (!list.length) return null;
          return (
            <div className="absolute left-3 right-3 top-full mt-0.5 z-40 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
              {list.map((opt, i) => (
                <div key={opt} onMouseDown={() => addLab(opt)}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer border-b border-[#F8FAFC] last:border-b-0 transition-colors
                    ${i === searchHi ? "bg-blue-50" : "hover:bg-[#F8FAFC]"}`}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center text-[8px] font-extrabold text-yellow-800 shrink-0 leading-none">
                    {initials(opt) || "Li"}
                  </div>
                  <span className="text-[11.5px] font-semibold text-[#1E293B]">{opt}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

    </section>
  );
}
