"use client";

import React, { useState, useRef } from "react";

/* ─── Static suggestion lists ────────────────────────────────────── */
const freqMedications = [
  { name: "Dolopar 650 Tablet", generic: "PARACETAMOL (650MG)", form: "tablet" },
  { name: "Cyclopam Tablet", generic: "DICYCLOMINE (20MG) + PARACETAMOL (500MG)", form: "tablet" },
  { name: "Enzoflam Tablet", generic: "DICLOFENAC (50MG) + PARACETAMOL (325MG) + SERRATIOPEPTIDASE (15MG)", form: "tablet" },
  { name: "Drotin-M Tablet", generic: "DROTAVERINE (80MG) + MEFENAMIC ACID (250MG)", form: "tablet" },
  { name: "Ultracet Tablet", generic: "PARACETAMOL/ACETAMINOPHEN (325MG) + TRAMADOL (37.5MG)", form: "tablet" },
  { name: "Drotin Plus Tablet", generic: "DROTAVERINE (80MG) + PARACETAMOL (500MG)", form: "tablet" },
  { name: "Ultracet Semi Tablet", generic: "PARACETAMOL/ACETAMINOPHEN (162.5MG) + TRAMADOL (18.75MG)", form: "tablet" },
  { name: "Naproxen 250mg Tablet", generic: "NAPROXEN (250MG)", form: "tablet" }
];

const SUGGESTED_DOSES = ["1 Tablet", "2 Tablets", "1 Capsule", "2 Capsules", "1 tsp (5ml)", "2 tsp (10ml)", "1 Drop", "2 Drops", "1 Puff", "2 Puffs"];
const SUGGESTED_FREQS = ["1-1-1", "1-0-1", "1-0-0", "0-1-0", "0-0-1", "Once Daily", "Twice Daily", "Thrice Daily", "As needed (PRN)"];
const SUGGESTED_TIMINGS = ["After Meal", "Before Meal", "Empty Stomach", "With Food", "Bedtime"];
const SUGGESTED_DURATIONS = ["3 Days", "5 Days", "7 Days", "10 Days", "15 Days", "30 Days", "Ongoing"];
const SUGGESTED_STARTS = ["Today", "Tomorrow", "In 2 Days", "In 3 Days"];
const SUGGESTED_INSTRS = ["if pain", "if fever", "before bed", "empty stomach"];

/* ─── Helpers ────────────────────────────────────────────────────── */
const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/* ─── Types ──────────────────────────────────────────────────────── */
interface Medication {
  id: string;
  name: string;
  generic: string;
  form?: string;
  dose: string;
  freq: string;
  timing: string;
  duration: string;
  start: string;
  instr: string;
}

interface MedicationsCardProps {
  medications: Medication[];
  setMedications: React.Dispatch<React.SetStateAction<Medication[]>>;
}

/* ═══════════════════════════════════════════════════════════════════
   Medications Component
═══════════════════════════════════════════════════════════════════ */
export default function MedicationsCard({ medications, setMedications }: MedicationsCardProps) {
  /* search bar */
  const [medInput, setMedInput]               = useState("");
  const [medInputFocused, setMedInputFocused] = useState(false);
  const [searchHi, setSearchHi]               = useState(-1);

  /* inline dropdowns highlight */
  const [focusId, setFocusId]       = useState<string | null>(null);
  const [focusField, setFocusField] = useState<string | null>(null);
  const [rowHi, setRowHi]           = useState(-1);

  /* drag */
  const dragIdx = useRef<number | null>(null);

  /* ─── helpers ─── */
  const addMedicine = (med: { name: string; generic: string; form?: string }) => {
    const newMed = {
      id: Date.now().toString(),
      name: med.name,
      generic: med.generic,
      form: med.form ?? "tablet",
      dose: "",
      freq: "",
      timing: "",
      duration: "",
      start: "",
      instr: ""
    };
    setMedications((p) => [...p, newMed]);
    setMedInput("");
    setMedInputFocused(false);
    setSearchHi(-1);
  };

  const patch  = (id: string, diff: Partial<Medication>) => setMedications((p) => p.map((m) => (m.id === id ? { ...m, ...diff } : m)));
  const remove = (id: string) => setMedications((p) => p.filter((m) => m.id !== id));

  /* drag reorder */
  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const r = [...medications]; const [m] = r.splice(dragIdx.current, 1); r.splice(i, 0, m);
    dragIdx.current = i; setMedications(r);
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

  /* search key events */
  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const list = freqMedications.filter((m) => !medInput || m.name.toLowerCase().includes(medInput.toLowerCase()));
    if (e.key === "ArrowDown") { e.preventDefault(); setSearchHi((p) => Math.min(p + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSearchHi((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (searchHi >= 0 && list[searchHi]) addMedicine(list[searchHi]);
      else addMedicine({ name: medInput, generic: "" });
    }
    else if (e.key === "Escape") { setMedInputFocused(false); setSearchHi(-1); }
  };

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm w-full select-none overflow-visible">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2.5 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white text-xs shadow-sm">
            💊
          </div>
          <span className="text-[12px] font-bold text-[#1E293B] tracking-tight">Medications</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#4A5568] bg-[#F1F5F9] px-2.5 py-1 rounded-md border border-[#E2E8F0]">
            <span className="text-slate-400">ⓘ Default Instructions:</span>
            <select className="bg-transparent text-blue-600 cursor-pointer focus:outline-none font-extrabold">
              <option value="off">Off</option>
              <option value="en">English</option>
              <option value="hi">हिंदी - Hindi</option>
            </select>
          </div>
          <button className="w-7 h-7 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center transition-colors">
            <svg className="w-3 h-3 fill-[#94A3B8]" viewBox="0 0 448 512">
              <path d="M224 256c-35.2 0-64 28.8-64 64s28.8 64 64 64 64-28.8 64-64-28.8-64-64-64zm209.1-127L349.2 45.1C341.1 37.1 328.8 32 316.1 32H64C28.7 32 0 60.7 0 96v320c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64V163.9c0-12.7-5.1-25-14.9-34.9zM128 80h144v80H128V80zM400 416c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16h16v88c0 13.3 10.7 24 24 24h192c13.3 0 24-10.7 24-24V85.5l78.3 78.3c.8.8 1.7 2.4 1.7 4.1V416z"/>
            </svg>
          </button>
          <button className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 flex flex-col items-center justify-center text-rose-600 transition-colors relative">
            <span className="text-[9px] font-extrabold">Mx</span>
          </button>
          <button className="w-7 h-7 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Columns Header Grid */}
      <div className="flex items-stretch border-b border-[#E2E8F0] bg-slate-50/50 text-[9px] font-bold text-[#718096] uppercase select-none">
        {/* drag grip blank */}
        <div className="w-7 shrink-0 border-r border-[#E2E8F0]" />
        
        {/* Col 1: Medicine */}
        <div className="w-[27%] shrink-0 border-r border-[#E2E8F0] px-3 py-1.5 flex flex-col justify-center">
          <div>Medicine</div>
          <div className="text-[8px] text-[#A0AEC0] lowercase font-normal">Generic</div>
        </div>
        
        {/* Col 2: Dose */}
        <div className="w-[10%] shrink-0 border-r border-[#E2E8F0] px-3 py-1.5 flex flex-col justify-center">
          <div>Dose</div>
          <div className="text-[8px] text-[#A0AEC0] lowercase font-normal">eg. 1 tablet</div>
        </div>

        {/* Col 3: Frequency */}
        <div className="w-[10%] shrink-0 border-r border-[#E2E8F0] px-3 py-1.5 flex flex-col justify-center">
          <div>Frequency</div>
          <div className="text-[8px] text-[#A0AEC0] lowercase font-normal">eg. 1-0-1 etc</div>
        </div>

        {/* Col 4: Timing */}
        <div className="w-[10%] shrink-0 border-r border-[#E2E8F0] px-3 py-1.5 flex flex-col justify-center">
          <div>Timing</div>
          <div className="text-[8px] text-[#A0AEC0] lowercase font-normal">eg. After meal</div>
        </div>

        {/* Col 5: Duration */}
        <div className="w-[10%] shrink-0 border-r border-[#E2E8F0] px-3 py-1.5 flex flex-col justify-center">
          <div>Duration</div>
          <div className="text-[8px] text-[#A0AEC0] lowercase font-normal">eg. 3 days</div>
        </div>

        {/* Col 6: Start From */}
        <div className="w-[10%] shrink-0 border-r border-[#E2E8F0] px-3 py-1.5 flex flex-col justify-center">
          <div>Start From</div>
          <div className="text-[8px] text-[#A0AEC0] lowercase font-normal">eg. 1, 3, 5 etc</div>
        </div>

        {/* Col 7: Instructions */}
        <div className="w-[18%] shrink-0 border-r border-[#E2E8F0] px-3 py-1.5 flex flex-col justify-center">
          <div>Instructions</div>
          <div className="text-[8px] text-[#A0AEC0] lowercase font-normal">if any..</div>
        </div>

        {/* Action blank */}
        <div className="flex-1" />
      </div>

      {/* Row list */}
      {medications.length > 0 && (
        <div className="p-3 space-y-2">
          {medications.map((med, idx) => (
            <div key={med.id}
              data-drag-row="true"
              draggable="false"
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDragEnd={(e) => { onDragEnd(); e.currentTarget.setAttribute("draggable", "false"); }}
              className="group flex flex-col w-full text-left"
            >
              <div className="flex items-stretch border border-[#E2E8F0] rounded-lg bg-white overflow-visible min-h-[58px]">
                
                {/* drag handle */}
                <div
                  onMouseDown={(e) => { const row = e.currentTarget.closest("[data-drag-row]"); if (row) row.setAttribute("draggable", "true"); }}
                  onMouseUp={(e) => { const row = e.currentTarget.closest("[data-drag-row]"); if (row) row.setAttribute("draggable", "false"); }}
                  className="flex items-center justify-center w-7 shrink-0 border-r border-[#E2E8F0] bg-slate-50/50 cursor-grab active:cursor-grabbing text-slate-400"
                >
                  <svg viewBox="0 0 10 16" fill="currentColor" className="w-2.5 h-3.5">
                    <circle cx="2" cy="2" r="1.2"/><circle cx="8" cy="2" r="1.2"/>
                    <circle cx="2" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/>
                    <circle cx="2" cy="14" r="1.2"/><circle cx="8" cy="14" r="1.2"/>
                  </svg>
                </div>

                {/* Col 1: Medicine Input */}
                <div className="w-[27%] shrink-0 border-r border-[#E2E8F0] bg-white px-3 py-1.5 flex flex-col justify-between relative overflow-visible">
                  <div className="flex items-center justify-between w-full">
                    <input type="text" value={med.name}
                      onChange={(e) => patch(med.id, { name: e.target.value })}
                      onFocus={() => { setFocusId(med.id); setFocusField("name"); setRowHi(-1); }}
                      onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                      placeholder="Medicine"
                      className="w-[80%] border-0 focus:ring-0 text-[11px] font-bold text-[#1e293b] bg-transparent outline-none p-0 placeholder:text-slate-300"
                    />
                    {med.form && (
                      <span className="text-[8.5px] text-[#A0AEC0] border border-slate-200 px-1 py-0.2 rounded font-extrabold select-none bg-slate-50 uppercase leading-none">
                        {med.form}
                      </span>
                    )}
                  </div>
                  {med.generic && (
                    <div className="text-[8px] text-[#A0AEC0] font-semibold uppercase leading-tight select-all truncate max-w-[95%]">
                      {med.generic}
                    </div>
                  )}
                  <div className="flex items-center justify-between w-full text-[#A0AEC0] pt-1">
                    <span className="cursor-pointer hover:text-[#4A5568] transition-colors leading-none">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                        <path d="M12 4.5v15m7.5-7.5h-15"/>
                      </svg>
                    </span>
                    <span className="cursor-pointer hover:text-[#4A5568] transition-colors leading-none">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                        <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/>
                      </svg>
                    </span>
                  </div>
                  <InlineDD id={med.id} field="name" opts={freqMedications.map(m => m.name)} val={med.name} />
                </div>

                {/* Col 2: Dose */}
                <div className="relative w-[10%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                  <input type="text" value={med.dose}
                    onChange={(e) => patch(med.id, { dose: e.target.value })}
                    onFocus={() => { setFocusId(med.id); setFocusField("dose"); setRowHi(-1); }}
                    onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                    onKeyDown={(e) => handleRowKey(e, med.id, "dose", SUGGESTED_DOSES, med.dose)}
                    placeholder="e.g 1 Tablet"
                    className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-[#C0CADC]"
                  />
                  <InlineDD id={med.id} field="dose" opts={SUGGESTED_DOSES} val={med.dose} />
                </div>

                {/* Col 3: Frequency */}
                <div className="relative w-[10%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                  <input type="text" value={med.freq}
                    onChange={(e) => patch(med.id, { freq: e.target.value })}
                    onFocus={() => { setFocusId(med.id); setFocusField("freq"); setRowHi(-1); }}
                    onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                    onKeyDown={(e) => handleRowKey(e, med.id, "freq", SUGGESTED_FREQS, med.freq)}
                    placeholder="Frequency"
                    className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-[#C0CADC]"
                  />
                  <InlineDD id={med.id} field="freq" opts={SUGGESTED_FREQS} val={med.freq} />
                </div>

                {/* Col 4: Timing */}
                <div className="relative w-[10%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                  <input type="text" value={med.timing}
                    onChange={(e) => patch(med.id, { timing: e.target.value })}
                    onFocus={() => { setFocusId(med.id); setFocusField("timing"); setRowHi(-1); }}
                    onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                    onKeyDown={(e) => handleRowKey(e, med.id, "timing", SUGGESTED_TIMINGS, med.timing)}
                    placeholder="Timing"
                    className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-[#C0CADC]"
                  />
                  <InlineDD id={med.id} field="timing" opts={SUGGESTED_TIMINGS} val={med.timing} />
                </div>

                {/* Col 5: Duration */}
                <div className="relative w-[10%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                  <input type="text" value={med.duration}
                    onChange={(e) => patch(med.id, { duration: e.target.value })}
                    onFocus={() => { setFocusId(med.id); setFocusField("duration"); setRowHi(-1); }}
                    onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                    onKeyDown={(e) => handleRowKey(e, med.id, "duration", SUGGESTED_DURATIONS, med.duration)}
                    placeholder="Duration"
                    className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-[#C0CADC]"
                  />
                  <InlineDD id={med.id} field="duration" opts={SUGGESTED_DURATIONS} val={med.duration} />
                </div>

                {/* Col 6: Start From */}
                <div className="relative w-[10%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                  <input type="text" value={med.start}
                    onChange={(e) => patch(med.id, { start: e.target.value })}
                    onFocus={() => { setFocusId(med.id); setFocusField("start"); setRowHi(-1); }}
                    onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                    onKeyDown={(e) => handleRowKey(e, med.id, "start", SUGGESTED_STARTS, med.start)}
                    placeholder="eg: 3 day"
                    className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-[#C0CADC]"
                  />
                  <InlineDD id={med.id} field="start" opts={SUGGESTED_STARTS} val={med.start} />
                </div>

                {/* Col 7: Instructions */}
                <div className="relative w-[18%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                  <input type="text" value={med.instr}
                    onChange={(e) => patch(med.id, { instr: e.target.value })}
                    onFocus={() => { setFocusId(med.id); setFocusField("instr"); setRowHi(-1); }}
                    onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                    onKeyDown={(e) => handleRowKey(e, med.id, "instr", SUGGESTED_INSTRS, med.instr)}
                    placeholder="Instructions"
                    className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-[#C0CADC]"
                  />
                  <InlineDD id={med.id} field="instr" opts={SUGGESTED_INSTRS} val={med.instr} />
                </div>

                {/* Col 8: Trash action */}
                <div className="flex-1 flex items-center justify-center bg-white text-slate-300 hover:text-red-500 transition-colors cursor-pointer">
                  <button type="button" onClick={() => remove(med.id)} className="p-1">
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
            placeholder="Start typing Medicines"
            value={medInput}
            onChange={(e) => { setMedInput(e.target.value); setSearchHi(-1); setMedInputFocused(true); }}
            onFocus={() => { setMedInputFocused(true); setSearchHi(-1); }}
            onBlur={() => setTimeout(() => setMedInputFocused(false), 200)}
            onKeyDown={handleSearchKey}
            className="w-full h-8.5 pl-8 pr-14 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[11px] bg-[#FAFBFC] focus:bg-white focus:outline-none placeholder:text-[#C0CADC] font-medium transition-all"
          />
        </div>

        {/* Medicines Dropdown Autocomplete */}
        {medInputFocused && (() => {
          const list = freqMedications.filter((m) => !medInput || m.name.toLowerCase().includes(medInput.toLowerCase()));
          if (!list.length) return null;
          return (
            <div className="absolute left-3 right-3 top-full mt-0.5 z-40 bg-white border border-[#CBD5E0] rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto p-1.5 space-y-1">
              <div className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-bold inline-block select-none mb-1">
                FREQUENTLY PRESCRIBED BY YOU
              </div>
              {list.map((med, i) => (
                <div
                  key={med.name}
                  onMouseDown={() => addMedicine(med)}
                  className={`p-2 text-left rounded cursor-pointer transition-colors border-b border-[#F1F5F9] last:border-b-0
                    ${i === searchHi ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  <div className="text-[11px] font-bold text-[#1e293b]">{med.name}</div>
                  <div className="text-[8px] text-[#A0AEC0] uppercase font-semibold">{med.generic}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </section>
  );
}
