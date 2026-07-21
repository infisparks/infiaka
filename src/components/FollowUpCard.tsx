"use client";

import React, { useState, useEffect, useMemo } from "react";

interface FollowUpCardProps {
  followUpVal: string;
  setFollowUpVal: (v: string) => void;
  followUpNotes: string;
  setFollowUpNotes: (v: string) => void;
}

const SUGGESTED_INTERVALS = [
  "1 Day",
  "3 Days",
  "5 Days",
  "1 Week",
  "10 Days",
  "2 Weeks",
  "1 Month",
  "3 Months"
];

export default function FollowUpCard({
  followUpVal,
  setFollowUpVal,
  followUpNotes,
  setFollowUpNotes
}: FollowUpCardProps) {
  const [showDD, setShowDD] = useState(false);
  const [calcDate, setCalcDate] = useState("");
  const [focusedIdx, setFocusedIdx] = useState(-1);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDD || dynamicSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((prev) => {
        const next = prev + 1;
        return next >= dynamicSuggestions.length ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((prev) => {
        const next = prev - 1;
        return next < 0 ? dynamicSuggestions.length - 1 : next;
      });
    } else if (e.key === "Enter") {
      if (focusedIdx >= 0 && focusedIdx < dynamicSuggestions.length) {
        e.preventDefault();
        setFollowUpVal(dynamicSuggestions[focusedIdx]);
        setShowDD(false);
        setFocusedIdx(-1);
      }
    } else if (e.key === "Escape") {
      setShowDD(false);
      setFocusedIdx(-1);
    }
  };

  // Parse value to calculate target date
  useEffect(() => {
    if (!followUpVal) {
      setCalcDate("");
      return;
    }

    // Check if it is a formatted date string YYYY-MM-DD
    if (followUpVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const d = new Date(followUpVal);
      if (!isNaN(d.getTime())) {
        const options: Intl.DateTimeFormatOptions = {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "2-digit"
        };
        const formatted = d.toLocaleDateString("en-US", options);
        const yearPart = d.getFullYear().toString().slice(-2);
        const output = formatted.replace(new RegExp(d.getFullYear().toString(), "g"), `'${yearPart}`);
        setCalcDate(output);
        return;
      }
    }

    const parseDays = (val: string): number => {
      const match = val.match(/^(\d+)\s*(day|week|month|year)s?$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        if (unit.startsWith("day")) return num;
        if (unit.startsWith("week")) return num * 7;
        if (unit.startsWith("month")) return num * 30;
        if (unit.startsWith("year")) return num * 365;
      }
      const rawNum = parseInt(val.replace(/[^\d]/g, ""), 10);
      return isNaN(rawNum) ? 0 : rawNum;
    };

    const days = parseDays(followUpVal);
    if (days > 0) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "2-digit"
      };
      const formatted = d.toLocaleDateString("en-US", options);
      const yearPart = d.getFullYear().toString().slice(-2);
      const output = formatted.replace(new RegExp(d.getFullYear().toString(), "g"), `'${yearPart}`);
      setCalcDate(output);
    } else {
      setCalcDate("");
    }
  }, [followUpVal]);

  // Dynamically compute suggested intervals based on input value
  const dynamicSuggestions = useMemo(() => {
    if (!followUpVal || !followUpVal.trim()) {
      return SUGGESTED_INTERVALS;
    }

    const trimmed = followUpVal.trim();
    // Extract a number from the input
    const matchNum = trimmed.match(/^(\d+)$/);
    if (matchNum) {
      const num = parseInt(matchNum[1], 10);
      return [
        `${num} ${num === 1 ? "Day" : "Days"}`,
        `${num} ${num === 1 ? "Week" : "Weeks"}`,
        `${num} ${num === 1 ? "Month" : "Months"}`,
        `${num} ${num === 1 ? "Year" : "Years"}`
      ];
    }

    return SUGGESTED_INTERVALS.filter(opt => 
      opt.toLowerCase().includes(trimmed.toLowerCase())
    );
  }, [followUpVal]);

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-sm w-full relative">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2 select-none">
        <span className="text-[11px] font-extrabold text-[#1E293B] uppercase flex items-center gap-1.5">
          <svg className="w-4 h-4 text-slate-500 fill-slate-500/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Follow Up
        </span>
      </div>

      {/* Input container */}
      <div className="grid grid-cols-1 gap-3.5">
        <div className="relative flex items-center gap-3">
          {/* Main Interval input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={followUpVal}
              onChange={(e) => {
                setFollowUpVal(e.target.value);
                setFocusedIdx(-1);
              }}
              onFocus={() => {
                setShowDD(true);
                setFocusedIdx(-1);
              }}
              onBlur={() => setTimeout(() => {
                setShowDD(false);
                setFocusedIdx(-1);
              }, 200)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 10 Days"
              className="w-full h-10 px-3.5 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[12px] font-semibold text-[#1E293B] focus:bg-white focus:outline-none placeholder:text-[#C0CADC] transition-all"
            />
            {followUpVal && (
              <button
                type="button"
                onClick={() => setFollowUpVal("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}

            {/* Dropdown menu */}
            {showDD && dynamicSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                {dynamicSuggestions.map((opt, index) => (
                  <div
                    key={opt}
                    onMouseDown={() => {
                      setFollowUpVal(opt);
                      setShowDD(false);
                      setFocusedIdx(-1);
                    }}
                    className={`px-3.5 py-2.5 cursor-pointer border-b border-[#F8FAFC] last:border-b-0 text-[11.5px] font-semibold text-left transition-colors ${
                      index === focusedIdx
                        ? "bg-[#EFF6FF] text-[#1D4ED8]"
                        : "text-[#1E293B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calendar selector icon button wrapper */}
          <div className="relative w-10 h-10 shrink-0">
            <input
              type="date"
              value={followUpVal.match(/^\d{4}-\d{2}-\d{2}$/) ? followUpVal : ""}
              onChange={(e) => {
                if (e.target.value) {
                  setFollowUpVal(e.target.value);
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              title="Select follow up date"
            />
            <button
              type="button"
              className="w-full h-full rounded-lg border border-[#E2E8F0] hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          {/* Auto fill check right aligned */}
          <label className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-[#64748B] cursor-pointer shrink-0">
            <input type="checkbox" className="rounded text-primary border-gray-300 w-4 h-4 cursor-pointer focus:ring-0" />
            Auto Fill from Rx
          </label>
        </div>

        {/* Calculated date displays below input */}
        {calcDate && (
          <div className="text-[12px] font-extrabold text-[#090d16] bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-left inline-block w-fit select-none">
            📅 {calcDate}
          </div>
        )}

        {/* Note TextArea */}
        <div className="flex flex-col gap-1.5 text-left">
          <textarea
            rows={3}
            value={followUpNotes}
            onChange={(e) => setFollowUpNotes(e.target.value)}
            placeholder="Notes added here will be available in the follow-up visit for reference"
            className="w-full p-3 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[12.5px] font-extrabold text-[#090d16] placeholder:text-slate-400 focus:bg-white focus:outline-none transition-all resize-none"
          />
        </div>
      </div>
    </section>
  );
}
