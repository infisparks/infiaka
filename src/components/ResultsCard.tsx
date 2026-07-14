"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AutoComplete } from "primereact/autocomplete";

/* ─── Supabase helpers ──────────────────────────────────────────── */
async function fetchOptions(categoryId: number): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("aka_master_dropdown_catalog")
      .select("value")
      .eq("category_id", categoryId)
      .order("usage_count", { ascending: false })
      .limit(5000);
    if (error) throw error;
    return (data || []).map((d: any) => d.value);
  } catch (err) {
    console.error("Error fetching lab result options:", err);
    return [];
  }
}

async function incrementOption(categoryId: number, value: string) {
  if (!value?.trim()) return;
  try {
    const { data: existing } = await supabase
      .from("aka_master_dropdown_catalog")
      .select("id, usage_count")
      .eq("category_id", categoryId)
      .ilike("value", value.trim())
      .maybeSingle();
    if (existing) {
      await supabase
        .from("aka_master_dropdown_catalog")
        .update({ usage_count: (existing.usage_count || 0) + 1 })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("aka_master_dropdown_catalog")
        .insert({ category_id: categoryId, value: value.trim(), usage_count: 1 });
    }
  } catch (err) {
    console.error("Error incrementing option:", err);
  }
}

/* ─── Helpers ────────────────────────────────────────────────────── */
const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

// Converts date from display format "11 Jul 26" to ISO "2026-07-11"
const convertToISODate = (displayDate: string) => {
  if (!displayDate) return "";
  try {
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
    const year = parts[0].slice(2);
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

/* ─── Reusable AutoComplete inline input ─────────────────────────── */
function InlineAutoComplete({
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  onAfterSelect,
  onInputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: (v: string) => void;
  options: string[];
  placeholder?: string;
  onAfterSelect?: () => void;
  onInputRef?: (el: HTMLInputElement | null) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const dropdownClicked = useRef(false);
  const autoRef = useRef<any>(null);

  const search = (event: { query: string }) => {
    const q = event.query.trim().toLowerCase();
    let results = options
      .filter((o) => o.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(q);
        const bStarts = b.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
    const sliced = results.slice(0, 30);
    if (q && !options.some((o) => o.toLowerCase() === q)) {
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
      onChange(custom); onBlur(custom);
    } else {
      onChange(val); onBlur(val);
    }
    setTimeout(() => onAfterSelect?.(), 60);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setTimeout(() => {
      if (dropdownClicked.current) { dropdownClicked.current = false; return; }
      onChange(val); onBlur(val);
    }, 180);
  };

  const itemTemplate = (item: string) => {
    if (item.startsWith('+ Create "')) {
      const match = item.match(/\+ Create "(.*)"/);
      const custom = match ? match[1] : item;
      return (
        <span className="text-blue-600 font-bold flex items-center gap-1 text-[11px]">
          <span>+ Create</span><span className="italic">"{custom}"</span>
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
          autoRef.current?.search(e, value || "", "dropdown");
        }}
        itemTemplate={itemTemplate}
        placeholder={placeholder}
        inputRef={onInputRef ? (el: any) => onInputRef(el as HTMLInputElement | null) : undefined}
        inputClassName="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#1e293b] bg-transparent outline-none placeholder:text-slate-350"
        className="w-full h-full"
        panelClassName="custom-autocomplete-panel text-[11.5px] font-semibold"
      />
    </div>
  );
}

/* ─── Parameter name autocomplete with Supabase search ──────────── */
function InlineParameterAutoComplete({
  value,
  onChange,
  placeholder,
  paramOptions,
  onAfterSelect,
  onInputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  paramOptions: string[];
  onAfterSelect?: () => void;
  onInputRef?: (el: HTMLInputElement | null) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const dropdownClicked = useRef(false);
  const autoRef = useRef<any>(null);

  const search = (event: { query: string }) => {
    const q = event.query.trim().toLowerCase();
    let results = paramOptions
      .filter((o) => o.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(q);
        const bStarts = b.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
    const sliced = results.slice(0, 30);
    if (q && !paramOptions.some((o) => o.toLowerCase() === q)) {
      setSuggestions([...sliced, `+ Create "${event.query.trim()}"`]);
    } else {
      setSuggestions(sliced);
    }
  };

  const handleSelect = (e: { value: string }) => {
    dropdownClicked.current = true;
    const val = e.value;
    if (val.startsWith('+ Create "')) {
      const match = val.match(/\+ Create "(.*)"/);
      const custom = match ? match[1] : val;
      onChange(custom);
    } else {
      onChange(val);
    }
    setTimeout(() => onAfterSelect?.(), 80);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setTimeout(() => {
      if (dropdownClicked.current) { dropdownClicked.current = false; return; }
      onChange(val);
    }, 180);
  };

  const itemTemplate = (item: string) => {
    if (item.startsWith('+ Create "')) {
      const match = item.match(/\+ Create "(.*)"/);
      const custom = match ? match[1] : item;
      return (
        <div className="p-1">
          <span className="text-blue-600 font-bold text-[11px]">+ Create "{custom}"</span>
        </div>
      );
    }
    return (
      <div className="p-1">
        <div className="text-[11px] font-bold text-[#1e293b]">{item}</div>
      </div>
    );
  };

  return (
    <div className="w-full h-full relative primereact-autocomplete-inline flex items-center">
      <AutoComplete
        ref={autoRef}
        value={value}
        suggestions={suggestions}
        completeMethod={search}
        onChange={(e) => { if (typeof e.value === "string") onChange(e.value); }}
        onSelect={handleSelect}
        onBlur={handleBlur}
        minLength={0}
        onFocus={(e) => {
          autoRef.current?.search(e, value || "", "dropdown");
        }}
        itemTemplate={itemTemplate}
        placeholder={placeholder}
        inputRef={onInputRef ? (el: any) => onInputRef(el as HTMLInputElement | null) : undefined}
        inputClassName="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-bold text-[#1e293b] bg-transparent outline-none p-0 placeholder:text-slate-350"
        className="w-full h-full"
        panelClassName="custom-autocomplete-panel text-[11.5px] font-semibold"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ResultsCard Component
═══════════════════════════════════════════════════════════════════ */
export default function ResultsCard({ labResults, setLabResults }: ResultsCardProps) {
  // Category IDs: 40=lab_result_parameter, 41=lab_result_unit, 42=lab_result_interpretation, 43=lab_result_notes
  const [paramOptions, setParamOptions]           = useState<string[]>([]);
  const [unitOptions, setUnitOptions]             = useState<string[]>([]);
  const [interpretationOptions, setInterpretationOptions] = useState<string[]>([]);
  const [notesOptions, setNotesOptions]           = useState<string[]>([]);

  const [searchVal, setSearchVal]                 = useState("");
  const [searchOpen, setSearchOpen]               = useState(false);
  const [searchHi, setSearchHi]                   = useState(-1);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

  /* drag & drop handle */
  const dragIdx = useRef<number | null>(null);

  /* ─── Auto-focus refs ─── */
  type ResFieldKey = 'unit' | 'reading' | 'interpretation' | 'notes';
  const fieldInputRefs = useRef<Record<string, Partial<Record<ResFieldKey, HTMLInputElement | null>>>>({});

  const focusField = (resId: string, field: ResFieldKey) => {
    setTimeout(() => {
      fieldInputRefs.current[resId]?.[field]?.focus();
    }, 80);
  };

  const setFieldRef = (resId: string, field: ResFieldKey) => (el: HTMLInputElement | null) => {
    if (!fieldInputRefs.current[resId]) fieldInputRefs.current[resId] = {};
    fieldInputRefs.current[resId][field] = el;
  };

  /* Load all dropdown options from Supabase on mount */
  useEffect(() => {
    let active = true;
    const load = async () => {
      const [params, units, interpretations, notes] = await Promise.all([
        fetchOptions(40),
        fetchOptions(41),
        fetchOptions(42),
        fetchOptions(43),
      ]);
      if (!active) return;
      setParamOptions(params);
      setUnitOptions(units);
      setInterpretationOptions(interpretations);
      setNotesOptions(notes);
    };
    load();
    return () => { active = false; };
  }, []);

  /* Debounced search suggestions */
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      const q = searchVal.trim();
      if (!q) {
        if (active) setSearchSuggestions(paramOptions.slice(0, 12));
        return;
      }
      const qLower = q.toLowerCase();
      let results = paramOptions
        .filter((o) => o.toLowerCase().includes(qLower))
        .sort((a, b) => {
          const aStarts = a.toLowerCase().startsWith(qLower);
          const bStarts = b.toLowerCase().startsWith(qLower);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return 0;
        });
      
      const hasPerfectMatch = paramOptions.some((o) => o.toLowerCase() === qLower);
      const sliced = results.slice(0, 30);
      if (!hasPerfectMatch) {
        if (active) setSearchSuggestions([...sliced, `+ Create "${q}"`]);
      } else {
        if (active) setSearchSuggestions(sliced);
      }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [searchVal, paramOptions]);

  /* ─── helpers ─── */
  const addLabResult = (name: string) => {
    if (!name.trim()) return;
    const formattedDate = formatISODateToDisplay(new Date().toISOString().split("T")[0]);
    const newRes: LabResult = {
      id: Date.now().toString(),
      name: name.trim(),
      unit: "",
      reading: "",
      interpretation: "",
      date: formattedDate,
      notes: "",
    };
    setLabResults((p) => [...p, newRes]);
    incrementOption(40, name.trim());
    setSearchVal("");
    setSearchOpen(false);
    setSearchHi(-1);
  };

  const patch  = (id: string, diff: Partial<LabResult>) => setLabResults((p) => p.map((r) => (r.id === id ? { ...r, ...diff } : r)));
  const remove = (id: string) => setLabResults((p) => p.filter((r) => r.id !== id));

  const handleInputBlur = (categoryId: number, value: string) => {
    if (value?.trim()) incrementOption(categoryId, value.trim());
  };

  /* drag reorder */
  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const r = [...labResults]; const [m] = r.splice(dragIdx.current, 1); r.splice(i, 0, m);
    dragIdx.current = i; setLabResults(r);
  };
  const onDragEnd = () => { dragIdx.current = null; };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSearchHi((p) => Math.min(p + 1, searchSuggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSearchHi((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (searchHi >= 0 && searchSuggestions[searchHi]) addLabResult(searchSuggestions[searchHi]);
      else if (searchVal.trim()) addLabResult(searchVal);
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
        <div className="w-7 shrink-0 border-r border-[#E2E8F0]" />
        <div className="w-[28%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">Parameter Name</div>
        <div className="w-[8%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">Unit</div>
        <div className="w-[16%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">Reading/Observations</div>
        <div className="w-[16%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">Interpretation</div>
        <div className="w-[12%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">Date</div>
        <div className="flex-1 border-r border-[#E2E8F0] px-3 py-2 flex items-center">Additional Notes</div>
        <div className="w-8 shrink-0" />
      </div>

      {/* Rows */}
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
              <div className="flex items-stretch border border-[#E2E8F0] rounded-lg bg-white overflow-visible min-h-[44px]">
                
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

                {/* Col 1: Parameter Name */}
                <div className="relative w-[28%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible">
                  <InlineParameterAutoComplete
                    value={row.name}
                    onChange={(v) => patch(row.id, { name: v })}
                    paramOptions={paramOptions}
                    placeholder="Parameter name"
                    onAfterSelect={() => focusField(row.id, 'unit')}
                  />
                </div>

                {/* Col 2: Unit */}
                <div className="relative w-[8%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible">
                  <InlineAutoComplete
                    value={row.unit}
                    onChange={(v) => patch(row.id, { unit: v })}
                    onBlur={(v) => handleInputBlur(41, v)}
                    options={unitOptions}
                    placeholder="Unit"
                    onInputRef={setFieldRef(row.id, 'unit')}
                    onAfterSelect={() => focusField(row.id, 'reading')}
                  />
                </div>

                {/* Col 3: Reading/Observations */}
                <div className="relative w-[16%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible">
                  <input type="text" value={row.reading}
                    ref={(el) => {
                      if (!fieldInputRefs.current[row.id]) fieldInputRefs.current[row.id] = {};
                      fieldInputRefs.current[row.id].reading = el;
                    }}
                    onChange={(e) => patch(row.id, { reading: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        focusField(row.id, 'interpretation');
                      }
                    }}
                    placeholder="Reading"
                    className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-slate-350"
                  />
                </div>

                {/* Col 4: Interpretation */}
                <div className="relative w-[16%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible">
                  <InlineAutoComplete
                    value={row.interpretation}
                    onChange={(v) => patch(row.id, { interpretation: v })}
                    onBlur={(v) => handleInputBlur(42, v)}
                    options={interpretationOptions}
                    placeholder="High/Normal/Low"
                    onInputRef={setFieldRef(row.id, 'interpretation')}
                    onAfterSelect={() => focusField(row.id, 'notes')}
                  />
                </div>

                {/* Col 5: Date */}
                <div className="relative w-[12%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible">
                  <input
                    type="text"
                    value={row.date}
                    onChange={(e) => patch(row.id, { date: e.target.value })}
                    placeholder="Date"
                    className="w-full h-full border-0 focus:ring-0 pl-3 pr-7 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-slate-350"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center cursor-pointer text-slate-350 hover:text-slate-500 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input
                      type="date"
                      value={convertToISODate(row.date)}
                      onChange={(e) => {
                        if (e.target.value) {
                          patch(row.id, { date: formatISODateToDisplay(e.target.value) });
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                </div>

                {/* Col 6: Additional Notes */}
                <div className="relative flex-1 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible">
                  <InlineAutoComplete
                    value={row.notes}
                    onChange={(v) => patch(row.id, { notes: v })}
                    onBlur={(v) => handleInputBlur(43, v)}
                    options={notesOptions}
                    placeholder="Add notes here"
                    onInputRef={setFieldRef(row.id, 'notes')}
                  />
                </div>

                {/* Trash */}
                <div className="w-8 flex items-center justify-center bg-white text-slate-300 hover:text-red-500 transition-colors cursor-pointer shrink-0">
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
            placeholder="Start typing a blood parameter (e.g. Platelets, Hemoglobin, WBC)..."
            value={searchVal}
            onChange={(e) => { setSearchVal(e.target.value); setSearchHi(-1); setSearchOpen(true); }}
            onFocus={() => { setSearchOpen(true); setSearchHi(-1); }}
            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            onKeyDown={handleSearchKey}
            className="w-full h-8.5 pl-8 pr-14 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[11px] bg-[#FAFBFC] focus:bg-white focus:outline-none placeholder:text-[#C0CADC] font-medium transition-all"
          />
          {searchVal.trim() && (
            <button type="button" onClick={() => addLabResult(searchVal)}
              className="absolute right-2 text-blue-600 hover:text-blue-700 text-[10px] font-bold tracking-wide">+ Add</button>
          )}
        </div>

        {/* Dropdown suggestions */}
        {searchOpen && (searchSuggestions.length > 0 || searchVal.trim()) && (
          <div className="absolute left-3 right-3 top-full mt-0.5 z-40 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
            <div className="px-3 pt-2 pb-1 text-[9px] font-bold text-[#94A3B8] uppercase tracking-wide">
              {searchVal.trim() ? "Matching Parameters" : "Sample Parameters"}
            </div>
            {searchSuggestions.map((opt, i) => {
              const isCreate = opt.startsWith('+ Create "');
              let displayVal = opt;
              if (isCreate) {
                const match = opt.match(/\+ Create "(.*)"/);
                displayVal = match ? match[1] : opt;
              }
              
              return (
                <div key={opt} onMouseDown={() => addLabResult(displayVal)}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer border-b border-[#F8FAFC] last:border-b-0 transition-colors
                    ${i === searchHi ? "bg-blue-50" : "hover:bg-[#F8FAFC]"}`}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-[8px] font-extrabold text-amber-700 shrink-0 leading-none">
                    {isCreate ? "+" : (initials(opt) || "Lr")}
                  </div>
                  {isCreate ? (
                    <span className="text-[11.5px] font-bold text-blue-600">
                      + Create <span className="italic font-semibold">"{displayVal}"</span>
                    </span>
                  ) : (
                    <span className="text-[11.5px] font-semibold text-[#1E293B]">{opt}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </section>
  );
}
