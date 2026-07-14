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
    console.error("Error fetching lab options:", err);
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

/* ─── Types ──────────────────────────────────────────────────────── */
interface Lab {
  id: string;
  name: string;
  testOn: string;
  repeatOn: string;
  remarks: string;
}

interface LabsCardProps {
  labs: Lab[];
  setLabs: React.Dispatch<React.SetStateAction<Lab[]>>;
}

/* ─── Reusable PrimeReact inline autocomplete for lab columns ────── */
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
    const q = (event?.query || "").trim().toLowerCase();
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
      setSuggestions([...sliced, `+ Create "${(event?.query || "").trim()}"`]);
    } else {
      setSuggestions(sliced);
    }
  };

  const handleSelect = (e: { value: string }) => {
    const val = e.value;
    dropdownClicked.current = true;
    if (val.startsWith('+ Create "')) {
      const match = val.match(/\+ Create "(.*)"/)
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
      const match = item.match(/\+ Create "(.*)"/)
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

/* ─── Investigation name autocomplete with Supabase search ──────── */
function InlineLabAutoComplete({
  value,
  onChange,
  placeholder,
  labOptions,
  onAfterSelect,
  onInputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  labOptions: string[];
  onAfterSelect?: () => void;
  onInputRef?: (el: HTMLInputElement | null) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const dropdownClicked = useRef(false);
  const autoRef = useRef<any>(null);

  const search = (event: { query: string }) => {
    const q = (event?.query || "").trim().toLowerCase();
    let results = labOptions
      .filter((o) => o.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(q);
        const bStarts = b.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
    const sliced = results.slice(0, 30);
    if (q && !labOptions.some((o) => o.toLowerCase() === q)) {
      setSuggestions([...sliced, `+ Create "${(event?.query || "").trim()}"`]);
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
   LabsCard Component
═══════════════════════════════════════════════════════════════════ */
const fallbackPackages = [
  {
    id: 1,
    name: "DLPC 1 (11 Items)",
    items: [
      "Serum Creatinine",
      "Hepatitis B Surface Antigen HBsAg (ECLIA)",
      "Human Anti HIV Antibodies (ECLIA)",
      "CBC",
      "ECG",
      "Hepatitis C (HCV) Virus Total (ECLIA)",
      "PT/INR",
      "Random Blood Sugar (RBS)",
      "Total Bilirubin",
      "Urine Routine and Microscopy",
      "X-Ray Chest - PA View"
    ]
  },
  {
    id: 2,
    name: "DLPC 2 (13 Items)",
    items: [
      "Serum Creatinine",
      "HbA1c",
      "Hepatitis B Surface Antigen HBsAg (ECLIA)",
      "Human Anti HIV Antibodies (ECLIA)",
      "CBC",
      "ECG",
      "Fasting Blood Sugar",
      "Hepatitis C (HCV) Virus Total (ECLIA)",
      "PT/INR",
      "Post Prandial Blood Sugar",
      "Total Bilirubin",
      "Urine Routine and Microscopy",
      "X-Ray Chest - PA View"
    ]
  },
  {
    id: 3,
    name: "DLPC 3 (3 Items)",
    items: [
      "Hepatitis B Surface Antigen HBsAg (ECLIA)",
      "Human Anti HIV Antibodies (ECLIA)",
      "Hepatitis C (HCV) Virus Total (ECLIA)"
    ]
  }
];

export default function LabsCard({ labs, setLabs }: LabsCardProps) {
  // Category IDs: 30=lab_name, 31=lab_test_on, 32=lab_repeat_on, 33=lab_remarks
  const [labNameOptions, setLabNameOptions] = useState<string[]>([]);
  const [testOnOptions, setTestOnOptions]   = useState<string[]>([]);
  const [repeatOnOptions, setRepeatOnOptions] = useState<string[]>([]);
  const [remarksOptions, setRemarksOptions] = useState<string[]>([]);

  // Packages state
  const [packages, setPackages] = useState(fallbackPackages);
  const [showPkgDropdown, setShowPkgDropdown] = useState(false);
  const pkgDropdownRef = useRef<HTMLDivElement>(null);
  // Create Package state
  const [showCreatePkgModal, setShowCreatePkgModal] = useState(false);
  const [newPkgName, setNewPkgName]                 = useState("");
  const [isCreatingPkg, setIsCreatingPkg]             = useState(false);
  const [toast, setToast]                             = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreatePackage = async () => {
    const name = newPkgName.trim();
    if (!name) return;
    if (labs.length === 0) {
      showToast("Cannot create package: Active list is empty.", "error");
      return;
    }
    setIsCreatingPkg(true);

    try {
      const { data: existingPkg } = await supabase
        .from("aka_lab_packages")
        .select("id")
        .eq("name", name)
        .maybeSingle();

      let packageId: number;

      if (existingPkg) {
        packageId = existingPkg.id;
        await supabase
          .from("aka_lab_package_items")
          .delete()
          .eq("package_id", packageId);
      } else {
        const { data: newPkg, error: pkgErr } = await supabase
          .from("aka_lab_packages")
          .insert({ name })
          .select("id")
          .single();

        if (pkgErr) throw pkgErr;
        packageId = newPkg.id;
      }

      const itemsToInsert = labs.map((l) => ({
        package_id: packageId,
        test_name: l.name.trim()
      }));

      const { error: itemsErr } = await supabase
        .from("aka_lab_package_items")
        .insert(itemsToInsert);

      if (itemsErr) throw itemsErr;

      showToast(`Package "${name}" saved successfully!`, "success");

      const { data: pkgData } = await supabase
        .from("aka_lab_packages")
        .select(`
          id,
          name,
          items:aka_lab_package_items (
            test_name
          )
        `);

      if (pkgData) {
        const mappedPkgs = pkgData.map((p: any) => ({
          id: p.id,
          name: p.name,
          items: p.items?.map((item: any) => item.test_name) || []
        }));
        setPackages(mappedPkgs);
      }

      setNewPkgName("");
      setShowCreatePkgModal(false);
    } catch (err) {
      console.error("Error creating lab package:", err);
      showToast("Failed to save lab package.", "error");
    } finally {
      setIsCreatingPkg(false);
    }
  };

  const [medInput, setMedInput]             = useState("");
  const [medInputFocused, setMedInputFocused] = useState(false);
  const [searchHi, setSearchHi]             = useState(-1);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

  /* drag */
  const dragIdx = useRef<number | null>(null);

  /* ─── Auto-focus refs ─── */
  type LabFieldKey = 'testOn' | 'repeatOn' | 'remarks';
  const fieldInputRefs = useRef<Record<string, Partial<Record<LabFieldKey, HTMLInputElement | null>>>>({});

  const focusField = (labId: string, field: LabFieldKey) => {
    setTimeout(() => {
      fieldInputRefs.current[labId]?.[field]?.focus();
    }, 80);
  };

  const setFieldRef = (labId: string, field: LabFieldKey) => (el: HTMLInputElement | null) => {
    if (!fieldInputRefs.current[labId]) fieldInputRefs.current[labId] = {};
    fieldInputRefs.current[labId][field] = el;
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (pkgDropdownRef.current && !pkgDropdownRef.current.contains(e.target as Node)) {
        setShowPkgDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  /* Load all dropdown options from Supabase on mount */
  useEffect(() => {
    let active = true;
    const load = async () => {
      // 1. Fetch autocomplete options
      const [names, testOn, repeatOn, remarks] = await Promise.all([
        fetchOptions(30),
        fetchOptions(31),
        fetchOptions(32),
        fetchOptions(33),
      ]);
      if (!active) return;
      setLabNameOptions(names);
      setTestOnOptions(testOn);
      setRepeatOnOptions(repeatOn);
      setRemarksOptions(remarks);

      // 2. Fetch packages dynamically
      try {
        const { data: pkgData } = await supabase
          .from("aka_lab_packages")
          .select(`
            id,
            name,
            items:aka_lab_package_items (
              test_name
            )
          `);

        if (pkgData && pkgData.length > 0) {
          const mappedPkgs = pkgData.map((p: any) => ({
            id: p.id,
            name: p.name,
            items: p.items?.map((item: any) => item.test_name) || []
          }));
          setPackages(mappedPkgs);
        }
      } catch (err) {
        console.error("Error loading packages dynamically:", err);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  /* Debounced search suggestions */
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      const q = medInput.trim();
      if (!q) {
        if (active) setSearchSuggestions(labNameOptions.slice(0, 12));
        return;
      }
      const qLower = q.toLowerCase();
      let results = labNameOptions
        .filter((o) => o.toLowerCase().includes(qLower))
        .sort((a, b) => {
          const aStarts = a.toLowerCase().startsWith(qLower);
          const bStarts = b.toLowerCase().startsWith(qLower);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return 0;
        });
      
      const hasPerfectMatch = labNameOptions.some((o) => o.toLowerCase() === qLower);
      const sliced = results.slice(0, 30);
      if (!hasPerfectMatch) {
        if (active) setSearchSuggestions([...sliced, `+ Create "${q}"`]);
      } else {
        if (active) setSearchSuggestions(sliced);
      }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [medInput, labNameOptions]);

  /* ─── helpers ─── */
  const addLab = (name: string) => {
    if (!name.trim()) return;
    const newLab: Lab = {
      id: "temp_" + Date.now(),
      name: name.trim(),
      testOn: "",
      repeatOn: "",
      remarks: "",
    };
    setLabs((p) => [...p, newLab]);
    incrementOption(30, name.trim());
    setMedInput("");
    setMedInputFocused(false);
    setSearchHi(-1);
  };

  const patch  = (id: string, diff: Partial<Lab>) => setLabs((p) => p.map((l) => (l.id === id ? { ...l, ...diff } : l)));
  const remove = (id: string) => setLabs((p) => p.filter((l) => l.id !== id));

  const handleInputBlur = (categoryId: number, value: string) => {
    if (value?.trim()) incrementOption(categoryId, value.trim());
  };

  /* drag reorder */
  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const r = [...labs]; const [m] = r.splice(dragIdx.current, 1); r.splice(i, 0, m);
    dragIdx.current = i; setLabs(r);
  };
  const onDragEnd = () => { dragIdx.current = null; };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSearchHi((p) => Math.min(p + 1, searchSuggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSearchHi((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (searchHi >= 0 && searchSuggestions[searchHi]) addLab(searchSuggestions[searchHi]);
      else if (medInput.trim()) addLab(medInput);
    }
    else if (e.key === "Escape") { setMedInputFocused(false); setSearchHi(-1); }
  };

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm w-full select-none overflow-visible">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2.5 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-white text-xs shadow-sm">
            🧪
          </div>
          <span className="text-[12px] font-bold text-[#1E293B] tracking-tight">Lab Investigations</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-7 h-7 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-slate-500 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-slate-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          <button className="w-7 h-7 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center transition-colors">
            <svg className="w-3 h-3 fill-[#94A3B8]" viewBox="0 0 448 512">
              <path d="M224 256c-35.2 0-64 28.8-64 64s28.8 64 64 64 64-28.8 64-64-28.8-64-64-64zm209.1-127L349.2 45.1C341.1 37.1 328.8 32 316.1 32H64C28.7 32 0 60.7 0 96v320c0 35.3 28.7 64 64 64h320c35.3 0 64-28.7 64-64V163.9c0-12.7-5.1-25-14.9-34.9zM128 80h144v80H128V80zM400 416c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16h16v88c0 13.3 10.7 24 24 24h192c13.3 0 24-10.7 24-24V85.5l78.3 78.3c.8.8 1.7 2.4 1.7 4.1V416z"/>
            </svg>
          </button>
          <div ref={pkgDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setShowPkgDropdown(!showPkgDropdown)}
              className="w-16 h-7 rounded-lg bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 flex items-center justify-center gap-1 text-yellow-700 transition-colors cursor-pointer shadow-2xs"
            >
              <span className="text-[9px] font-extrabold uppercase">TPanel</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2 h-2 shrink-0 text-yellow-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {showPkgDropdown && (
              <div className="absolute right-0 top-full mt-1.5 z-[100] bg-white border-2 border-yellow-100 rounded-xl shadow-2xl py-1.5 min-w-[240px] max-w-[280px] text-left overflow-hidden">
                <div className="px-3 py-1 bg-yellow-50/60 text-yellow-800 rounded-md text-[9px] font-extrabold uppercase tracking-wide mb-1 select-none mx-1">
                  Select Lab Package
                </div>
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => {
                      const newLabs = [...labs];
                      pkg.items.forEach((testName) => {
                        const exists = newLabs.some(l => l.name.toLowerCase() === testName.toLowerCase());
                        if (!exists) {
                          newLabs.push({
                            id: "temp_" + (Date.now() + Math.floor(Math.random() * 100000)),
                            name: testName,
                            testOn: "",
                            repeatOn: "",
                            remarks: ""
                          });
                        }
                      });
                      setLabs(newLabs);
                      setShowPkgDropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-[11px] font-bold text-slate-700 hover:bg-yellow-50/40 hover:text-yellow-800 transition-colors block border-b border-[#F8FAFC] last:border-0 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800">{pkg.name}</span>
                      <span className="text-[7.5px] bg-yellow-100 text-yellow-800 px-1 py-0.2 rounded font-extrabold uppercase">{pkg.items.length} tests</span>
                    </div>
                    <div className="text-[8.5px] text-slate-400 font-bold lowercase truncate mt-1">
                      {pkg.items.join(", ")}
                    </div>
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1.5 px-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (labs.length === 0) {
                        showToast("Add some tests to the list first to save as a package!", "error");
                        return;
                      }
                      setShowCreatePkgModal(true);
                      setShowPkgDropdown(false);
                    }}
                    className="w-full text-center px-3 py-2 text-[10px] font-extrabold text-yellow-800 bg-yellow-50/50 hover:bg-yellow-100/60 rounded-lg transition-colors cursor-pointer block border border-yellow-200"
                  >
                    + Save Active List as Package
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Column Headers */}
      <div className="flex items-stretch border-b border-[#E2E8F0] bg-slate-50/50 text-[9px] font-bold text-[#718096] uppercase select-none">
        <div className="w-7 shrink-0 border-r border-[#E2E8F0]" />
        <div className="w-[38%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">Investigation Name</div>
        <div className="w-[18%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">Test On</div>
        <div className="w-[18%] shrink-0 border-r border-[#E2E8F0] px-3 py-2 flex items-center">Repeat On</div>
        <div className="flex-1 border-r border-[#E2E8F0] px-3 py-2 flex items-center">Remarks</div>
        <div className="w-8 shrink-0" />
      </div>

      {/* Rows */}
      {labs.length > 0 && (
        <div className="p-3 space-y-2">
          {labs.map((row, idx) => (
            <div key={row.id}
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
                  onMouseDown={(e) => { const r = e.currentTarget.closest("[data-drag-row]"); if (r) r.setAttribute("draggable", "true"); }}
                  onMouseUp={(e) => { const r = e.currentTarget.closest("[data-drag-row]"); if (r) r.setAttribute("draggable", "false"); }}
                  className="flex items-center justify-center w-7 shrink-0 border-r border-[#E2E8F0] bg-slate-50/50 cursor-grab active:cursor-grabbing text-slate-400"
                >
                  <svg viewBox="0 0 10 16" fill="currentColor" className="w-2.5 h-3.5">
                    <circle cx="2" cy="2" r="1.2"/><circle cx="8" cy="2" r="1.2"/>
                    <circle cx="2" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/>
                    <circle cx="2" cy="14" r="1.2"/><circle cx="8" cy="14" r="1.2"/>
                  </svg>
                </div>

                {/* Col 1: Investigation Name */}
                <div className="relative w-[38%] shrink-0 border-r border-[#E2E8F0] bg-white flex items-center overflow-visible">
                  <InlineLabAutoComplete
                    value={row.name}
                    onChange={(v) => patch(row.id, { name: v })}
                    labOptions={labNameOptions}
                    placeholder="Investigation name"
                    onAfterSelect={() => focusField(row.id, 'testOn')}
                  />
                </div>

                {/* Col 2: Test On */}
                <div className="relative w-[18%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                  <InlineAutoComplete
                    value={row.testOn}
                    onChange={(v) => patch(row.id, { testOn: v })}
                    onBlur={(v) => handleInputBlur(31, v)}
                    options={testOnOptions}
                    placeholder="Test On"
                    onInputRef={setFieldRef(row.id, 'testOn')}
                    onAfterSelect={() => focusField(row.id, 'repeatOn')}
                  />
                </div>

                {/* Col 3: Repeat On */}
                <div className="relative w-[18%] shrink-0 border-r border-[#E2E8F0] flex items-center bg-white">
                  <InlineAutoComplete
                    value={row.repeatOn}
                    onChange={(v) => patch(row.id, { repeatOn: v })}
                    onBlur={(v) => handleInputBlur(32, v)}
                    options={repeatOnOptions}
                    placeholder="Repeat On"
                    onInputRef={setFieldRef(row.id, 'repeatOn')}
                    onAfterSelect={() => focusField(row.id, 'remarks')}
                  />
                </div>

                {/* Col 4: Remarks */}
                <div className="relative flex-1 border-r border-[#E2E8F0] flex items-center bg-white">
                  <InlineAutoComplete
                    value={row.remarks}
                    onChange={(v) => patch(row.id, { remarks: v })}
                    onBlur={(v) => handleInputBlur(33, v)}
                    options={remarksOptions}
                    placeholder="Instructions"
                    onInputRef={setFieldRef(row.id, 'remarks')}
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

      {/* Bottom Search Bar */}
      <div className="relative px-3 py-2.5 border-t border-[#F8FAFC]">
        <div className="relative flex items-center">
          <svg className="absolute left-2.5 w-3 h-3 fill-[#CBD5E0] pointer-events-none" viewBox="0 0 512 512">
            <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z"/>
          </svg>
          <input
            type="text"
            placeholder="Start typing Lab test / Radiology / Investigation..."
            value={medInput}
            onChange={(e) => { setMedInput(e.target.value); setSearchHi(-1); setMedInputFocused(true); }}
            onFocus={() => { setMedInputFocused(true); setSearchHi(-1); }}
            onBlur={() => setTimeout(() => setMedInputFocused(false), 200)}
            onKeyDown={handleSearchKey}
            className="w-full h-8.5 pl-8 pr-14 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[11px] bg-[#FAFBFC] focus:bg-white focus:outline-none placeholder:text-[#C0CADC] font-medium transition-all"
          />
          {medInput.trim() && (
            <button type="button" onClick={() => addLab(medInput)}
              className="absolute right-2 text-blue-600 hover:text-blue-700 text-[10px] font-bold tracking-wide">+ Add</button>
          )}
        </div>

        {/* Dropdown suggestions */}
        {medInputFocused && (searchSuggestions.length > 0 || medInput.trim()) && (
          <div className="absolute left-3 right-3 top-full mt-0.5 z-40 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
            <div className="px-3 pt-2 pb-1 text-[9px] font-bold text-[#94A3B8] uppercase tracking-wide">
              {medInput.trim() ? "Matching Tests" : "Sample Tests"}
            </div>
            {searchSuggestions.map((opt, i) => {
              const isCreate = opt.startsWith('+ Create "');
              let displayVal = opt;
              if (isCreate) {
                const match = opt.match(/\+ Create "(.*)"/);
                displayVal = match ? match[1] : opt;
              }
              
              return (
                <div key={opt} onMouseDown={() => addLab(displayVal)}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer border-b border-[#F8FAFC] last:border-b-0 transition-colors
                    ${i === searchHi ? "bg-blue-50" : "hover:bg-[#F8FAFC]"}`}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-100 to-amber-200 flex items-center justify-center text-[8px] font-extrabold text-yellow-800 shrink-0 leading-none">
                    {isCreate ? "+" : (initials(opt) || "Li")}
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

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[200] bg-slate-900 text-white rounded-xl shadow-2xl p-3.5 px-4 flex items-center gap-2.5 max-w-sm transition-all animate-fade-in-up border border-slate-800">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0
            ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
            {toast.type === "success" ? "✓" : "✕"}
          </div>
          <span className="text-[11.5px] font-extrabold tracking-tight">{toast.message}</span>
        </div>
      )}

      {/* Save Current as Package Modal */}
      {showCreatePkgModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[150] p-4 select-none animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-5 w-full max-w-sm text-left">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-800 text-xs font-bold shadow-sm">
                📦
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-slate-800 leading-tight">Create Lab Package</h3>
                <p className="text-[9.5px] text-slate-400 font-bold leading-normal mt-0.5">
                  Save active list as a reusable package template.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Package Name *
                </label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Pre-Op Profile, Cardiac Panel"
                  value={newPkgName}
                  onChange={(e) => setNewPkgName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      await handleCreatePackage();
                    } else if (e.key === "Escape") {
                      setShowCreatePkgModal(false);
                    }
                  }}
                  className="w-full text-[12px] px-3 py-2 border border-slate-200 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 rounded-lg font-semibold placeholder:text-slate-350"
                />
              </div>

              {/* Items included */}
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Tests Included ({labs.length}):
                </span>
                <div className="bg-slate-50 border border-slate-150 rounded-lg p-2 max-h-24 overflow-y-auto space-y-1">
                  {labs.map((l) => (
                    <div key={l.id} className="text-[10px] font-semibold text-slate-650 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                      <span className="truncate">{l.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreatePkgModal(false)}
                  className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreatePackage}
                  disabled={!newPkgName.trim() || isCreatingPkg}
                  className="px-3.5 py-1.5 text-[10px] font-extrabold text-white bg-yellow-600 hover:bg-yellow-750 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  {isCreatingPkg ? "Saving..." : "Save Package"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
