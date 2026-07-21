"use client";

import React, { useState } from "react";

interface AdvicesCardProps {
  advicesInput: string;
  setAdvicesInput: (v: string) => void;
  advRest: boolean;
  setAdvRest: (v: boolean) => void;
  advWater: boolean;
  setAdvWater: (v: boolean) => void;
  onOpenDrawer: () => void;
}

export default function AdvicesCard({
  advicesInput,
  setAdvicesInput,
  advRest,
  setAdvRest,
  advWater,
  setAdvWater,
  onOpenDrawer
}: AdvicesCardProps) {
  // Local list of templates, allowing the doctor to dynamically add new ones ("create master")
  const [customTemplates, setCustomTemplates] = useState<string[]>([]);
  const [typedTemplate, setTypedTemplate] = useState("");

  const handleSaveToMaster = () => {
    const text = advicesInput.trim();
    if (!text) return;
    // Check if it's already in the default or custom templates to avoid duplicates
    const defaultTemplates = ["Please take some rest.", "Drink plenty of water."];
    if (!defaultTemplates.includes(text) && !customTemplates.includes(text)) {
      setCustomTemplates((prev) => [...prev, text]);
      alert("Added to master templates list!");
    }
  };

  // Toggle checklist template click helper
  const handleToggleTemplate = (templateText: string, isChecked: boolean) => {
    let currentInput = advicesInput.trim();
    if (isChecked) {
      // Add text if not already present
      if (!currentInput.includes(templateText)) {
        setAdvicesInput(currentInput ? `${currentInput}\n${templateText}` : templateText);
      }
    } else {
      // Remove text
      const regex = new RegExp(`(^|\\n)${templateText.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}(\\n|$)`, "g");
      const cleaned = currentInput.replace(regex, "\n").trim();
      setAdvicesInput(cleaned);
    }
  };

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-sm w-full select-none text-left">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2 select-none">
        <span className="text-sm font-extrabold text-[#1E293B] uppercase flex items-center gap-1.5">
          <svg className="w-4 h-4 text-slate-500 fill-slate-500/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Advices
        </span>
        <div className="flex items-center gap-2">
          {/* Floppy save to master templates */}
          <button
            type="button"
            onClick={handleSaveToMaster}
            className="p-1 hover:bg-[#F1F5F9] rounded text-slate-500 hover:text-indigo-600 transition-colors"
            title="Create Master (Save current advice text to templates list)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V8l-4-4H8zm2 0v5h4V4H10zm-1 9h6v6H9v-6z" />
            </svg>
          </button>
          {/* Quick template button */}
          <button
            type="button"
            onClick={onOpenDrawer}
            className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[#F1F5F9] rounded text-slate-500 hover:text-indigo-600 text-xs font-bold transition-colors"
            title="Advices Templates Quick-List"
          >
            <span>T</span>
            <span className="text-[8px] font-bold lowercase">adv</span>
          </button>
          {/* Full screen */}
          <button
            type="button"
            className="p-1 hover:bg-[#F1F5F9] rounded text-slate-500 hover:text-indigo-600 transition-colors"
            title="Full Screen View"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Toolbar with small list icon */}
        <div className="flex gap-2 border-b pb-1 select-none items-center">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="p-1 hover:bg-[#F1F5F9] rounded text-slate-500 hover:text-primary transition-colors flex items-center justify-center"
            title="Open Select Advices Drawer"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Text Area */}
        <textarea
          rows={3}
          value={advicesInput}
          onChange={(e) => setAdvicesInput(e.target.value)}
          placeholder="Enter medical advice here..."
          className="w-full p-3 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-sm font-extrabold text-[#090d16] placeholder:text-slate-400 focus:bg-white focus:outline-none transition-all resize-none"
        />

        {/* Checkbox Templates Section */}
        <div className="flex flex-col gap-2 select-none text-sm font-bold text-[#090d16] pt-1">

          {/* Dynamically created templates (Masters) */}
          {customTemplates.map((text, idx) => (
            <label key={idx} className="flex items-center gap-2 cursor-pointer w-fit text-[#4B5563]">
              <input
                type="checkbox"
                onChange={(e) => handleToggleTemplate(text, e.target.checked)}
                className="rounded text-indigo-600 border-gray-300 w-4 h-4 cursor-pointer focus:ring-0"
              />
              {text}
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

