"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AutoComplete } from "primereact/autocomplete";

/* ─── Helpers ─────────────────────────────────────────────────── */
const severityColor = (s: string) => {
  const l = s.toLowerCase();
  if (l === "severe") return "bg-red-50 text-red-600 border-red-200";
  if (l === "moderate") return "bg-amber-50 text-amber-600 border-amber-200";
  return "bg-emerald-50 text-emerald-600 border-emerald-200";
};

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
      .limit(1000);

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
    console.error("Error updating dropdown option:", err);
  }
}

/* ─── Types ───────────────────────────────────────────────────── */
interface Symptom {
  id: string;
  name: string;
  duration: string;
  severity: string;
  headacheSites?: string[];
  painTypes?: string[];
  clinicalCourse?: string;
  note?: string;
}

interface SymptomsCardProps {
  symptoms: Symptom[];
  setSymptoms: React.Dispatch<React.SetStateAction<Symptom[]>>;
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
    const slicedResults = results.slice(0, 30);
    if (event.query.trim() && !options.some((o) => o.toLowerCase() === query)) {
      setSuggestions([...slicedResults, `+ Create "${event.query.trim()}"`]);
    } else {
      setSuggestions(slicedResults);
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
    <div className="space-y-1 relative primereact-autocomplete-custom">
      <label className="block text-[11px] font-semibold text-[#64748B]">{label}</label>
      <div className="border border-[#E2E8F0] focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 rounded-lg bg-white min-h-[36px] transition-all cursor-text flex items-center">
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
    const slicedResults = results.slice(0, 30);
    if (event.query.trim() && !options.some((o) => o.toLowerCase() === query)) {
      setSuggestions([...slicedResults, `+ Create "${event.query.trim()}"`]);
    } else {
      setSuggestions(slicedResults);
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
    <div className="space-y-1 relative primereact-autocomplete-custom">
      <label className="block text-[11px] font-semibold text-[#64748B]">{label}</label>
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
          inputClassName="w-full h-9 px-3 pr-8 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[11px] bg-white focus:outline-none font-semibold text-[#334155] placeholder:text-[#C0CADC] transition-all"
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
    const slicedResults = results.slice(0, 30);
    if (event.query.trim() && !options.some((o) => o.toLowerCase() === query)) {
      setSuggestions([...slicedResults, `+ Create "${event.query.trim()}"`]);
    } else {
      setSuggestions(slicedResults);
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
    <div className="w-full h-7 relative primereact-autocomplete-inline">
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
        inputClassName="w-full h-full border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-md text-[11px] px-2 font-semibold text-[#334155] bg-white focus:outline-none placeholder:text-[#CBD5E0] transition-all"
        className="w-full h-full"
        panelClassName="custom-autocomplete-panel text-[11.5px] font-semibold"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════ */
export default function SymptomsCard({ symptoms, setSymptoms }: SymptomsCardProps) {
  // Option Suggestion Lists from Supabase
  const [symptomOptions, setSymptomOptions] = useState<string[]>([]);
  const [durationOptions, setDurationOptions] = useState<string[]>([]);
  const [severityOptions, setSeverityOptions] = useState<string[]>([]);
  const [headacheOptions, setHeadacheOptions] = useState<string[]>([]);
  const [painOptions, setPainOptions] = useState<string[]>([]);
  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [notesOptions, setNotesOptions] = useState<string[]>([]);

  // Fetch initial suggestion options from Supabase on mount
  const refreshAllOptions = async () => {
    setSymptomOptions(await fetchOptions(1));
    setDurationOptions(await fetchOptions(2));
    setSeverityOptions(await fetchOptions(3));
    setHeadacheOptions(await fetchOptions(4));
    setPainOptions(await fetchOptions(5));
    setCourseOptions(await fetchOptions(6));
    setNotesOptions(await fetchOptions(7));
  };

  useEffect(() => {
    refreshAllOptions();
  }, []);

  /* search bar */
  const [searchVal, setSearchVal] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHi, setSearchHi] = useState(-1);



  /* drag */
  const dragIdx = useRef<number | null>(null);

  /* modal */
  const [modalId, setModalId] = useState<string | null>(null);
  const [mSeverity, setMSeverity] = useState("");
  const [mHeadache, setMHeadache] = useState<string[]>([]);
  const [mPainTypes, setMPainTypes] = useState<string[]>([]);
  const [mCourse, setMCourse] = useState("");
  const [mNote, setMNote] = useState("");

  /* ─── helpers ─── */
  const addSymptom = async (name: string) => {
    if (!name.trim()) return;
    const cleanName = name.trim();
    setSymptoms((p) => [...p, { id: "temp_" + Date.now(), name: cleanName, duration: "", severity: "" }]);
    setSearchVal("");
    setSearchOpen(false);
    setSearchHi(-1);
    
    // Save selection / create new custom option in Supabase
    await incrementOption(1, cleanName);
    // Refresh suggestions list
    setSymptomOptions(await fetchOptions(1));
  };

  const dropdownClicked = useRef(false);

  const patch = (id: string, diff: Partial<Symptom>) => {
    setSymptoms((p) => p.map((s) => (s.id === id ? { ...s, ...diff } : s)));
  };

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

  const catIdOf = (field: string): number => {
    if (field === "name") return 1;
    if (field === "duration") return 2;
    if (field === "severity") return 3;
    return 1;
  };

  const remove = (id: string) => setSymptoms((p) => p.filter((s) => s.id !== id));

  /* drag */
  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const r = [...symptoms]; const [m] = r.splice(dragIdx.current, 1); r.splice(i, 0, m);
    dragIdx.current = i; setSymptoms(r);
  };
  const onDragEnd = () => { dragIdx.current = null; };

  /* modal */
  const openModal = (sym: Symptom) => {
    setModalId(sym.id);
    setMSeverity(sym.severity ?? "");
    setMHeadache(sym.headacheSites ?? []);
    setMPainTypes(sym.painTypes ?? []);
    setMCourse(sym.clinicalCourse ?? "");
    setMNote(sym.note ?? "");
  };

  const saveModal = () => {
    if (!modalId) return;
    patch(modalId, {
      severity: mSeverity,
      headacheSites: mHeadache,
      painTypes: mPainTypes,
      clinicalCourse: mCourse,
      note: mNote,
    });
    setModalId(null);
  };

  const activeSym = symptoms.find((s) => s.id === modalId);



  /* search bar keyboard nav */
  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const list = symptomOptions.filter((o) => !searchVal || o.toLowerCase().includes(searchVal.toLowerCase()));
    if (e.key === "ArrowDown") { e.preventDefault(); setSearchHi((p) => Math.min(p + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSearchHi((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (searchHi >= 0 && list[searchHi]) addSymptom(list[searchHi]);
      else addSymptom(searchVal);
    }
    else if (e.key === "Escape") { setSearchOpen(false); setSearchHi(-1); }
  };

  /* ─── render ─── */
  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm w-full select-none overflow-visible">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm">
            <svg className="w-3 h-3 fill-white" viewBox="0 0 512 512">
              <path d="M192 104.8c0-9.2-5.8-17.3-13.5-21.8L64.9 15.8C58.7 12.2 51.5 12.4 45.5 16.2c-6 3.8-9.5 10.5-9.5 17.7V96H16c-8.8 0-16 7.2-16 16s7.2 16 16 16h20v62.3c0 7.2 3.5 13.9 9.5 17.7c6 3.8 13.2 4 19.4.4L178.5 146c7.7-4.5 13.5-12.6 13.5-21.8v-19.4zM400 64h-80v32h80c26.5 0 48 21.5 48 48v192c0 26.5-21.5 48-48 48H112c-26.5 0-48-21.5-48-48V336H32v48c0 44.2 35.8 80 80 80h288c44.2 0 80-35.8 80-80V144c0-44.2-35.8-80-80-80z"/>
            </svg>
          </div>
          <span className="text-[12px] font-bold text-[#1E293B] tracking-tight">Symptoms</span>
          <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-bold tracking-widest uppercase">ICD-10</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="w-7 h-7 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center transition-colors">
            <svg className="w-3 h-3 fill-[#94A3B8]" viewBox="0 0 448 512">
              <path d="M224 256c-35.2 0-64 28.8-64 64s28.8 64 64 64 64-28.8 64-64-28.8-64-64-64zm209.1-127L349.2 45.1C341.1 37.1 328.8 32 316.1 32H64C28.7 32 0 60.7 0 96v320c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64V163.9c0-12.7-5.1-25-14.9-34.9zM128 80h144v80H128V80zM400 416c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16h16v88c0 13.3 10.7 24 24 24h192c13.3 0 24-10.7 24-24V85.5l78.3 78.3c.8.8 1.7 2.4 1.7 4.1V416z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Symptom rows */}
      {symptoms.length > 0 && (
        <div className="px-3 pt-2 pb-1 space-y-0.5">
          {/* column labels */}
          <div className="flex items-center gap-2 px-1 pb-1 border-b border-[#F8FAFC]">
            <div className="w-4 shrink-0" />
            <div className="w-[26%] shrink-0 text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest">Symptom</div>
            <div className="flex-1 text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest">Duration</div>
            <div className="flex-1 text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest">Severity</div>
            <div className="flex-1 text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest hidden lg:block">Details</div>
            <div className="w-16 shrink-0" />
          </div>

          {symptoms.map((sym, idx) => {
            const hasDetails = (sym.headacheSites?.length ?? 0) > 0 || (sym.painTypes?.length ?? 0) > 0 || sym.clinicalCourse || sym.note;

            return (
              <div key={sym.id}
                data-drag-row="true"
                draggable="false"
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragEnd={(e) => { onDragEnd(); e.currentTarget.setAttribute("draggable", "false"); }}
                className="group flex items-center gap-2 px-1 py-1 rounded-lg hover:bg-[#F8FAFC] border border-transparent hover:border-[#E2E8F0] transition-all"
              >
                {/* grip */}
                <span
                  onMouseDown={(e) => { const row = e.currentTarget.closest("[data-drag-row]"); if (row) row.setAttribute("draggable", "true"); }}
                  onMouseUp={(e) => { const row = e.currentTarget.closest("[data-drag-row]"); if (row) row.setAttribute("draggable", "false"); }}
                  className="text-[#CBD5E0] group-hover:text-[#94A3B8] cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                >
                  <svg viewBox="0 0 10 16" fill="currentColor" className="w-2.5 h-3.5">
                    <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>
                    <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                    <circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/>
                  </svg>
                </span>

                {/* name */}
                <div className="relative w-[26%] shrink-0">
                  <InlineAutoComplete
                    value={sym.name}
                    onChange={(v) => patch(sym.id, { name: v })}
                    onBlur={(v) => handleInputBlur(1, v)}
                    options={symptomOptions}
                    placeholder="Symptom name"
                  />
                </div>

                {/* duration */}
                <div className="relative flex-1">
                  <InlineAutoComplete
                    value={sym.duration}
                    onChange={(v) => patch(sym.id, { duration: v })}
                    onBlur={(v) => handleInputBlur(2, v)}
                    options={durationOptions}
                    placeholder="Duration"
                  />
                </div>

                {/* severity */}
                <div className="relative flex-1">
                  <InlineAutoComplete
                    value={sym.severity}
                    onChange={(v) => patch(sym.id, { severity: v })}
                    onBlur={(v) => handleInputBlur(3, v)}
                    options={severityOptions}
                    placeholder="Severity"
                  />
                </div>

                {/* saved details */}
                <div className="flex-1 hidden lg:block overflow-hidden">
                  {hasDetails ? (
                    <div className="flex flex-wrap gap-1">
                      {(sym.headacheSites ?? []).map((s) => (
                        <span key={s} className="text-[9px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded-md leading-none">{s}</span>
                      ))}
                      {(sym.painTypes ?? []).map((pt) => (
                        <span key={pt} className="text-[9px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-md leading-none">{pt}</span>
                      ))}
                      {sym.clinicalCourse && (
                        <span className="text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md leading-none">{sym.clinicalCourse}</span>
                      )}
                      {sym.note && (
                        <span className="text-[9px] font-semibold bg-gray-100 text-gray-700 border border-gray-300 px-1.5 py-0.5 rounded-md leading-none max-w-[150px] truncate" title={sym.note}>
                          Note: {sym.note}
                        </span>
                      )}
                    </div>
                  ) : <span className="text-[10px] text-[#CBD5E0]">—</span>}
                </div>

                {/* actions */}
                <div className="flex items-center gap-1 shrink-0 w-16 justify-end">
                  <button type="button" onClick={() => openModal(sym)}
                    className="h-6 px-2 text-[9px] font-bold text-[#64748B] border border-[#E2E8F0] rounded-md hover:bg-[#F1F5F9] hover:border-[#CBD5E0] transition-all uppercase tracking-wide"
                  >More</button>
                  <button type="button" onClick={() => remove(sym.id)}
                    className="w-5 h-5 flex items-center justify-center text-[#CBD5E0] hover:text-red-400 transition-colors rounded">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search / add bar */}
      <div className="relative px-3 py-2.5 border-t border-[#F8FAFC]">
        <div className="relative flex items-center">
          <svg className="absolute left-2.5 w-3 h-3 fill-[#CBD5E0] pointer-events-none" viewBox="0 0 512 512">
            <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z"/>
          </svg>
          <input
            type="text"
            placeholder="Search and add symptoms / chief complaints…"
            value={searchVal}
            onChange={(e) => { setSearchVal(e.target.value); setSearchHi(-1); setSearchOpen(true); }}
            onFocus={() => { setSearchOpen(true); setSearchHi(-1); }}
            onBlur={() => setTimeout(() => { setSearchOpen(false); setSearchHi(-1); }, 160)}
            onKeyDown={handleSearchKey}
            className="w-full h-8 pl-8 pr-14 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[11px] bg-[#FAFBFC] focus:bg-white focus:outline-none placeholder:text-[#C0CADC] font-medium transition-all"
          />
          {searchVal.trim() && (
            <button type="button" onClick={() => addSymptom(searchVal)}
              className="absolute right-2 text-blue-600 hover:text-blue-700 text-[10px] font-bold tracking-wide">+ Add</button>
          )}
        </div>

        {searchOpen && (() => {
          const query = searchVal.trim().toLowerCase();
          const list = symptomOptions
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
          const hasCustomVal = searchVal.trim() && !symptomOptions.some(o => o.toLowerCase() === searchVal.trim().toLowerCase());
          if (list.length === 0 && !hasCustomVal) return null;
          return (
            <div className="absolute left-3 right-3 top-full mt-0.5 z-40 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
              {list.map((opt, i) => (
                <div key={opt} onMouseDown={() => addSymptom(opt)}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer border-b border-[#F8FAFC] last:border-b-0 transition-colors
                    ${i === searchHi ? "bg-blue-50" : "hover:bg-[#F8FAFC]"}`}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-[8px] font-extrabold text-blue-700 shrink-0 leading-none">
                    {initials(opt) || "Sx"}
                  </div>
                  <span className="text-[11.5px] font-semibold text-[#1E293B]">{opt}</span>
                </div>
              ))}
              {hasCustomVal && (
                <div
                  onMouseDown={() => addSymptom(searchVal)}
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

      {/* ══ MODAL ══ */}
      {modalId && activeSym && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] px-4">
          <div className="bg-white w-full max-w-[440px] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[88vh] border border-[#E2E8F0]">

            {/* header */}
            <div className="px-5 py-3.5 border-b border-[#F1F5F9] flex items-center justify-between shrink-0 bg-[#FAFBFC]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-[10px] font-extrabold text-blue-700 shrink-0">
                  {initials(activeSym.name) || "Sx"}
                </div>
                <div>
                  <p className="text-[13px] font-extrabold text-[#1E293B] leading-none">{activeSym.name || "Symptom"}</p>
                  {(activeSym.duration || activeSym.severity) && (
                    <p className="text-[10px] text-[#94A3B8] font-medium mt-0.5">
                      {[activeSym.duration, activeSym.severity].filter(Boolean).join(" · ")}
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

            {/* body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">

              {/* Severity */}
              <div className="space-y-1 relative">
                <label className="block text-[11px] font-semibold text-[#64748B]">Severity</label>
                <div className="relative">
                  <input type="text" value={mSeverity}
                    onChange={(e) => setMSeverity(e.target.value)}
                    onBlur={async (e) => {
                      const v = e.target.value.trim();
                      if (v) {
                        await incrementOption(3, v);
                        refreshAllOptions();
                      }
                    }}
                    placeholder="Severity"
                    className="w-full h-9 px-3 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[11px] bg-white focus:outline-none font-semibold text-[#334155] placeholder:text-[#C0CADC] transition-all"
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap pt-0.5">
                  {severityOptions.map((s) => (
                    <button key={s} type="button"
                      onMouseDown={async () => {
                        setMSeverity(s);
                        await incrementOption(3, s);
                        refreshAllOptions();
                      }}
                      className={`text-[9.5px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                        mSeverity === s ? severityColor(s) : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:border-[#CBD5E0]"
                      }`}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {/* Select Headache site */}
              <ChipTagField
                label="Select Headache site"
                options={headacheOptions}
                selected={mHeadache}
                onToggle={async (v) => {
                  const isAdding = !mHeadache.includes(v);
                  setMHeadache((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
                  if (isAdding) {
                    await incrementOption(4, v);
                    refreshAllOptions();
                  }
                }}
              />

              {/* Select Type of pain */}
              <ChipTagField
                label="Select Type of pain"
                options={painOptions}
                selected={mPainTypes}
                onToggle={async (v) => {
                  const isAdding = !mPainTypes.includes(v);
                  setMPainTypes((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
                  if (isAdding) {
                    await incrementOption(5, v);
                    refreshAllOptions();
                  }
                }}
              />

              {/* Clinical course */}
              <AutoInput
                label="Clinical course"
                value={mCourse}
                onChange={setMCourse}
                onBlur={async (v) => {
                  if (v && v.trim()) {
                    await incrementOption(6, v.trim());
                    refreshAllOptions();
                  }
                }}
                options={courseOptions}
                placeholder="Clinical course"
                clearable
              />

              {/* Note */}
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
                        await incrementOption(7, v);
                        refreshAllOptions();
                      }
                    }}
                    placeholder="Add clinical notes, findings or observations…"
                    className="w-full px-3 py-2 text-[11px] focus:outline-none bg-white font-medium text-[#475569] resize-none placeholder:text-[#CBD5E0]"
                  />
                </div>
              </div>
            </div>

            {/* footer */}
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
