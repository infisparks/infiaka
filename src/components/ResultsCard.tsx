"use client";

import React, { useState, useRef } from "react";

/* ─── Static suggestion lists ────────────────────────────────────── */
const SUGGESTED_INVESTIGATIONS = [
  { name: "Hemoglobin S/Total Hemoglobin (%), (HPLC)", unit: "%" },
  { name: "Complete Blood Count (CBC)", unit: "-" },
  { name: "Coronary Angiography", unit: "-" },
  { name: "Lipid Profile", unit: "mg/dL" },
  { name: "Blood Glucose (Fasting)", unit: "mg/dL" },
  { name: "Serum Creatinine", unit: "mg/dL" },
  { name: "TSH (Thyroid Stimulating Hormone)", unit: "mIU/L" }
];

const SUGGESTED_UNITS = ["%", "mg/dL", "g/dL", "mIU/L", "-"];
const SUGGESTED_INTERPRETATIONS = ["High", "Normal", "Low", "Borderline"];

/* ─── Helpers ────────────────────────────────────────────────────── */
const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

// Converts date from display format "11 Jul 26" to ISO "2026-07-11"
const convertToISODate = (displayDate: string) => {
  if (!displayDate) return "";
  try {
    // Normalizes punctuation like "11 Jul'26" or "11 Jul 26"
    const cleaned = displayDate.replace(/'/g, " ");
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length < 3) return "";
    const day = parts[0].padStart(2, "0");
    const monthStr = parts[1];
    let yearShort = parts[2];
    if (yearShort.length === 2) {
      yearShort = "20" + yearShort;
    }
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = months.findIndex(m => monthStr.toLowerCase().startsWith(m.toLowerCase()));
    if (monthIdx === -1) return "";
    const month = String(monthIdx + 1).padStart(2, "0");
    
    return `${yearShort}-${month}-${day}`;
  } catch (e) {
    return "";
  }
};

// Converts date from ISO "2026-07-11" to display format "11 Jul 26"
const formatISODateToDisplay = (isoDate: string) => {
  if (!isoDate) return "";
  try {
    const parts = isoDate.split("-");
    if (parts.length < 3) return isoDate;
    const year = parts[0].slice(2); // e.g. "26"
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthStr = months[monthIdx] || "Jan";
    
    return `${day} ${monthStr} ${year}`;
  } catch (e) {
    return isoDate;
  }
};

/* ─── Types ──────────────────────────────────────────────────────── */
interface LabResult {
  id: string;
  name: string;
  unit: string;
  reading: string;
  interpretation: string;
  date: string;
  notes: string;
}

interface ResultsCardProps {
  labResults: LabResult[];
  setLabResults: React.Dispatch<React.SetStateAction<LabResult[]>>;
}

/* ═══════════════════════════════════════════════════════════════════
   ResultsCard Component
═══════════════════════════════════════════════════════════════════ */
export default function ResultsCard({ labResults, setLabResults }: ResultsCardProps) {
  /* search bar state */
  const [searchVal, setSearchVal]   = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHi, setSearchHi]     = useState(-1);

  /* inline cell suggestions highlight */
  const [focusId, setFocusId]       = useState<string | null>(null);
  const [focusField, setFocusField] = useState<string | null>(null);
  const [rowHi, setRowHi]           = useState(-1);

  /* drag & drop handle */
  const dragIdx = useRef<number | null>(null);

  /* ─── helpers ─── */
  const addLabResult = (item: { name: string; unit: string }) => {
    const formattedDate = formatISODateToDisplay(new Date().toISOString().split("T")[0]);
    const newRes = {
      id: Date.now().toString(),
      name: item.name,
      unit: item.unit,
      reading: "",
      interpretation: "",
      date: formattedDate,
      notes: ""
    };
    setLabResults((p) => [...p, newRes]);
    setSearchVal("");
    setSearchOpen(false);
    setSearchHi(-1);
  };

  const patch  = (id: string, diff: Partial<LabResult>) => setLabResults((p) => p.map((r) => (r.id === id ? { ...r, ...diff } : r)));
  const remove = (id: string) => setLabResults((p) => p.filter((r) => r.id !== id));

  /* drag reorder */
  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const r = [...labResults]; const [m] = r.splice(dragIdx.current, 1); r.splice(i, 0, m);
    dragIdx.current = i; setLabResults(r);
  };
  const onDragEnd = () => { dragIdx.current = null; };

  /* inline suggestions list component */
  const InlineDD = ({ id, field, opts, val }: { id: string; field: string; opts: string[]; val: string }) => {
    if (focusId !== id || focusField !== field) return null;
    const list = opts.filter((o) => !val || o.toLowerCase().includes(val.toLowerCase()));
    if (!list.length) return null;
    return (
      <div className="absolute left-0 top-full mt-0.5 z-40 w-full min-w-[125px] bg-white border border-[#E2E8F0] rounded-lg shadow-xl overflow-hidden max-h-44 overflow-y-auto text-left">
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

  /* search key events */
  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const list = SUGGESTED_INVESTIGATIONS.filter((o) => !searchVal || o.name.toLowerCase().includes(searchVal.toLowerCase()));
    if (e.key === "ArrowDown") { e.preventDefault(); setSearchHi((p) => Math.min(p + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSearchHi((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (searchHi >= 0 && list[searchHi]) addLabResult(list[searchHi]);
      else addLabResult({ name: searchVal, unit: "-" });
    }
    else if (e.key === "Escape") { setSearchOpen(false); setSearchHi(-1); }
  };

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm w-full select-none overflow-visible">
      
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2.5 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white text-xs shadow-sm">
            💧
          </div>
          <span className="text-[12px] font-bold text-[#1E293B] tracking-tight">Lab Results</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#718096] cursor-pointer">
            <input type="checkbox" className="rounded text-primary border-gray-300 w-3.5 h-3.5 focus:ring-primary" />
            <span>Print only Out of range in Rx</span>
          </label>
          <button className="h-7 px-3 border border-blue-500 hover:bg-blue-50 rounded-lg text-blue-500 text-[10px] font-bold tracking-wide transition-all flex items-center gap-1.5">
            Browse Panels
            <svg viewBox="0 0 512 512" className="w-2.5 h-2.5 fill-current">
              <path d="M40 48C26.7 48 16 58.7 16 72v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V72c0-13.3-10.7-24-24-24H40zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zM16 232v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V232c0-13.3-10.7-24-24-24H40c-13.3 0-24 10.7-24 24zm24 136c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V392c0-13.3-10.7-24-24-24H40z"/>
            </svg>
          </button>
          <button className="w-7 h-7 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center transition-colors">
            <svg className="w-3 h-3 fill-[#94A3B8]" viewBox="0 0 448 512">
              <path d="M224 256c-35.2 0-64 28.8-64 64s28.8 64 64 64 64-28.8 64-64-28.8-64-64-64zm209.1-127L349.2 45.1C341.1 37.1 328.8 32 316.1 32H64C28.7 32 0 60.7 0 96v320c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64V163.9c0-12.7-5.1-25-14.9-34.9zM128 80h144v80H128V80zM400 416c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16h16v88c0 13.3 10.7 24 24 24h192c13.3 0 24-10.7 24-24V85.5l78.3 78.3c.8.8 1.7 2.4 1.7 4.1V416z"/>
            </svg>
          </button>
          <button className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 flex flex-col items-center justify-center text-amber-700 transition-colors">
            <span className="text-[9.5px] font-extrabold">TInv</span>
          </button>
        </div>
      </div>

      {/* Grid Headers Row */}
      <div className="flex items-stretch border-b border-[#E2E8F0] bg-slate-50/50 text-[9px] font-bold text-[#718096] uppercase select-none">
        {/* drag blank */}
        <div className="w-7 shrink-0 border-r border-[#E2E8F0]" />
        
        {/* Col 1: Investigation Name */}
        <div className="w-[28%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">
          Investigation Name
        </div>

        {/* Col 2: Unit */}
        <div className="w-[8%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">
          Unit
        </div>

        {/* Col 3: Reading/Observations */}
        <div className="w-[16%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">
          Reading/Observations
        </div>

        {/* Col 4: Interpretation */}
        <div className="w-[16%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">
          Interpretation
        </div>

        {/* Col 5: Date */}
        <div className="w-[12%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">
          Date
        </div>

        {/* Col 6: Additional Notes */}
        <div className="w-[16%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">
          Additional Notes
        </div>

        {/* Action Column */}
        <div className="flex-1" />
      </div>

      {/* Row list */}
      {labResults.length > 0 && (
        <div className="p-3 space-y-2">
          {labResults.map((row, idx) => (
            <div key={row.id}
              data-drag-row="true"
              draggable="false"
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDragEnd={(e) => { onDragEnd(); e.currentTarget.setAttribute("draggable", "false"); }}
              className="group flex flex-col w-full text-left"
            >
              <div className="flex items-stretch border border-[#E2E8F0] rounded-lg bg-white overflow-visible h-9">
                
                {/* drag grip */}
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
                <div className="relative w-[28%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible">
                  <input type="text" value={row.name}
                    onChange={(e) => patch(row.id, { name: e.target.value })}
                    onFocus={() => { setFocusId(row.id); setFocusField("name"); setRowHi(-1); }}
                    onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                    onKeyDown={(e) => handleRowKey(e, row.id, "name", SUGGESTED_INVESTIGATIONS.map(i => i.name), row.name)}
                    placeholder="Investigation Name"
                    className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-bold text-[#1e293b] bg-transparent outline-none placeholder:text-slate-300"
                  />
                  <InlineDD id={row.id} field="name" opts={SUGGESTED_INVESTIGATIONS.map(i => i.name)} val={row.name} />
                </div>

                {/* Col 2: Unit */}
                <div className="relative w-[8%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible">
                  <input type="text" value={row.unit}
                    onChange={(e) => patch(row.id, { unit: e.target.value })}
                    onFocus={() => { setFocusId(row.id); setFocusField("unit"); setRowHi(-1); }}
                    onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                    onKeyDown={(e) => handleRowKey(e, row.id, "unit", SUGGESTED_UNITS, row.unit)}
                    placeholder="Unit"
                    className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-slate-350"
                  />
                  <InlineDD id={row.id} field="unit" opts={SUGGESTED_UNITS} val={row.unit} />
                </div>

                {/* Col 3: Reading/Observations */}
                <div className="relative w-[16%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible">
                  <input type="text" value={row.reading}
                    onChange={(e) => patch(row.id, { reading: e.target.value })}
                    placeholder="Reading"
                    className="w-full h-full border-0 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-slate-350 transition-all"
                  />
                </div>

                {/* Col 4: Interpretation */}
                <div className="relative w-[16%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible">
                  <input type="text" value={row.interpretation}
                    onChange={(e) => patch(row.id, { interpretation: e.target.value })}
                    onFocus={() => { setFocusId(row.id); setFocusField("interpretation"); setRowHi(-1); }}
                    onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                    onKeyDown={(e) => handleRowKey(e, row.id, "interpretation", SUGGESTED_INTERPRETATIONS, row.interpretation)}
                    placeholder="High/Normal/Low"
                    className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-slate-350"
                  />
                  <InlineDD id={row.id} field="interpretation" opts={SUGGESTED_INTERPRETATIONS} val={row.interpretation} />
                </div>

                {/* Col 5: Date (Formatted display with underlying native Date Picker) */}
                <div className="relative w-[12%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible px-3">
                  <span className="text-[11px] font-semibold text-[#334155] pointer-events-none truncate">
                    {row.date || "Date"}
                  </span>
                  <input
                    type="date"
                    value={convertToISODate(row.date)}
                    onChange={(e) => {
                      if (e.target.value) {
                        patch(row.id, { date: formatISODateToDisplay(e.target.value) });
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                </div>

                {/* Col 6: Additional Notes */}
                <div className="relative w-[16%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white overflow-hidden">
                  <input type="text" value={row.notes}
                    onChange={(e) => patch(row.id, { notes: e.target.value })}
                    placeholder="Add notes here"
                    className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-slate-350 truncate"
                  />
                </div>

                {/* Col 7: Trash */}
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

      {/* Search parameters bar */}
      <div className="relative px-3 py-2.5 border-t border-[#F8FAFC]">
        <div className="relative flex items-center">
          <svg className="absolute left-2.5 w-3 h-3 fill-[#CBD5E0] pointer-events-none" viewBox="0 0 512 512">
            <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z"/>
          </svg>
          <input
            type="text"
            placeholder="Start typing a parameter..."
            value={searchVal}
            onChange={(e) => { setSearchVal(e.target.value); setSearchHi(-1); setSearchOpen(true); }}
            onFocus={() => { setSearchOpen(true); setSearchHi(-1); }}
            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            onKeyDown={handleSearchKey}
            className="w-full h-8.5 pl-8 pr-14 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[11px] bg-[#FAFBFC] focus:bg-white focus:outline-none placeholder:text-[#C0CADC] font-medium transition-all"
          />
          {searchVal.trim() && (
            <button type="button" onClick={() => addLabResult({ name: searchVal, unit: "-" })}
              className="absolute right-2 text-blue-600 hover:text-blue-700 text-[10px] font-bold tracking-wide">+ Add</button>
          )}
        </div>

        {/* Dropdown search suggestions */}
        {searchOpen && (() => {
          const list = SUGGESTED_INVESTIGATIONS.filter((o) => !searchVal || o.name.toLowerCase().includes(searchVal.toLowerCase()));
          if (!list.length) return null;
          return (
            <div className="absolute left-3 right-3 top-full mt-0.5 z-40 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
              {list.map((opt, i) => (
                <div key={opt.name} onMouseDown={() => addLabResult(opt)}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer border-b border-[#F8FAFC] last:border-b-0 transition-colors
                    ${i === searchHi ? "bg-blue-50" : "hover:bg-[#F8FAFC]"}`}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-[8px] font-extrabold text-amber-700 shrink-0 leading-none">
                    {initials(opt.name) || "Lr"}
                  </div>
                  <span className="text-[11.5px] font-semibold text-[#1E293B]">{opt.name}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

    </section>
  );
}
