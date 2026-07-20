"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface SurgeryPerformedCardProps {
  surgeryPerformed: string;
  setSurgeryPerformed: (val: string) => void;
  surgeryDate: string;
  setSurgeryDate: (val: string) => void;
  surgeryNotes: string;
  setSurgeryNotes: (val: string) => void;
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

export default function SurgeryPerformedCard({
  surgeryPerformed,
  setSurgeryPerformed,
  surgeryDate,
  setSurgeryDate,
  surgeryNotes,
  setSurgeryNotes,
}: SurgeryPerformedCardProps) {
  // Surgery Name Autocomplete states
  const [surgeryNameOptions, setSurgeryNameOptions] = useState<string[]>(DEFAULT_SURGERIES);
  const [surgeryNameFocused, setSurgeryNameFocused] = useState(false);
  const [nameDDIndex, setNameDDIndex] = useState(-1);

  // Surgery Date Autocomplete states
  const [dateFocused, setDateFocused] = useState(false);
  const [dateDDIndex, setDateDDIndex] = useState(-1);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const dateContainerRef = useRef<HTMLDivElement>(null);

  // Load from Supabase on mount
  useEffect(() => {
    let active = true;
    const loadOptions = async () => {
      try {
        const { data, error } = await supabase
          .from("aka_master_dropdown_catalog")
          .select("value")
          .eq("category_id", 130)
          .order("usage_count", { ascending: false })
          .limit(100);
        if (error) throw error;
        const list = (data || []).map((d: any) => d.value);
        if (active && list.length > 0) {
          setSurgeryNameOptions(list);
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

  // Increment surgery option in database helper
  const incrementOption = async (categoryId: number, value: string) => {
    if (!value?.trim()) return;
    const trimmed = value.trim();
    try {
      const { data: existing } = await supabase
        .from("aka_master_dropdown_catalog")
        .select("id, usage_count")
        .eq("category_id", categoryId)
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
          .insert({ category_id: categoryId, value: trimmed, usage_count: 1 });
      }
      
      // Update local choices state so it shows up next time
      setSurgeryNameOptions((prev) => {
        if (prev.some((p) => p.toLowerCase() === trimmed.toLowerCase())) return prev;
        return [...prev, trimmed];
      });
    } catch (err) {
      console.error("Error incrementing option:", err);
    }
  };

  // Close dropdowns on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (nameContainerRef.current && !nameContainerRef.current.contains(event.target as Node)) {
        setSurgeryNameFocused(false);
      }
      if (dateContainerRef.current && !dateContainerRef.current.contains(event.target as Node)) {
        setDateFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format JS Date into "23 July 2026"
  const formatDateToCustom = (date: Date): string => {
    const day = date.getDate();
    const monthsCorrected = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = monthsCorrected[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Convert "2 day", "3 month" to actual date
  const calculateRelativeDate = (val: string): string => {
    const clean = val.trim().toLowerCase();
    const match = clean.match(/^(\d+)\s*(day|week|month|year)s?$/i);
    if (!match) return val;
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const target = new Date();
    if (unit.startsWith("day")) {
      target.setDate(target.getDate() - amount);
    } else if (unit.startsWith("week")) {
      target.setDate(target.getDate() - amount * 7);
    } else if (unit.startsWith("month")) {
      target.setMonth(target.getMonth() - amount);
    } else if (unit.startsWith("year")) {
      target.setFullYear(target.getFullYear() - amount);
    }
    return formatDateToCustom(target);
  };

  // Generate date autocomplete list
  const getDateSuggestions = (): string[] => {
    const clean = surgeryDate.trim();
    if (!clean) return [];
    const numMatch = clean.match(/^(\d+)/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      const isSingular = num === 1;
      return [
        `${num} ${isSingular ? "Day" : "Days"} ago`,
        `${num} ${isSingular ? "Week" : "Weeks"} ago`,
        `${num} ${isSingular ? "Month" : "Months"} ago`,
        `${num} ${isSingular ? "Year" : "Years"} ago`
      ];
    }
    return [];
  };

  const dateSuggestions = getDateSuggestions();

  // Filter surgery name autocomplete list
  const getNameSuggestions = (): string[] => {
    const clean = surgeryPerformed.trim().toLowerCase();
    const filtered = surgeryNameOptions.filter((o) => o.toLowerCase().includes(clean));
    
    // Add create suggestion if not matches perfectly
    if (surgeryPerformed.trim() && !surgeryNameOptions.some((o) => o.toLowerCase() === surgeryPerformed.trim().toLowerCase())) {
      return [...filtered, `+ Create "${surgeryPerformed.trim()}"`];
    }
    return filtered;
  };

  const nameSuggestions = getNameSuggestions();

  const handleDatePickerChange = (isoDate: string) => {
    if (!isoDate) return;
    const target = new Date(isoDate);
    setSurgeryDate(formatDateToCustom(target));
  };

  const handleDateSuggestionSelect = (opt: string) => {
    const base = opt.replace(/\s*ago$/i, "");
    const formatted = calculateRelativeDate(base);
    setSurgeryDate(formatted);
    setDateFocused(false);
    setDateDDIndex(-1);
  };

  const handleNameSuggestionSelect = (opt: string) => {
    const isCreate = opt.startsWith('+ Create "');
    let finalVal = opt;
    if (isCreate) {
      const match = opt.match(/\+ Create "(.*)"/);
      finalVal = match ? match[1] : opt;
      incrementOption(130, finalVal);
    }
    setSurgeryPerformed(finalVal);
    setSurgeryNameFocused(false);
    setNameDDIndex(-1);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (nameSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setNameDDIndex((prev) => Math.min(prev + 1, nameSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setNameDDIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      if (nameDDIndex >= 0 && nameSuggestions[nameDDIndex]) {
        e.preventDefault();
        handleNameSuggestionSelect(nameSuggestions[nameDDIndex]);
      }
    } else if (e.key === "Escape") {
      setSurgeryNameFocused(false);
      setNameDDIndex(-1);
    }
  };

  const handleDateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (dateSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDateDDIndex((prev) => Math.min(prev + 1, dateSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDateDDIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      if (dateDDIndex >= 0 && dateSuggestions[dateDDIndex]) {
        e.preventDefault();
        handleDateSuggestionSelect(dateSuggestions[dateDDIndex]);
      }
    } else if (e.key === "Escape") {
      setDateFocused(false);
      setDateDDIndex(-1);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 space-y-4 shadow-sm w-full transition-all">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 select-none">
          <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 0L5 5m4.121 4.121L5 19" />
          </svg>
          Surgery
        </span>
      </div>

      <div className="space-y-4">
        {/* Row 1: Full width - Surgery Performed */}
        <div className="w-full relative" ref={nameContainerRef}>
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 select-none">
            Surgery Performed
          </label>
          <input
            type="text"
            value={surgeryPerformed}
            onChange={(e) => {
              setSurgeryPerformed(e.target.value);
              setSurgeryNameFocused(true);
              setNameDDIndex(-1);
            }}
            onFocus={() => {
              setSurgeryNameFocused(true);
              setNameDDIndex(-1);
            }}
            onKeyDown={handleNameKeyDown}
            placeholder="Enter surgery performed (e.g., Appendectomy, Knee Replacement)..."
            className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />

          {/* Autocomplete Dropdown list for Surgery Performed */}
          {surgeryNameFocused && nameSuggestions.length > 0 && (
            <div className="absolute left-0 top-full mt-1 z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto p-1 space-y-0.5">
              {nameSuggestions.map((opt, idx) => {
                const isCreate = opt.startsWith('+ Create "');
                let displayVal = opt;
                if (isCreate) {
                  const match = opt.match(/\+ Create "(.*)"/);
                  displayVal = match ? match[1] : opt;
                }
                const isHighlighted = idx === nameDDIndex;
                return (
                  <div
                    key={opt}
                    onMouseDown={() => handleNameSuggestionSelect(opt)}
                    onMouseEnter={() => setNameDDIndex(idx)}
                    className={`px-3 py-2 text-xs rounded-md cursor-pointer text-left transition-colors font-medium
                      ${isHighlighted ? "bg-indigo-50 text-indigo-700 font-semibold" : "hover:bg-slate-50 text-slate-700"}`}
                  >
                    {isCreate ? (
                      <span className="text-indigo-600 font-bold">
                        + Create <span className="italic font-semibold">"{displayVal}"</span>
                      </span>
                    ) : (
                      opt
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Row 2: Date of Surgery (less width ~1/3) and Surgery Notes (more width ~2/3) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Input 2: Date of Surgery (md:col-span-4) */}
          <div className="md:col-span-4 relative" ref={dateContainerRef}>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 select-none">
              Date of Surgery
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={surgeryDate}
                onChange={(e) => {
                  setSurgeryDate(e.target.value);
                  setDateFocused(true);
                  setDateDDIndex(-1);
                }}
                onFocus={() => {
                  setDateFocused(true);
                  setDateDDIndex(-1);
                }}
                onKeyDown={handleDateKeyDown}
                placeholder="e.g., 23 July 2026 or '2 days ago'"
                className="w-full px-3 py-2 pr-9 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              {/* Calendar trigger button */}
              <button
                type="button"
                onClick={() => {
                  if (dateInputRef.current) {
                    if (dateInputRef.current.showPicker) {
                      dateInputRef.current.showPicker();
                    } else {
                      dateInputRef.current.click();
                    }
                  }
                }}
                className="absolute right-2.5 text-slate-400 hover:text-indigo-600 focus:outline-none transition-colors"
                title="Open calendar picker"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.75}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              </button>
              {/* Hidden native Date picker input */}
              <input
                type="date"
                ref={dateInputRef}
                onChange={(e) => handleDatePickerChange(e.target.value)}
                className="absolute opacity-0 pointer-events-none w-0 h-0 right-0"
              />
            </div>

            {/* Autocomplete Dropdown list for Date of Surgery */}
            {dateFocused && dateSuggestions.length > 0 && (
              <div className="absolute left-0 top-full mt-1 z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto p-1 space-y-0.5">
                {dateSuggestions.map((opt, idx) => {
                  const isHighlighted = idx === dateDDIndex;
                  const dateVal = calculateRelativeDate(opt.replace(/\s*ago$/i, ""));
                  return (
                    <div
                      key={opt}
                      onMouseDown={() => handleDateSuggestionSelect(opt)}
                      onMouseEnter={() => setDateDDIndex(idx)}
                      className={`px-3 py-2 text-xs rounded-md cursor-pointer text-left transition-colors flex justify-between items-center
                        ${isHighlighted ? "bg-indigo-50 text-indigo-700 font-semibold" : "hover:bg-slate-50 text-slate-700"}`}
                    >
                      <span className="font-medium">{opt}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({dateVal})</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Input 3: Surgery Notes (md:col-span-8) */}
          <div className="md:col-span-8">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 select-none">
              Surgery Notes
            </label>
            <input
              type="text"
              value={surgeryNotes}
              onChange={(e) => setSurgeryNotes(e.target.value)}
              placeholder="Enter complications or surgery notes..."
              className="w-full px-3 py-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
