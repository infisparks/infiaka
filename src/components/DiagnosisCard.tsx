"use client";

import React, { useState, useRef } from "react";

/* ─── Static suggestion lists ────────────────────────────────────── */
const SUGGESTED_DIAGNOSES = [
  "Period pain",
  "Head Pain",
  "Body Pain",
  "Fever",
  "Cough",
  "Migraine",
  "Essential hypertension",
  "Type 2 diabetes mellitus",
  "Gastro-esophageal reflux disease",
  "Acute upper respiratory infection",
];

const SUGGESTED_SINCE = [
  "Since childhood",
  "1 Day",
  "2 Days",
  "1 Week",
  "2 Weeks",
  "1 Month",
  "3 Months",
  "6 Months",
  "1 Year",
];

const SUGGESTED_STATUS = [
  "Active",
  "Suspected",
  "Resolved",
  "Chronic",
];

const SUGGESTED_SEVERITIES = ["Mild", "Moderate", "Severe"];

const SUGGESTED_ABDOMINAL_REGIONS = [
  "Umbilical region",
  "Left hypochondriac region",
  "Epigastric region",
  "Suprapubic / Hypogastric region",
  "Right upper quadrant (RUQ)",
  "Left upper quadrant (LUQ)",
  "Right lower quadrant (RLQ)",
  "Left lower quadrant (LLQ)",
  "Generalized abdomen"
];

const SUGGESTED_PAIN_TYPES = [
  "Burning pain",
  "Shooting pain",
  "Stabbing pain",
  "Throbbing pain",
  "Cramping pain",
  "Dull pain",
  "Tingling pain",
  "Colicky pain"
];

const SUGGESTED_RELIEVED_BY = [
  "Pain relief by medicine",
  "Rest",
  "Warm compress",
  "Defecation / Passing gas",
  "Eating food",
  "Vomiting"
];

const SUGGESTED_TENDERNESS = [
  "Absent",
  "Present",
  "Rebound tenderness",
  "Guarding",
  "Rigidity"
];

const SUGGESTED_PALPATIONS = [
  "Abdominal guarding",
  "Fluid thrill in abdomen",
  "Splenomegaly",
  "Soft, non-tender",
  "Soft, mild tenderness",
  "Rigidity present",
  "Distended abdomen"
];

const SUGGESTED_AUSCULTATIONS = [
  "Normal bowel sounds",
  "Borborygmi",
  "Hyperactive bowel sounds",
  "Hypoactive bowel sounds",
  "Absent bowel sounds"
];

const CLINICAL_COURSES = [
  "Acute",
  "Subacute",
  "Chronic",
  "Recurrent",
  "Acute-on-chronic",
  "Intermittent",
  "Progressive",
  "Seasonal"
];

/* ─── Helpers ────────────────────────────────────────────────────── */
const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/* ─── Types ──────────────────────────────────────────────────────── */
interface Diagnosis {
  id: string;
  name: string;
  since: string;
  status: string;
  severity?: string;
  abdominalRegions?: string[];
  painTypes?: string[];
  relievedBy?: string[];
  abdominalTenderness?: string;
  palpations?: string[];
  auscultations?: string[];
  clinicalCourse?: string;
  note?: string;
}

interface DiagnosisCardProps {
  diagnoses: Diagnosis[];
  setDiagnoses: React.Dispatch<React.SetStateAction<Diagnosis[]>>;
}

/* ─── Reusable autocomplete text input for modal ─────────────────── */
function ModalAutoInput({
  label,
  value,
  onChange,
  options,
  placeholder,
  hasChevron,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  hasChevron?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi]     = useState(-1);

  const filtered = options.filter(
    (o) => !value || o.toLowerCase().includes(value.toLowerCase())
  );

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((p) => Math.min(p + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp")  { e.preventDefault(); setHi((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter")    { e.preventDefault(); if (hi >= 0 && filtered[hi]) { onChange(filtered[hi]); setHi(-1); setOpen(false); } }
    else if (e.key === "Escape")   { setOpen(false); setHi(-1); }
  };

  return (
    <div className="space-y-1 relative text-left">
      <label className="block text-[11px] font-semibold text-[#556376]">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setHi(-1); setOpen(true); }}
          onFocus={() => { setOpen(true); setHi(-1); }}
          onBlur={() => setTimeout(() => { setOpen(false); setHi(-1); }, 160)}
          onKeyDown={handleKey}
          placeholder={placeholder ?? label}
          className="w-full h-8.5 px-3 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-md text-[11px] bg-white focus:outline-none font-semibold text-[#334155] placeholder:text-[#C0CADC] transition-all"
        />
        {hasChevron && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        )}
        {open && filtered.length > 0 && (
          <div className="absolute left-0 top-full mt-1 z-[60] w-full bg-white border border-[#E2E8F0] rounded-lg shadow-xl overflow-hidden max-h-40 overflow-y-auto">
            {filtered.map((opt, i) => (
              <div key={opt}
                onMouseDown={() => { onChange(opt); setOpen(false); setHi(-1); }}
                className={`px-3 py-2 text-[11px] font-semibold cursor-pointer border-b border-[#F8FAFC] last:border-b-0 transition-colors
                  ${i === hi ? "bg-blue-50 text-blue-700" : "hover:bg-[#F8FAFC] text-[#334155]"}`}
              >{opt}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Reusable chip-tag multi-selector for modal ─────────────────── */
function ModalChipTagField({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen]     = useState(false);
  const [hi, setHi]         = useState(-1);

  const filtered = options.filter(
    (o) => !search || o.toLowerCase().includes(search.toLowerCase())
  );

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((p) => Math.min(p + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp")  { e.preventDefault(); setHi((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter")    { e.preventDefault(); if (hi >= 0 && filtered[hi]) { onToggle(filtered[hi]); setSearch(""); setHi(-1); } }
    else if (e.key === "Escape")   { setOpen(false); setHi(-1); }
  };

  return (
    <div className="space-y-1 relative text-left">
      <label className="block text-[11px] font-semibold text-[#556376]">{label}</label>
      <div
        className="border border-[#E2E8F0] focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 rounded-md p-1.5 flex flex-wrap gap-1.5 bg-white min-h-[38px] transition-all cursor-text"
        onClick={() => setOpen(true)}
      >
        {selected.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 bg-slate-50 text-[#334155] border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded select-none">
            {v}
            <button type="button" onMouseDown={(e) => { e.stopPropagation(); onToggle(v); }}
              className="text-slate-400 hover:text-red-500 font-bold leading-none text-[12px]">×</button>
          </span>
        ))}
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setHi(-1); setOpen(true); }}
          onFocus={() => { setOpen(true); setHi(-1); }}
          onBlur={() => setTimeout(() => { setOpen(false); setHi(-1); }, 160)}
          onKeyDown={handleKey}
          placeholder={selected.length === 0 ? label : ""}
          className="flex-1 bg-transparent min-w-[100px] text-[11px] font-semibold text-[#1e293b] focus:outline-none placeholder:text-[#C0CADC]"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-[60] w-full bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto">
          {filtered.map((opt, i) => (
            <div key={opt}
              onMouseDown={() => { onToggle(opt); setSearch(""); setHi(-1); }}
              className={`px-3 py-2 text-[11px] font-semibold cursor-pointer border-b border-[#F8FAFC] last:border-b-0 flex items-center justify-between transition-colors
                ${i === hi ? "bg-blue-50 text-blue-700" : selected.includes(opt) ? "bg-purple-50 text-purple-700" : "hover:bg-[#F8FAFC] text-[#334155]"}`}
            >
              {opt}
              {selected.includes(opt) && (
                <svg className="w-3 h-3 fill-current shrink-0" viewBox="0 0 20 20">
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Diagnosis Component
═══════════════════════════════════════════════════════════════════ */
export default function DiagnosisCard({ diagnoses, setDiagnoses }: DiagnosisCardProps) {
  /* search bar */
  const [searchVal, setSearchVal]   = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHi, setSearchHi]     = useState(-1);

  /* inline row highlight dropdowns */
  const [focusId, setFocusId]       = useState<string | null>(null);
  const [focusField, setFocusField] = useState<string | null>(null);
  const [rowHi, setRowHi]           = useState(-1);

  /* drag */
  const dragIdx = useRef<number | null>(null);

  /* modal options */
  const [modalId, setModalId]             = useState<string | null>(null);
  const [mSeverity, setMSeverity]         = useState("");
  const [mRegions, setMRegions]           = useState<string[]>([]);
  const [mPainTypes, setMPainTypes]       = useState<string[]>([]);
  const [mRelieved, setMRelieved]         = useState<string[]>([]);
  const [mTenderness, setMTenderness]     = useState("");
  const [mPalpations, setMPalpations]     = useState<string[]>([]);
  const [mAuscultations, setMAuscultations] = useState<string[]>([]);
  const [mCourse, setMCourse]             = useState("");
  const [mNote, setMNote]                 = useState("");

  /* ─── helpers ─── */
  const addDiagnosis = (name: string) => {
    if (!name.trim()) return;
    setDiagnoses((p) => [...p, { id: Date.now().toString(), name: name.trim(), since: "", status: "" }]);
    setSearchVal(""); setSearchOpen(false); setSearchHi(-1);
  };
  const patch  = (id: string, diff: Partial<Diagnosis>) => setDiagnoses((p) => p.map((d) => (d.id === id ? { ...d, ...diff } : d)));
  const remove = (id: string) => setDiagnoses((p) => p.filter((d) => d.id !== id));

  /* drag and drop */
  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const r = [...diagnoses]; const [m] = r.splice(dragIdx.current, 1); r.splice(i, 0, m);
    dragIdx.current = i; setDiagnoses(r);
  };
  const onDragEnd = () => { dragIdx.current = null; };

  /* modal helper actions */
  const openModal = (d: Diagnosis) => {
    setModalId(d.id);
    setMSeverity(d.severity ?? "");
    setMRegions(d.abdominalRegions ?? []);
    setMPainTypes(d.painTypes ?? []);
    setMRelieved(d.relievedBy ?? []);
    setMTenderness(d.abdominalTenderness ?? "");
    setMPalpations(d.palpations ?? []);
    setMAuscultations(d.auscultations ?? []);
    setMCourse(d.clinicalCourse ?? "");
    setMNote(d.note ?? "");
  };

  const saveModal = () => {
    if (!modalId) return;
    patch(modalId, {
      severity: mSeverity,
      abdominalRegions: mRegions,
      painTypes: mPainTypes,
      relievedBy: mRelieved,
      abdominalTenderness: mTenderness,
      palpations: mPalpations,
      auscultations: mAuscultations,
      clinicalCourse: mCourse,
      note: mNote,
    });
    setModalId(null);
  };

  const activeDiag = diagnoses.find((d) => d.id === modalId);

  /* inline dropdown keyboard navigation */
  const InlineDD = ({ id, field, opts, val }: { id: string; field: string; opts: string[]; val: string }) => {
    if (focusId !== id || focusField !== field) return null;
    const list = opts.filter((o) => !val || o.toLowerCase().includes(val.toLowerCase()));
    if (!list.length) return null;
    return (
      <div className="absolute left-0 top-full mt-0.5 z-40 w-full min-w-[120px] bg-white border border-[#E2E8F0] rounded-lg shadow-xl overflow-hidden max-h-44 overflow-y-auto">
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
    const list = SUGGESTED_DIAGNOSES.filter((o) => !searchVal || o.toLowerCase().includes(searchVal.toLowerCase()));
    if (e.key === "ArrowDown") { e.preventDefault(); setSearchHi((p) => Math.min(p + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSearchHi((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (searchHi >= 0 && list[searchHi]) addDiagnosis(list[searchHi]);
      else addDiagnosis(searchVal);
    }
    else if (e.key === "Escape") { setSearchOpen(false); setSearchHi(-1); }
  };

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm w-full select-none overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-sm text-white text-xs">
            📋
          </div>
          <span className="text-[12px] font-bold text-[#1E293B] tracking-tight">Diagnosis</span>
          <span className="text-[9px] bg-purple-50 text-purple-600 border border-purple-200 px-1.5 py-0.5 rounded font-bold tracking-widest uppercase">ICD-10</span>
        </div>
        <div className="flex items-center space-x-3 mr-2">
          <button className="w-7 h-7 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center transition-colors">
            <svg className="w-3 h-3 fill-[#94A3B8]" viewBox="0 0 448 512">
              <path d="M224 256c-35.2 0-64 28.8-64 64s28.8 64 64 64 64-28.8 64-64-28.8-64-64-64zm209.1-127L349.2 45.1C341.1 37.1 328.8 32 316.1 32H64C28.7 32 0 60.7 0 96v320c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64V163.9c0-12.7-5.1-25-14.9-34.9zM128 80h144v80H128V80zM400 416c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16h16v88c0 13.3 10.7 24 24 24h192c13.3 0 24-10.7 24-24V85.5l78.3 78.3c.8.8 1.7 2.4 1.7 4.1V416z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Rows */}
      {diagnoses.length > 0 && (
        <div className="p-3 space-y-2">
          {diagnoses.map((diag, idx) => {
            const hasDetails = diag.severity || (diag.abdominalRegions?.length ?? 0) > 0 || (diag.painTypes?.length ?? 0) > 0 || (diag.relievedBy?.length ?? 0) > 0 || diag.abdominalTenderness || (diag.palpations?.length ?? 0) > 0 || (diag.auscultations?.length ?? 0) > 0 || diag.clinicalCourse || diag.note;

            return (
              <div key={diag.id}
                data-drag-row="true"
                draggable="false"
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragEnd={(e) => { onDragEnd(); e.currentTarget.setAttribute("draggable", "false"); }}
                className="group flex flex-col w-full"
              >
                <div className="flex items-stretch border border-[#E2E8F0] rounded-lg bg-white overflow-visible h-9">
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

                  {/* diagnosis name (35%) */}
                  <div className="relative w-[35%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                    <input type="text" value={diag.name}
                      onChange={(e) => patch(diag.id, { name: e.target.value })}
                      onFocus={() => { setFocusId(diag.id); setFocusField("name"); setRowHi(-1); }}
                      onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                      onKeyDown={(e) => handleRowKey(e, diag.id, "name", SUGGESTED_DIAGNOSES, diag.name)}
                      placeholder="Diagnosis"
                      className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#1e293b] bg-transparent outline-none placeholder:text-slate-300"
                    />
                    <InlineDD id={diag.id} field="name" opts={SUGGESTED_DIAGNOSES} val={diag.name} />
                  </div>

                  {/* since (18%) */}
                  <div className="relative w-[18%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                    <input type="text" value={diag.since}
                      onChange={(e) => patch(diag.id, { since: e.target.value })}
                      onFocus={() => { setFocusId(diag.id); setFocusField("since"); setRowHi(-1); }}
                      onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                      onKeyDown={(e) => handleRowKey(e, diag.id, "since", SUGGESTED_SINCE, diag.since)}
                      placeholder="Since"
                      className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-slate-350"
                    />
                    <InlineDD id={diag.id} field="since" opts={SUGGESTED_SINCE} val={diag.since} />
                  </div>

                  {/* status (18%) */}
                  <div className="relative w-[18%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                    <input type="text" value={diag.status}
                      onChange={(e) => patch(diag.id, { status: e.target.value })}
                      onFocus={() => { setFocusId(diag.id); setFocusField("status"); setRowHi(-1); }}
                      onBlur={() => setTimeout(() => { setFocusId(null); setFocusField(null); setRowHi(-1); }, 160)}
                      onKeyDown={(e) => handleRowKey(e, diag.id, "status", SUGGESTED_STATUS, diag.status)}
                      placeholder="Status"
                      className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-slate-350"
                    />
                    <InlineDD id={diag.id} field="status" opts={SUGGESTED_STATUS} val={diag.status} />
                  </div>

                  {/* more options (18%) */}
                  <div className="w-[18%] shrink-0 border-r border-[#E2E8F0] flex items-center justify-center bg-white px-2">
                    <button type="button" onClick={() => openModal(diag)}
                      className="w-full h-6 border border-blue-400 hover:bg-blue-50 text-[9px] font-bold text-blue-500 rounded transition-colors uppercase tracking-wider leading-none"
                    >More Options</button>
                  </div>

                  {/* trash */}
                  <div className="flex-1 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors cursor-pointer bg-white">
                    <button type="button" onClick={() => remove(diag.id)} className="p-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* saved details badge row */}
                {hasDetails && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5 pl-9">
                    {diag.severity && (
                      <span className="text-[9px] font-bold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded leading-none">{diag.severity}</span>
                    )}
                    {diag.abdominalRegions && diag.abdominalRegions.length > 0 && (
                      <span className="text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded leading-none">Region: {diag.abdominalRegions.join(", ")}</span>
                    )}
                    {diag.painTypes && diag.painTypes.length > 0 && (
                      <span className="text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded leading-none">Pain: {diag.painTypes.join(", ")}</span>
                    )}
                    {diag.relievedBy && diag.relievedBy.length > 0 && (
                      <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded leading-none">Relieved: {diag.relievedBy.join(", ")}</span>
                    )}
                    {diag.abdominalTenderness && (
                      <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded leading-none">Tenderness: {diag.abdominalTenderness}</span>
                    )}
                    {diag.palpations && diag.palpations.length > 0 && (
                      <span className="text-[9px] font-bold bg-pink-50 text-pink-700 border border-pink-200 px-1.5 py-0.5 rounded leading-none">Palpation: {diag.palpations.join(", ")}</span>
                    )}
                    {diag.auscultations && diag.auscultations.length > 0 && (
                      <span className="text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded leading-none">Auscultation: {diag.auscultations.join(", ")}</span>
                    )}
                    {diag.clinicalCourse && (
                      <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded leading-none">{diag.clinicalCourse}</span>
                    )}
                    {diag.note && (
                      <span className="text-[9px] font-bold text-[#64748b] italic truncate max-w-[200px]" title={diag.note}>Note: {diag.note}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Search Input */}
      <div className="relative px-3 py-2.5 border-t border-[#F8FAFC]">
        <div className="relative flex items-center">
          <svg className="absolute left-2.5 w-3 h-3 fill-[#CBD5E0] pointer-events-none" viewBox="0 0 512 512">
            <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z"/>
          </svg>
          <input
            type="text"
            placeholder="Start typing Diagnosis"
            value={searchVal}
            onChange={(e) => { setSearchVal(e.target.value); setSearchHi(-1); setSearchOpen(true); }}
            onFocus={() => { setSearchOpen(true); setSearchHi(-1); }}
            onBlur={() => setTimeout(() => { setSearchOpen(false); setSearchHi(-1); }, 160)}
            onKeyDown={handleSearchKey}
            className="w-full h-8.5 pl-8 pr-14 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[11px] bg-[#FAFBFC] focus:bg-white focus:outline-none placeholder:text-[#C0CADC] font-medium transition-all"
          />
          {searchVal.trim() && (
            <button type="button" onClick={() => addDiagnosis(searchVal)}
              className="absolute right-2 text-blue-600 hover:text-blue-700 text-[10px] font-bold tracking-wide">+ Add</button>
          )}
        </div>

        {searchOpen && (() => {
          const list = SUGGESTED_DIAGNOSES.filter((o) => !searchVal || o.toLowerCase().includes(searchVal.toLowerCase()));
          if (!list.length) return null;
          return (
            <div className="absolute left-3 right-3 top-full mt-0.5 z-40 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
              {list.map((opt, i) => (
                <div key={opt} onMouseDown={() => addDiagnosis(opt)}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer border-b border-[#F8FAFC] last:border-b-0 transition-colors
                    ${i === searchHi ? "bg-blue-50" : "hover:bg-[#F8FAFC]"}`}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-[8px] font-extrabold text-purple-750 shrink-0 leading-none">
                    {initials(opt) || "Dx"}
                  </div>
                  <span className="text-[11.5px] font-semibold text-[#1E293B]">{opt}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ══ DIAGNOSIS DETAILED POPUP MODAL (Matching Screenshot) ══ */}
      {modalId && activeDiag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] px-4">
          <div className="bg-white w-full max-w-[440px] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[88vh] border border-[#E2E8F0]">
            
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[#F1F5F9] flex items-center justify-between shrink-0 bg-[#FAFBFC]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-[10px] font-extrabold text-purple-750 shrink-0">
                  {initials(activeDiag.name) || "Dx"}
                </div>
                <div>
                  <p className="text-[13px] font-extrabold text-[#1E293B] leading-none">{activeDiag.name || "Diagnosis"}</p>
                  {(activeDiag.since || activeDiag.status) && (
                    <p className="text-[10px] text-[#94A3B8] font-medium mt-0.5">
                      {[activeDiag.since, activeDiag.status].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => setModalId(null)}
                className="w-7 h-7 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#94A3B8] hover:text-[#475569] transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-left">
              
              {/* 1. Severity */}
              <ModalAutoInput
                label="Severity"
                value={mSeverity}
                onChange={setMSeverity}
                options={SUGGESTED_SEVERITIES}
                placeholder="Severity"
                hasChevron
              />

              {/* 2. Select Abdominal region */}
              <ModalChipTagField
                label="Select Abdominal region"
                options={SUGGESTED_ABDOMINAL_REGIONS}
                selected={mRegions}
                onToggle={(v) => setMRegions((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v])}
              />

              {/* 3. Select Type of pain */}
              <ModalChipTagField
                label="Select Type of pain"
                options={SUGGESTED_PAIN_TYPES}
                selected={mPainTypes}
                onToggle={(v) => setMPainTypes((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v])}
              />

              {/* 4. Select Abdominal symptom relieved by */}
              <ModalChipTagField
                label="Select Abdominal symptom relieved by"
                options={SUGGESTED_RELIEVED_BY}
                selected={mRelieved}
                onToggle={(v) => setMRelieved((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v])}
              />

              {/* 5. Abdominal tenderness */}
              <ModalAutoInput
                label="Abdominal tenderness"
                value={mTenderness}
                onChange={setMTenderness}
                options={SUGGESTED_TENDERNESS}
                placeholder="Abdominal tenderness"
                hasChevron
              />

              {/* 6. Select Per abdomen palpation */}
              <ModalChipTagField
                label="Select Per abdomen palpation"
                options={SUGGESTED_PALPATIONS}
                selected={mPalpations}
                onToggle={(v) => setMPalpations((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v])}
              />

              {/* 7. Select Abdomen auscultatory finding */}
              <ModalChipTagField
                label="Select Abdomen auscultatory finding"
                options={SUGGESTED_AUSCULTATIONS}
                selected={mAuscultations}
                onToggle={(v) => setMAuscultations((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v])}
              />

              {/* 8. Clinical course */}
              <ModalAutoInput
                label="Clinical course"
                value={mCourse}
                onChange={setMCourse}
                options={CLINICAL_COURSES}
                placeholder="Clinical course"
                hasChevron
              />

              {/* 9. Note */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-[#64748B]">Note</label>
                  <span className="text-[9px] text-[#CBD5E0]">ⓘ</span>
                </div>
                <div className="border border-[#E2E8F0] focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 rounded-lg overflow-hidden bg-white transition-all">
                  <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#F1F5F9] bg-[#FAFBFC]">
                    <button type="button" className="w-6 h-5 flex items-center justify-center text-[11px] font-extrabold text-[#94A3B8] hover:bg-[#E2E8F0] rounded">B</button>
                    <button type="button" className="w-6 h-5 flex items-center justify-center text-[11px] italic font-bold text-[#94A3B8] hover:bg-[#E2E8F0] rounded">I</button>
                    <button type="button" className="w-6 h-5 flex items-center justify-center text-[10px] text-[#94A3B8] hover:bg-[#E2E8F0] rounded">≡ ▾</button>
                    <div className="flex-1" />
                    <button type="button" className="text-[10px] text-[#CBD5E0] hover:text-[#94A3B8] px-1">⤢</button>
                  </div>
                  <textarea rows={3} value={mNote} onChange={(e) => setMNote(e.target.value)}
                    placeholder="Add clinical notes, findings or observations…"
                    className="w-full px-3 py-2 text-[11px] focus:outline-none bg-white font-medium text-[#475569] resize-none placeholder:text-[#CBD5E0]"
                  />
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#F1F5F9] bg-[#FAFBFC] flex items-center justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setModalId(null)}
                className="px-4 py-1.5 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] rounded-lg transition-all"
              >Cancel</button>
              <button type="button" onClick={saveModal}
                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-[11px] font-extrabold text-white rounded-lg transition-all shadow-sm"
              >Save</button>
            </div>

          </div>
        </div>
      )}
    </section>
  );
}
