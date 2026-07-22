"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AutoComplete } from "primereact/autocomplete";

/* ─── Helpers ────────────────────────────────────────────────────── */
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
      .limit(5000);

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
    console.error("Error incrementing option:", err);
  }
}

interface MedicineItem {
  id?: number;
  name: string;
  generic: string;
  form?: string;
  defaultDose?: string;
  defaultFreq?: string;
  defaultTiming?: string;
  defaultDuration?: string;
  defaultInstr?: string;
}

async function saveMedicineDefaultDosage(medicineId: number, defaults: {
  dose?: string;
  freq?: string;
  timing?: string;
  duration?: string;
  instr?: string;
}) {
  if (!medicineId) return;
  try {
    const { data } = await supabase
      .from("medicine")
      .select("metadata")
      .eq("id", medicineId)
      .maybeSingle();

    const existingMeta = data?.metadata || {};
    const updatedMeta = { ...existingMeta };

    if (defaults.dose !== undefined) updatedMeta.default_dose = defaults.dose;
    if (defaults.freq !== undefined) updatedMeta.default_freq = defaults.freq;
    if (defaults.timing !== undefined) updatedMeta.default_timing = defaults.timing;
    if (defaults.duration !== undefined) updatedMeta.default_duration = defaults.duration;
    if (defaults.instr !== undefined) updatedMeta.default_instr = defaults.instr;

    await supabase
      .from("medicine")
      .update({ metadata: updatedMeta })
      .eq("id", medicineId);
  } catch (err) {
    console.error("Error saving medicine metadata:", err);
  }
}

async function incrementMedicineUsageCount(medicineId: number) {
  if (!medicineId) return;
  try {
    const { data } = await supabase
      .from("medicine")
      .select("usage_count")
      .eq("id", medicineId)
      .maybeSingle();

    const currentCount = Number(data?.usage_count || 0);
    await supabase
      .from("medicine")
      .update({ usage_count: currentCount + 1 })
      .eq("id", medicineId);
  } catch (err) {
    console.error("Error incrementing medicine usage count:", err);
  }
}

async function searchMedicinesFromDb(query: string): Promise<MedicineItem[]> {
  try {
    const q = query?.trim() ?? "";

    const toItem = (m: any): MedicineItem => {
      const meta = m.metadata || {};
      return {
        id: Number(m.id),
        name: m.name ?? "",
        generic: m.salt_composition || m.short_composition1 || "",
        form: m.type?.toLowerCase() || "tablet",
        defaultDose: meta.default_dose || "",
        defaultFreq: meta.default_freq || "",
        defaultTiming: meta.default_timing || "",
        defaultDuration: meta.default_duration || "",
        defaultInstr: meta.default_instr || ""
      };
    };

    // Empty query — show top 10 most used
    if (!q) {
      const { data } = await supabase
        .from("medicine")
        .select("id, name, salt_composition, short_composition1, type, metadata, usage_count")
        .order("usage_count", { ascending: false })
        .order("name", { ascending: true })
        .limit(10);
      return (data || []).map(toItem);
    }

    // Run Tier 1 (starts with) and Tier 2 (contains) queries in parallel to reduce network latency
    const [tier1Result, tier2Result] = await Promise.all([
      supabase
        .from("medicine")
        .select("id, name, salt_composition, short_composition1, type, metadata, usage_count")
        .ilike("name", `${q}%`)
        .order("usage_count", { ascending: false })
        .order("name", { ascending: true })
        .limit(12),
      supabase
        .from("medicine")
        .select("id, name, salt_composition, short_composition1, type, metadata, usage_count")
        .ilike("name", `%${q}%`)
        .not("name", "ilike", `${q}%`)   // exclude starts-with results
        .order("usage_count", { ascending: false })
        .order("name", { ascending: true })
        .limit(10)
    ]);

    const tier1 = tier1Result.data || [];
    const tier2 = tier2Result.data || [];

    const seen = new Set<string>(tier1.map((m: any) => m.name));
    const results: MedicineItem[] = tier1.map(toItem);

    for (const m of tier2) {
      if (!seen.has(m.name)) {
        seen.add(m.name);
        results.push(toItem(m));
      }
    }

    // Tier 3: Composition / Salt matches (only requested if we have very few name results)
    if (results.length < 8) {
      const { data: tier3 } = await supabase
        .from("medicine")
        .select("id, name, salt_composition, short_composition1, type, metadata, usage_count")
        .or(`salt_composition.ilike.${q}%,short_composition1.ilike.${q}%`)
        .order("usage_count", { ascending: false })
        .order("name", { ascending: true })
        .limit(8);
      for (const m of (tier3 || [])) {
        if (!seen.has(m.name)) {
          seen.add(m.name);
          results.push(toItem(m));
        }
      }
    }

    return results.slice(0, 20);
  } catch (err) {
    console.error("Error searching medicines:", err);
    return [];
  }
}

async function insertMedicineIntoDb(name: string, generic: string = "", type: string = "tablet"): Promise<MedicineItem> {
  const customId = Date.now() + Math.floor(Math.random() * 10000000);
  try {
    const { data, error } = await supabase
      .from("medicine")
      .insert({
        id: customId,
        name,
        salt_composition: generic,
        short_composition1: generic,
        type: type.charAt(0).toUpperCase() + type.slice(1)
      })
      .select("id, name, salt_composition, short_composition1, type")
      .single();
    if (error) throw error;
    return {
      id: Number(data.id),
      name: data.name ?? name,
      generic: data.salt_composition || data.short_composition1 || generic,
      form: data.type?.toLowerCase() || type
    };
  } catch (err) {
    console.error("Error inserting medicine:", err);
    return { id: customId, name, generic, form: type };
  }
}

async function updateMedicineGenericName(name: string, generic: string) {
  try {
    await supabase
      .from("medicine")
      .update({
        salt_composition: generic,
        short_composition1: generic
      })
      .eq("name", name);
  } catch (err) {
    console.error("Error updating generic name:", err);
  }
}

const DEFAULT_FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Suspension",
  "Drops",
  "Injection",
  "Cream",
  "Ointment",
  "Gel",
  "Lotion",
  "Powder",
  "Sachet",
  "Eye Drops",
  "Ear Drops",
  "Nasal Spray",
  "Inhaler",
  "Nebulizer Solution",
  "Patch",
  "Suppository",
  "Mouthwash",
  "Gargle"
];

const FULL_FORMS = [
  "Tablet",
  "Capsule",
  "Caplet",
  "Softgel Capsule",
  "Chewable Tablet",
  "Dispersible Tablet",
  "Effervescent Tablet",
  "Sublingual Tablet",
  "Buccal Tablet",
  "Orally Disintegrating Tablet (ODT)",
  "Pill",

  "Syrup",
  "Suspension",
  "Oral Solution",
  "Oral Drops",
  "Elixir",
  "Linctus",
  "Mixture",
  "Emulsion",
  "Tonic",

  "Injection",
  "IV Infusion",
  "IM Injection",
  "SC Injection",
  "Prefilled Syringe",
  "Vial",
  "Ampoule",

  "Powder",
  "Powder for Suspension",
  "Granules",
  "Sachet",

  "Ointment",
  "Cream",
  "Gel",
  "Lotion",
  "Paste",
  "Liniment",
  "Foam",
  "Topical Solution",
  "Topical Spray",

  "Eye Drops",
  "Eye Ointment",
  "Eye Gel",

  "Ear Drops",

  "Nasal Drops",
  "Nasal Spray",

  "Mouthwash",
  "Gargle",
  "Oral Gel",
  "Dental Gel",

  "Inhaler",
  "Rotacaps",
  "Respules",
  "Nebulizer Solution",
  "Dry Powder Inhaler",

  "Transdermal Patch",
  "Medicated Patch",

  "Suppository",
  "Pessary",
  "Enema",

  "Lozenge",
  "Troche",

  "Medicated Shampoo",
  "Soap",
  "Dusting Powder",

  "Implant",
  "Pellet",

  "Vaginal Cream",
  "Vaginal Tablet",
  "Vaginal Gel",

  "Rectal Cream",
  "Rectal Ointment",

  "Liquid",
  "Drops",
  "Spray",
  "Reconstitution Powder",

  "Kit",
  "Medical Device",
  "Others"
];

/* ─── Types ─────────────────────────────────────────────────── */
interface Medication {
  id: string;
  medicineId?: number;
  name: string;
  generic: string;
  form?: string;
  dose: string;
  freq: string;
  timing: string;
  duration: string;
  start: string;
  instr: string;
}

interface MedicationsCardProps {
  medications: Medication[];
  setMedications: React.Dispatch<React.SetStateAction<Medication[]>>;
}


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
    const query = event.query.trim().toLowerCase();
    let results = options
      .filter((o) => o.toLowerCase().includes(query))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(query);
        const bStarts = b.toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
    if (!query || options.some(opt => opt.toLowerCase() === query)) {
      results = options;
    }
    const sliced = results.slice(0, 30);
    if (event.query.trim() && !options.some((o) => o.toLowerCase() === query)) {
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
      onChange(custom);
      onBlur(custom);
    } else {
      onChange(val);
      onBlur(val);
    }
    // Auto-focus next field after selection
    setTimeout(() => onAfterSelect?.(), 60);
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
        <span className="text-blue-600 font-bold flex items-center gap-1 text-sm">
          <span>+ Create</span>
          <span className="italic">"{custom}"</span>
        </span>
      );
    }
    return <span className="text-sm font-semibold text-[#334155]">{item}</span>;
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
          search({ query: value || "" });
          autoRef.current?.search(e, value || "", "dropdown");
        }}
        itemTemplate={itemTemplate}
        placeholder={placeholder}
        inputRef={onInputRef ? (el: any) => onInputRef(el as HTMLInputElement | null) : undefined}
        inputClassName="w-full h-full border-0 focus:ring-0 px-3 text-sm font-bold text-[#090d16] bg-transparent outline-none placeholder:text-slate-400"
        className="w-full h-full"
        panelClassName="custom-autocomplete-panel text-sm font-semibold"
      />
    </div>
  );
}


/* ─── Reusable autocomplete inline input for medicine search ───── */
function InlineMedicineAutoComplete({
  value,
  onChange,
  onSelect,
  onBlur,
  placeholder,
  onAfterSelect,
  onInputRef,
  isAlreadyAdded,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (med: MedicineItem) => void;
  onBlur?: (v: string) => void;
  placeholder?: string;
  onAfterSelect?: () => void;
  onInputRef?: (el: HTMLInputElement | null) => void;
  isAlreadyAdded?: (medName: string, medId?: number) => boolean;
}) {
  const [suggestions, setSuggestions] = useState<MedicineItem[]>([]);
  const dropdownClicked = useRef(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoRef = useRef<any>(null);

  /* Debounce DB queries — avoids hitting Supabase on every keystroke */
  const search = (event: { query: string }) => {
    clearTimeout(searchTimer.current);
    const query = event.query.trim();
    searchTimer.current = setTimeout(async () => {
      const results = await searchMedicinesFromDb(query);
      setSuggestions(results);
    }, 280);
  };

  const handleSelect = (e: { value: MedicineItem }) => {
    dropdownClicked.current = true;
    onSelect(e.value);
    // Auto-focus dose field after medicine is selected
    setTimeout(() => onAfterSelect?.(), 80);
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

  const itemTemplate = (item: MedicineItem) => {
    return (
      <div className="p-1.5 flex items-center justify-between w-full">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-[#1e293b]">{item.name}</div>
          <div className="text-[8px] text-[#A0AEC0] uppercase font-semibold truncate">{item.generic}</div>
        </div>
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
        field="name"
        onChange={(e) => {
          if (typeof e.value === "string") {
            onChange(e.value);
          } else if (e.value && typeof e.value === "object" && "name" in e.value) {
            onChange((e.value as MedicineItem).name);
          }
        }}
        onSelect={handleSelect}
        onBlur={handleBlur}
        minLength={0}
        onFocus={(e) => {
          search({ query: value || "" });
          autoRef.current?.search(e, value || "", "dropdown");
        }}
        itemTemplate={itemTemplate}
        placeholder={placeholder}
        inputRef={onInputRef ? (el: any) => onInputRef(el as HTMLInputElement | null) : undefined}
        inputClassName="w-full h-full border-0 focus:ring-0 px-3 text-sm font-extrabold text-[#090d16] bg-transparent outline-none p-0 placeholder:text-slate-400"
        className="w-full h-full"
        panelClassName="custom-autocomplete-panel text-sm font-semibold"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Medications Component
   ═══════════════════════════════════════════════════════════════════ */
export default function MedicationsCard({ medications, setMedications }: MedicationsCardProps) {
  // Option Suggestion Lists from Supabase
  const [doseOptions, setDoseOptions] = useState<string[]>([]);
  const [freqOptions, setFreqOptions] = useState<string[]>([]);
  const [timingOptions, setTimingOptions] = useState<string[]>([]);
  const [durationOptions, setDurationOptions] = useState<string[]>([]);
  const [startOptions, setStartOptions] = useState<string[]>([]);
  const [instrOptions, setInstrOptions] = useState<string[]>([]);

  // Fetch initial suggestion options from Supabase on mount
  const refreshAllOptions = async () => {
    setDoseOptions(await fetchOptions(20));
    setFreqOptions(await fetchOptions(21));
    setTimingOptions(await fetchOptions(22));
    setDurationOptions(await fetchOptions(23));
    setStartOptions(await fetchOptions(24));
    setInstrOptions(await fetchOptions(25));
  };

  useEffect(() => {
    refreshAllOptions();
  }, []);

  /* search bar */
  const [medInput, setMedInput]               = useState("");
  const [medInputFocused, setMedInputFocused] = useState(false);
  const [searchHi, setSearchHi]               = useState(-1);
  const [medSuggestions, setMedSuggestions]   = useState<MedicineItem[]>([]);

  /* inline generic name edit */
  const [editingGenericId, setEditingGenericId] = useState<string | null>(null);
  const [editingGenericVal, setEditingGenericVal] = useState("");

  useEffect(() => {
    let active = true;
    // Debounce: wait 300ms after user stops typing before querying
    const timer = setTimeout(async () => {
      const results = await searchMedicinesFromDb(medInput);
      if (active) setMedSuggestions(results);
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [medInput]);

  /* drag */
  const dragIdx = useRef<number | null>(null);

  /* ─── Auto-focus: field input refs per medication row ─── */
  type FieldKey = 'dose' | 'freq' | 'timing' | 'duration' | 'instr';
  const fieldInputRefs = useRef<Record<string, Partial<Record<FieldKey, HTMLInputElement | null>>>>({});

  const focusField = (medId: string, field: FieldKey) => {
    setTimeout(() => {
      if (!fieldInputRefs.current[medId]) return;
      fieldInputRefs.current[medId][field]?.focus();
    }, 80);
  };

  const setFieldRef = (medId: string, field: FieldKey) => (el: HTMLInputElement | null) => {
    if (!fieldInputRefs.current[medId]) fieldInputRefs.current[medId] = {};
    fieldInputRefs.current[medId][field] = el;
  };

  /* ─── helpers ─── */
  const addMedicine = async (med: { 
    id?: number; 
    name: string; 
    generic: string; 
    form?: string;
    defaultDose?: string;
    defaultFreq?: string;
    defaultTiming?: string;
    defaultDuration?: string;
    defaultInstr?: string;
  }) => {
    // If the medicine generic matches empty, check if it's new custom typed text
    let name = med.name.trim();
    if (!name) return;

    let generic = med.generic ? med.generic.trim() : "";
    let form = med.form ?? "tablet";

    let medicineId: number | undefined;

    let defaultDose = med.defaultDose || "";
    let defaultFreq = med.defaultFreq || "";
    let defaultTiming = med.defaultTiming || "";
    let defaultDuration = med.defaultDuration || "";
    let defaultInstr = med.defaultInstr || "";

    // If it's a new custom entry, insert it into public.medicine in Supabase
    const { data: existing } = await supabase
      .from("medicine")
      .select("id, name, salt_composition, short_composition1, type, metadata")
      .eq("name", name)
      .maybeSingle();

    if (!existing) {
      const inserted = await insertMedicineIntoDb(name, generic, form);
      medicineId = inserted.id;
      name = inserted.name;
      generic = inserted.generic;
      form = inserted.form ?? form;
    } else {
      medicineId = Number(existing.id);
      generic = existing.salt_composition || existing.short_composition1 || generic;
      form = existing.type?.toLowerCase() || form;
      const meta = existing.metadata || {};
      if (meta.default_dose) defaultDose = meta.default_dose;
      if (meta.default_freq) defaultFreq = meta.default_freq;
      if (meta.default_timing) defaultTiming = meta.default_timing;
      if (meta.default_duration) defaultDuration = meta.default_duration;
      if (meta.default_instr) defaultInstr = meta.default_instr;
    }

    if (medicineId) {
      incrementMedicineUsageCount(medicineId);
    }

    const newMed = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      medicineId,
      name,
      generic,
      form,
      dose: defaultDose,
      freq: defaultFreq,
      timing: defaultTiming,
      duration: defaultDuration,
      start: "",
      instr: defaultInstr
    };
    setMedications((p) => [...p, newMed]);
    setMedInput("");
    setMedInputFocused(false);
    setSearchHi(-1);
  };

  const dropdownClicked = useRef(false);

  const patch = (id: string, diff: Partial<Medication>) => {
    setMedications((p) =>
      p.map((m) => {
        if (m.id === id) {
          const updated = { ...m, ...diff };
          if (
            updated.medicineId &&
            (diff.dose !== undefined ||
              diff.freq !== undefined ||
              diff.timing !== undefined ||
              diff.duration !== undefined ||
              diff.instr !== undefined)
          ) {
            saveMedicineDefaultDosage(updated.medicineId, {
              dose: updated.dose,
              freq: updated.freq,
              timing: updated.timing,
              duration: updated.duration,
              instr: updated.instr
            });
          }
          return updated;
        }
        return m;
      })
    );
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
  const remove = (id: string) => setMedications((p) => p.filter((m) => m.id !== id));

  /* drag reorder */
  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const r = [...medications]; const [m] = r.splice(dragIdx.current, 1); r.splice(i, 0, m);
    dragIdx.current = i; setMedications(r);
  };
  const onDragEnd = () => { dragIdx.current = null; };

  /* search key events */
  const handleSearchKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    const list = await searchMedicinesFromDb(medInput);
    if (e.key === "ArrowDown") { e.preventDefault(); setSearchHi((p) => Math.min(p + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSearchHi((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (searchHi >= 0 && list[searchHi]) addMedicine(list[searchHi]);
      else addMedicine({ name: medInput, generic: "" });
    }
    else if (e.key === "Escape") { setMedInputFocused(false); setSearchHi(-1); }
  };

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm w-full select-none overflow-visible">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2.5 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white text-xs shadow-sm">
            💊
          </div>
          <span className="text-sm font-bold text-[#1E293B] tracking-tight">Medications</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#4A5568] bg-[#F1F5F9] px-2.5 py-1 rounded-md border border-[#E2E8F0]">
            <span className="text-slate-400">ⓘ Default Instructions:</span>
            <select className="bg-transparent text-blue-600 cursor-pointer focus:outline-none font-extrabold">
              <option value="off">Off</option>
              <option value="en">English</option>
              <option value="hi">हिंदी - Hindi</option>
            </select>
          </div>
          <button className="w-7 h-7 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center transition-colors">
            <svg className="w-3 h-3 fill-[#94A3B8]" viewBox="0 0 448 512">
              <path d="M224 256c-35.2 0-64 28.8-64 64s28.8 64 64 64 64-28.8 64-64-28.8-64-64-64zm209.1-127L349.2 45.1C341.1 37.1 328.8 32 316.1 32H64C28.7 32 0 60.7 0 96v320c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64V163.9c0-12.7-5.1-25-14.9-34.9zM128 80h144v80H128V80zM400 416c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16h16v88c0 13.3 10.7 24 24 24h192c13.3 0 24-10.7 24-24V85.5l78.3 78.3c.8.8 1.7 2.4 1.7 4.1V416z"/>
            </svg>
          </button>
          <button className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 flex flex-col items-center justify-center text-rose-600 transition-colors relative">
            <span className="text-xs font-extrabold">Mx</span>
          </button>
          <button className="w-7 h-7 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Columns Header Grid */}
      <div className="flex items-stretch border-b border-[#E2E8F0] bg-slate-50/50 text-sm font-extrabold text-[#090d16] uppercase select-none">
        {/* drag grip blank */}
        <div className="w-7 shrink-0 border-r border-[#E2E8F0]" />
        
        {/* Col 1: Medicine */}
        <div className="w-[32%] shrink-0 border-r border-[#E2E8F0] px-3 py-1.5 flex flex-col justify-center">
          <div>Medicine</div>
          <div className="text-sm text-slate-700 lowercase font-semibold">Generic</div>
        </div>
        
        {/* Col 2: Dose */}
        <div className="w-[11%] shrink-0 border-r border-[#E2E8F0] px-3 py-1.5 flex flex-col justify-center">
          <div>Dose</div>
          <div className="text-sm text-slate-700 lowercase font-semibold">eg. 1 tablet</div>
        </div>

        {/* Col 3: Frequency */}
        <div className="w-[11%] shrink-0 border-r border-[#E2E8F0] px-3 py-1.5 flex flex-col justify-center">
          <div>Frequency</div>
          <div className="text-sm text-slate-700 lowercase font-semibold">eg. 1-0-1 etc</div>
        </div>

        {/* Col 4: Timing */}
        <div className="w-[11%] shrink-0 border-r border-[#E2E8F0] px-3 py-1.5 flex flex-col justify-center">
          <div>Timing</div>
          <div className="text-sm text-slate-700 lowercase font-semibold">eg. After meal</div>
        </div>

        {/* Col 5: Duration */}
        <div className="w-[11%] shrink-0 border-r border-[#E2E8F0] px-3 py-1.5 flex flex-col justify-center">
          <div>Duration</div>
          <div className="text-sm text-slate-700 lowercase font-semibold">eg. 3 days</div>
        </div>

        {/* Col 6: Instructions */}
        <div className="w-[21%] shrink-0 border-r border-[#E2E8F0] px-3 py-1.5 flex flex-col justify-center">
          <div>Instructions</div>
          <div className="text-sm text-slate-700 lowercase font-semibold">if any..</div>
        </div>

        {/* Action blank */}
        <div className="flex-1" />
      </div>

      {/* Row list */}
      {medications.length > 0 && (
        <div className="p-3 space-y-2">
          {medications.map((med, idx) => (
            <div key={med.id}
              data-drag-row="true"
              draggable="false"
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDragEnd={(e) => { onDragEnd(); e.currentTarget.setAttribute("draggable", "false"); }}
              className="group flex flex-col w-full text-left"
            >
              <div className="flex items-stretch border border-[#E2E8F0] rounded-lg bg-white overflow-visible min-h-[44px]">
                
                {/* drag handle */}
                <div
                  onMouseDown={(e) => { const row = e.currentTarget.closest("[data-drag-row]"); if (row) row.setAttribute("draggable", "true"); }}
                  onMouseUp={(e) => { const row = e.currentTarget.closest("[data-drag-row]"); if (row) row.setAttribute("draggable", "false"); }}
                  className="flex items-center justify-center w-7 shrink-0 border-r border-[#E2E8F0] bg-slate-50/50 cursor-grab active:cursor-grabbing text-slate-400"
                >
                  <svg viewBox="0 0 10 16" fill="currentColor" className="w-2.5 h-3.5">
                    <circle cx="2" cy="2" r="1.2"/><circle cx="8" cy="2" r="1.2"/>
                    <circle cx="2" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/>
                    <circle cx="2" cy="14" r="1.2"/><circle cx="8" cy="14" r="1.2"/>
                  </svg>
                </div>

                {/* Col 1: Medicine Input */}
                <div className="w-[32%] shrink-0 border-r border-[#E2E8F0] bg-white px-2 py-1 flex flex-col justify-center relative overflow-visible gap-0.5">
                  {/* Name row: autocomplete + form badge + pencil */}
                  <div className="flex items-center gap-1 w-full h-6">
                    <div className="flex-1 min-w-0">
                      <InlineMedicineAutoComplete
                        value={med.name}
                        onChange={(v) => patch(med.id, { name: v })}
                        onSelect={async (m) => {
                          if (m.id) incrementMedicineUsageCount(m.id);
                          patch(med.id, { 
                            medicineId: m.id, 
                            name: m.name, 
                            generic: m.generic, 
                            form: m.form,
                            ...(m.defaultDose && { dose: m.defaultDose }),
                            ...(m.defaultFreq && { freq: m.defaultFreq }),
                            ...(m.defaultTiming && { timing: m.defaultTiming }),
                            ...(m.defaultDuration && { duration: m.defaultDuration }),
                            ...(m.defaultInstr && { instr: m.defaultInstr })
                          });
                        }}
                        onBlur={async (v) => {
                          const cleanName = v.trim();
                          if (!cleanName) return;
                          
                          // Prevent duplicate typed name
                          const isDuplicate = medications.some(m => 
                            m.id !== med.id && m.name.trim().toLowerCase() === cleanName.toLowerCase()
                          );
                          if (isDuplicate) {
                            patch(med.id, { name: "", medicineId: undefined, generic: "" });
                            return;
                          }
                          
                          const { data: existing } = await supabase
                            .from("medicine")
                            .select("id, name, salt_composition, short_composition1, type, metadata, usage_count")
                            .eq("name", cleanName)
                            .maybeSingle();

                          if (existing) {
                            incrementMedicineUsageCount(Number(existing.id));
                            const meta = existing.metadata || {};
                            patch(med.id, { 
                              medicineId: Number(existing.id), 
                              generic: existing.salt_composition || existing.short_composition1 || med.generic, 
                              form: existing.type?.toLowerCase() || med.form,
                              ...(meta.default_dose && { dose: meta.default_dose }),
                              ...(meta.default_freq && { freq: meta.default_freq }),
                              ...(meta.default_timing && { timing: meta.default_timing }),
                              ...(meta.default_duration && { duration: meta.default_duration }),
                              ...(meta.default_instr && { instr: meta.default_instr })
                            });
                          } else {
                            const inserted = await insertMedicineIntoDb(cleanName, med.generic, med.form || "tablet");
                            if (inserted.id) incrementMedicineUsageCount(inserted.id);
                            patch(med.id, { 
                              medicineId: inserted.id, 
                              name: inserted.name,
                              generic: inserted.generic,
                              form: inserted.form 
                            });
                          }
                        }}
                        isAlreadyAdded={(medName, medId) => {
                          return medications.some(m => 
                            m.id !== med.id && (
                              m.name.trim().toLowerCase() === medName.trim().toLowerCase() ||
                              (medId && m.medicineId === medId)
                            )
                          );
                        }}
                        onAfterSelect={() => focusField(med.id, 'dose')}
                        placeholder="Medicine"
                      />
                    </div>
                    <FormSelectDropdown
                      value={med.form || "tablet"}
                      onChange={async (newForm) => {
                        patch(med.id, { form: newForm });
                        if (med.name) {
                          try {
                            await supabase
                              .from("medicine")
                              .update({ type: newForm.toUpperCase() })
                              .eq("name", med.name);
                          } catch (err) {
                            console.error("Error updating medicine type:", err);
                          }
                        }
                      }}
                    />
                    {/* Pencil — always visible, inline right */}
                    {editingGenericId !== med.id && (
                      <span
                        onClick={() => { setEditingGenericId(med.id); setEditingGenericVal(med.generic); }}
                        className="shrink-0 cursor-pointer text-[#C0CADC] hover:text-indigo-500 transition-colors"
                        title="Edit generic composition"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                          <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/>
                        </svg>
                      </span>
                    )}
                  </div>

                  {/* Generic name: show text or inline edit */}
                  {editingGenericId === med.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        type="text"
                        value={editingGenericVal}
                        onChange={(e) => setEditingGenericVal(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter") {
                            patch(med.id, { generic: editingGenericVal });
                            await updateMedicineGenericName(med.name, editingGenericVal);
                            setEditingGenericId(null);
                          } else if (e.key === "Escape") {
                            setEditingGenericId(null);
                          }
                        }}
                        placeholder="Generic composition"
                        className="flex-1 min-w-0 border border-indigo-300 rounded px-1.5 py-0.5 text-sm font-semibold text-[#334155] outline-none focus:ring-1 focus:ring-indigo-200 bg-white"
                      />
                      <button type="button" onMouseDown={async () => {
                        patch(med.id, { generic: editingGenericVal });
                        await updateMedicineGenericName(med.name, editingGenericVal);
                        setEditingGenericId(null);
                      }} className="shrink-0 text-indigo-600 hover:text-indigo-800">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                        </svg>
                      </button>
                      <button type="button" onMouseDown={() => setEditingGenericId(null)} className="shrink-0 text-slate-400 hover:text-slate-600">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  ) : med.generic ? (
                    <div className="text-[8.5px] text-slate-800 font-extrabold uppercase leading-none truncate max-w-full">
                      {med.generic}
                    </div>
                  ) : null}
                </div>

                {/* Col 2: Dose */}
                <div className="relative w-[11%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                  <InlineAutoComplete
                    value={med.dose}
                    onChange={(v) => patch(med.id, { dose: v })}
                    onBlur={(v) => handleInputBlur(20, v)}
                    options={doseOptions}
                    placeholder="Dose"
                    onInputRef={setFieldRef(med.id, 'dose')}
                    onAfterSelect={() => focusField(med.id, 'freq')}
                  />
                </div>

                {/* Col 3: Frequency */}
                <div className="relative w-[11%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                  <InlineAutoComplete
                    value={med.freq}
                    onChange={(v) => patch(med.id, { freq: v })}
                    onBlur={(v) => handleInputBlur(21, v)}
                    options={freqOptions}
                    placeholder="Frequency"
                    onInputRef={setFieldRef(med.id, 'freq')}
                    onAfterSelect={() => focusField(med.id, 'timing')}
                  />
                </div>

                {/* Col 4: Timing */}
                <div className="relative w-[11%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                  <InlineAutoComplete
                    value={med.timing}
                    onChange={(v) => patch(med.id, { timing: v })}
                    onBlur={(v) => handleInputBlur(22, v)}
                    options={timingOptions}
                    placeholder="Timing"
                    onInputRef={setFieldRef(med.id, 'timing')}
                    onAfterSelect={() => focusField(med.id, 'duration')}
                  />
                </div>

                {/* Col 5: Duration */}
                <div className="relative w-[11%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                  <InlineAutoComplete
                    value={med.duration}
                    onChange={(v) => patch(med.id, { duration: v })}
                    onBlur={(v) => handleInputBlur(23, v)}
                    options={durationOptions}
                    placeholder="Duration"
                    onInputRef={setFieldRef(med.id, 'duration')}
                    onAfterSelect={() => focusField(med.id, 'instr')}
                  />
                </div>

                {/* Col 6: Instructions */}
                <div className="relative w-[21%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                  <InlineAutoComplete
                    value={med.instr}
                    onChange={(v) => patch(med.id, { instr: v })}
                    onBlur={(v) => handleInputBlur(25, v)}
                    options={instrOptions}
                    placeholder="Instructions"
                    onInputRef={setFieldRef(med.id, 'instr')}
                  />
                </div>

                {/* Action Trash button */}
                <div className="flex-1 flex items-center justify-center bg-white text-slate-300 hover:text-red-500 transition-colors cursor-pointer">
                  <button type="button" onClick={() => remove(med.id)} className="p-1">
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

      {/* Bottom Search Bar */}
      <div className="relative px-4 py-3 border-t border-[#F1F5F9] bg-slate-50/30">
        <div className="relative flex items-center">
          <svg className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search & Add Medicines (e.g. Paracetamol, Pantocid...)"
            value={medInput}
            onChange={(e) => { setMedInput(e.target.value); setSearchHi(-1); setMedInputFocused(true); }}
            onFocus={() => { setMedInputFocused(true); setSearchHi(-1); }}
            onBlur={() => setTimeout(() => setMedInputFocused(false), 200)}
            onKeyDown={handleSearchKey}
            className="w-full h-11 pl-10 pr-16 border-2 border-[#E2E8F0] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm bg-white focus:outline-none placeholder:text-slate-400 font-semibold transition-all shadow-xs"
          />
          <div className="absolute right-3.5 flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded uppercase pointer-events-none select-none">
            Enter ↵
          </div>
        </div>

        {/* Medicines Dropdown Autocomplete */}
        {medInputFocused && (() => {
          const list = medSuggestions;
          const hasCustomVal = medInput.trim() && !medSuggestions.some(m => m.name.toLowerCase() === medInput.trim().toLowerCase());
          if (list.length === 0 && !hasCustomVal) return null;
          return (
            <div className="absolute left-4 right-4 bottom-full mb-1 z-50 bg-white border-2 border-indigo-100 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto p-1.5 space-y-0.5 animate-fade-in-up">
              <div className="px-3 py-1 bg-indigo-50/60 text-indigo-700 rounded-lg text-xs font-extrabold uppercase tracking-wider mb-1.5 select-none inline-block">
                Select Medicine to Add
              </div>
              {list.map((med, i) => {
                return (
                  <div
                    key={`${med.name}-${i}`}
                    onMouseDown={() => {
                      addMedicine(med);
                    }}
                    className={`p-2.5 px-3.5 text-left rounded-lg border-b border-[#F8FAFC] last:border-b-0 flex items-center justify-between transition-colors ${
                      i === searchHi 
                        ? "bg-indigo-50/80 text-indigo-950 font-black border-indigo-100 cursor-pointer" 
                        : "hover:bg-slate-50 text-slate-700 cursor-pointer"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold tracking-tight text-[#1e293b]">{med.name}</div>
                      {med.generic && <div className="text-xs text-[#A0AEC0] uppercase font-bold tracking-wide mt-0.5 truncate">{med.generic}</div>}
                    </div>
                    <span className="text-xs text-indigo-600 font-bold shrink-0 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                      + Add
                    </span>
                  </div>
                );
              })}
              {hasCustomVal && (
                <div
                  onMouseDown={() => {
                    addMedicine({ name: medInput, generic: "" });
                  }}
                  className="p-2.5 px-3.5 text-left rounded-lg border-t border-[#F8FAFC] flex items-center justify-between hover:bg-indigo-50 text-indigo-650 font-extrabold cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm">+ Create new medicine</span>
                    <span className="italic text-sm font-semibold truncate text-slate-500">"{medInput.trim()}"</span>
                  </div>
                  <span className="text-xs text-indigo-600 font-bold shrink-0 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    + Add
                  </span>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </section>
  );
}

/* ─── Custom Searchable Select Badge Dropdown for Medicine Form ─── */
function FormSelectDropdown({
  value,
  onChange,
  onAfterSelect
}: {
  value: string;
  onChange: (v: string) => void;
  onAfterSelect?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const displayValue = value || "tablet";

  // Check if current value is in default forms
  const isDefaultForm = (formName: string) => {
    if (!formName) return true;
    return DEFAULT_FORMS.some(f => f.toLowerCase() === formName.toLowerCase());
  };

  const showFullList = isExpanded || !isDefaultForm(displayValue);
  const activeList = showFullList ? FULL_FORMS : DEFAULT_FORMS;

  // Filter options based on search query
  const filteredOptions = activeList.filter(opt =>
    opt.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div ref={dropdownRef} className="relative inline-block shrink-0">
      {/* Clickable Badge Trigger */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchQuery("");
        }}
        className="flex items-center gap-1 text-[8px] text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-extrabold bg-slate-50 hover:bg-slate-100/80 transition-all cursor-pointer uppercase select-none leading-normal shrink-0"
      >
        <span>{displayValue}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-2.5 h-2.5 text-slate-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      {/* Floating Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 mt-1 z-[120] bg-white border-2 border-indigo-100 rounded-xl shadow-2xl p-1.5 w-[160px] text-left">
          {/* Small Search Box inside Dropdown */}
          <div className="relative mb-1">
            <input
              autoFocus
              type="text"
              placeholder="Search form..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 font-semibold placeholder:text-slate-350 bg-slate-50/50"
            />
          </div>

          {/* Options List */}
          <div className="max-h-44 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt.toLowerCase());
                    setIsOpen(false);
                    onAfterSelect?.();
                  }}
                  className={`px-2 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center justify-between
                    ${opt.toLowerCase() === displayValue.toLowerCase() 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "hover:bg-slate-50 text-slate-700"
                    }`}
                >
                  <span>{opt}</span>
                  {opt.toLowerCase() === displayValue.toLowerCase() && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5 text-indigo-650">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
              ))
            ) : (
              <div className="px-2 py-1.5 text-xs font-bold text-slate-400 italic">
                No match found
              </div>
            )}

            {/* More Options toggle */}
            {!showFullList && !searchQuery.trim() && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
                className="px-2 py-1 text-xs text-indigo-600 font-extrabold rounded-lg hover:bg-indigo-50 cursor-pointer border-t border-slate-100 mt-1 select-none"
              >
                + More Options...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
