"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase, getUserRole } from "@/lib/supabase";

interface IpdRecord {
  id: number;
  surgery_date?: string;
  month?: string;
  patients_name?: string;
  hospital?: string;
  sex?: string;
  diagnosis?: string;
  surgery?: string;
  surgeons_name?: string;
  asst_surgeon?: string;
  visiting_doc?: string;
  payer?: string;
  bill_amount?: number;
  hosp_charges?: number;
  net_pkg?: number;
  surgeons_fees?: number;
  eqpmt_charges?: number;
  asst_surgeon_fees?: number;
  visit_fees?: number;
  anesthetist?: string;
  anaes_fees?: number;
  opd?: string;
  complete?: string;
  remarks?: string;
  bill_no?: string;
  bill_date?: string;
}

const DEFAULT_HOSPITALS = [
  "ASH TD", "ASH CH", "PAREL HOSP", "SAVLA", "SAIFEE", "GLENEAGLES",
  "SENGOL HOSP", "SURYA HOSP", "SL RAHEJA", "DLPC DADAR", "WOCKHARDT",
  "OTHERS", "DLPC PAREL", "DLPC BANDRA"
];
const DEFAULT_SEX = ["M", "F"];
const DEFAULT_PAYERS = ["TPA", "Corporate", "Cash"];
const DEFAULT_COMPLETE = ["Y", "N", "TBC"];
const DEFAULT_REMARKS = ["Y", "N", "TBC"];

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}

function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  required = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // De-duplicate options list case-insensitively so no duplicate items ever appear
  const cleanOptions = useMemo(() => {
    const map = new Map<string, string>();
    (options || []).forEach((opt) => {
      const trimmed = opt?.trim();
      if (trimmed) {
        const lower = trimmed.toLowerCase();
        if (!map.has(lower)) {
          map.set(lower, trimmed);
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [options]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return cleanOptions;
    return cleanOptions.filter((opt) => opt.toLowerCase().includes(q));
  }, [cleanOptions, search]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        onChange(filteredOptions[0]);
      } else if (search.trim()) {
        onChange(search.trim());
      }
      setIsOpen(false);
      setSearch("");
    }
  };

  return (
    <div className="relative flex flex-col gap-1" ref={dropdownRef}>
      <label className="block text-xs font-bold text-slate-700 uppercase">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-primary focus:border-primary rounded-lg text-xs font-semibold text-slate-900 cursor-pointer flex items-center justify-between shadow-2xs transition-colors"
      >
        <span className={value ? "text-slate-900 truncate font-semibold" : "text-slate-400 font-normal"}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5 text-xs font-bold cursor-pointer"
              title="Clear selection"
            >
              ✕
            </span>
          )}
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-60">
          <input
            type="text"
            placeholder={`Search ${label}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-primary"
            autoFocus
          />

          <div className="flex-1 overflow-y-auto space-y-0.5 max-h-44 pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-2.5 text-center text-xs text-slate-400 font-medium">
                {search.trim() ? `Press Enter to set "${search.trim()}"` : "No matching options"}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                    value === opt ? "bg-purple-50 text-purple-700 font-bold" : "hover:bg-slate-100 text-slate-800"
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {value === opt && <span className="text-purple-600 font-bold shrink-0 ml-1">✓</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IpdPage() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [records, setRecords] = useState<IpdRecord[]>([]);

  // Search and Date Range Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [payerFilter, setPayerFilter] = useState("all");
  const [completeFilter, setCompleteFilter] = useState("all");

  // Multi-select filters
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [selectedSurgeries, setSelectedSurgeries] = useState<string[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);

  // Multi-select dropdown popover toggles
  const [openDropdown, setOpenDropdown] = useState<"hosp" | "diag" | "surg" | "doc" | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Separate analytics graph toggles (Default FALSE as requested)
  const [showHospitalGraph, setShowHospitalGraph] = useState(false);
  const [showDoctorGraph, setShowDoctorGraph] = useState(false);

  // Dynamic dropdown catalogs loaded from DB
  const [hospitalOptions, setHospitalOptions] = useState<string[]>(DEFAULT_HOSPITALS);
  const [payerOptions, setPayerOptions] = useState<string[]>(DEFAULT_PAYERS);
  const [sexOptions, setSexOptions] = useState<string[]>(DEFAULT_SEX);
  const [completeOptions, setCompleteOptions] = useState<string[]>(DEFAULT_COMPLETE);
  const [remarksOptions, setRemarksOptions] = useState<string[]>(DEFAULT_REMARKS);

  // Drawer / Form state (Slide-over Drawer instead of popup)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IpdRecord | null>(null);
  const [formData, setFormData] = useState<Partial<IpdRecord>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Close dropdown popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check auth & role
  useEffect(() => {
    async function init() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const role = await getUserRole(session.user.email);
        setUserRole(role);
        if (role === "admin") {
          await loadRecords();
          await loadDropdownCatalogs();
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  // Load records from Supabase
  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("aka_ipd")
        .select("*")
        .order("id", { ascending: false });

      if (error) {
        console.error("Error loading IPD data:", error);
        return;
      }

      const cleanData: IpdRecord[] = (data || []).map((r: any) => ({
        ...r,
        id: Number(r.id),
        bill_amount: r.bill_amount ? Number(r.bill_amount) : undefined,
        hosp_charges: r.hosp_charges ? Number(r.hosp_charges) : undefined,
        net_pkg: r.net_pkg ? Number(r.net_pkg) : undefined,
        surgeons_fees: r.surgeons_fees ? Number(r.surgeons_fees) : undefined,
        eqpmt_charges: r.eqpmt_charges ? Number(r.eqpmt_charges) : undefined,
        asst_surgeon_fees: r.asst_surgeon_fees ? Number(r.asst_surgeon_fees) : undefined,
        visit_fees: r.visit_fees ? Number(r.visit_fees) : undefined,
        anaes_fees: r.anaes_fees ? Number(r.anaes_fees) : undefined
      }));

      setRecords(cleanData);
    } catch (err) {
      console.error("Error in loadRecords:", err);
    }
  };

  // Load catalog options
  const loadDropdownCatalogs = async () => {
    try {
      const { data } = await supabase.from("master_dropdown_data").select("data_type, item_name");
      if (data && data.length > 0) {
        const hList = new Set(DEFAULT_HOSPITALS);
        const pList = new Set(DEFAULT_PAYERS);
        const sList = new Set(DEFAULT_SEX);
        const cList = new Set(DEFAULT_COMPLETE);
        const rList = new Set(DEFAULT_REMARKS);

        data.forEach((item: any) => {
          const val = item.item_name?.trim();
          if (!val) return;
          if (item.data_type === "hospital") hList.add(val);
          if (item.data_type === "payer") pList.add(val);
          if (item.data_type === "sex") sList.add(val);
          if (item.data_type === "complete") cList.add(val);
          if (item.data_type === "remarks") rList.add(val);
        });

        setHospitalOptions(Array.from(hList));
        setPayerOptions(Array.from(pList));
        setSexOptions(Array.from(sList));
        setCompleteOptions(Array.from(cList));
        setRemarksOptions(Array.from(rList));
      }
    } catch (err) {
      console.error("Error loading catalog:", err);
    }
  };

  // Save custom value to catalog
  const saveCatalogItem = async (dataType: string, itemName: string) => {
    const val = itemName?.trim();
    if (!val) return;
    try {
      await supabase
        .from("master_dropdown_data")
        .upsert(
          { data_type: dataType, data_subtype: "default", item_name: val },
          { onConflict: "data_type,data_subtype,item_name" }
        );
    } catch (e) {
      console.error("Catalog save error:", e);
    }
  };

  // Combined hospitals (defaults + catalog + previous records)
  const combinedHospitals = useMemo(() => {
    const list = [...hospitalOptions];
    records.forEach((r) => { if (r.hospital?.trim()) list.push(r.hospital.trim()); });
    return list;
  }, [hospitalOptions, records]);

  // Distinct diagnoses derived from catalog + previous records
  const allDiagnoses = useMemo(() => {
    const list: string[] = [];
    records.forEach((r) => { if (r.diagnosis?.trim()) list.push(r.diagnosis.trim()); });
    return list;
  }, [records]);

  // Distinct surgeries derived from catalog + previous records
  const allSurgeries = useMemo(() => {
    const list: string[] = [];
    records.forEach((r) => { if (r.surgery?.trim()) list.push(r.surgery.trim()); });
    return list;
  }, [records]);

  // Distinct doctors derived from catalog + previous records
  const allDoctors = useMemo(() => {
    const list: string[] = [];
    records.forEach((r) => {
      if (r.visiting_doc?.trim()) list.push(r.visiting_doc.trim());
      if (r.surgeons_name?.trim()) list.push(r.surgeons_name.trim());
      if (r.asst_surgeon?.trim()) list.push(r.asst_surgeon.trim());
    });
    return list;
  }, [records]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => { if (r.month) set.add(r.month); });
    return Array.from(set);
  }, [records]);

  // Master Filter Evaluation
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.patients_name?.toLowerCase().includes(q);
        const matchesDiag = r.diagnosis?.toLowerCase().includes(q);
        const matchesSurg = r.surgery?.toLowerCase().includes(q);
        const matchesHosp = r.hospital?.toLowerCase().includes(q);
        const matchesDoc = r.visiting_doc?.toLowerCase().includes(q) || r.surgeons_name?.toLowerCase().includes(q);
        const matchesBill = r.bill_no?.toLowerCase().includes(q);
        if (!matchesName && !matchesDiag && !matchesSurg && !matchesHosp && !matchesDoc && !matchesBill) return false;
      }

      // 2. Date Range Filter
      if (startDate || endDate) {
        if (!r.surgery_date) return false;
        // Parse dates assuming DD/MM/YYYY or YYYY-MM-DD
        const parts = r.surgery_date.split(/[\/\-]/);
        let recDate: Date | null = null;
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            recDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          } else {
            recDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          }
        }
        if (recDate && !isNaN(recDate.getTime())) {
          if (startDate) {
            const sDate = new Date(startDate);
            sDate.setHours(0, 0, 0, 0);
            if (recDate < sDate) return false;
          }
          if (endDate) {
            const eDate = new Date(endDate);
            eDate.setHours(23, 59, 59, 999);
            if (recDate > eDate) return false;
          }
        }
      }

      // 3. Month Filter
      if (monthFilter !== "all" && (r.month || "") !== monthFilter) return false;

      // 4. Payer Filter
      if (payerFilter !== "all" && (r.payer || "") !== payerFilter) return false;

      // 5. Complete Filter
      if (completeFilter !== "all" && (r.complete || "N") !== completeFilter) return false;

      // 6. Multi-Select Hospitals
      if (selectedHospitals.length > 0 && (!r.hospital || !selectedHospitals.includes(r.hospital))) return false;

      // 7. Multi-Select Diagnoses
      if (selectedDiagnoses.length > 0 && (!r.diagnosis || !selectedDiagnoses.includes(r.diagnosis))) return false;

      // 8. Multi-Select Surgeries
      if (selectedSurgeries.length > 0 && (!r.surgery || !selectedSurgeries.includes(r.surgery))) return false;

      // 9. Multi-Select Doctors
      if (selectedDoctors.length > 0) {
        const doc = r.visiting_doc || r.surgeons_name;
        if (!doc || !selectedDoctors.includes(doc)) return false;
      }

      return true;
    });
  }, [
    records, searchQuery, startDate, endDate, monthFilter, payerFilter, completeFilter,
    selectedHospitals, selectedDiagnoses, selectedSurgeries, selectedDoctors
  ]);

  // Statistics Summary
  const stats = useMemo(() => {
    let totalBill = 0;
    let totalNetPkg = 0;
    let totalSurgeon = 0;
    let totalHosp = 0;
    let totalEqpmt = 0;

    filteredRecords.forEach((r) => {
      totalBill += r.bill_amount || 0;
      totalNetPkg += r.net_pkg || 0;
      totalSurgeon += r.surgeons_fees || 0;
      totalHosp += r.hosp_charges || 0;
      totalEqpmt += r.eqpmt_charges || 0;
    });

    return {
      count: filteredRecords.length,
      totalBill,
      totalNetPkg,
      totalSurgeon,
      totalHosp,
      totalEqpmt
    };
  }, [filteredRecords]);

  // Analytics Data for Hospital Graph
  const hospitalGraphData = useMemo(() => {
    const map = new Map<string, { count: number; bill: number; netPkg: number }>();
    filteredRecords.forEach((r) => {
      const h = r.hospital || "Unknown";
      const existing = map.get(h) || { count: 0, bill: 0, netPkg: 0 };
      map.set(h, {
        count: existing.count + 1,
        bill: existing.bill + (r.bill_amount || 0),
        netPkg: existing.netPkg + (r.net_pkg || 0)
      });
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, count: d.count, bill: d.bill, netPkg: d.netPkg }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // Analytics Data for Doctor Graph
  const doctorGraphData = useMemo(() => {
    const map = new Map<string, { count: number; fees: number; bill: number }>();
    filteredRecords.forEach((r) => {
      const d = r.visiting_doc || r.surgeons_name || "Unassigned";
      const existing = map.get(d) || { count: 0, fees: 0, bill: 0 };
      map.set(d, {
        count: existing.count + 1,
        fees: existing.fees + (r.surgeons_fees || 0),
        bill: existing.bill + (r.bill_amount || 0)
      });
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, count: d.count, fees: d.fees, bill: d.bill }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // Open Drawer for Add / Edit
  const handleOpenAddDrawer = () => {
    setEditingRecord(null);
    setFormData({
      surgery_date: new Date().toLocaleDateString("en-GB"),
      month: new Date().toLocaleString("en-US", { month: "short" }),
      sex: "M",
      payer: "TPA",
      complete: "N"
    });
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (rec: IpdRecord) => {
    setEditingRecord(rec);
    setFormData({ ...rec });
    setIsDrawerOpen(true);
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patients_name?.trim()) {
      alert("Please enter patient name.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        surgery_date: formData.surgery_date || null,
        month: formData.month || null,
        patients_name: formData.patients_name.trim(),
        hospital: formData.hospital || null,
        sex: formData.sex || null,
        diagnosis: formData.diagnosis || null,
        surgery: formData.surgery || null,
        surgeons_name: formData.surgeons_name || null,
        asst_surgeon: formData.asst_surgeon || null,
        visiting_doc: formData.visiting_doc || null,
        payer: formData.payer || null,
        bill_amount: formData.bill_amount !== undefined && formData.bill_amount !== null ? Number(formData.bill_amount) : null,
        hosp_charges: formData.hosp_charges !== undefined && formData.hosp_charges !== null ? Number(formData.hosp_charges) : null,
        net_pkg: formData.net_pkg !== undefined && formData.net_pkg !== null ? Number(formData.net_pkg) : null,
        surgeons_fees: formData.surgeons_fees !== undefined && formData.surgeons_fees !== null ? Number(formData.surgeons_fees) : null,
        eqpmt_charges: formData.eqpmt_charges !== undefined && formData.eqpmt_charges !== null ? Number(formData.eqpmt_charges) : null,
        asst_surgeon_fees: formData.asst_surgeon_fees !== undefined && formData.asst_surgeon_fees !== null ? Number(formData.asst_surgeon_fees) : null,
        visit_fees: formData.visit_fees !== undefined && formData.visit_fees !== null ? Number(formData.visit_fees) : null,
        anesthetist: formData.anesthetist || null,
        anaes_fees: formData.anaes_fees !== undefined && formData.anaes_fees !== null ? Number(formData.anaes_fees) : null,
        opd: formData.opd || null,
        complete: formData.complete || null,
        remarks: formData.remarks || null,
        bill_no: formData.bill_no || null,
        bill_date: formData.bill_date || null
      };

      if (editingRecord?.id) {
        const { error } = await supabase
          .from("aka_ipd")
          .update(payload)
          .eq("id", editingRecord.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("aka_ipd")
          .insert(payload);

        if (error) throw error;
      }

      // Save new custom options to catalog
      if (formData.hospital) saveCatalogItem("hospital", formData.hospital);
      if (formData.payer) saveCatalogItem("payer", formData.payer);
      if (formData.sex) saveCatalogItem("sex", formData.sex);
      if (formData.complete) saveCatalogItem("complete", formData.complete);
      if (formData.remarks) saveCatalogItem("remarks", formData.remarks);

      setIsDrawerOpen(false);
      await loadRecords();
      await loadDropdownCatalogs();
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Error saving IPD record: " + (err?.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Record
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this IPD record?")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("aka_ipd").delete().eq("id", id);
      if (error) throw error;
      await loadRecords();
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Failed to delete record.");
    } finally {
      setDeletingId(null);
    }
  };

  // Format currency helper
  const fmtCurr = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return "-";
    return `₹ ${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setMonthFilter("all");
    setPayerFilter("all");
    setCompleteFilter("all");
    setSelectedHospitals([]);
    setSelectedDiagnoses([]);
    setSelectedSurgeries([]);
    setSelectedDoctors([]);
  };

  // Toggle multi-select items
  const toggleSelection = (list: string[], item: string, setList: (l: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F5F6F8] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-600">Verifying IPD Authorization...</span>
        </div>
      </div>
    );
  }

  // Access restriction for Admin role
  if (userRole !== "admin") {
    return (
      <div className="flex h-screen bg-[#F5F6F8]">
        <Sidebar active="ipd" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-200">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 max-w-md mb-6">
            The IPD module is strictly restricted to Admin users.
          </p>
          <a
            href="/"
            className="px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl shadow-xs hover:bg-primary-hover transition-all"
          >
            Return to OPD Queue
          </a>
        </div>
      </div>
    );
  }

  const maxHospCount = Math.max(...hospitalGraphData.map((d) => d.count), 1);
  const maxDocCount = Math.max(...doctorGraphData.map((d) => d.count), 1);

  return (
    <div className="flex h-screen bg-[#F5F6F8] overflow-hidden text-left font-sans">
      <Sidebar active="ipd" />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* HEADER BAR */}
        <div className="bg-white border-b border-[#E5E7EB] px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 select-none">
          <div>
            <h1 className="text-lg md:text-xl font-extrabold text-[#111827] tracking-tight">IPD Master Dashboard</h1>
            <p className="text-xs text-[#6B7280]">Surgeries analytics, multi-filter reporting, and billing management</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowHospitalGraph(!showHospitalGraph)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                showHospitalGraph
                  ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              📊 {showHospitalGraph ? "Hide Hospital Graph" : "Show Hospital Graph"}
            </button>

            <button
              onClick={() => setShowDoctorGraph(!showDoctorGraph)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                showDoctorGraph
                  ? "bg-indigo-650 text-white border-indigo-650 shadow-xs"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              👨‍⚕️ {showDoctorGraph ? "Hide Doctor Visiting Graph" : "Show Doctor Visiting Graph"}
            </button>

            <button
              onClick={handleOpenAddDrawer}
              className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add IPD Record
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-3 md:p-5 space-y-4">
          {/* STAT CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Filtered Surgeries</span>
              <div className="text-lg font-extrabold text-[#111827] mt-0.5">{stats.count}</div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Total Bill Amount</span>
              <div className="text-sm font-extrabold text-primary mt-0.5">{fmtCurr(stats.totalBill)}</div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Total Net Package</span>
              <div className="text-sm font-extrabold text-emerald-600 mt-0.5">{fmtCurr(stats.totalNetPkg)}</div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Surgeons Fees</span>
              <div className="text-sm font-extrabold text-indigo-600 mt-0.5">{fmtCurr(stats.totalSurgeon)}</div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Hospital Charges</span>
              <div className="text-sm font-extrabold text-slate-700 mt-0.5">{fmtCurr(stats.totalHosp)}</div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider">Eqpmt Charges</span>
              <div className="text-sm font-extrabold text-amber-600 mt-0.5">{fmtCurr(stats.totalEqpmt)}</div>
            </div>
          </div>

          {/* MASTER MULTI-FILTER BAR */}
          <div ref={filterRef} className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Master Multi-Select Filters</span>
              </div>

              {(searchQuery || startDate || endDate || monthFilter !== "all" || payerFilter !== "all" || completeFilter !== "all" || selectedHospitals.length > 0 || selectedDiagnoses.length > 0 || selectedSurgeries.length > 0 || selectedDoctors.length > 0) && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Search text */}
              <div>
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Quick Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, diagnosis, bill..."
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-primary font-medium"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-xs bg-white focus:outline-none focus:border-primary font-semibold"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-xs bg-white focus:outline-none focus:border-primary font-semibold"
                />
              </div>

              {/* Multi-Select Hospitals */}
              <div className="relative">
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Multi Hospital</label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "hosp" ? null : "hosp")}
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-xs bg-white text-left font-semibold flex items-center justify-between truncate"
                >
                  <span className="truncate">
                    {selectedHospitals.length === 0 ? "All Hospitals" : `${selectedHospitals.length} Selected`}
                  </span>
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openDropdown === "hosp" && (
                  <div className="absolute left-0 top-full mt-1 w-56 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">Select Hospitals</div>
                    {hospitalOptions.map((h) => (
                      <label key={h} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={selectedHospitals.includes(h)}
                          onChange={() => toggleSelection(selectedHospitals, h, setSelectedHospitals)}
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="truncate">{h}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Multi-Select Surgery */}
              <div className="relative">
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Multi Surgery</label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "surg" ? null : "surg")}
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-xs bg-white text-left font-semibold flex items-center justify-between truncate"
                >
                  <span className="truncate">
                    {selectedSurgeries.length === 0 ? "All Surgeries" : `${selectedSurgeries.length} Selected`}
                  </span>
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openDropdown === "surg" && (
                  <div className="absolute left-0 top-full mt-1 w-64 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">Select Surgeries</div>
                    {allSurgeries.map((s) => (
                      <label key={s} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={selectedSurgeries.includes(s)}
                          onChange={() => toggleSelection(selectedSurgeries, s, setSelectedSurgeries)}
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="truncate" title={s}>{s}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Multi-Select Doctor / Visiting */}
              <div className="relative">
                <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">Multi Doctor / Visiting</label>
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "doc" ? null : "doc")}
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-xs bg-white text-left font-semibold flex items-center justify-between truncate"
                >
                  <span className="truncate">
                    {selectedDoctors.length === 0 ? "All Doctors" : `${selectedDoctors.length} Selected`}
                  </span>
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openDropdown === "doc" && (
                  <div className="absolute left-0 top-full mt-1 w-60 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">Select Doctors</div>
                    {allDoctors.map((d) => (
                      <label key={d} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={selectedDoctors.includes(d)}
                          onChange={() => toggleSelection(selectedDoctors, d, setSelectedDoctors)}
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="truncate">{d}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* HOSPITAL ANALYTICS GRAPH */}
          {showHospitalGraph && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 md:p-4 shadow-2xs space-y-3 select-text">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Hospital Analytics Graph</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                    {filteredRecords.length} Filtered Records
                  </span>
                </div>
                <button
                  onClick={() => setShowHospitalGraph(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {hospitalGraphData.slice(0, 15).map((h) => {
                  const pct = Math.max(8, Math.round((h.count / maxHospCount) * 100));
                  return (
                    <div key={h.name} className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-xs font-bold flex-wrap gap-1">
                        <span className="text-slate-900 truncate max-w-[180px] sm:max-w-[280px]">{h.name}</span>
                        <span className="text-primary font-extrabold text-[11px]">{h.count} Surgeries ({fmtCurr(h.bill)})</span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-300"
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DOCTOR VISITING ANALYTICS GRAPH */}
          {showDoctorGraph && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 md:p-4 shadow-2xs space-y-3 select-text">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Doctor / Visiting Doctor Analytics Graph</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                    {filteredRecords.length} Filtered Records
                  </span>
                </div>
                <button
                  onClick={() => setShowDoctorGraph(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {doctorGraphData.slice(0, 15).map((d) => {
                  const pct = Math.max(8, Math.round((d.count / maxDocCount) * 100));
                  return (
                    <div key={d.name} className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-xs font-bold flex-wrap gap-1">
                        <span className="text-slate-900 truncate max-w-[180px] sm:max-w-[280px]">{d.name}</span>
                        <span className="text-indigo-600 font-extrabold text-[11px]">{d.count} Surgeries ({fmtCurr(d.fees)} Fees)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-300"
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TABLE CONTAINER */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-380px)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-[#6B7280] uppercase font-bold sticky top-0 z-10 select-none">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-[#E5E7EB] whitespace-nowrap">Date</th>
                    <th className="py-2.5 px-3 border-r border-[#E5E7EB] whitespace-nowrap">Month</th>
                    <th className="py-2.5 px-3 border-r border-[#E5E7EB] whitespace-nowrap">Patient Name</th>
                    <th className="py-2.5 px-3 border-r border-[#E5E7EB] whitespace-nowrap">Hospital</th>
                    <th className="py-2.5 px-3 border-r border-[#E5E7EB] whitespace-nowrap">Sex</th>
                    <th className="py-2.5 px-3 border-r border-[#E5E7EB] whitespace-nowrap min-w-[160px]">Diagnosis</th>
                    <th className="py-2.5 px-3 border-r border-[#E5E7EB] whitespace-nowrap min-w-[160px]">Surgery</th>
                    <th className="py-2.5 px-3 border-r border-[#E5E7EB] whitespace-nowrap">Doctor / Visiting</th>
                    <th className="py-2.5 px-3 border-r border-[#E5E7EB] whitespace-nowrap">Payer</th>
                    <th className="py-2.5 px-3 border-r border-[#E5E7EB] text-right whitespace-nowrap">Bill Amount</th>
                    <th className="py-2.5 px-3 border-r border-[#E5E7EB] text-right whitespace-nowrap">Net Pkg</th>
                    <th className="py-2.5 px-3 border-r border-[#E5E7EB] text-right whitespace-nowrap">Surgeons Fees</th>
                    <th className="py-2.5 px-3 border-r border-[#E5E7EB] text-right whitespace-nowrap">Hosp Charges</th>
                    <th className="py-2.5 px-3 border-r border-[#E5E7EB] text-right whitespace-nowrap">Eqpmt Charges</th>
                    <th className="py-2.5 px-3 border-r border-[#E5E7EB] text-center whitespace-nowrap">Complete</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5E7EB] text-[#111827]">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="py-12 text-center text-slate-400 font-medium">
                        No IPD records found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 border-r border-[#E5E7EB] whitespace-nowrap text-slate-600">{r.surgery_date || "-"}</td>
                        <td className="py-2 px-3 border-r border-[#E5E7EB] whitespace-nowrap font-medium">{r.month || "-"}</td>
                        <td className="py-2 px-3 border-r border-[#E5E7EB] whitespace-nowrap font-bold text-slate-900">{r.patients_name}</td>
                        <td className="py-2 px-3 border-r border-[#E5E7EB] whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-bold text-slate-700">
                            {r.hospital || "-"}
                          </span>
                        </td>
                        <td className="py-2 px-3 border-r border-[#E5E7EB] whitespace-nowrap text-center font-bold">{r.sex || "-"}</td>
                        <td className="py-2 px-3 border-r border-[#E5E7EB] text-slate-700 max-w-[200px] truncate" title={r.diagnosis}>{r.diagnosis || "-"}</td>
                        <td className="py-2 px-3 border-r border-[#E5E7EB] font-medium text-slate-800 max-w-[200px] truncate" title={r.surgery}>{r.surgery || "-"}</td>
                        <td className="py-2 px-3 border-r border-[#E5E7EB] whitespace-nowrap text-slate-700">
                          {r.visiting_doc || r.surgeons_name || "-"}
                        </td>
                        <td className="py-2 px-3 border-r border-[#E5E7EB] whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            r.payer === "TPA" ? "bg-purple-100 text-purple-700" : r.payer === "Cash" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {r.payer || "-"}
                          </span>
                        </td>
                        <td className="py-2 px-3 border-r border-[#E5E7EB] text-right font-bold text-slate-900">{fmtCurr(r.bill_amount)}</td>
                        <td className="py-2 px-3 border-r border-[#E5E7EB] text-right font-semibold text-emerald-700">{fmtCurr(r.net_pkg)}</td>
                        <td className="py-2 px-3 border-r border-[#E5E7EB] text-right font-semibold text-indigo-700">{fmtCurr(r.surgeons_fees)}</td>
                        <td className="py-2 px-3 border-r border-[#E5E7EB] text-right text-slate-600">{fmtCurr(r.hosp_charges)}</td>
                        <td className="py-2 px-3 border-r border-[#E5E7EB] text-right text-slate-600">{fmtCurr(r.eqpmt_charges)}</td>
                        <td className="py-2 px-3 border-r border-[#E5E7EB] text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            r.complete === "Y" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {r.complete || "N"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditDrawer(r)}
                              className="p-1 hover:bg-slate-100 rounded-md text-indigo-650 transition-colors"
                              title="Edit Record"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              disabled={deletingId === r.id}
                              className="p-1 hover:bg-slate-100 rounded-md text-red-600 transition-colors disabled:opacity-30"
                              title="Delete Record"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* SLIDE-OVER DRAWER FOR ADD / EDIT IPD RECORD */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden text-left select-none">
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          />

          <div className="fixed inset-y-0 right-0 w-full md:max-w-xl flex">
            <div className="w-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 border-l border-slate-200">
              {/* Drawer Header */}
              <div className="px-5 py-4 bg-primary text-white flex items-center justify-between shrink-0 sticky top-0 z-20">
                <div>
                  <h3 className="text-base font-extrabold">
                    {editingRecord ? "Edit IPD Record" : "Add New IPD Record"}
                  </h3>
                  <p className="text-xs text-purple-100">Fill in patient details, hospital billing, and surgeon fees</p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 hover:bg-primary-hover rounded-lg transition-colors text-white cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Drawer Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
                {/* SECTION 1: BASIC & ADMISSION DETAILS */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">
                    1. Patient & Admission Info
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Patient Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.patients_name || ""}
                        onChange={(e) => setFormData({ ...formData, patients_name: e.target.value })}
                        placeholder="Enter patient name"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-primary font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Surgery Date</label>
                      <input
                        type="text"
                        value={formData.surgery_date || ""}
                        onChange={(e) => setFormData({ ...formData, surgery_date: e.target.value })}
                        placeholder="e.g. 7/4/2025"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-primary font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Month</label>
                      <input
                        type="text"
                        value={formData.month || ""}
                        onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                        placeholder="e.g. Apr"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-primary font-medium"
                      />
                    </div>

                    <SearchableSelect
                      label="Hospital"
                      value={formData.hospital || ""}
                      onChange={(val) => setFormData({ ...formData, hospital: val })}
                      options={combinedHospitals}
                      placeholder="Select or search hospital"
                    />

                    <SearchableSelect
                      label="Sex"
                      value={formData.sex || ""}
                      onChange={(val) => setFormData({ ...formData, sex: val })}
                      options={sexOptions}
                      placeholder="Select gender"
                    />

                    <SearchableSelect
                      label="Payer"
                      value={formData.payer || ""}
                      onChange={(val) => setFormData({ ...formData, payer: val })}
                      options={payerOptions}
                      placeholder="Select payer type"
                    />

                    <SearchableSelect
                      label="Complete"
                      value={formData.complete || ""}
                      onChange={(val) => setFormData({ ...formData, complete: val })}
                      options={completeOptions}
                      placeholder="Select status"
                    />
                  </div>
                </div>

                {/* SECTION 2: DIAGNOSIS & SURGEON DETAILS */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">
                    2. Surgery & Medical Details
                  </h4>

                  <div className="space-y-3">
                    <SearchableSelect
                      label="Diagnosis"
                      value={formData.diagnosis || ""}
                      onChange={(val) => setFormData({ ...formData, diagnosis: val })}
                      options={allDiagnoses}
                      placeholder="Select or search diagnosis"
                    />

                    <SearchableSelect
                      label="Surgery Procedure"
                      value={formData.surgery || ""}
                      onChange={(val) => setFormData({ ...formData, surgery: val })}
                      options={allSurgeries}
                      placeholder="Select or search surgery"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <SearchableSelect
                        label="Visiting Doc / Surgeon"
                        value={formData.visiting_doc || formData.surgeons_name || ""}
                        onChange={(val) => setFormData({ ...formData, visiting_doc: val, surgeons_name: val })}
                        options={allDoctors}
                        placeholder="Select or search surgeon"
                      />

                      <SearchableSelect
                        label="Assistant Surgeon"
                        value={formData.asst_surgeon || ""}
                        onChange={(val) => setFormData({ ...formData, asst_surgeon: val })}
                        options={allDoctors}
                        placeholder="Select assistant surgeon"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: FINANCIALS & BILLING */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">
                    3. Financial & Billing Charges
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bill Amount (₹)</label>
                      <input
                        type="number"
                        step="any"
                        onWheel={(e) => e.currentTarget.blur()}
                        value={formData.bill_amount ?? ""}
                        onChange={(e) => setFormData({ ...formData, bill_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="192150"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-primary font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Net Package (₹)</label>
                      <input
                        type="number"
                        step="any"
                        onWheel={(e) => e.currentTarget.blur()}
                        value={formData.net_pkg ?? ""}
                        onChange={(e) => setFormData({ ...formData, net_pkg: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="148302"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-primary font-semibold text-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Surgeon Fees (₹)</label>
                      <input
                        type="number"
                        step="any"
                        onWheel={(e) => e.currentTarget.blur()}
                        value={formData.surgeons_fees ?? ""}
                        onChange={(e) => setFormData({ ...formData, surgeons_fees: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="56059"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-primary font-semibold text-indigo-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hospital Charges (₹)</label>
                      <input
                        type="number"
                        step="any"
                        onWheel={(e) => e.currentTarget.blur()}
                        value={formData.hosp_charges ?? ""}
                        onChange={(e) => setFormData({ ...formData, hosp_charges: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-primary font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Equipment Charges (₹)</label>
                      <input
                        type="number"
                        step="any"
                        onWheel={(e) => e.currentTarget.blur()}
                        value={formData.eqpmt_charges ?? ""}
                        onChange={(e) => setFormData({ ...formData, eqpmt_charges: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="27000"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-primary font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Visit Fees (₹)</label>
                      <input
                        type="number"
                        step="any"
                        onWheel={(e) => e.currentTarget.blur()}
                        value={formData.visit_fees ?? ""}
                        onChange={(e) => setFormData({ ...formData, visit_fees: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="24024"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-primary font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Drawer Footer Actions */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 sticky bottom-0 bg-white py-2 z-10">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? "Saving Record..." : editingRecord ? "Update Record" : "Save Record"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
