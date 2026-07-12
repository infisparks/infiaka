"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AutoComplete } from "primereact/autocomplete";

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

/* ─── Supabase helpers ──────────────────────────────────────────── */
async function fetchOptions(categoryId: number): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("aka_master_dropdown_catalog")
      .select("value")
      .eq("category_id", categoryId)
      .order("usage_count", { ascending: false })
      .limit(40);
    if (error) throw error;
    return (data || []).map((d: any) => d.value);
  } catch (err) {
    console.error("Error fetching procedure options:", err);
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
    console.error("Error incrementing procedure option:", err);
  }
}

/* ─── Helpers ────────────────────────────────────────────────────── */
const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

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

  const search = (event: { query: string }) => {
    const q = event.query.trim().toLowerCase();
    let results = options.filter((o) => o.toLowerCase().includes(q));
    if (!q) results = options;
    if (q && !options.some((o) => o.toLowerCase() === q)) {
      results = [...results, `+ Create "${event.query.trim()}"`];
    }
    setSuggestions(results);
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
        value={value}
        suggestions={suggestions}
        completeMethod={search}
        onChange={(e) => onChange(e.value)}
        onSelect={handleSelect}
        onBlur={handleBlur}
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

/* ─── Procedure name autocomplete with Supabase search ───────────── */
function InlineProcedureAutoComplete({
  value,
  onChange,
  placeholder,
  procOptions,
  onAfterSelect,
  onInputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  procOptions: string[];
  onAfterSelect?: () => void;
  onInputRef?: (el: HTMLInputElement | null) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const dropdownClicked = useRef(false);

  const search = (event: { query: string }) => {
    const q = event.query.trim().toLowerCase();
    let results = procOptions.filter((o) => o.toLowerCase().includes(q));
    if (!q) results = procOptions;
    if (q && !procOptions.some((o) => o.toLowerCase() === q)) {
      results = [...results, `+ Create "${event.query.trim()}"`];
    }
    setSuggestions(results);
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
        value={value}
        suggestions={suggestions}
        completeMethod={search}
        onChange={(e) => { if (typeof e.value === "string") onChange(e.value); }}
        onSelect={handleSelect}
        onBlur={handleBlur}
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

export default function ProceduresCard({ procedures, setProcedures }: ProceduresCardProps) {
  // Category IDs: 60=procedure_name, 61=procedure_duration
  const [procedureOptions, setProcedureOptions] = useState<string[]>([]);
  const [durationOptions, setDurationOptions]   = useState<string[]>([]);

  const [searchVal, setSearchVal]                 = useState("");
  const [searchOpen, setSearchOpen]               = useState(false);
  const [searchHi, setSearchHi]                   = useState(-1);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const dragIdx = useRef<number | null>(null);

  /* ─── Auto-focus refs ─── */
  type ProcFieldKey = 'duration' | 'note';
  const fieldInputRefs = useRef<Record<string, Partial<Record<ProcFieldKey, HTMLInputElement | null>>>>({});

  const focusField = (procId: string, field: ProcFieldKey) => {
    setTimeout(() => {
      fieldInputRefs.current[procId]?.[field]?.focus();
    }, 80);
  };

  const setFieldRef = (procId: string, field: ProcFieldKey) => (el: HTMLInputElement | null) => {
    if (!fieldInputRefs.current[procId]) fieldInputRefs.current[procId] = {};
    fieldInputRefs.current[procId][field] = el;
  };

  // Load options on mount
  useEffect(() => {
    let active = true;
    const load = async () => {
      const [procs, durations] = await Promise.all([
        fetchOptions(60),
        fetchOptions(61),
      ]);
      if (active) {
        setProcedureOptions(procs);
        setDurationOptions(durations);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  // Filter options with debounced suggestions
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      const q = searchVal.trim();
      if (!q) {
        if (active) setSearchSuggestions(procedureOptions.slice(0, 12));
        return;
      }
      const qLower = q.toLowerCase();
      let results = procedureOptions.filter((o) => o.toLowerCase().includes(qLower));
      
      const hasPerfectMatch = procedureOptions.some((o) => o.toLowerCase() === qLower);
      if (!hasPerfectMatch) {
        results = [...results, `+ Create "${q}"`];
      }
      
      if (active) setSearchSuggestions(results);
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [searchVal, procedureOptions]);

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
    incrementOption(60, name.trim());
    setSearchVal("");
    setSearchOpen(false);
    setSearchHi(-1);
  };

  const patch = (id: string, diff: Partial<ProcedureItem>) =>
    setProcedures((p) => p.map((c) => (c.id === id ? { ...c, ...diff } : c)));
  const remove = (id: string) => setProcedures((p) => p.filter((c) => c.id !== id));

  const handleInputBlur = (categoryId: number, value: string) => {
    if (value?.trim()) incrementOption(categoryId, value.trim());
  };

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

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchHi((p) => Math.min(p + 1, searchSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchHi((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchHi >= 0 && searchSuggestions[searchHi]) addProcedure(searchSuggestions[searchHi]);
      else if (searchVal.trim()) addProcedure(searchVal);
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
          {/* Save Template */}
          <button
            type="button"
            className="p-1 hover:bg-[#F1F5F9] rounded text-slate-500 hover:text-indigo-600 transition-colors"
            title="Save Template"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V8l-4-4H8zm2 0v5h4V4H10zm-1 9h6v6H9v-6z" />
            </svg>
          </button>
          {/* Templates */}
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
              <div className="relative flex-1 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible">
                <InlineProcedureAutoComplete
                  value={item.name}
                  onChange={(v) => patch(item.id, { name: v })}
                  procOptions={procedureOptions}
                  placeholder="Procedure Name"
                  onAfterSelect={() => focusField(item.id, 'duration')}
                />
              </div>

              {/* Duration / Timeline */}
              <div className="relative w-[30%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white overflow-visible px-3">
                <InlineAutoComplete
                  value={item.duration}
                  onChange={(v) => patch(item.id, { duration: v })}
                  onBlur={(v) => handleInputBlur(61, v)}
                  options={durationOptions}
                  placeholder="Duration"
                  onInputRef={setFieldRef(item.id, 'duration')}
                  onAfterSelect={() => focusField(item.id, 'note')}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none z-10">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </span>
              </div>

              {/* Note */}
              <div className="relative w-[35%] shrink-0 border-r border-[#E2E8F0] flex items-center">
                <input
                  type="text"
                  value={item.note}
                  ref={(el) => {
                    if (!fieldInputRefs.current[item.id]) fieldInputRefs.current[item.id] = {};
                    fieldInputRefs.current[item.id].note = el;
                  }}
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

      {/* Input */}
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
        {searchOpen && (searchSuggestions.length > 0 || searchVal.trim()) && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-[60] bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
            {searchSuggestions.map((opt, i) => {
              const isCreate = opt.startsWith('+ Create "');
              let displayVal = opt;
              if (isCreate) {
                const match = opt.match(/\+ Create "(.*)"/);
                displayVal = match ? match[1] : opt;
              }
              return (
                <div
                  key={opt}
                  onMouseDown={() => addProcedure(displayVal)}
                  className={`px-3.5 py-2.5 cursor-pointer border-b border-[#F8FAFC] last:border-b-0 text-[11.5px] font-semibold transition-colors ${
                    i === searchHi ? "bg-blue-50 text-blue-700" : "hover:bg-[#F8FAFC] text-[#1E293B]"
                  }`}
                >
                  {isCreate ? (
                    <span className="text-[11.5px] font-bold text-blue-600">
                      + Create <span className="italic font-semibold">"{displayVal}"</span>
                    </span>
                  ) : (
                    <span>{opt}</span>
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
