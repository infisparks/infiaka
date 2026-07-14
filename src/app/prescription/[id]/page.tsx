"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PrintPrescription from "@/components/PrintPrescription";

export default function PrescriptionDetailPage() {
  const { id: registrationId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activePrintData, setActivePrintData] = useState<any>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Initial loaded settings to support reset/cancel
  const [initialSettings, setInitialSettings] = useState<any>(null);

  // Settings Configuration States
  const [printShowHeader, setPrintShowHeader] = useState(true);
  const [printShowHeaderPage2, setPrintShowHeaderPage2] = useState(false);
  const [printShowLetterhead, setPrintShowLetterhead] = useState(true);
  const [printShowLetterheadPage2, setPrintShowLetterheadPage2] = useState(false);
  const [printShowFooter, setPrintShowFooter] = useState(true);
  const [printShowFooterPage2, setPrintShowFooterPage2] = useState(true);
  const [printHeaderHeight, setPrintHeaderHeight] = useState(0);
  const [printHeaderHeightPage2, setPrintHeaderHeightPage2] = useState(15);
  const [printFooterHeight, setPrintFooterHeight] = useState(0);
  const [printFooterHeightPage2, setPrintFooterHeightPage2] = useState(15);

  const printRef = useRef<any>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── LOAD PRINT SETTINGS FROM DB ───────────────────────────────────
  useEffect(() => {
    const loadPrintSettings = async () => {
      try {
        const { data } = await supabase
          .from("aka_setting")
          .select("metadata")
          .eq("setting_key", "prescription_settings")
          .maybeSingle();

        const defaultSettings = {
          showLetterhead: true,
          showHeader: true,
          showFooter: true,
          headerHeight: 65,
          footerHeight: 30,
          showLetterheadPage2: false,
          showHeaderPage2: false,
          showFooterPage2: true,
          headerHeightPage2: 15,
          footerHeightPage2: 15
        };

        const meta = (data && data.metadata) ? { ...defaultSettings, ...data.metadata } : defaultSettings;
        setInitialSettings(meta);

        setPrintShowLetterhead(meta.showLetterhead);
        setPrintShowHeader(meta.showHeader);
        setPrintShowFooter(meta.showFooter);
        setPrintHeaderHeight(meta.headerHeight);
        setPrintFooterHeight(meta.footerHeight);

        setPrintShowLetterheadPage2(meta.showLetterheadPage2);
        setPrintShowHeaderPage2(meta.showHeaderPage2);
        setPrintShowFooterPage2(meta.showFooterPage2);
        setPrintHeaderHeightPage2(meta.headerHeightPage2);
        setPrintFooterHeightPage2(meta.footerHeightPage2);

      } catch (e) {
        console.error("Failed to load prescription settings from DB:", e);
      }
    };
    loadPrintSettings();
  }, []);

  // ─── SAVE SETTINGS TO DB ───────────────────────────────────────────
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);

      const { data } = await supabase
        .from("aka_setting")
        .select("metadata")
        .eq("setting_key", "prescription_settings")
        .maybeSingle();

      const existingMeta = data?.metadata || {};
      const newMeta = {
        ...existingMeta,
        showLetterhead: printShowLetterhead,
        showHeader: printShowHeader,
        showFooter: printShowFooter,
        headerHeight: printHeaderHeight,
        footerHeight: printFooterHeight,
        showLetterheadPage2: printShowLetterheadPage2,
        showHeaderPage2: printShowHeaderPage2,
        showFooterPage2: printShowFooterPage2,
        headerHeightPage2: printHeaderHeightPage2,
        footerHeightPage2: printFooterHeightPage2
      };

      const { error } = await supabase
        .from("aka_setting")
        .upsert(
          { setting_key: "prescription_settings", metadata: newMeta },
          { onConflict: "setting_key" }
        );

      if (error) throw error;
      setInitialSettings(newMeta);
      showToast("Configuration saved successfully!", "success");
    } catch (e) {
      console.error("Failed to save settings:", e);
      showToast("Failed to save configuration.", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  // ─── RESET SETTINGS TO LOADED VALUES ──────────────────────────────
  const handleResetSettings = () => {
    if (!initialSettings) return;
    setPrintShowLetterhead(initialSettings.showLetterhead);
    setPrintShowHeader(initialSettings.showHeader);
    setPrintShowFooter(initialSettings.showFooter);
    setPrintHeaderHeight(initialSettings.headerHeight);
    setPrintFooterHeight(initialSettings.footerHeight);

    setPrintShowLetterheadPage2(initialSettings.showLetterheadPage2);
    setPrintShowHeaderPage2(initialSettings.showHeaderPage2);
    setPrintShowFooterPage2(initialSettings.showFooterPage2);
    setPrintHeaderHeightPage2(initialSettings.headerHeightPage2);
    setPrintFooterHeightPage2(initialSettings.footerHeightPage2);
    showToast("Settings reset to default.", "success");
  };

  // ─── LOAD DATA FOR THE GIVEN REGISTRATION ID ──────────────────────
  useEffect(() => {
    if (!registrationId) return;

    const fetchPrescriptionData = async () => {
      try {
        setLoading(true);

        // 1. Fetch OPD Registration
        const { data: reg, error: regErr } = await supabase
          .from("aka_opd_registration")
          .select("*")
          .eq("registration_id", Number(registrationId))
          .or("is_deleted.is.null,is_deleted.eq.false")
          .maybeSingle();

        if (regErr) throw regErr;
        if (!reg) {
          showToast("Prescription record not found", "error");
          setLoading(false);
          return;
        }

        // 2. Fetch Patient Details
        const { data: patient, error: patientErr } = await supabase
          .from("patient_detail")
          .select("*")
          .eq("uhid", reg.patient_uhid)
          .maybeSingle();

        if (patientErr) throw patientErr;
        if (!patient) {
          showToast("Patient record not found", "error");
          setLoading(false);
          return;
        }

        // 3. Fetch related arrays concurrently
        const [
          { data: syms },
          { data: diags },
          { data: meds },
          { data: labReqs },
          { data: procs },
          { data: refs },
          { data: results },
          { data: history }
        ] = await Promise.all([
          supabase.from("aka_symptoms").select("*").eq("registration_id", Number(registrationId)),
          supabase.from("aka_diagnoses").select("*").eq("registration_id", Number(registrationId)),
          supabase.from("aka_patient_medications").select(`
            *,
            medicine:medicine_id (
              name,
              salt_composition,
              short_composition1,
              type
            )
          `).eq("registration_id", Number(registrationId)),
          supabase.from("aka_patient_labs").select("*").eq("registration_id", Number(registrationId)),
          supabase.from("aka_procedure").select("*").eq("registration_id", Number(registrationId)),
          supabase.from("aka_refer_to").select("*").eq("registration_id", Number(registrationId)),
          supabase.from("aka_lab_result").select("*").eq("registration_id", Number(registrationId)),
          supabase.from("aka_patient_medical_history").select("*").eq("patient_uhid", reg.patient_uhid).maybeSingle()
        ]);

        // 4. Map data fields
        const mappedSyms = (syms || []).map(s => ({
          id: String(s.symptom_id),
          name: s.name,
          duration: s.duration,
          severity: s.severity || "medium",
          note: s.note
        }));

        const mappedDiags = (diags || []).map(d => ({
          id: String(d.diagnosis_id),
          name: d.name,
          since: d.duration,
          note: d.note
        }));

        const mappedMeds = (meds || []).map((m: any) => {
          const medName = m.medicine?.name || m.medicine_id || "Medicine";
          const medGeneric = m.medicine?.salt_composition || m.medicine?.short_composition1 || "";
          return {
            id: String(m.patient_medication_id),
            name: medName,
            generic: medGeneric,
            form: m.medicine?.type || "Tablet",
            dose: m.dose || "1 Tablet",
            freq: m.freq || "1-0-1",
            timing: m.timing || "After Meal",
            duration: m.duration || "5 Days",
            start: m.start_from || "Today",
            instr: m.instruction || ""
          };
        });

        const mappedLabs = (labReqs || []).map(l => ({
          id: String(l.patient_lab_id),
          name: l.name,
          testOn: l.test_on,
          repeatOn: l.repeat_on,
          remarks: l.remarks
        }));

        const mappedResults = (results || []).map(r => ({
          id: String(r.lab_result_id),
          name: r.test_name,
          unit: r.unit,
          reading: r.reading,
          interpretation: r.interpretation,
          date: r.test_date,
          notes: r.remarks
        }));

        const mappedProcs = (procs || []).map(p => ({
          id: String(p.procedure_id),
          name: p.name,
          duration: p.duration,
          note: p.note
        }));

        const mappedRefs = (refs || []).map(r => ({
          id: String(r.refer_id),
          doctorName: r.doctor_name,
          notes: r.notes
        }));

        setActivePrintData({
          patient: {
            id: patient.uhid,
            title: patient.title || "Mr/Mrs",
            name: patient.name,
            age: Number(patient.age || 0),
            ageUnit: patient.age_unit || "Year",
            gender: patient.gender || "Male",
            phone: String(patient.number || ""),
            permanentAddress: patient.address || "",
            opdRegistration: {
              clinic_name: reg.clinic_name,
              treating_doctor: reg.treating_doctor,
              referring_doctor: reg.referring_doctor
            }
          },
          bp: reg.bp || "",
          pulse: reg.pulse || "",
          weight: reg.weight || "",
          spo2: reg.spo2 || "",
          sugar: reg.sugar || "",
          symptoms: mappedSyms,
          diagnoses: mappedDiags,
          medications: mappedMeds,
          labs: mappedLabs,
          labResults: mappedResults,
          procedures: mappedProcs,
          referrals: mappedRefs,
          advice: reg.advice || "",
          advice_rest: reg.advice_rest || false,
          advice_water: reg.advice_water || false,
          notes_for_patient: reg.notes_for_patient || "",
          follow_up: reg.follow_up || "",
          follow_up_notes: reg.follow_up_notes || "",
          medicalHistory: history || null
        });

      } catch (err) {
        console.error("Error fetching prescription details:", err);
        showToast("Failed to fetch prescription details from DB.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptionData();
  }, [registrationId]);

  // ─── GENERATE PDF BLOB RE-EXECUTION ON SETTINGS CHANGE ──────────────
  useEffect(() => {
    if (activePrintData && printRef.current) {
      const timer = setTimeout(async () => {
        const blobUrl = await printRef.current.generatePDF(false);
        if (blobUrl) {
          setPreviewBlobUrl(blobUrl);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [
    activePrintData,
    printShowHeader,
    printShowLetterhead,
    printShowFooter,
    printHeaderHeight,
    printFooterHeight,
    printShowHeaderPage2,
    printShowLetterheadPage2,
    printShowFooterPage2,
    printHeaderHeightPage2,
    printFooterHeightPage2
  ]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F6F8] font-sans select-none">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Prescription Preview...</p>
        </div>
      </div>
    );
  }

  if (!activePrintData) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F5F6F8] font-sans select-none p-4">
        <div className="text-center space-y-4">
          <p className="text-sm font-bold text-red-500 uppercase tracking-wider">Prescription Not Found</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-indigo-650 hover:bg-indigo-750 text-white font-bold rounded-lg text-xs"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F5F6F8] overflow-hidden font-sans select-none">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[200] bg-slate-900 text-white rounded-xl shadow-2xl p-3.5 px-4 flex items-center gap-2.5 max-w-sm transition-all border border-slate-800">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0
            ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
            {toast.type === "success" ? "✓" : "✕"}
          </div>
          <span className="text-[11.5px] font-extrabold tracking-tight">{toast.message}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="h-12 bg-white border-b border-[#E2E8F0] px-4 flex items-center justify-between shrink-0 shadow-2xs z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-1 hover:bg-[#E2E8F0] rounded-md text-[#718096] transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-800" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="text-left leading-tight">
            <span className="text-[12px] font-bold text-slate-800">
              Prescription View - {activePrintData.patient.name} ({activePrintData.patient.age}y / {activePrintData.patient.gender})
            </span>
            <div className="text-[9px] text-[#A0AEC0] font-semibold tracking-tight">
              OPD ID: {registrationId} | Phone: {activePrintData.patient.phone}
            </div>
          </div>
        </div>
      </header>

      {/* SPLIT SCREEN CONTENT PANEL */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: CONFIGURATION */}
        <aside className="w-80 bg-white border-r border-[#E2E8F0] flex flex-col overflow-y-auto select-text p-4 space-y-5">
          <div className="border-b pb-2 mb-1">
            <h3 className="text-sm font-bold text-slate-850">Print Configuration</h3>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Adjust document dimensions and layouts. Settings apply dynamically to the PDF.</p>
          </div>

          {/* FIRST PAGE CONFIG */}
          <div className="space-y-3.5">
            <span className="text-[11px] font-extrabold text-indigo-650 uppercase tracking-wider">Page 1 Layout</span>
            
            {/* Show Header Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-slate-700">
              <input
                type="checkbox"
                checked={printShowHeader}
                onChange={(e) => setPrintShowHeader(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-650 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
              />
              <span>Show Header Row</span>
            </label>

            {/* Print Background letterhead */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-slate-700">
              <input
                type="checkbox"
                checked={printShowLetterhead}
                onChange={(e) => setPrintShowLetterhead(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-650 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
              />
              <span>Print Background Letterhead</span>
            </label>

            {/* Header Height */}
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-slate-500">Header Margin (Height mm)</label>
              <input
                type="number"
                min="0"
                max="200"
                placeholder="e.g. 65"
                value={printHeaderHeight}
                onChange={(e) => setPrintHeaderHeight(Number(e.target.value))}
                className="w-full text-xs font-bold text-slate-800 border border-[#E2E8F0] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg p-2 outline-hidden"
              />
            </div>

            {/* Show Footer Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-slate-700">
              <input
                type="checkbox"
                checked={printShowFooter}
                onChange={(e) => setPrintShowFooter(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-650 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
              />
              <span>Show Footer Row</span>
            </label>

            {/* Footer Height */}
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-slate-500">Footer Margin (Height mm)</label>
              <input
                type="number"
                min="0"
                max="200"
                placeholder="e.g. 30"
                value={printFooterHeight}
                onChange={(e) => setPrintFooterHeight(Number(e.target.value))}
                className="w-full text-xs font-bold text-slate-800 border border-[#E2E8F0] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg p-2 outline-hidden"
              />
            </div>
          </div>

          {/* SECOND PAGE CONFIG */}
          <div className="space-y-3.5 pt-3.5 border-t border-slate-100">
            <span className="text-[11px] font-extrabold text-indigo-650 uppercase tracking-wider">Page 2 Layout</span>

            {/* Show Header Page 2 */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-slate-700">
              <input
                type="checkbox"
                checked={printShowHeaderPage2}
                onChange={(e) => setPrintShowHeaderPage2(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-650 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
              />
              <span>Show Header Row Page 2</span>
            </label>

            {/* Print Background Page 2 */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-slate-700">
              <input
                type="checkbox"
                checked={printShowLetterheadPage2}
                onChange={(e) => setPrintShowLetterheadPage2(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-650 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
              />
              <span>Print Background Letterhead Page 2</span>
            </label>

            {/* Header Height Page 2 */}
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-slate-500">Header Margin Page 2 (mm)</label>
              <input
                type="number"
                min="0"
                max="200"
                placeholder="e.g. 15"
                value={printHeaderHeightPage2}
                onChange={(e) => setPrintHeaderHeightPage2(Number(e.target.value))}
                className="w-full text-xs font-bold text-slate-800 border border-[#E2E8F0] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg p-2 outline-hidden"
              />
            </div>

            {/* Show Footer Page 2 */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-slate-700">
              <input
                type="checkbox"
                checked={printShowFooterPage2}
                onChange={(e) => setPrintShowFooterPage2(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-650 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
              />
              <span>Show Footer Row Page 2</span>
            </label>

            {/* Footer Height Page 2 */}
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-slate-500">Footer Margin Page 2 (mm)</label>
              <input
                type="number"
                min="0"
                max="200"
                placeholder="e.g. 15"
                value={printFooterHeightPage2}
                onChange={(e) => setPrintFooterHeightPage2(Number(e.target.value))}
                className="w-full text-xs font-bold text-slate-800 border border-[#E2E8F0] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg p-2 outline-hidden"
              />
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 shrink-0">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {savingSettings ? "Saving Settings..." : "💾 Save Settings"}
            </button>
            <button
              onClick={handleResetSettings}
              className="w-full py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-750 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              🔄 Reset to Defaults
            </button>
          </div>
        </aside>

        {/* RIGHT PANEL: LIVE PDF PREVIEW */}
        <main className="flex-1 p-4 bg-slate-100/50 relative">
          {previewBlobUrl ? (
            <iframe src={previewBlobUrl} className="w-full h-full rounded-xl border border-slate-200 shadow-sm bg-white" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm animate-pulse">
              <svg className="w-8 h-8 text-indigo-500 animate-spin mb-2" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">Generating PDF Preview...</span>
            </div>
          )}
        </main>

      </div>

      {/* ACTION FOOTER */}
      <footer className="h-12 bg-white border-t border-[#E2E8F0] px-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              showToast("Prescription saved as template successfully!", "success");
            }}
            className="px-3.5 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[10.5px] font-bold text-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            📂 Save as Template
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              if (printRef.current) {
                await printRef.current.generatePDF(true);
                showToast("Downloading PDF Configuration Report...", "success");
              }
            }}
            className="px-3.5 py-1.5 bg-white border border-indigo-200 hover:bg-indigo-50 text-[10.5px] font-bold text-indigo-650 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            📥 Download PDF Report
          </button>
          <button
            type="button"
            onClick={() => {
              const phone = activePrintData.patient.phone || "";
              const text = `Hello, here is your prescription from Dr. ${activePrintData?.treating_doctor || "Doctor"}. Please access it here: ${previewBlobUrl}`;
              window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, "_blank");
              showToast("Redirecting to WhatsApp...", "success");
            }}
            className="px-3.5 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[10.5px] font-bold text-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            💬 Send SMS/WhatsApp
          </button>
          <button
            type="button"
            onClick={() => {
              if (previewBlobUrl) {
                const printWindow = window.open(previewBlobUrl);
                if (printWindow) {
                  printWindow.print();
                }
              }
            }}
            className="px-4.5 py-1.5 bg-indigo-650 hover:bg-indigo-750 text-[11px] font-extrabold text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
          >
            🖨️ Print
          </button>
        </div>
      </footer>

      {/* HIDDEN PRINT PRESCRIPTION MOUNT FOR GENERATING THE BLOB */}
      <div className="hidden">
        <PrintPrescription
          ref={printRef}
          patient={activePrintData.patient}
          bp={activePrintData.bp}
          pulse={activePrintData.pulse}
          weight={activePrintData.weight}
          spo2={activePrintData.spo2}
          sugar={activePrintData.sugar}
          symptoms={activePrintData.symptoms}
          diagnoses={activePrintData.diagnoses}
          medications={activePrintData.medications}
          labs={activePrintData.labs}
          labResults={activePrintData.labResults}
          rxProcedures={activePrintData.procedures}
          referrals={activePrintData.referrals}
          advicesInput={activePrintData.advice}
          advRest={activePrintData.advice_rest}
          advWater={activePrintData.advice_water}
          notesForPatient={activePrintData.notes_for_patient}
          followUpVal={activePrintData.follow_up}
          followUpNotes={activePrintData.follow_up_notes}
          histNoKnown={activePrintData.medicalHistory?.no_known_history || false}
          familyItems={activePrintData.medicalHistory?.family_history || []}
          conditions={activePrintData.medicalHistory?.existing_conditions || []}
          allergies={activePrintData.medicalHistory?.drug_allergies || []}
          procedures={activePrintData.medicalHistory?.surgical_procedures || []}
          currentMeds={activePrintData.medicalHistory?.current_medications || []}
          habits={activePrintData.medicalHistory?.lifestyle_habits || []}
          foodAllergies={activePrintData.medicalHistory?.food_allergies || []}
          otherHistory={activePrintData.medicalHistory?.other_history || []}
          otherHistoryTitle={activePrintData.medicalHistory?.other_history_title || ""}
          travelHistory={activePrintData.medicalHistory?.travel_history || []}
          showHeader={printShowHeader}
          headerHeight={printHeaderHeight}
          showFooter={printShowFooter}
          footerHeight={printFooterHeight}
          showLetterhead={printShowLetterhead}
          showHeaderPage2={printShowHeaderPage2}
          headerHeightPage2={printHeaderHeightPage2}
          showFooterPage2={printShowFooterPage2}
          footerHeightPage2={printFooterHeightPage2}
          showLetterheadPage2={printShowLetterheadPage2}
        />
      </div>

    </div>
  );
}
