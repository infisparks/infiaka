"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, getUserRole } from "@/lib/supabase";
import jsPDF from "jspdf";

interface Patient {
  patient_id?: number;
  id: string;
  queueNo: string;
  title?: string;
  name: string;
  phoneDialCode?: string;
  phone: string;
  gender: string;
  age: number;
  ageUnit?: string;
  dob?: string;
  permanentAddress?: string;
  localAddress?: string;
  country?: string;
  state?: string;
  statusTags: string[];
  billAmount: number;
  paymentMethod: string;
  isAbhaCreated: boolean;
  customTags: string[];
  isCompleted: boolean;
  isOngoing: boolean;
  arrivalTime: string;
  arrivalMinutesAgo: number;
  opdRegistration?: {
    clinic_name?: string;
    treating_doctor?: string;
    referring_doctor?: string;
  };
}

interface IssuedCertificate {
  certificate_id: number;
  registration_id: number | null;
  patient_uhid: string;
  title: string;
  content: string;
  created_at: string;
}

const CustomToast = ({ message, type, onClose }: { message: string; type: "success" | "error" | "info"; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-indigo-50 border-indigo-200 text-indigo-800"
  };

  const icons = {
    success: (
      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all">
      <div className={`flex items-center gap-2.5 ${bgColors[type]} px-4 py-2.5 rounded-xl border-2 shadow-sm`}>
        {icons[type]}
        <span className="text-[13px] font-bold tracking-tight">{message}</span>
      </div>
    </div>
  );
};

function CertificatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rxPatientId = searchParams.get("rx") || "";

  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRxPatient, setCurrentRxPatient] = useState<Patient | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [pastVisitsCount, setPastVisitsCount] = useState<number>(0);
  const [legacyVisitsCount, setLegacyVisitsCount] = useState<number>(0);

  // Settings states
  const [printShowHeader, setPrintShowHeader] = useState(false);
  const [printShowFooter, setPrintShowFooter] = useState(true);
  const [printHeaderHeight, setPrintHeaderHeight] = useState(65);
  const [printFooterHeight, setPrintFooterHeight] = useState(29);
  const [printShowLetterhead, setPrintShowLetterhead] = useState(true);

  // Certificate input states
  const [certificateTitle, setCertificateTitle] = useState("");
  const [certificateBody, setCertificateBody] = useState("");
  const [issuedCertificates, setIssuedCertificates] = useState<IssuedCertificate[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [issuing, setIssuing] = useState(false);



  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  // Auth session check
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        const role = await getUserRole(session.user?.email || "");
        if (role === "staff") {
          router.push("/");
        } else {
          setUserRole(role);
          setSessionLoaded(true);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        router.push("/login");
      } else {
        const role = await getUserRole(session.user?.email || "");
        if (role === "staff") {
          router.push("/");
        } else {
          setUserRole(role);
          setSessionLoaded(true);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Load Patient and Settings on Mount
  useEffect(() => {
    if (!sessionLoaded || !rxPatientId) return;

    const loadData = async () => {
      try {
        setLoading(true);

        // Fetch OPD registration
        const { data: regData, error: rError } = await supabase
          .from("aka_opd_registration")
          .select("*")
          .eq("registration_id", rxPatientId)
          .or("is_deleted.is.null,is_deleted.eq.false")
          .maybeSingle();

        if (rError) throw rError;
        if (!regData) {
          setCurrentRxPatient(null);
          setLoading(false);
          return;
        }

        // Fetch Patient details
        const { data: pData, error: pError } = await supabase
          .from("patient_detail")
          .select("*")
          .eq("uhid", regData.patient_uhid)
          .maybeSingle();

        if (pError) throw pError;
        if (!pData) {
          setCurrentRxPatient(null);
          setLoading(false);
          return;
        }

        const mappedPatient: Patient = {
          patient_id: pData.patient_id,
          id: pData.uhid,
          queueNo: "01",
          title: pData.title || "Mr",
          name: pData.name,
          phone: String(pData.number || ""),
          gender: pData.gender || "Male",
          age: pData.age || 25,
          ageUnit: pData.age_unit || "Year",
          dob: pData.dob || "",
          permanentAddress: pData.address || "",
          localAddress: pData.local_address || "",
          statusTags: ["Ongoing"],
          billAmount: 0,
          paymentMethod: "Cash",
          isAbhaCreated: false,
          customTags: [],
          isCompleted: false,
          isOngoing: true,
          arrivalTime: "",
          arrivalMinutesAgo: 0,
          opdRegistration: {
            clinic_name: regData.clinic_name || "",
            treating_doctor: regData.treating_doctor || "",
            referring_doctor: regData.referring_doctor || ""
          }
        };

        setCurrentRxPatient(mappedPatient);

        // Fetch Header Counts
        const { count: pastCount } = await supabase
          .from("aka_opd_registration")
          .select("*", { count: "exact", head: true })
          .eq("patient_uhid", pData.uhid)
          .neq("registration_id", Number(rxPatientId))
          .or("is_deleted.is.null,is_deleted.eq.false");

        if (pastCount !== null) {
          setPastVisitsCount(pastCount);
        }

        const { count: legacyCount } = await supabase
          .from("legacy_patients")
          .select("*", { count: "exact", head: true })
          .or(`name.ilike.*${pData.name}*,phone.ilike.*${pData.number}*`)
          .not("prescription_url", "is", null);

        if (legacyCount !== null) {
          setLegacyVisitsCount(legacyCount);
        }



        // Fetch Certificate configuration settings
        const { data: configData } = await supabase
          .from("aka_setting")
          .select("metadata")
          .eq("setting_key", "medical_certificate_settings")
          .maybeSingle();

        if (configData && configData.metadata) {
          const m = configData.metadata;
          setPrintShowHeader(m.showHeader ?? false);
          setPrintShowFooter(m.showFooter ?? true);
          setPrintHeaderHeight(m.headerHeight ?? 65);
          setPrintFooterHeight(m.footerHeight ?? 29);
          setPrintShowLetterhead(m.showLetterhead ?? true);
        }

        // Fetch Issued Certificates list
        const { data: certs } = await supabase
          .from("aka_medical_certificate")
          .select("*")
          .eq("patient_uhid", pData.uhid)
          .order("created_at", { ascending: false });

        setIssuedCertificates(certs || []);

      } catch (err: any) {
        console.error("Error loading certificate page data:", err);
        showToast("Error loading page details.", "error");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sessionLoaded, rxPatientId]);

  // Load and Refresh PDF Preview dynamically
  useEffect(() => {
    if (!currentRxPatient) return;

    let active = true;
    const generatePreview = async () => {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Background Letterhead
      let letterheadBase64 = "";
      if (printShowLetterhead) {
        try {
          const res = await fetch("/letterhead.jpg");
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            let binary = "";
            const bytes = new Uint8Array(buffer);
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            letterheadBase64 = window.btoa(binary);
          }
        } catch (e) {
          console.error("Letterhead image failed to load:", e);
        }
      }

      if (printShowLetterhead && letterheadBase64) {
        doc.addImage(letterheadBase64, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      // Load Font File VFS for Poppins
      let fontName = "helvetica";
      try {
        const [regRes, boldRes] = await Promise.all([
          fetch("https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/poppins/Poppins-Regular.ttf").then(res => res.arrayBuffer()),
          fetch("https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/poppins/Poppins-Bold.ttf").then(res => res.arrayBuffer())
        ]);
        const toBase64 = (buffer: ArrayBuffer) => {
          let binary = "";
          const bytes = new Uint8Array(buffer);
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return window.btoa(binary);
        };
        doc.addFileToVFS("Poppins-Regular.ttf", toBase64(regRes));
        doc.addFont("Poppins-Regular.ttf", "Poppins", "normal");
        doc.addFileToVFS("Poppins-Bold.ttf", toBase64(boldRes));
        doc.addFont("Poppins-Bold.ttf", "Poppins", "bold");
        fontName = "Poppins";
      } catch (e) {
        console.error("Failed to load Poppins fonts:", e);
      }

      // Draw header patient info card
      let y = printHeaderHeight + 5;

      // Outer Frame
      doc.setDrawColor(226, 232, 240).setLineWidth(0.4);
      doc.rect(18, y - 2, 174, 18);

      // Patient Name
      doc.setFont(fontName, "bold").setFontSize(9.5).setTextColor(17, 24, 39);
      doc.text(`Patient Name: ${currentRxPatient.name}`, 22, y + 4);
      doc.text(`Age/Sex: ${currentRxPatient.age} ${currentRxPatient.ageUnit} / ${currentRxPatient.gender}`, 125, y + 4);

      // Patient details line 2
      y += 6;
      doc.text(`UHID: ${currentRxPatient.id}`, 22, y + 4);
      const docName = currentRxPatient.opdRegistration?.treating_doctor || "Doctor";
      doc.text(`Treating Doctor: Dr. ${docName}`, 125, y + 4);

      // Date issued
      y += 18;
      doc.setFont(fontName, "bold").setFontSize(10).setTextColor(75, 85, 99);
      const dateText = `Date: ${new Date().toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}`;
      doc.text(dateText, 190 - doc.getTextWidth(dateText), y);

      // Certificate Title Header
      y += 15;
      doc.setFont(fontName, "bold").setFontSize(15).setTextColor(99, 102, 241);
      const titleText = certificateTitle.trim().toUpperCase();
      const tWidth = doc.getTextWidth(titleText);
      doc.text(titleText, 105, y, { align: "center" });

      // Title underline
      doc.setDrawColor(99, 102, 241).setLineWidth(0.6);
      doc.line(105 - tWidth / 2, y + 2, 105 + tWidth / 2, y + 2);

      // Certificate Body Text
      y += 20;
      doc.setFont(fontName, "normal").setFontSize(11).setTextColor(51, 65, 85);
      const textLines = doc.splitTextToSize(certificateBody, 170);
      doc.text(textLines, 20, y);



      if (active) {
        const url = URL.createObjectURL(doc.output("blob"));
        setPreviewUrl(url);
      }
    };

    generatePreview();

    return () => {
      active = false;
    };
  }, [
    currentRxPatient,
    certificateTitle,
    certificateBody,
    printShowHeader,
    printShowFooter,
    printHeaderHeight,
    printFooterHeight,
    printShowLetterhead
  ]);

  // Save Settings configuration
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const { error } = await supabase
        .from("aka_setting")
        .upsert({
          setting_key: "medical_certificate_settings",
          metadata: {
            showHeader: printShowHeader,
            showFooter: printShowFooter,
            headerHeight: printHeaderHeight,
            footerHeight: printFooterHeight,
            showLetterhead: printShowLetterhead,
            // Fallback counterparts
            showHeaderPage2: printShowHeader,
            showFooterPage2: printShowFooter,
            headerHeightPage2: printHeaderHeight,
            footerHeightPage2: printFooterHeight,
            showLetterheadPage2: printShowLetterhead
          }
        }, { onConflict: "setting_key" });

      if (error) throw error;
      showToast("Certificate layout configuration saved successfully!", "success");
    } catch (e: any) {
      console.error(e);
      showToast(`Failed to save settings: ${e.message || "DB Error"}`, "error");
    } finally {
      setSavingSettings(false);
    }
  };

  // Issue Certificate & Insert in Database
  const handleIssueCertificate = async () => {
    if (!currentRxPatient) return;
    if (!certificateTitle.trim()) {
      showToast("Please enter a certificate title.", "error");
      return;
    }
    if (!certificateBody.trim()) {
      showToast("Please enter the certificate content.", "error");
      return;
    }

    try {
      setIssuing(true);
      const { error } = await supabase
        .from("aka_medical_certificate")
        .insert({
          registration_id: rxPatientId ? Number(rxPatientId) : null,
          patient_uhid: currentRxPatient.id,
          title: certificateTitle,
          content: certificateBody
        });

      if (error) throw error;

      showToast("Medical certificate issued successfully!", "success");

      // Generate PDF & Open in New Tab immediately
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const docName = currentRxPatient.opdRegistration?.treating_doctor || "Doctor";

      // Setup Header Card
      let y = printHeaderHeight + 5;
      doc.setDrawColor(226, 232, 240).setLineWidth(0.4);
      doc.rect(18, y - 2, 174, 18);

      doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(17, 24, 39);
      doc.text(`Patient Name: ${currentRxPatient.name}`, 22, y + 4);
      doc.text(`Age/Sex: ${currentRxPatient.age} ${currentRxPatient.ageUnit} / ${currentRxPatient.gender}`, 125, y + 4);

      y += 6;
      doc.text(`UHID: ${currentRxPatient.id}`, 22, y + 4);
      doc.text(`Treating Doctor: Dr. ${docName}`, 125, y + 4);

      // Date
      y += 18;
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(75, 85, 99);
      const formattedDate = `Date: ${new Date().toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}`;
      doc.text(formattedDate, 190 - doc.getTextWidth(formattedDate), y);

      // Title
      y += 15;
      doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(99, 102, 241);
      const titleText = certificateTitle.toUpperCase();
      const tWidth = doc.getTextWidth(titleText);
      doc.text(titleText, 105, y, { align: "center" });
      doc.setDrawColor(99, 102, 241).setLineWidth(0.6);
      doc.line(105 - tWidth / 2, y + 2, 105 + tWidth / 2, y + 2);

      // Body
      y += 20;
      doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(51, 65, 85);
      const textLines = doc.splitTextToSize(certificateBody, 170);
      doc.text(textLines, 20, y);

      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");

      // Reload certificate history
      const { data: certs } = await supabase
        .from("aka_medical_certificate")
        .select("*")
        .eq("patient_uhid", currentRxPatient.id)
        .order("created_at", { ascending: false });

      setIssuedCertificates(certs || []);
    } catch (e: any) {
      console.error(e);
      showToast(`Failed to issue certificate: ${e.message || "DB Error"}`, "error");
    } finally {
      setIssuing(false);
    }
  };

  const handleDeleteCertificate = async (certId: number) => {
    if (!confirm("Are you sure you want to delete this certificate record?")) return;

    try {
      const { error } = await supabase
        .from("aka_medical_certificate")
        .delete()
        .eq("certificate_id", certId);

      if (error) throw error;
      showToast("Certificate record deleted.", "success");
      setIssuedCertificates(prev => prev.filter(c => c.certificate_id !== certId));
    } catch (e: any) {
      console.error(e);
      showToast("Failed to delete certificate record.", "error");
    }
  };

  const handlePrintPastCertificate = (cert: IssuedCertificate) => {
    if (!currentRxPatient) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const docName = currentRxPatient.opdRegistration?.treating_doctor || "Doctor";

    // Setup Header Card
    let y = printHeaderHeight + 5;
    doc.setDrawColor(226, 232, 240).setLineWidth(0.4);
    doc.rect(18, y - 2, 174, 18);

    doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(17, 24, 39);
    doc.text(`Patient Name: ${currentRxPatient.name}`, 22, y + 4);
    doc.text(`Age/Sex: ${currentRxPatient.age} ${currentRxPatient.ageUnit} / ${currentRxPatient.gender}`, 125, y + 4);

    y += 6;
    doc.text(`UHID: ${currentRxPatient.id}`, 22, y + 4);
    doc.text(`Treating Doctor: Dr. ${docName}`, 125, y + 4);

    // Date
    y += 18;
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(75, 85, 99);
    const formattedDate = `Date: ${new Date(cert.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}`;
    doc.text(formattedDate, 190 - doc.getTextWidth(formattedDate), y);

    // Title
    y += 15;
    doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(99, 102, 241);
    const titleText = cert.title.toUpperCase();
    const tWidth = doc.getTextWidth(titleText);
    doc.text(titleText, 105, y, { align: "center" });
    doc.setDrawColor(99, 102, 241).setLineWidth(0.6);
    doc.line(105 - tWidth / 2, y + 2, 105 + tWidth / 2, y + 2);

    // Body
    y += 20;
    doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(51, 65, 85);
    const textLines = doc.splitTextToSize(cert.content, 170);
    doc.text(textLines, 20, y);

    // Convert to blob and open in new window
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-primary" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
          </svg>
          <span className="text-[12px] font-bold text-slate-500">Loading certificate configuration...</span>
        </div>
      </div>
    );
  }

  if (!currentRxPatient) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-[12px] font-bold text-slate-500">No active patient session found.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F6F8]">
      {toast && <CustomToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* HEADER BAR */}
      <header className="h-12 bg-white border-b border-[#E2E8F0] px-4 flex items-center justify-between shrink-0 shadow-2xs z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-1 hover:bg-[#E2E8F0] rounded-md text-[#718096] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-[14px] font-extrabold text-[#111827]">{currentRxPatient.name}</span>
          <span className="px-2 py-0.5 bg-[#F1F5F9] text-[9.5px] font-extrabold rounded-md text-[#475569]">{currentRxPatient.gender} / {currentRxPatient.age} {currentRxPatient.ageUnit}</span>
          <span className="text-[10px] text-slate-400 font-bold">UHID: {currentRxPatient.id}</span>
        </div>

        {/* Navigation tab bar in the center */}
        <div className="flex items-center h-full">
          <button 
            onClick={() => router.push(`/rx/overview?rx=${rxPatientId}`)}
            className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground transition-all"
          >
            Overview {pastVisitsCount > 0 ? `(${pastVisitsCount})` : `(0)`}
          </button>
          <button
            onClick={() => router.push(`/rx?rx=${rxPatientId}`)}
            className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground transition-all"
          >
            Pad
          </button>
          <button 
            onClick={() => router.push(`/rx/ekacare?rx=${rxPatientId}`)}
            className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground transition-all"
          >
            EkaCare Old Data{legacyVisitsCount > 0 ? ` (${legacyVisitsCount} found)` : ""}
          </button>
          <button className="h-full px-3 text-[11px] font-bold text-primary border-b-2 border-primary">
            Medical Certificate
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-emerald-600 bg-emerald-50 text-[10px] font-extrabold rounded-md flex items-center gap-1 border border-emerald-100">
            🟢 Active Session
          </span>
        </div>
      </header>

      {/* THREE-COLUMN WORKSPACE */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        
        {/* COLUMN 1: Certificate Layout Margin Adjustments */}
        <aside className="w-[280px] bg-white border-r border-[#E2E8F0] p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-5">
            <div>
              <h2 className="text-[12px] font-bold text-[#111827] uppercase tracking-wider mb-3">Layout Margins</h2>
              <div className="space-y-4">
                {/* Header Height */}
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span>Header Margin (mm)</span>
                    <span className="text-primary">{printHeaderHeight}mm</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    value={printHeaderHeight}
                    onChange={(e) => setPrintHeaderHeight(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Footer Height */}
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span>Footer Margin (mm)</span>
                    <span className="text-primary">{printFooterHeight}mm</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={printFooterHeight}
                    onChange={(e) => setPrintFooterHeight(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Print settings switches */}
            <div>
              <h2 className="text-[12px] font-bold text-[#111827] uppercase tracking-wider mb-3">Print Configuration</h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[11.5px] font-bold text-slate-700">With Letterhead Background</span>
                  <input
                    type="checkbox"
                    checked={printShowLetterhead}
                    onChange={(e) => setPrintShowLetterhead(e.target.checked)}
                    className="rounded text-primary border-slate-300 w-4 h-4 cursor-pointer focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[11.5px] font-bold text-slate-700">Show Header Block</span>
                  <input
                    type="checkbox"
                    checked={printShowHeader}
                    onChange={(e) => setPrintShowHeader(e.target.checked)}
                    className="rounded text-primary border-slate-300 w-4 h-4 cursor-pointer focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[11.5px] font-bold text-slate-700">Show Footer Block</span>
                  <input
                    type="checkbox"
                    checked={printShowFooter}
                    onChange={(e) => setPrintShowFooter(e.target.checked)}
                    className="rounded text-primary border-slate-300 w-4 h-4 cursor-pointer focus:ring-0"
                  />
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="w-full py-2 bg-[#F1F5F9] border border-[#CBD5E1] hover:bg-slate-100 text-slate-700 text-[11px] font-extrabold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors mt-6 shadow-2xs"
          >
            {savingSettings ? "Saving Settings..." : "💾 Save Layout Configuration"}
          </button>
        </aside>

        {/* COLUMN 2: Editor Inputs and History */}
        <section className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">
          {/* Certificate Creator Form */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-2xs space-y-4">
            <h2 className="text-[13px] font-extrabold text-[#111827] uppercase tracking-wider">Issue Certificate</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Certificate Header Title*</label>
                <input
                  type="text"
                  value={certificateTitle}
                  onChange={(e) => setCertificateTitle(e.target.value)}
                  placeholder="e.g. MEDICAL CERTIFICATE"
                  className="w-full px-3 py-2 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[12px] font-semibold text-[#1E293B] placeholder:text-[#A0AEC0] focus:outline-none transition-all"
                />
              </div>


              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Certificate Body Content*</label>
                <textarea
                  rows={8}
                  value={certificateBody}
                  onChange={(e) => setCertificateBody(e.target.value)}
                  placeholder="Type the certificate details..."
                  className="w-full p-3 border border-[#E2E8F0] focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg text-[12px] font-semibold text-[#1E293B] placeholder:text-[#A0AEC0] focus:outline-none transition-all resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleIssueCertificate}
              disabled={issuing}
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer transition-all"
            >
              {issuing ? "Issuing..." : "📜 Issue & Record Certificate"}
            </button>
          </div>

          {/* Certificate History */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-2xs flex-1 flex flex-col min-h-[300px]">
            <h2 className="text-[13px] font-extrabold text-[#111827] uppercase tracking-wider mb-3">Issued Certificate History</h2>
            
            {issuedCertificates.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[11.5px] text-slate-400 italic">
                No certificate history recorded for this patient.
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
                {issuedCertificates.map((cert) => (
                  <div key={cert.certificate_id} className="p-3 border border-[#F1F5F9] bg-[#FAFAFC] rounded-lg flex items-center justify-between gap-3 shadow-2xs hover:border-slate-200 transition-all">
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-slate-800 truncate">{cert.title || "Untitled Certificate"}</div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        Issued: {new Date(cert.created_at).toLocaleString("en-IN", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[10.5px] text-slate-500 font-medium line-clamp-1 mt-1">
                        {(() => {
                          try {
                            const parsed = JSON.parse(cert.content);
                            return parsed.text || cert.content;
                          } catch (e) {
                            return cert.content;
                          }
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handlePrintPastCertificate(cert)}
                        className="p-1.5 bg-white border border-[#CBD5E1] hover:bg-indigo-50 hover:text-indigo-650 rounded-lg text-[10px] font-bold text-slate-600 cursor-pointer shadow-2xs transition-colors"
                        title="Print Certificate"
                      >
                        🖨️ Print
                      </button>
                      <button
                        onClick={() => handleDeleteCertificate(cert.certificate_id)}
                        className="p-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-bold cursor-pointer shadow-2xs transition-colors"
                        title="Delete Record"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* COLUMN 3: Live PDF Preview Frame */}
        <section className="w-[45%] bg-white border-l border-[#E2E8F0] p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h2 className="text-[12px] font-bold text-[#111827] uppercase tracking-wider">Live Certificate Preview</h2>
            <span className="text-[9.5px] font-extrabold text-slate-400">Standard A4 Layout</span>
          </div>

          <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden border border-[#E5E7EB] relative">
            {previewUrl ? (
              <iframe
                src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                className="w-full h-full"
                title="Medical Certificate Preview"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[12px] text-slate-400 italic">
                Generating preview document...
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function CertificatePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-[12px] font-bold text-slate-500">Loading certificate components...</div>
      </div>
    }>
      <CertificatePageContent />
    </Suspense>
  );
}
