"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/* ─── Static suggestion defaults (Fallbacks if DB empty) ─────────── */
const DEFAULT_NAMES = [
  "Other medical history",
  "Organ transplant",
  "Blood transfusion",
  "Immunodeficiency",
  "Psychiatric disorder",
  "Radiation therapy",
  "Chemotherapy",
  "Disability / Physical limitation",
  "Substance use history",
  "Occupational hazard exposure"
];

const DEFAULT_NOTES = ["Details pending", "Requires follow-up", "Documented in old records", "Confirmed by specialist"];

/* ─── Supabase helpers ──────────────────────────────────────────── */
async function fetchOptions(categoryId: number, defaults: string[]): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("aka_master_dropdown_catalog")
      .select("value")
      .eq("category_id", categoryId)
      .order("usage_count", { ascending: false })
      .limit(30);
    if (error) throw error;
    const list = (data || []).map((d: any) => d.value);
    return list.length > 0 ? list : defaults;
  } catch (err) {
    console.error(`Error fetching category ${categoryId}:`, err);
    return defaults;
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

/* ─── Types ──────────────────────────────────────────────────────── */
export interface OtherMedHistory {
  id: string;
  name: string;
  notes: string;
}

interface OtherMedHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: OtherMedHistory[];
  setItems: React.Dispatch<React.SetStateAction<OtherMedHistory[]>>;
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
}

/* ═══════════════════════════════════════════════════════════════════
   OtherMedHistoryDrawer Component
═══════════════════════════════════════════════════════════════════ */
export default function OtherMedHistoryDrawer({
  isOpen,
  onClose,
  items,
  setItems,
  title,
  setTitle,
}: OtherMedHistoryDrawerProps) {
  const [suggestedNames, setSuggestedNames]         = useState<string[]>(DEFAULT_NAMES);
  const [suggestedNotes, setSuggestedNotes]         = useState<string[]>(DEFAULT_NOTES);

  const [searchVal, setSearchVal] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHi, setSearchHi] = useState(-1);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusField, setFocusField] = useState<string | null>(null);
  const [rowHi, setRowHi] = useState(-1);
  const dragIdx = useRef<number | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputFocus = (id: string, field: string) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setFocusId(id);
    setFocusField(field);
    setRowHi(-1);
  };

  const handleInputBlur = (categoryId: number, value: string) => {
    blurTimeoutRef.current = setTimeout(() => {
      if (value?.trim()) incrementOption(categoryId, value.trim());
      setFocusId(null);
      setFocusField(null);
      setRowHi(-1);
    }, 180);
  };

  // Load from Supabase on mount
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const load = async () => {
      const [names, notes] = await Promise.all([
        fetchOptions(150, DEFAULT_NAMES),
        fetchOptions(151, DEFAULT_NOTES)
      ]);
      if (active) {
        setSuggestedNames(names);
        setSuggestedNotes(notes);
      }
    };
    load();
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const addItem = (name: string) => {
    if (!name.trim()) return;
    setItems((p) => [...p, { id: Date.now().toString(), name: name.trim(), notes: "" }]);
    incrementOption(150, name.trim());
    setSearchVal(""); setSearchOpen(false); setSearchHi(-1);
  };

  const patch = (id: string, diff: Partial<OtherMedHistory>) => setItems((p) => p.map((c) => c.id === id ? { ...c, ...diff } : c));
  const remove = (id: string) => setItems((p) => p.filter((c) => c.id !== id));

  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const r = [...items]; const [m] = r.splice(dragIdx.current, 1); r.splice(i, 0, m);
    dragIdx.current = i; setItems(r);
  };
  const onDragEnd = () => { dragIdx.current = null; };

  const InlineDD = ({ id, field, opts, val }: { id: string; field: string; opts: string[]; val: string }) => {
    if (focusId !== id || focusField !== field) return null;
    let list = opts.filter((o) => !val || o.toLowerCase().includes(val.toLowerCase()));
    
    // Add "+ Create" option if not a perfect match
    if (val && val.trim() && !opts.some(o => o.toLowerCase() === val.trim().toLowerCase())) {
      list = [...list, `+ Create "${val.trim()}"`];
    }

    if (!list.length) return null;
    return (
      <div className="absolute left-0 top-full mt-0.5 z-40 w-full min-w-[140px] bg-white border border-[#E2E8F0] rounded-lg shadow-xl overflow-hidden max-h-44 overflow-y-auto text-left">
        {list.map((opt, i) => {
          const isCreate = opt.startsWith('+ Create "');
          let displayVal = opt;
          if (isCreate) {
            const match = opt.match(/\+ Create "(.*)"/);
            displayVal = match ? match[1] : opt;
          }
          return (
            <div
              key={opt}
              onMouseDown={() => {
                patch(id, { [field]: displayVal });
                if (isCreate) {
                  const catId = field === "name" ? 150 : 151;
                  incrementOption(catId, displayVal);
                }
                setFocusId(null);
                setFocusField(null);
                setRowHi(-1);
              }}
              className={`px-3 py-[7px] text-[11px] font-semibold cursor-pointer border-b border-[#F8FAFC] last:border-b-0 transition-colors ${
                i === rowHi ? "bg-blue-50 text-blue-700" : "hover:bg-[#F1F5F9] text-[#334155]"
              }`}
            >
              {isCreate ? (
                <span className="text-blue-600 font-bold">
                  + Create <span className="italic font-semibold">"{displayVal}"</span>
                </span>
              ) : opt}
            </div>
          );
        })}
      </div>
    );
  };

  const handleRowKey = (e: React.KeyboardEvent, id: string, field: string, opts: string[], val: string) => {
    let list = opts.filter((o) => !val || o.toLowerCase().includes(val.toLowerCase()));
    
    if (val && val.trim() && !opts.some(o => o.toLowerCase() === val.trim().toLowerCase())) {
      list = [...list, `+ Create "${val.trim()}"`];
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setRowHi((p) => Math.min(p + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setRowHi((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rowHi >= 0 && list[rowHi]) {
        const selectedOpt = list[rowHi];
        const isCreate = selectedOpt.startsWith('+ Create "');
        let finalVal = selectedOpt;
        if (isCreate) {
          const match = selectedOpt.match(/\+ Create "(.*)"/);
          finalVal = match ? match[1] : selectedOpt;
          const catId = field === "name" ? 150 : 151;
          incrementOption(catId, finalVal);
        }
        patch(id, { [field]: finalVal });
        setFocusId(null);
        setFocusField(null);
        setRowHi(-1);
      }
    } else if (e.key === "Escape") {
      setFocusId(null);
      setFocusField(null);
      setRowHi(-1);
    }
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const list = suggestedNames.filter((o) => !searchVal || o.toLowerCase().includes(searchVal.toLowerCase()));
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchHi((p) => Math.min(p + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchHi((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchHi >= 0 && list[searchHi]) addItem(list[searchHi]);
      else addItem(searchVal);
    } else if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchHi(-1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/35 backdrop-blur-[2px] select-none">
      <div className="w-[88vw] max-w-[850px] h-full bg-white shadow-2xl flex flex-col overflow-hidden border-l border-[#E2E8F0]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between shrink-0 bg-[#FAFBFC]">
          <div className="flex items-center gap-2.5">
            <div className="rounded-md bg-[#EEF2F6] flex items-center justify-center text-violet-750 text-xs px-1.5 shadow-sm">📖</div>
            <span className="text-[13px] font-extrabold text-[#1E293B]">Other Medical History</span>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#94A3B8] hover:text-[#475569] transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 flex flex-col space-y-4 overflow-y-auto min-h-0">
          {/* Title Field */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">Enter Title:</label>
            <input
              type="text"
              placeholder="Enter title here"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-4 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[12px] font-semibold text-[#1E293B] bg-[#FAFBFC] focus:bg-white focus:outline-none placeholder:text-[#C0CADC] transition-all"
            />
          </div>

          {/* Search */}
          <div className="relative">
            <div className="relative flex items-center">
              <svg className="absolute left-3 w-3.5 h-3.5 fill-[#CBD5E0] pointer-events-none" viewBox="0 0 512 512">
                <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z"/>
              </svg>
              <input type="text" placeholder="Start typing a parameter..." value={searchVal}
                onChange={(e) => { setSearchVal(e.target.value); setSearchHi(-1); setSearchOpen(true); }}
                onFocus={() => { setSearchOpen(true); setSearchHi(-1); }}
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                onKeyDown={handleSearchKey}
                className="w-full h-9 pl-9 pr-14 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[11px] bg-[#FAFBFC] focus:bg-white focus:outline-none placeholder:text-[#C0CADC] font-semibold transition-all"
              />
              {searchVal.trim() && (
                <button type="button" onClick={() => addItem(searchVal)} className="absolute right-3 text-blue-600 hover:text-blue-700 text-[10px] font-bold">+ Add</button>
              )}
            </div>
            {searchOpen && (() => {
              const list = suggestedNames.filter((o) => !searchVal || o.toLowerCase().includes(searchVal.toLowerCase()));
              if (!list.length) return null;
              return (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-[60] bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                  {list.map((opt, i) => (
                    <div key={opt} onMouseDown={() => addItem(opt)}
                      className={`px-3.5 py-2.5 cursor-pointer border-b border-[#F8FAFC] last:border-b-0 text-[11.5px] font-semibold text-[#1E293B] transition-colors ${i === searchHi ? "bg-blue-50" : "hover:bg-[#F8FAFC]"}`}
                    >{opt}</div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Table */}
          <div className="flex-1 border border-[#E2E8F0] rounded-xl overflow-y-auto min-h-0 bg-[#FAFBFC]">
            <div className="flex items-stretch border-b border-[#E2E8F0] bg-white text-[9px] font-extrabold text-[#718096] uppercase sticky top-0 z-30 h-9">
              <div className="w-8 shrink-0" />
              <div className="flex-1 border-r border-[#E2E8F0] px-3 flex items-center">Name</div>
              <div className="w-[45%] shrink-0 border-r border-[#E2E8F0] px-3 flex items-center">Notes</div>
              <div className="w-9 shrink-0" />
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#CBD5E0]">
                <span className="text-3xl mb-1.5">📖</span>
                <span className="text-[11px] font-bold uppercase tracking-wider">No records added yet</span>
              </div>
            ) : (
              <div className="p-3.5 space-y-2">
                {items.map((item, idx) => (
                  <div key={item.id} data-drag-row="true" draggable="false"
                    onDragStart={() => onDragStart(idx)}
                    onDragOver={(e) => onDragOver(e, idx)}
                    onDragEnd={(e) => { onDragEnd(); e.currentTarget.setAttribute("draggable", "false"); }}
                    className="flex items-stretch min-h-[38px] bg-white rounded-lg border border-[#E2E8F0] overflow-visible"
                  >
                    <div
                      onMouseDown={(e) => { const el = e.currentTarget.closest("[data-drag-row]"); if (el) el.setAttribute("draggable", "true"); }}
                      onMouseUp={(e) => { const el = e.currentTarget.closest("[data-drag-row]"); if (el) el.setAttribute("draggable", "false"); }}
                      className="flex items-center justify-center w-8 shrink-0 border-r border-[#E2E8F0] bg-slate-50/50 cursor-grab text-slate-400"
                    >
                      <svg viewBox="0 0 10 16" fill="currentColor" className="w-2.5 h-3.5">
                        <circle cx="2" cy="2" r="1.2"/><circle cx="8" cy="2" r="1.2"/>
                        <circle cx="2" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/>
                        <circle cx="2" cy="14" r="1.2"/><circle cx="8" cy="14" r="1.2"/>
                      </svg>
                    </div>

                    {/* name */}
                    <div className="relative flex-1 border-r border-[#E2E8F0] flex items-center">
                      <input type="text" value={item.name}
                        onChange={(e) => patch(item.id, { name: e.target.value })}
                        onFocus={() => handleInputFocus(item.id, "name")}
                        onBlur={() => handleInputBlur(150, item.name)}
                        onKeyDown={(e) => handleRowKey(e, item.id, "name", suggestedNames, item.name)}
                        placeholder="Name"
                        className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-bold text-[#1e293b] bg-transparent outline-none placeholder:text-slate-300"
                      />
                      <InlineDD id={item.id} field="name" opts={suggestedNames} val={item.name} />
                    </div>

                    {/* notes */}
                    <div className="relative w-[45%] shrink-0 border-r border-[#E2E8F0] flex items-center">
                      <input type="text" value={item.notes}
                        onChange={(e) => patch(item.id, { notes: e.target.value })}
                        onFocus={() => handleInputFocus(item.id, "notes")}
                        onBlur={() => handleInputBlur(151, item.notes)}
                        onKeyDown={(e) => handleRowKey(e, item.id, "notes", suggestedNotes, item.notes)}
                        placeholder="Add notes here"
                        className="w-full h-full border-0 focus:ring-0 px-3 text-[11px] font-semibold text-[#334155] bg-transparent outline-none placeholder:text-[#CBD5E0]"
                      />
                      <InlineDD id={item.id} field="notes" opts={suggestedNotes} val={item.notes} />
                    </div>

                    <div className="w-9 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors cursor-pointer">
                      <button type="button" onClick={() => remove(item.id)} className="p-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#F1F5F9] bg-[#FAFBFC] flex items-center justify-end gap-2.5 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[11.5px] font-bold text-[#64748B] rounded-lg transition-all">Cancel</button>
          <button type="button" onClick={onClose} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-[11.5px] font-extrabold text-white rounded-lg transition-all shadow-md">Save & Close</button>
        </div>
      </div>
    </div>
  );
}
