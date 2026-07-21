"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface PlanSurgeryAdvisedCardProps {
  planSurgeryAdvised: string;
  setPlanSurgeryAdvised: (val: string) => void;
}

const DEFAULT_SURGERIES = [
  "Appendectomy",
  "Cholecystectomy",
  "Hernia Repair",
  "Cataract Surgery",
  "Coronary Artery Bypass",
  "Knee Replacement",
  "Tonsillectomy",
  "Angioplasty",
  "Hysterectomy",
  "Cesarean Section",
  "Laparoscopy"
];

export default function PlanSurgeryAdvisedCard({
  planSurgeryAdvised,
  setPlanSurgeryAdvised,
}: PlanSurgeryAdvisedCardProps) {
  const [searchInput, setSearchInput] = useState("");
  const [surgeryOptions, setSurgeryOptions] = useState<string[]>(DEFAULT_SURGERIES);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load surgery options from Supabase catalog on mount (category_id = 135)
  useEffect(() => {
    let active = true;
    const loadOptions = async () => {
      try {
        const { data, error } = await supabase
          .from("aka_master_dropdown_catalog")
          .select("value")
          .eq("category_id", 135)
          .order("usage_count", { ascending: false })
          .limit(100);

        if (error) throw error;
        const list = (data || []).map((d: any) => d.value);
        if (active && list.length > 0) {
          const merged = Array.from(new Set([...list, ...DEFAULT_SURGERIES]));
          setSurgeryOptions(merged);
        }
      } catch (err) {
        console.error("Error loading surgery options:", err);
      }
    };
    loadOptions();
    return () => {
      active = false;
    };
  }, []);

  // Save/increment new option in database
  const saveNewOption = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    try {
      const { data: existing } = await supabase
        .from("aka_master_dropdown_catalog")
        .select("id, usage_count")
        .eq("category_id", 135)
        .ilike("value", trimmed)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("aka_master_dropdown_catalog")
          .update({ usage_count: (existing.usage_count || 0) + 1 })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("aka_master_dropdown_catalog")
          .insert({ category_id: 135, value: trimmed, usage_count: 1 });
      }

      setSurgeryOptions((prev) => {
        if (prev.some((p) => p.toLowerCase() === trimmed.toLowerCase())) return prev;
        return [trimmed, ...prev];
      });
    } catch (err) {
      console.error("Error saving dropdown option:", err);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter dropdown options based on searchInput
  const getSuggestions = (): string[] => {
    const clean = searchInput.trim().toLowerCase();
    const filtered = surgeryOptions.filter((o) => o.toLowerCase().includes(clean));

    // Show "+ Create..." option if search term is entered and not exact match
    if (searchInput.trim() && !surgeryOptions.some((o) => o.toLowerCase() === searchInput.trim().toLowerCase())) {
      return [...filtered, `+ Create "${searchInput.trim()}"`];
    }
    return filtered;
  };

  const suggestions = getSuggestions();

  const handleSelectOption = (opt: string) => {
    const isCreate = opt.startsWith('+ Create "');
    let finalVal = opt;
    if (isCreate) {
      const match = opt.match(/\+ Create "(.*)"/);
      finalVal = match ? match[1] : opt;
      saveNewOption(finalVal);
    }

    // Append cleanly without duplicate/continuous commas
    const current = planSurgeryAdvised.trim().replace(/[\s,]+$/, "");
    if (current) {
      if (!current.toLowerCase().includes(finalVal.toLowerCase())) {
        setPlanSurgeryAdvised(`${current}, ${finalVal}`);
      }
    } else {
      setPlanSurgeryAdvised(finalVal);
    }

    setSearchInput("");
    setIsFocused(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        e.preventDefault();
        handleSelectOption(suggestions[selectedIndex]);
      } else if (searchInput.trim()) {
        e.preventDefault();
        handleSelectOption(`+ Create "${searchInput.trim()}"`);
      }
    } else if (e.key === "Escape") {
      setIsFocused(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-sm w-full font-sans">
      <div className="flex items-center justify-between border-b pb-2 select-none">
        <span className="text-sm font-extrabold text-[#1E293B] uppercase flex items-center gap-1.5">
          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Plan / Surgery Advised
        </span>
      </div>

      <div className="space-y-3">
        {/* Autocomplete Input with Dropdown & Create Option */}
        <div ref={containerRef} className="relative w-full">
          <label className="block text-xs font-extrabold text-[#64748B] mb-1 uppercase tracking-wider">
            Select or Create Surgery / Plan
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchInput}
              onFocus={() => setIsFocused(true)}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setIsFocused(true);
                setSelectedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search or type surgery (e.g. Appendectomy, Cataract Surgery)..."
              className="w-full h-10 px-3.5 pr-10 border border-[#E2E8F0] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-lg text-sm font-semibold text-[#1E293B] placeholder:text-[#C0CADC] focus:bg-white focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setIsFocused(!isFocused)}
              className="absolute right-3 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {isFocused && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E2E8F0] rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-50">
              {suggestions.map((opt, idx) => {
                const isCreate = opt.startsWith('+ Create "');
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={opt}
                    onClick={() => handleSelectOption(opt)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`px-3.5 py-2.5 cursor-pointer text-sm font-semibold transition-colors flex items-center justify-between ${
                      isSelected ? "bg-indigo-50 text-indigo-700" : "hover:bg-[#F8FAFC] text-[#1E293B]"
                    } ${isCreate ? "text-indigo-600 font-extrabold bg-indigo-50/40" : ""}`}
                  >
                    <span>{opt}</span>
                    {isCreate && (
                      <span className="text-xs bg-indigo-600 text-white font-extrabold px-2 py-0.5 rounded shadow-2xs">
                        + Add to catalog
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Textarea for Selected Plan & Custom Details */}
        <div>
          <label className="block text-xs font-extrabold text-[#64748B] mb-1 uppercase tracking-wider">
            Advised Plan / Recommendations Details
          </label>
          <textarea
            rows={3}
            value={planSurgeryAdvised}
            onChange={(e) => setPlanSurgeryAdvised(e.target.value)}
            placeholder="Enter surgical procedure plan or recommendations advised..."
            className="w-full p-3 border border-[#E2E8F0] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-lg text-sm font-semibold text-[#090d16] placeholder:text-slate-400 focus:bg-white focus:outline-none transition-all resize-none"
          />
        </div>
      </div>
    </section>
  );
}
