"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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
      .limit(40);

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
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);

  const filtered = options.filter(
    (o) => !search || o.toLowerCase().includes(search.toLowerCase())
  );

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((p) => Math.min(p + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (hi >= 0 && filtered[hi]) {
        onToggle(filtered[hi]);
        setSearch("");
        setHi(-1);
      } else if (search.trim()) {
        onToggle(search.trim());
        setSearch("");
        setHi(-1);
      }
    }
    else if (e.key === "Escape") { setOpen(false); setHi(-1); }
  };

  return (
    <div className="space-y-1 relative">
      <label className="block text-[11px] font-semibold text-[#64748B]">{label}</label>
      <div
        className="border border-[#E2E8F0] focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 rounded-lg px-2 py-1.5 flex flex-wrap gap-1.5 bg-white min-h-[36px] transition-all cursor-text"
        onClick={() => { setOpen(true); }}
      >
        {selected.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 bg-[#EFF6FF] text-blue-700 border border-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded-md">
            {v}
            <button type="button" onMouseDown={(e) => { e.stopPropagation(); onToggle(v); }}
              className="text-blue-400 hover:text-red-500 font-bold leading-none text-[12px]">×</button>
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
          className="flex-1 bg-transparent min-w-[100px] text-[11px] font-medium text-[#1e293b] focus:outline-none placeholder:text-[#C0CADC]"
        />
      </div>
      {open && (filtered.length > 0 || (search.trim() && !options.some(o => o.toLowerCase() === search.trim().toLowerCase()))) && (
        <div className="absolute left-0 top-full mt-1 z-[60] w-full bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map((opt, i) => (
            <div key={opt}
              onMouseDown={() => { onToggle(opt); setSearch(""); setHi(-1); }}
              className={`px-3 py-2 text-[11px] font-semibold cursor-pointer border-b border-[#F8FAFC] last:border-b-0 flex items-center justify-between transition-colors
                ${i === hi ? "bg-blue-50 text-blue-700" : selected.includes(opt) ? "bg-purple-50 text-purple-700" : "hover:bg-[#F8FAFC] text-[#334155]"}`}
            >
              {opt}
              {selected.includes(opt) && (
                <svg className="w-3.5 h-3.5 fill-current shrink-0 text-blue-600" viewBox="0 0 20 20">
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                </svg>
              )}
            </div>
          ))}
          {search.trim() && !options.some(o => o.toLowerCase() === search.trim().toLowerCase()) && (
            <div
              onMouseDown={() => {
                onToggle(search.trim());
                setSearch("");
                setHi(-1);
              }}
              className="px-3 py-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 border-t border-[#F8FAFC] cursor-pointer flex items-center gap-1.5"
            >
              <span>+ Create</span>
              <span className="italic">"{search.trim()}"</span>
            </div>
          )}
        </div>
      )}
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
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const localDropdownClicked = useRef(false);

  const filtered = options.filter((o) => {
    if (!value || options.some(opt => opt === value)) return true;
    return o.toLowerCase().includes(value.toLowerCase());
  });

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((p) => Math.min(p + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (hi >= 0 && filtered[hi]) {
        localDropdownClicked.current = true;
        onChange(filtered[hi]);
        if (onBlur) onBlur(filtered[hi]);
        setHi(-1);
        setOpen(false);
      } else if (value.trim()) {
        localDropdownClicked.current = true;
        onChange(value.trim());
        if (onBlur) onBlur(value.trim());
        setHi(-1);
        setOpen(false);
      }
    }
    else if (e.key === "Escape") { setOpen(false); setHi(-1); }
  };

  return (
    <div className="space-y-1 relative">
      <label className="block text-[11px] font-semibold text-[#64748B]">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setHi(-1); setOpen(true); }}
          onFocus={() => { setOpen(true); setHi(-1); }}
          onBlur={(e) => {
            const val = e.target.value;
            setTimeout(() => {
              if (localDropdownClicked.current) {
                localDropdownClicked.current = false;
                return;
              }
              if (onBlur) onBlur(val);
              setOpen(false);
              setHi(-1);
            }, 180);
          }}
          onKeyDown={handleKey}
          placeholder={placeholder ?? label}
          className="w-full h-9 px-3 pr-8 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[11px] bg-white focus:outline-none font-semibold text-[#334155] placeholder:text-[#C0CADC] transition-all"
        />
        {clearable && value && (
          <button type="button" onMouseDown={() => onChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path strokeLinecap="round" d="M15 9l-6 6M9 9l6 6"/>
            </svg>
          </button>
        )}
        {open && (filtered.length > 0 || (value.trim() && !options.some(o => o.toLowerCase() === value.trim().toLowerCase()))) && (
          <div className="absolute left-0 top-full mt-1 z-[60] w-full bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-44 overflow-y-auto">
            {filtered.map((opt, i) => (
              <div key={opt}
                onMouseDown={() => {
                  localDropdownClicked.current = true;
                  onChange(opt);
                  if (onBlur) onBlur(opt);
                  setOpen(false);
                  setHi(-1);
                }}
                className={`px-3 py-2 text-[11px] font-semibold cursor-pointer border-b border-[#F8FAFC] last:border-b-0 transition-colors
                  ${i === hi ? "bg-blue-50 text-blue-700" : "hover:bg-[#F8FAFC] text-[#334155]"}`}
              >{opt}</div>
            ))}
            {value.trim() && !options.some(o => o.toLowerCase() === value.trim().toLowerCase()) && (
              <div
                onMouseDown={() => {
                  localDropdownClicked.current = true;
                  onChange(value.trim());
                  if (onBlur) onBlur(value.trim());
                  setOpen(false);
                  setHi(-1);
                }}
                className="px-3 py-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 border-t border-[#F8FAFC] cursor-pointer flex items-center gap-1.5"
              >
                <span>+ Create</span>
                <span className="italic">"{value.trim()}"</span>
              </div>
            )}
          </div>
        )}
      </div>
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

  /* inline row highlight */
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusField, setFocusField] = useState<string | null>(null);
  const [rowHi, setRowHi] = useState(-1);  // highlight index for inline DD

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
    setSymptoms((p) => [...p, { id: Date.now().toString(), name: cleanName, duration: "1 Day", severity: "Mild" }]);
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

  /* ─── inline dropdown w/ keyboard nav ─── */
  const InlineDD = ({ id, field, opts, val }: { id: string; field: string; opts: string[]; val: string }) => {
    if (focusId !== id || focusField !== field) return null;
    
    // Show all options if val matches the saved database value in state (not edited yet)
    const activeSymptom = symptoms.find(s => s.id === id);
    const originalVal = activeSymptom ? (activeSymptom[field as keyof Symptom] as string) : "";
    const list = opts.filter((o) => {
      if (!val || val === originalVal) return true;
      return o.toLowerCase().includes(val.toLowerCase());
    });
    
    const hasCustomVal = val.trim() && !opts.some(o => o.toLowerCase() === val.trim().toLowerCase());
    if (list.length === 0 && !hasCustomVal) return null;
    return (
      <div className="absolute left-0 top-full mt-0.5 z-40 w-full min-w-[120px] bg-white border border-[#E2E8F0] rounded-lg shadow-xl overflow-hidden max-h-44 overflow-y-auto">
        {list.map((opt, i) => (
          <div key={opt}
            onMouseDown={async () => {
              dropdownClicked.current = true;
              patch(id, { [field]: opt });
              setFocusId(null);
              setFocusField(null);
              setRowHi(-1);
              await incrementOption(catIdOf(field), opt);
              refreshAllOptions();
            }}
            className={`px-3 py-[7px] text-[11px] font-semibold cursor-pointer border-b border-[#F8FAFC] last:border-b-0 transition-colors
              ${i === rowHi ? "bg-blue-50 text-blue-700" : "hover:bg-[#F1F5F9] text-[#334155]"}`}
          >{opt}</div>
        ))}
        {hasCustomVal && (
          <div
            onMouseDown={async () => {
              dropdownClicked.current = true;
              patch(id, { [field]: val.trim() });
              setFocusId(null);
              setFocusField(null);
              setRowHi(-1);
              await incrementOption(catIdOf(field), val.trim());
              refreshAllOptions();
            }}
            className="px-3 py-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 border-t border-[#F8FAFC] cursor-pointer flex items-center gap-1.5"
          >
            <span>+ Create</span>
            <span className="italic">"{val.trim()}"</span>
          </div>
        )}
      </div>
    );
  };

  const handleRowKey = (e: React.KeyboardEvent, id: string, field: string, opts: string[], val: string) => {
    const list = opts.filter((o) => !val || o.toLowerCase().includes(val.toLowerCase()));
    if (e.key === "ArrowDown") { e.preventDefault(); setRowHi((p) => Math.min(p + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setRowHi((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (rowHi >= 0 && list[rowHi]) {
        const chosen = list[rowHi];
        dropdownClicked.current = true;
        patch(id, { [field]: chosen });
        setFocusId(null);
        setFocusField(null);
        setRowHi(-1);
        incrementOption(catIdOf(field), chosen).then(() => refreshAllOptions());
      } else if (val.trim()) {
        const custom = val.trim();
        dropdownClicked.current = true;
        patch(id, { [field]: custom });
        setFocusId(null);
        setFocusField(null);
        setRowHi(-1);
        incrementOption(catIdOf(field), custom).then(() => refreshAllOptions());
      }
    }
    else if (e.key === "Escape") { setFocusId(null); setFocusField(null); setRowHi(-1); }
  };

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
                  <input type="text" value={sym.name}
                    onChange={(e) => patch(sym.id, { name: e.target.value })}
                    onFocus={() => { setFocusId(sym.id); setFocusField("name"); setRowHi(-1); }}
                    onBlur={(e) => {
                      const v = e.target.value;
                      handleInputBlur(1, v);
                      setTimeout(() => {
                        setFocusField((curr) => {
                          if (curr === "name") {
                            setFocusId(null);
                            setRowHi(-1);
                            return null;
                          }
                          return curr;
                        });
                      }, 160);
                    }}
                    onKeyDown={(e) => handleRowKey(e, sym.id, "name", symptomOptions, sym.name)}
                    placeholder="Symptom name"
                    className="w-full h-7 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-md text-[11px] px-2 font-semibold text-[#1e293b] bg-white focus:outline-none placeholder:text-[#CBD5E0] transition-all"
                  />
                  <InlineDD id={sym.id} field="name" opts={symptomOptions} val={sym.name} />
                </div>

                {/* duration */}
                <div className="relative flex-1">
                  <input type="text" value={sym.duration}
                    onChange={(e) => patch(sym.id, { duration: e.target.value })}
                    onFocus={() => { setFocusId(sym.id); setFocusField("duration"); setRowHi(-1); }}
                    onBlur={(e) => {
                      const v = e.target.value;
                      handleInputBlur(2, v);
                      setTimeout(() => {
                        setFocusField((curr) => {
                          if (curr === "duration") {
                            setFocusId(null);
                            setRowHi(-1);
                            return null;
                          }
                          return curr;
                        });
                      }, 160);
                    }}
                    onKeyDown={(e) => handleRowKey(e, sym.id, "duration", durationOptions, sym.duration)}
                    placeholder="Duration"
                    className="w-full h-7 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-md text-[11px] px-2 font-semibold text-[#334155] bg-white focus:outline-none placeholder:text-[#CBD5E0] transition-all"
                  />
                  <InlineDD id={sym.id} field="duration" opts={durationOptions} val={sym.duration} />
                </div>

                {/* severity */}
                <div className="relative flex-1">
                  <input type="text" value={sym.severity}
                    onChange={(e) => patch(sym.id, { severity: e.target.value })}
                    onFocus={() => { setFocusId(sym.id); setFocusField("severity"); setRowHi(-1); }}
                    onBlur={(e) => {
                      const v = e.target.value;
                      handleInputBlur(3, v);
                      setTimeout(() => {
                        setFocusField((curr) => {
                          if (curr === "severity") {
                            setFocusId(null);
                            setRowHi(-1);
                            return null;
                          }
                          return curr;
                        });
                      }, 160);
                    }}
                    onKeyDown={(e) => handleRowKey(e, sym.id, "severity", severityOptions, sym.severity)}
                    placeholder="Severity"
                    className="w-full h-7 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-md text-[11px] px-2 font-semibold text-[#334155] bg-white focus:outline-none placeholder:text-[#CBD5E0] transition-all"
                  />
                  <InlineDD id={sym.id} field="severity" opts={severityOptions} val={sym.severity} />
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
          const list = symptomOptions.filter((o) => !searchVal || o.toLowerCase().includes(searchVal.toLowerCase()));
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
