"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const DEFAULT_ADVICES = [
  "Avoid maida (eg: toast, butter, biscuit, Khari, cake, pav, bread)",

];

async function fetchAdvices(categoryId: number, defaults: string[]): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("aka_master_dropdown_catalog")
      .select("value")
      .eq("category_id", categoryId)
      .order("value", { ascending: true });
    
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

interface AdvicesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  advicesInput: string;
  setAdvicesInput: (v: string) => void;
}

export default function AdvicesDrawer({
  isOpen,
  onClose,
  advicesInput,
  setAdvicesInput
}: AdvicesDrawerProps) {
  const [dbAdvices, setDbAdvices] = useState<string[]>(DEFAULT_ADVICES);
  const [searchVal, setSearchVal] = useState("");
  const [selectedAdvices, setSelectedAdvices] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync selected advices with advicesInput lines when drawer opens
  useEffect(() => {
    if (isOpen) {
      const lines = advicesInput
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      setSelectedAdvices(lines);
      setSearchVal("");
      
      // Load advices from Supabase
      const load = async () => {
        const list = await fetchAdvices(70, DEFAULT_ADVICES);
        setDbAdvices(list);
      };
      load();
    }
  }, [isOpen, advicesInput]);

  if (!isOpen) return null;

  // Toggle selection helper
  const handleToggleAdvice = (advice: string) => {
    setSelectedAdvices((prev) => {
      if (prev.includes(advice)) {
        return prev.filter((item) => item !== advice);
      } else {
        return [...prev, advice];
      }
    });
  };

  // Create new advice template helper
  const handleCreateAdvice = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    // Add to DB
    await incrementOption(70, trimmed);
    
    // Add to local lists
    if (!dbAdvices.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      setDbAdvices((prev) => [...prev, trimmed].sort());
    }
    
    // Auto-select the newly created advice
    if (!selectedAdvices.includes(trimmed)) {
      setSelectedAdvices((prev) => [...prev, trimmed]);
    }
    
    // Clear search query
    setSearchVal("");
  };

  // Filter list based on search query
  const filteredList = dbAdvices.filter((item) =>
    item.toLowerCase().includes(searchVal.toLowerCase())
  );

  // Is exact match found in list? (to show + Create button)
  const isExactMatch = dbAdvices.some(
    (item) => item.toLowerCase() === searchVal.trim().toLowerCase()
  );

  const handleSave = () => {
    // Join with newlines
    const newText = selectedAdvices.join("\n");
    setAdvicesInput(newText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-start bg-black/35 backdrop-blur-[2px] select-none text-left">
      {/* Sidebar Container - Aligned on left using justify-start & animate-slide-in-left */}
      <div className="w-[88vw] max-w-[480px] h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-in-left relative border-r border-[#E2E8F0]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between shrink-0 bg-[#FAFBFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-650 text-xs shadow-sm">
              💬
            </div>
            <span className="text-[13px] font-extrabold text-[#1E293B]">Select Advices</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#94A3B8] hover:text-[#475569] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search & Input Area */}
        <div className="p-5 pb-3 border-b border-[#F1F5F9] bg-[#FAFBFC] space-y-3 shrink-0">
          <div className="relative flex items-center">
            <svg className="absolute left-3 w-3.5 h-3.5 fill-[#CBD5E0] pointer-events-none" viewBox="0 0 512 512">
              <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z" />
            </svg>
            <input
              type="text"
              placeholder="Search or add advice template..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full h-10 pl-9 pr-20 border border-[#E2E8F0] focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 rounded-lg text-[12px] bg-white focus:outline-none placeholder:text-[#C0CADC] font-semibold transition-all"
            />
            {searchVal.trim() && !isExactMatch && (
              <button
                type="button"
                onClick={() => handleCreateAdvice(searchVal)}
                className="absolute right-3 text-indigo-600 hover:text-indigo-700 text-[11px] font-bold tracking-wide transition-all"
              >
                + Create
              </button>
            )}
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold px-1">
            <span>Selected: {selectedAdvices.length} template(s)</span>
            {selectedAdvices.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedAdvices([])}
                className="text-red-500 hover:text-red-650 transition-colors uppercase tracking-wider text-[9px]"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Advices List */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-5 space-y-2 bg-[#FAFBFC]"
        >
          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#CBD5E0] bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
              <span className="text-3xl mb-1.5 font-bold">💬</span>
              <span className="text-[11px] font-bold uppercase tracking-wider mb-2">No templates found</span>
              {searchVal.trim() && (
                <button
                  type="button"
                  onClick={() => handleCreateAdvice(searchVal)}
                  className="px-3.5 py-1.5 bg-primary text-white text-[11px] font-extrabold rounded-lg hover:bg-primary-hover shadow-sm transition-all"
                >
                  Create "{searchVal.trim()}"
                </button>
              )}
            </div>
          ) : (
            filteredList.map((advice) => {
              const isChecked = selectedAdvices.includes(advice);
              return (
                <div
                  key={advice}
                  onClick={() => handleToggleAdvice(advice)}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer select-none bg-white
                    ${
                      isChecked
                        ? "border-indigo-400 bg-indigo-50/20 shadow-xs"
                        : "border-[#E2E8F0] hover:border-slate-350 hover:bg-slate-50/40"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // Controlled click via parent row
                    className="rounded text-primary border-gray-300 w-4 h-4 cursor-pointer focus:ring-0 shrink-0 accent-indigo-600"
                  />
                  <span className={`text-[12px] font-semibold leading-relaxed transition-all
                    ${isChecked ? "text-indigo-900 font-bold" : "text-[#334155]"}`}
                  >
                    {advice}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer controls */}
        <div className="px-5 py-4 border-t border-[#F1F5F9] bg-[#FAFBFC] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[12px] font-bold text-[#64748B] rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-primary hover:bg-primary-hover text-[12px] font-extrabold text-white rounded-lg transition-all shadow-md"
          >
            Save & Close
          </button>
        </div>

      </div>
    </div>
  );
}
