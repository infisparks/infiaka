"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AutoComplete } from "primereact/autocomplete";

/* ─── Helpers ────────────────────────────────────────────────────── */
const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

// Database helper functions
async function fetchOptions(categoryId: number, search: string = "") {
  try {
    let query = supabase
      .from("aka_master_dropdown_catalog")
      .select("value")
      .eq("category_id", categoryId)
      .order("usage_count", { ascending: false })
      .limit(5000);

    if (search) {
      query = query.ilike("value", `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data.map((d: any) => d.value);
  } catch (err) {
    console.error("Error fetching options:", err);
    return [];
  }
}

async function incrementOption(categoryId: number, value: string) {
  if (!value || !value.trim()) return;
  const val = value.trim();
  try {
    const { data } = await supabase
      .from("aka_master_dropdown_catalog")
      .select("id, usage_count")
      .eq("category_id", categoryId)
      .eq("value", val)
      .maybeSingle();

    if (data) {
      await supabase
        .from("aka_master_dropdown_catalog")
        .update({ usage_count: data.usage_count + 1 })
        .eq("id", data.id);
    } else {
      await supabase
        .from("aka_master_dropdown_catalog")
        .insert({ category_id: categoryId, value: val, usage_count: 1 });
    }
  } catch (err) {
    console.error("Error incrementing option:", err);
  }
}

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

/* ─── Reusable chip-tag multi-selector ────────────────────────── */
function ChipTagField({
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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const autoRef = useRef<any>(null);

  const search = (event: { query: string }) => {
    const query = event.query.trim().toLowerCase();
    let results = options
      .filter((o) => o.toLowerCase().includes(query))
      .sort((a, b) => {
        if (!query) return 0;
        const aStarts = a.toLowerCase().startsWith(query);
        const bStarts = b.toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
    const sliced = results.slice(0, 30);
    if (event.query.trim() && !options.some((o) => o.toLowerCase() === query)) {
      setSuggestions([...sliced, `+ Create "${event.query.trim()}"`]);
    } else {
      setSuggestions(sliced);
    }
  };

  const handleChange = (e: { value: string[] }) => {
    if (!e.value) return;
    const lastItem = e.value[e.value.length - 1];
    if (lastItem && lastItem.startsWith('+ Create "')) {
      const match = lastItem.match(/\+ Create "(.*)"/);
      const custom = match ? match[1] : lastItem;
      if (!selected.includes(custom)) {
        onToggle(custom);
      }
    } else {
      const added = e.value.find((x) => !selected.includes(x));
      const removed = selected.find((x) => !e.value.includes(x));
      if (added) onToggle(added);
      if (removed) onToggle(removed);
    }
  };

  const itemTemplate = (item: string) => {
    if (item.startsWith('+ Create "')) {
      const match = item.match(/\+ Create "(.*)"/);
      const custom = match ? match[1] : item;
      return (
        <span className="text-blue-600 font-bold flex items-center gap-1">
          <span>+ Create</span>
          <span className="italic">"{custom}"</span>
        </span>
      );
    }
    return <span>{item}</span>;
  };

  return (
    <div className="space-y-1 relative primereact-autocomplete-custom text-left">
      <label className="block text-[11px] font-semibold text-[#556376]">{label}</label>
      <div className="border border-[#E2E8F0] focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 rounded-md bg-white min-h-[36px] transition-all cursor-text flex items-center">
        <AutoComplete
          ref={autoRef}
          value={selected}
          suggestions={suggestions}
          completeMethod={search}
          onChange={handleChange}
          multiple
          minLength={0}
          onFocus={(e) => {
            search({ query: "" });
            autoRef.current?.search(e, "", "dropdown");
          }}
          itemTemplate={itemTemplate}
          placeholder={selected.length === 0 ? label : ""}
          inputClassName="w-full text-[11px] font-semibold text-[#1e293b] focus:outline-none placeholder:text-[#C0CADC] bg-transparent border-0 shadow-none p-1.5 focus:ring-0"
          className="w-full"
          panelClassName="custom-autocomplete-panel text-[11.5px] font-semibold"
        />
      </div>
    </div>
  );
}

/* ─── Reusable autocomplete text input ───────────────────────── */
function AutoInput({
  label,
  value,
  onChange,
  options,
  placeholder,
  clearable,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  clearable?: boolean;
  onBlur?: (v: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const dropdownClicked = useRef(false);
  const autoRef = useRef<any>(null);

  const search = (event: { query: string }) => {
    const query = event.query.trim().toLowerCase();
    let results = options
      .filter((o) => o.toLowerCase().includes(query))
      .sort((a, b) => {
        if (!query) return 0;
        const aStarts = a.toLowerCase().startsWith(query);
        const bStarts = b.toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
    if (!query || options.some(opt => opt.toLowerCase() === query)) {
      results = options;
    }
    const sliced = results.slice(0, 30);
    if (event.query.trim() && !options.some((o) => o.toLowerCase() === query)) {
      setSuggestions([...sliced, `+ Create "${event.query.trim()}"`]);
    } else {
      setSuggestions(sliced);
    }
  };

  const handleSelect = (e: { value: string }) => {
    const val = e.value;
    dropdownClicked.current = true;
    if (val.startsWith('+ Create "')) {
      const match = val.match(/\+ Create "(.*)"/);
      const custom = match ? match[1] : val;
      onChange(custom);
      if (onBlur) onBlur(custom);
    } else {
      onChange(val);
      if (onBlur) onBlur(val);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setTimeout(() => {
      if (dropdownClicked.current) {
        dropdownClicked.current = false;
        return;
      }
      onChange(val);
      if (onBlur) onBlur(val);
    }, 180);
  };

  const itemTemplate = (item: string) => {
    if (item.startsWith('+ Create "')) {
      const match = item.match(/\+ Create "(.*)"/);
      const custom = match ? match[1] : item;
      return (
        <span className="text-blue-600 font-bold flex items-center gap-1 text-[11px]">
          <span>+ Create</span>
          <span className="italic">"{custom}"</span>
        </span>
      );
    }
    return <span className="text-[11px] font-semibold text-[#334155]">{item}</span>;
  };

  return (
    <div className="space-y-1 relative primereact-autocomplete-custom text-left">
      <label className="block text-[11px] font-semibold text-[#556376]">{label}</label>
      <div className="relative">
        <AutoComplete
          ref={autoRef}
          value={value}
          suggestions={suggestions}
          completeMethod={search}
          onChange={(e) => onChange(e.value)}
          onSelect={handleSelect}
          onBlur={handleBlur}
          minLength={0}
          onFocus={(e) => {
            search({ query: value || "" });
            autoRef.current?.search(e, value || "", "dropdown");
          }}
          itemTemplate={itemTemplate}
          placeholder={placeholder ?? label}
          inputClassName="w-full h-8.5 px-3 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-md text-[11px] bg-white focus:outline-none font-semibold text-[#334155] placeholder:text-[#C0CADC] transition-all"
          className="w-full"
          panelClassName="custom-autocomplete-panel text-[11.5px] font-semibold"
        />
        {clearable && value && (
          <button type="button" onMouseDown={() => onChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] z-10">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path strokeLinecap="round" d="M15 9l-6 6M9 9l6 6"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Reusable autocomplete inline input ───────────────────────── */
function InlineAutoComplete({
  value,
  onChange,
  onBlur,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const dropdownClicked = useRef(false);
  const autoRef = useRef<any>(null);

  const search = (event: { query: string }) => {
    const query = event.query.trim().toLowerCase();
    let results = options
      .filter((o) => o.toLowerCase().includes(query))
      .sort((a, b) => {
        if (!query) return 0;
        const aStarts = a.toLowerCase().startsWith(query);
        const bStarts = b.toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
    if (!query || options.some(opt => opt.toLowerCase() === query)) {
      results = options;
    }
    const sliced = results.slice(0, 30);
    if (event.query.trim() && !options.some((o) => o.toLowerCase() === query)) {
      setSuggestions([...sliced, `+ Create "${event.query.trim()}"`]);
    } else {
      setSuggestions(sliced);
    }
  };

  const handleSelect = (e: { value: string }) => {
    const val = e.value;
    dropdownClicked.current = true;
    if (val.startsWith('+ Create "')) {
      const match = val.match(/\+ Create "(.*)"/);
      const custom = match ? match[1] : val;
      onChange(custom);
      onBlur(custom);
    } else {
      onChange(val);
      onBlur(val);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setTimeout(() => {
      if (dropdownClicked.current) {
        dropdownClicked.current = false;
        return;
      }
      onChange(val);
      onBlur(val);
    }, 180);
  };

  const itemTemplate = (item: string) => {
    if (item.startsWith('+ Create "')) {
      const match = item.match(/\+ Create "(.*)"/);
      const custom = match ? match[1] : item;
      return (
        <span className="text-blue-600 font-bold flex items-center gap-1 text-[11px]">
          <span>+ Create</span>
          <span className="italic">"{custom}"</span>
        </span>
      );
    }
    return <span className="text-[11px] font-semibold text-[#334155]">{item}</span>;
  };

  return (
    <div className="w-full h-full relative primereact-autocomplete-inline">
      <AutoComplete
        ref={autoRef}
        value={value}
        suggestions={suggestions}
        completeMethod={search}
        onChange={(e) => onChange(e.value)}
        onSelect={handleSelect}
        onBlur={handleBlur}
        minLength={0}
        onFocus={(e) => {
          search({ query: value || "" });
          autoRef.current?.search(e, value || "", "dropdown");
        }}
        itemTemplate={itemTemplate}
        placeholder={placeholder}
        inputClassName="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#1e293b] bg-transparent outline-none placeholder:text-slate-300"
        className="w-full h-full"
        panelClassName="custom-autocomplete-panel text-[11.5px] font-semibold"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Diagnosis Component
═══════════════════════════════════════════════════════════════════ */
export default function DiagnosisCard({ diagnoses, setDiagnoses }: DiagnosisCardProps) {
  // Option Suggestion Lists from Supabase
  const [diagnosisOptions, setDiagnosisOptions] = useState<string[]>([]);
  const [sinceOptions, setSinceOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [severityOptions, setSeverityOptions] = useState<string[]>([]);
  const [regionOptions, setRegionOptions] = useState<string[]>([]);
  const [painOptions, setPainOptions] = useState<string[]>([]);
  const [relievedOptions, setRelievedOptions] = useState<string[]>([]);
  const [tendernessOptions, setTendernessOptions] = useState<string[]>([]);
  const [palpationOptions, setPalpationOptions] = useState<string[]>([]);
  const [auscultationOptions, setAuscultationOptions] = useState<string[]>([]);
  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [notesOptions, setNotesOptions] = useState<string[]>([]);

  // Fetch initial suggestion options from Supabase on mount
  const refreshAllOptions = async () => {
    setDiagnosisOptions(await fetchOptions(8));
    setSinceOptions(await fetchOptions(9));
    setStatusOptions(await fetchOptions(10));
    setSeverityOptions(await fetchOptions(11));
    setRegionOptions(await fetchOptions(12));
    setPainOptions(await fetchOptions(13));
    setRelievedOptions(await fetchOptions(14));
    setTendernessOptions(await fetchOptions(15));
    setPalpationOptions(await fetchOptions(16));
    setAuscultationOptions(await fetchOptions(17));
    setCourseOptions(await fetchOptions(18));
    setNotesOptions(await fetchOptions(19));
  };

  useEffect(() => {
    refreshAllOptions();
  }, []);

  /* search bar */
  const [searchVal, setSearchVal]   = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHi, setSearchHi]     = useState(-1);

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
  const addDiagnosis = async (name: string) => {
    if (!name.trim()) return;
    const cleanName = name.trim();
    setDiagnoses((p) => [...p, { id: "temp_" + Date.now(), name: cleanName, since: "", status: "" }]);
    setSearchVal(""); setSearchOpen(false); setSearchHi(-1);

    // Save selection / create custom option in Supabase
    await incrementOption(8, cleanName);
    // Refresh suggestions list
    setDiagnosisOptions(await fetchOptions(8));
  };

  const dropdownClicked = useRef(false);

  const patch  = (id: string, diff: Partial<Diagnosis>) => setDiagnoses((p) => p.map((d) => (d.id === id ? { ...d, ...diff } : d)));
  
  const handleInputBlur = async (categoryId: number, value: string) => {
    if (!value || !value.trim()) return;
    setTimeout(async () => {
      if (dropdownClicked.current) {
        dropdownClicked.current = false;
        return;
      }
      await incrementOption(categoryId, value.trim());
      refreshAllOptions();
    }, 180);
  };

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

  /* search key actions */
  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const query = searchVal.trim().toLowerCase();
    const list = diagnosisOptions
      .filter((o) => !query || o.toLowerCase().includes(query))
      .sort((a, b) => {
        if (!query) return 0;
        const aStarts = a.toLowerCase().startsWith(query);
        const bStarts = b.toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      })
      .slice(0, 30);
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
                    <InlineAutoComplete
                      value={diag.name}
                      onChange={(v) => patch(diag.id, { name: v })}
                      onBlur={(v) => handleInputBlur(8, v)}
                      options={diagnosisOptions}
                      placeholder="Diagnosis"
                    />
                  </div>

                  {/* since (18%) */}
                  <div className="relative w-[18%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                    <InlineAutoComplete
                      value={diag.since}
                      onChange={(v) => patch(diag.id, { since: v })}
                      onBlur={(v) => handleInputBlur(9, v)}
                      options={sinceOptions}
                      placeholder="Since"
                    />
                  </div>

                  {/* status (18%) */}
                  <div className="relative w-[18%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                    <InlineAutoComplete
                      value={diag.status}
                      onChange={(v) => patch(diag.id, { status: v })}
                      onBlur={(v) => handleInputBlur(10, v)}
                      options={statusOptions}
                      placeholder="Status"
                    />
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
          const query = searchVal.trim().toLowerCase();
          const list = diagnosisOptions
            .filter((o) => !query || o.toLowerCase().includes(query))
            .sort((a, b) => {
              if (!query) return 0;
              const aStarts = a.toLowerCase().startsWith(query);
              const bStarts = b.toLowerCase().startsWith(query);
              if (aStarts && !bStarts) return -1;
              if (!aStarts && bStarts) return 1;
              return 0;
            })
            .slice(0, 30);
          const hasCustomVal = searchVal.trim() && !diagnosisOptions.some(o => o.toLowerCase() === searchVal.trim().toLowerCase());
          if (list.length === 0 && !hasCustomVal) return null;
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
              {hasCustomVal && (
                <div
                  onMouseDown={() => addDiagnosis(searchVal)}
                  className="px-3 py-2.5 text-[11.5px] font-bold text-blue-600 hover:bg-blue-50 border-t border-[#F8FAFC] cursor-pointer flex items-center gap-2.5"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-extrabold text-blue-700 shrink-0 leading-none">
                    +
                  </div>
                  <span>Create "{searchVal.trim()}"</span>
                </div>
              )}
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
              <AutoInput
                label="Severity"
                value={mSeverity}
                onChange={setMSeverity}
                onBlur={async (v) => {
                  if (v && v.trim()) {
                    await incrementOption(11, v.trim());
                    refreshAllOptions();
                  }
                }}
                options={severityOptions}
                placeholder="Severity"
              />

              {/* 2. Select Abdominal region */}
              <ChipTagField
                label="Select Abdominal region"
                options={regionOptions}
                selected={mRegions}
                onToggle={async (v) => {
                  const isAdding = !mRegions.includes(v);
                  setMRegions((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
                  if (isAdding) {
                    await incrementOption(12, v);
                    refreshAllOptions();
                  }
                }}
              />

              {/* 3. Select Type of pain */}
              <ChipTagField
                label="Select Type of pain"
                options={painOptions}
                selected={mPainTypes}
                onToggle={async (v) => {
                  const isAdding = !mPainTypes.includes(v);
                  setMPainTypes((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
                  if (isAdding) {
                    await incrementOption(13, v);
                    refreshAllOptions();
                  }
                }}
              />

              {/* 4. Select Abdominal symptom relieved by */}
              <ChipTagField
                label="Select Abdominal symptom relieved by"
                options={relievedOptions}
                selected={mRelieved}
                onToggle={async (v) => {
                  const isAdding = !mRelieved.includes(v);
                  setMRelieved((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
                  if (isAdding) {
                    await incrementOption(14, v);
                    refreshAllOptions();
                  }
                }}
              />

              {/* 5. Abdominal tenderness */}
              <AutoInput
                label="Abdominal tenderness"
                value={mTenderness}
                onChange={setMTenderness}
                onBlur={async (v) => {
                  if (v && v.trim()) {
                    await incrementOption(15, v.trim());
                    refreshAllOptions();
                  }
                }}
                options={tendernessOptions}
                placeholder="Abdominal tenderness"
              />

              {/* 6. Select Per abdomen palpation */}
              <ChipTagField
                label="Select Per abdomen palpation"
                options={palpationOptions}
                selected={mPalpations}
                onToggle={async (v) => {
                  const isAdding = !mPalpations.includes(v);
                  setMPalpations((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
                  if (isAdding) {
                    await incrementOption(16, v);
                    refreshAllOptions();
                  }
                }}
              />

              {/* 7. Select Abdomen auscultatory finding */}
              <ChipTagField
                label="Select Abdomen auscultatory finding"
                options={auscultationOptions}
                selected={mAuscultations}
                onToggle={async (v) => {
                  const isAdding = !mAuscultations.includes(v);
                  setMAuscultations((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
                  if (isAdding) {
                    await incrementOption(17, v);
                    refreshAllOptions();
                  }
                }}
              />

              {/* 8. Clinical course */}
              <AutoInput
                label="Clinical course"
                value={mCourse}
                onChange={setMCourse}
                onBlur={async (v) => {
                  if (v && v.trim()) {
                    await incrementOption(18, v.trim());
                    refreshAllOptions();
                  }
                }}
                options={courseOptions}
                placeholder="Clinical course"
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
                  <textarea rows={3} value={mNote}
                    onChange={(e) => setMNote(e.target.value)}
                    onBlur={async (e) => {
                      const v = e.target.value.trim();
                      if (v) {
                        await incrementOption(19, v);
                        refreshAllOptions();
                      }
                    }}
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
