"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, getUserRole } from "@/lib/supabase";
import PrintPrescription from "@/components/PrintPrescription";

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
    registration_id: string;
    appointment_date_time?: string;
    clinic_name?: string;
    treating_doctor?: string;
    visit_category?: string;
    referring_doctor?: string;
    discount_amount?: number;
    services?: Array<{ id: string; name: string; fee: number }>;
    payments?: Array<{ id: string; mode: string; amount: number }>;
  };
  vitals?: {
    bp?: string;
    pulse?: string;
    temp?: string;
    weight?: string;
    spo2?: string;
    sugar?: string;
    height?: string;
    bmi?: string;
    respRate?: string;
    egfrScore?: string;
    cvdRisk?: string;
    crclScore?: string;
    qriskScore?: string;
    bsaScore?: string;
  };
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

function OverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rxPatientId = searchParams.get("rx") || "";

  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRxPatient, setCurrentRxPatient] = useState<Patient | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [legacyVisitsCount, setLegacyVisitsCount] = useState<number>(0);

  const fetchLegacyCount = async (name: string, phone: any) => {
    if (!name && !phone) return;
    try {
      const cleanPhone = String(phone || "").replace(/\D/g, "");
      let query = supabase.from("legacy_patients").select("*", { count: "exact", head: true });
      
      let orClause = "";
      if (name) orClause += `name.ilike.*${name.trim()}*`;
      if (cleanPhone) {
        if (orClause) orClause += ",";
        orClause += `phone.ilike.*${cleanPhone}*`;
      }
      
      if (orClause) {
        query = query.or(orClause);
      }
      
      const { count, error } = await query;
      if (!error && count !== null) {
        setLegacyVisitsCount(count);
      }
    } catch (e) {
      console.error("Error fetching legacy count:", e);
    }
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

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };
  
  // Historical data states
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [symptoms, setSymptoms] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  
  // Patient-level medical history
  const [medicalHistory, setMedicalHistory] = useState<any>(null);

  // Search filter for lab results
  const [labSearchQuery, setLabSearchQuery] = useState("");

  // PrintPrescription specific states & ref
  const printRef = useRef<any>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const visitsScrollRef = useRef<HTMLDivElement>(null);
  const [activePrintData, setActivePrintData] = useState<any>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [lastActiveId, setLastActiveId] = useState<any>(null);

  if (activePrintData && activePrintData.registration_id !== lastActiveId) {
    setLastActiveId(activePrintData.registration_id);
    setPreviewBlobUrl(null);
  }

  const scrollVisits = (direction: "left" | "right") => {
    if (visitsScrollRef.current) {
      const scrollAmount = 360;
      visitsScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  // Print settings loaded from aka_setting
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

  useEffect(() => {
    if (!sessionLoaded) return;
    const loadPrintSettings = async () => {
      try {
        const { data } = await supabase
          .from("aka_setting")
          .select("metadata")
          .eq("setting_key", "prescription_settings")
          .maybeSingle();
        if (data && data.metadata) {
          const meta = data.metadata;
          if (meta.showLetterhead !== undefined) setPrintShowLetterhead(meta.showLetterhead);
          if (meta.showHeader !== undefined) setPrintShowHeader(meta.showHeader);
          if (meta.showFooter !== undefined) setPrintShowFooter(meta.showFooter);
          if (meta.headerHeight !== undefined) setPrintHeaderHeight(meta.headerHeight);
          if (meta.footerHeight !== undefined) setPrintFooterHeight(meta.footerHeight);

          if (meta.showLetterheadPage2 !== undefined) setPrintShowLetterheadPage2(meta.showLetterheadPage2);
          if (meta.showHeaderPage2 !== undefined) setPrintShowHeaderPage2(meta.showHeaderPage2);
          if (meta.showFooterPage2 !== undefined) setPrintShowFooterPage2(meta.showFooterPage2);
          if (meta.headerHeightPage2 !== undefined) setPrintHeaderHeightPage2(meta.headerHeightPage2);
          if (meta.footerHeightPage2 !== undefined) setPrintFooterHeightPage2(meta.footerHeightPage2);
        }
      } catch (e) {
        console.error("Failed to load prescription settings from DB:", e);
      }
    };
    loadPrintSettings();
  }, [sessionLoaded]);

  const loadAllHistory = async (patientUhid: string) => {
    try {
      setHistoryLoaded(false);
      // 1. Fetch all patient registrations
      const { data: regs, error: regErr } = await supabase
        .from("aka_opd_registration")
        .select("*")
        .eq("patient_uhid", patientUhid)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .order("appointment_date_time", { ascending: false });

      if (regErr) throw regErr;

      const regIds = regs?.map((r) => r.registration_id) || [];
      if (regIds.length === 0) {
        setSymptoms([]);
        setDiagnoses([]);
        setMedications([]);
        setLabs([]);
        setProcedures([]);
        setReferrals([]);
        setLabResults([]);
        setMedicalHistory(null);
        setRegistrations([]);
        setHistoryLoaded(true);
        return;
      }

      // Fetch all parameters concurrently
      const [symsRes, diagsRes, medsRes, labsRes, procsRes, refsRes, resultsRes, historyRes] = await Promise.all([
        supabase.from("aka_symptoms").select("*").in("registration_id", regIds),
        supabase.from("aka_diagnoses").select("*").in("registration_id", regIds),
        supabase.from("aka_patient_medications").select(`
          *,
          medicine:medicine_id (
            name,
            salt_composition,
            short_composition1,
            type
          )
        `).in("registration_id", regIds),
        supabase.from("aka_patient_labs").select("*").in("registration_id", regIds),
        supabase.from("aka_procedure").select("*").in("registration_id", regIds),
        supabase.from("aka_refer_to").select("*").in("registration_id", regIds),
        supabase.from("aka_lab_result").select("*").in("registration_id", regIds),
        supabase.from("aka_patient_medical_history").select("*").eq("patient_uhid", patientUhid).maybeSingle()
      ]);

      setSymptoms(symsRes.data || []);
      setDiagnoses(diagsRes.data || []);
      setMedications(medsRes.data || []);
      setLabs(labsRes.data || []);
      setProcedures(procsRes.data || []);
      setReferrals(refsRes.data || []);
      setLabResults(resultsRes.data || []);
      setMedicalHistory(historyRes.data || null);

      setRegistrations(regs || []);
      setHistoryLoaded(true);
    } catch (err) {
      console.error("Error loading patient history:", err);
      setHistoryLoaded(true);
    }
  };

  useEffect(() => {
    if (!sessionLoaded) return;
    if (!rxPatientId) return;

    const loadInitialPatient = async () => {
      try {
        setLoading(true);
        // Fetch OPD registration details first
        const { data: regData, error: rError } = await supabase
          .from("aka_opd_registration")
          .select("*")
          .eq("registration_id", rxPatientId)
          .maybeSingle();

        if (rError) throw rError;
        if (!regData) {
          setCurrentRxPatient(null);
          setLoading(false);
          return;
        }

        const patientUhid = regData.patient_uhid;

        // Fetch patient details using the UHID from the registration
        const { data: pData, error: pError } = await supabase
          .from("patient_detail")
          .select("*")
          .eq("uhid", patientUhid)
          .maybeSingle();

        if (pError) throw pError;
        if (!pData) {
          setCurrentRxPatient(null);
          setLoading(false);
          return;
        }

        // Map registration services & payments to compute amount
        const billAmt = regData?.services 
          ? regData.services.reduce((acc: number, s: any) => acc + (Number(s.fee) || 0), 0)
          : 0;

        const paymentsList = regData?.payments && Array.isArray(regData.payments) ? regData.payments : [];
        const modesWithAmount: string[] = paymentsList.filter((p: any) => (p.amount || 0) > 0).map((p: any) => String(p.mode));
        const uniqueModes: string[] = Array.from(new Set(modesWithAmount.length > 0 ? modesWithAmount : paymentsList.map((p: any) => String(p.mode))));
        let pMethod = "Cash";
        if (uniqueModes.includes("Cash") && uniqueModes.includes("Online")) {
          pMethod = "Cash + Online";
        } else if (uniqueModes.length > 0) {
          pMethod = uniqueModes[0];
        }

        const mappedPatient: Patient = {
          patient_id: pData.patient_id,
          id: pData.uhid,
          queueNo: "01",
          title: pData.title || "Mr",
          name: pData.name,
          phoneDialCode: "+91",
          phone: String(pData.number || ""),
          gender: pData.gender || "Male",
          age: pData.age || 25,
          ageUnit: pData.age_unit || "Year",
          dob: pData.dob || "",
          permanentAddress: pData.address || "",
          localAddress: pData.local_address || "",
          country: pData.country || "India",
          state: pData.state || "Maharashtra",
          statusTags: ["Ongoing"],
          billAmount: billAmt,
          paymentMethod: pMethod,
          isAbhaCreated: false,
          customTags: [],
          isCompleted: false,
          isOngoing: true,
          arrivalTime: regData?.created_at
            ? new Date(regData.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "",
          arrivalMinutesAgo: 0,
          vitals: {
            bp: regData?.bp || "",
            pulse: regData?.pulse || "",
            weight: regData?.weight || "",
            spo2: regData?.spo2 || "",
            sugar: regData?.sugar || "",
          },
          opdRegistration: regData ? {
            registration_id: regData.registration_id,
            appointment_date_time: regData.appointment_date_time,
            clinic_name: regData.clinic_name,
            treating_doctor: regData.treating_doctor,
            visit_category: regData.visit_category,
            referring_doctor: regData.referring_doctor,
            discount_amount: regData.discount_amount,
            services: regData.services,
            payments: regData.payments
          } : undefined
        };

        setCurrentRxPatient(mappedPatient);
        fetchLegacyCount(pData.name || "", pData.number || "");
        await loadAllHistory(patientUhid);
      } catch (err) {
        console.error("Failed to load initial overview data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialPatient();
  }, [rxPatientId, sessionLoaded]);

  // ─── REASSIGN SINGLE ITEMS TO TODAY'S VISIT ───────────────────────
  const reassignSymptom = async (sym: any) => {
    try {
      const { error } = await supabase.from("aka_symptoms").insert({
        registration_id: Number(rxPatientId),
        name: sym.name,
        duration: sym.duration || "",
        severity: sym.severity || "",
        note: sym.note || ""
      });
      if (error) throw error;
      showToast(`Symptom "${sym.name}" reassigned successfully!`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to reassign symptom.", "error");
    }
  };

  const reassignDiagnosis = async (diag: any) => {
    try {
      const { error } = await supabase.from("aka_diagnoses").insert({
        registration_id: Number(rxPatientId),
        name: diag.name,
        since: diag.since || diag.duration || "",
        status: diag.status || "",
        severity: diag.severity || "",
        abdominal_regions: diag.abdominal_regions || [],
        pain_types: diag.pain_types || [],
        relieved_by: diag.relieved_by || [],
        abdominal_tenderness: diag.abdominal_tenderness || "",
        palpations: diag.palpations || [],
        auscultations: diag.auscultations || [],
        clinical_course: diag.clinical_course || "",
        note: diag.note || ""
      });
      if (error) throw error;
      showToast(`Diagnosis "${diag.name}" reassigned successfully!`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to reassign diagnosis.", "error");
    }
  };

  const reassignMedication = async (med: any) => {
    try {
      const { error } = await supabase.from("aka_patient_medications").insert({
        registration_id: Number(rxPatientId),
        medicine_id: med.medicine_id,
        dose: med.dose || med.dosage || "",
        freq: med.freq || med.frequency || "",
        timing: med.timing || med.instruction || "",
        duration: med.duration || "",
        start_from: med.start_from || new Date().toISOString().split("T")[0],
        instruction: med.instruction || med.timing || med.instr || ""
      });
      if (error) throw error;
      showToast("Medication reassigned successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to reassign medication.", "error");
    }
  };

  const reassignAllMedications = async (visitRegId: number) => {
    try {
      const visitMedications = medications.filter((m) => m.registration_id === visitRegId);
      if (visitMedications.length === 0) {
        showToast("No medications found in this past visit.", "info");
        return;
      }
      for (const med of visitMedications) {
        await supabase.from("aka_patient_medications").insert({
          registration_id: Number(rxPatientId),
          medicine_id: med.medicine_id,
          dose: med.dose || med.dosage || "",
          freq: med.freq || med.frequency || "",
          timing: med.timing || med.instruction || "",
          duration: med.duration || "",
          start_from: med.start_from || new Date().toISOString().split("T")[0],
          instruction: med.instruction || med.timing || med.instr || ""
        });
      }
      showToast("All medications reassigned successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to reassign medications.", "error");
    }
  };

  const reassignLab = async (lab: any) => {
    try {
      const { error } = await supabase.from("aka_patient_labs").insert({
        registration_id: Number(rxPatientId),
        name: lab.name,
        test_on: lab.test_on || lab.testOn || "",
        repeat_on: lab.repeat_on || lab.repeatOn || "",
        remarks: lab.remarks || ""
      });
      if (error) throw error;
      showToast(`Lab test "${lab.name}" reassigned successfully!`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to reassign lab test.", "error");
    }
  };

  const reassignProcedure = async (proc: any) => {
    try {
      const { error } = await supabase.from("aka_procedure").insert({
        registration_id: Number(rxPatientId),
        patient_uhid: currentRxPatient!.id,
        name: proc.name,
        duration: proc.duration || "",
        note: proc.note || ""
      });
      if (error) throw error;
      showToast(`Procedure "${proc.name}" reassigned successfully!`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to reassign procedure.", "error");
    }
  };

  const reassignReferral = async (ref: any) => {
    try {
      const { error } = await supabase.from("aka_refer_to").insert({
        registration_id: Number(rxPatientId),
        patient_uhid: currentRxPatient!.id,
        doctor_name: ref.doctor_name,
        notes: ref.notes || ""
      });
      if (error) throw error;
      showToast(`Referral to "${ref.doctor_name}" reassigned successfully!`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to reassign referral.", "error");
    }
  };

  const reassignAdvice = async (adviceText: string, rest: boolean, water: boolean) => {
    try {
      const { error } = await supabase
        .from("aka_opd_registration")
        .update({
          advice: adviceText,
          advice_rest: rest,
          advice_water: water
        })
        .eq("registration_id", Number(rxPatientId));
      if (error) throw error;
      showToast("Advices reassigned successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to reassign advices.", "error");
    }
  };

  // ─── REASSIGN FULL VISIT ──────────────────────────────────────────
  const reassignFullVisit = async (visitRegId: number) => {
    try {
      const visitSymptoms = symptoms.filter((s) => s.registration_id === visitRegId);
      const visitDiagnoses = diagnoses.filter((d) => d.registration_id === visitRegId);
      const visitMedications = medications.filter((m) => m.registration_id === visitRegId);
      const visitLabs = labs.filter((l) => l.registration_id === visitRegId);
      const visitProcedures = procedures.filter((p) => p.registration_id === visitRegId);
      const visitReferrals = referrals.filter((r) => r.registration_id === visitRegId);
      const visitRegObj = registrations.find((r) => r.registration_id === visitRegId);

      // Reassign Symptoms
      for (const sym of visitSymptoms) {
        await supabase.from("aka_symptoms").insert({
          registration_id: Number(rxPatientId),
          name: sym.name,
          duration: sym.duration || "",
          severity: sym.severity || "",
          note: sym.note || ""
        });
      }

      // Reassign Diagnoses
      for (const diag of visitDiagnoses) {
        await supabase.from("aka_diagnoses").insert({
          registration_id: Number(rxPatientId),
          name: diag.name,
          since: diag.since || diag.duration || "",
          status: diag.status || "",
          severity: diag.severity || "",
          abdominal_regions: diag.abdominal_regions || [],
          pain_types: diag.pain_types || [],
          relieved_by: diag.relieved_by || [],
          abdominal_tenderness: diag.abdominal_tenderness || "",
          palpations: diag.palpations || [],
          auscultations: diag.auscultations || [],
          clinical_course: diag.clinical_course || "",
          note: diag.note || ""
        });
      }

      // Reassign Medications
      for (const med of visitMedications) {
        await supabase.from("aka_patient_medications").insert({
          registration_id: Number(rxPatientId),
          medicine_id: med.medicine_id,
          dose: med.dose || med.dosage || "",
          freq: med.freq || med.frequency || "",
          timing: med.timing || med.instruction || "",
          duration: med.duration || "",
          start_from: med.start_from || new Date().toISOString().split("T")[0],
          instruction: med.instruction || med.timing || med.instr || ""
        });
      }

      // Reassign Labs
      for (const lab of visitLabs) {
        await supabase.from("aka_patient_labs").insert({
          registration_id: Number(rxPatientId),
          name: lab.name,
          test_on: lab.test_on || lab.testOn || "",
          repeat_on: lab.repeat_on || lab.repeatOn || "",
          remarks: lab.remarks || ""
        });
      }

      // Reassign Procedures
      for (const proc of visitProcedures) {
        await supabase.from("aka_procedure").insert({
          registration_id: Number(rxPatientId),
          patient_uhid: currentRxPatient!.id,
          name: proc.name,
          duration: proc.duration || "",
          note: proc.note || ""
        });
      }

      // Reassign Referrals
      for (const ref of visitReferrals) {
        await supabase.from("aka_refer_to").insert({
          registration_id: Number(rxPatientId),
          patient_uhid: currentRxPatient!.id,
          doctor_name: ref.doctor_name,
          notes: ref.notes || ""
        });
      }

      // Reassign Advices
      if (visitRegObj) {
        await supabase.from("aka_opd_registration").update({
          advice: visitRegObj.advice || "",
          advice_rest: visitRegObj.advice_rest || false,
          advice_water: visitRegObj.advice_water || false
        }).eq("registration_id", Number(rxPatientId));
      }

      showToast("Entire visit details reassigned successfully!", "success");
    } catch (err) {
      console.error("Failed to reassign full visit:", err);
      showToast("An error occurred during visit reassignment.", "error");
    }
  };

  // ─── PDF PRINT POPUP BLOB GENERATION ──────────────────────────────
  const handlePrintPastVisit = (reg: any) => {
    const regSyms = symptoms.filter((s) => s.registration_id === reg.registration_id);
    const regDiags = diagnoses.filter((d) => d.registration_id === reg.registration_id);
    const regMeds = medications.filter((m) => m.registration_id === reg.registration_id);
    const regLabs = labs.filter((l) => l.registration_id === reg.registration_id);
    const regProcs = procedures.filter((p) => p.registration_id === reg.registration_id);
    const regRefs = referrals.filter((r) => r.registration_id === reg.registration_id);
    const regResults = labResults.filter((r) => r.registration_id === reg.registration_id);

    const mappedSyms = regSyms.map(s => ({
      id: String(s.symptom_id),
      name: s.name,
      duration: s.duration,
      severity: s.severity,
      note: s.note
    }));

    const mappedDiags = regDiags.map(d => ({
      id: String(d.diagnosis_id),
      name: d.name,
      since: d.since,
      status: d.status,
      severity: d.severity,
      abdominalRegions: d.abdominal_regions || [],
      painTypes: d.pain_types || [],
      relievedBy: d.relieved_by || [],
      abdominalTenderness: d.abdominal_tenderness,
      palpations: d.palpations || [],
      auscultations: d.auscultations || [],
      clinicalCourse: d.clinical_course,
      note: d.note
    }));

    const mappedMeds = regMeds.map(m => ({
      id: String(m.patient_medication_id),
      name: m.name || m.medicine?.name || "",
      generic: m.generic || m.medicine?.salt_composition || m.medicine?.short_composition1 || "",
      form: m.form || m.medicine?.type?.toLowerCase() || "tablet",
      dose: m.dosage || m.dose || "",
      freq: m.frequency || m.freq || "",
      timing: m.instruction || m.timing || "",
      duration: m.duration || "",
      instr: m.instruction || m.timing || ""
    }));

    const mappedLabs = regLabs.map(l => ({
      id: String(l.patient_lab_id),
      name: l.name
    }));

    const mappedResults = regResults.map(r => ({
      id: String(r.lab_result_id),
      name: r.name,
      unit: r.unit || "",
      reading: r.reading || "",
      interpretation: r.interpretation || "",
      date: r.result_date || "",
      notes: r.notes || ""
    }));

    const mappedProcs = regProcs.map(p => ({
      id: String(p.procedure_id),
      name: p.name,
      duration: p.duration,
      note: p.note
    }));

    const mappedRefs = regRefs.map(r => ({
      id: String(r.refer_id),
      doctorName: r.doctor_name,
      notes: r.notes
    }));

    setActivePrintData({
      registration_id: reg.registration_id,
      appointment_date_time: reg.appointment_date_time,
      clinic_name: reg.clinic_name,
      treating_doctor: reg.treating_doctor,
      visit_category: reg.visit_category,
      referring_doctor: reg.referring_doctor,
      discount_amount: reg.discount_amount,
      services: reg.services,
      payments: reg.payments,
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
      follow_up_notes: reg.follow_up_notes || ""
    });
  };

  // Filter registrations to show past ones
  const pastRegistrations = registrations.filter((r) => r.registration_id !== Number(rxPatientId));

  // ─── GENERATE PDF BLOB RE-EXECUTION ON SETTINGS CHANGE ──────────────
  useEffect(() => {
    if (activePrintData && printRef.current) {
      const timer = setTimeout(async () => {
        const blobUrl = await printRef.current.generatePDF(false);
        if (blobUrl) {
          setPreviewBlobUrl(blobUrl);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    activePrintData,
    printShowHeader,
    printHeaderHeight,
    printShowFooter,
    printFooterHeight,
    printShowLetterhead,
    printShowHeaderPage2,
    printShowLetterheadPage2,
    printShowFooterPage2,
    printHeaderHeightPage2,
    printFooterHeightPage2,
    historyLoaded
  ]);

  // Load latest visit preview by default on mount when registrations data becomes available
  useEffect(() => {
    if (historyLoaded && pastRegistrations.length > 0 && !activePrintData) {
      handlePrintPastVisit(pastRegistrations[0]);
    }
  }, [historyLoaded, pastRegistrations, activePrintData]);

  // Helper to extract doctor initials (e.g. "DR. LAXMAN SALVE" -> "LS")
  const getInitials = (docName: string): string => {
    if (!docName) return "MD";
    const cleaned = docName.toUpperCase().replace("DR", "").replace("DT", "").trim();
    const parts = cleaned.split(" ").filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
    if (parts.length === 1) return parts[0].slice(0, 2);
    return "MD";
  };

  // Group unique lab results by name and find the latest reading
  const uniqueLabReadings = (() => {
    const map: { [key: string]: any } = {};
    labResults.forEach((r) => {
      const key = r.name.trim();
      const existing = map[key];
      if (!existing || new Date(r.created_date || r.result_date) > new Date(existing.created_date || existing.result_date)) {
        map[key] = r;
      }
    });
    
    return Object.values(map).filter((r: any) =>
      r.name.toLowerCase().includes(labSearchQuery.toLowerCase())
    );
  })();

  if (!sessionLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F6F8] font-sans select-none">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verifying Session...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F6F8] font-sans select-none">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Patient History...</p>
        </div>
      </div>
    );
  }

  if (!currentRxPatient) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F5F6F8] font-sans select-none">
        <div className="text-center space-y-4">
          <p className="text-sm font-bold text-red-500 uppercase tracking-wider">Patient record not found</p>
          <button 
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-xs"
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
        <CustomToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* HEADER */}
      <header className="h-12 bg-white border-b border-[#E2E8F0] px-4 flex items-center justify-between shrink-0 shadow-2xs z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-1 hover:bg-[#E2E8F0] rounded-md text-[#718096] transition-colors"
          >
            <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[12px]">
            {currentRxPatient.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-left leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-foreground select-text">{currentRxPatient.name}</span>
              <span className="text-[11px] font-medium text-[#718096]">{currentRxPatient.age}y | {currentRxPatient.gender}</span>
            </div>
            <span className="text-[9px] text-[#A0AEC0] font-semibold tracking-tight select-text">{currentRxPatient.phone}</span>
          </div>
        </div>

        {/* Navigation tab bar in the center */}
        <div className="flex items-center h-full">
          <button className="h-full px-3 text-[11px] font-bold text-primary border-b-2 border-primary">
            Overview {pastRegistrations.length > 0 ? `(${pastRegistrations.length})` : `(0)`}
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
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          <button className="px-2.5 py-1 border border-primary/20 hover:bg-primary/5 text-primary text-[10px] font-bold rounded">
            DxaAI Assessments
          </button>
          <button className="px-2.5 py-1 bg-primary hover:bg-primary-hover text-white text-[10px] font-bold rounded flex items-center gap-1">
            ✨ DocScribe
          </button>
          <button className="px-2 py-1 text-[10.5px] font-semibold text-[#4A5568] hover:bg-gray-100 rounded">
            Templates
          </button>
          <button className="px-2 py-1 text-[10.5px] font-semibold text-[#4A5568] hover:bg-gray-100 rounded flex items-center gap-1">
            ⚙ Configure
          </button>
          <span className="px-2.5 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded text-[10px] font-bold tracking-wide select-none cursor-pointer">
            UPGRADE TO PRO
          </span>
        </div>
      </header>

      {/* MAIN SPLIT VIEW (TIMELINE LEFT | PREVIEW RIGHT) */}
      <div className="flex-1 flex overflow-hidden bg-[#F5F6F8]">
        
        {/* Left Side: Timeline of Past Visits & Trends (Scrollable) */}
        <div className="w-[45%] flex flex-col border-r border-[#E2E8F0] overflow-y-auto p-6 space-y-6 shrink-0">
        
        {/* PAST VISITS CONTAINER: SCROLLABLE HORIZONTALLY, LATEST ONE ON THE LEFT */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4.5 flex flex-col shadow-2xs text-left shrink-0">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4 shrink-0">
            <span className="text-[12px] font-extrabold text-[#1E293B] uppercase tracking-wider flex items-center gap-1.5">
              📅 Past Visits
            </span>
            <span className="text-[9.5px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {pastRegistrations.length} visit(s) found
            </span>
          </div>

          <div className="relative w-full group">
            {/* Scroll Left Button */}
            <button
              type="button"
              onClick={() => scrollVisits("left")}
              className="absolute left-[-16px] top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-[#E2E8F0] shadow-md hover:bg-slate-50 flex items-center justify-center text-slate-650 active:scale-95 transition-all opacity-0 group-hover:opacity-100 duration-200"
              title="Scroll Left"
            >
              <svg className="w-5 h-5 stroke-current" fill="none" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>

            {/* Scroll Right Button */}
            <button
              type="button"
              onClick={() => scrollVisits("right")}
              className="absolute right-[-16px] top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-[#E2E8F0] shadow-md hover:bg-slate-50 flex items-center justify-center text-slate-650 active:scale-95 transition-all opacity-0 group-hover:opacity-100 duration-200"
              title="Scroll Right"
            >
              <svg className="w-5 h-5 stroke-current" fill="none" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            <div 
              ref={visitsScrollRef}
              className="flex flex-row gap-4.5 overflow-x-auto pb-3 w-full scroll-smooth"
            >
            {pastRegistrations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 w-full text-slate-350 bg-[#FAFBFC] rounded-xl border border-dashed border-[#E2E8F0] p-4">
                <span className="text-3xl mb-1.5">📋</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">No Past Visits</span>
              </div>
            ) : (
              // Latest visits are already sorted descending (first in list = latest, shown on the left)
              pastRegistrations.map((reg) => {
                const regSyms = symptoms.filter((s) => s.registration_id === reg.registration_id);
                const regDiags = diagnoses.filter((d) => d.registration_id === reg.registration_id);
                const regMeds = medications.filter((m) => m.registration_id === reg.registration_id);
                const regLabs = labs.filter((l) => l.registration_id === reg.registration_id);
                const regProcs = procedures.filter((p) => p.registration_id === reg.registration_id);
                const regRefs = referrals.filter((r) => r.registration_id === reg.registration_id);

                const visitDateStr = new Date(reg.appointment_date_time || reg.created_at).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                const isSelected = activePrintData?.registration_id === reg.registration_id;

                return (
                  <div 
                    key={reg.registration_id} 
                    className={`w-[340px] shrink-0 border rounded-xl bg-white overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col h-[460px] ${
                      isSelected ? "border-primary ring-2 ring-primary/20 shadow-md scale-[1.01]" : "border-[#E5E7EB]"
                    }`}
                  >
                    
                    {/* Card Header */}
                    <div className="px-3.5 py-2.5 border-b border-[#E5E7EB] bg-slate-50/50 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-6.5 h-6.5 rounded-md bg-indigo-50 text-indigo-650 flex items-center justify-center font-black text-[9px] border border-indigo-100 uppercase shrink-0">
                          {getInitials(reg.treating_doctor)}
                        </div>
                        <div className="text-left leading-tight">
                          <span className="text-[11.5px] font-bold text-slate-800 flex items-center gap-1.5">
                            {visitDateStr}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-[#718096] font-bold uppercase">
                              {reg.treating_doctor || "Physician"}
                            </span>
                            <span className="text-slate-350 text-[8px]">•</span>
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-650 rounded-[4px] text-[8px] font-extrabold tracking-wide uppercase">
                              OPD ID: {reg.registration_id}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* PDF Print / Reassign Full */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePrintPastVisit(reg)}
                          className="px-2 py-0.5 bg-white border border-[#E2E8F0] text-[9.5px] font-bold rounded hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => reassignFullVisit(reg.registration_id)}
                          className="p-1 hover:bg-indigo-50 border border-transparent rounded text-indigo-650 transition-all animate-pulse-once"
                          title="Reassign full visit to today"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Card Content - scrollable vertically internally if too long */}
                    <div className="flex-1 overflow-y-auto p-1.5 divide-y divide-[#F1F5F9] text-[11.5px]">
                      
                      {/* History & Vitals block */}
                      {(reg.bp || reg.pulse || reg.weight || reg.spo2 || reg.sugar || medicalHistory) && (
                        <div className="flex items-start gap-3 py-2.5 px-2 hover:bg-slate-50/50 rounded-lg transition-colors">
                          <div className="w-6.5 h-6.5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black text-white bg-rose-500 shadow-sm">
                            Hx
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wide leading-none mb-1">Vitals & History</div>
                            <div className="space-y-1.5">
                              {(reg.bp || reg.pulse || reg.weight || reg.spo2 || reg.sugar) && (
                                <div className="text-[10px] font-bold text-slate-600 flex flex-wrap gap-x-2.5">
                                  {reg.bp && <span>BP: {reg.bp}</span>}
                                  {reg.pulse && <span>PR: {reg.pulse}</span>}
                                  {reg.weight && <span>Wt: {reg.weight}kg</span>}
                                </div>
                              )}
                              {medicalHistory?.existing_conditions && (
                                <div className="flex flex-wrap gap-1">
                                  {medicalHistory.existing_conditions.map((c: any, idx: number) => (
                                    <span key={idx} className="text-[9.5px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                                      {c.name}: {c.status}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Symptoms row */}
                      {regSyms.length > 0 && (
                        <div className="flex items-start gap-3 py-2.5 px-2 hover:bg-slate-50/50 rounded-lg transition-colors group">
                          <div className="w-6.5 h-6.5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black text-white bg-sky-500 shadow-sm uppercase">
                            Sx
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wide leading-none mb-1">Symptoms</div>
                            <div className="text-[11.5px] font-bold text-slate-800 leading-normal">
                              {regSyms.map((s, idx) => (
                                <span key={s.symptom_id}>
                                  {s.name}{s.duration ? ` (${s.duration})` : ""}{idx < regSyms.length - 1 ? " | " : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              for (const sym of regSyms) await reassignSymptom(sym);
                            }}
                            className="p-1 hover:bg-indigo-50 border border-transparent rounded text-indigo-650 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                            title="Reassign symptoms to today"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Diagnosis row */}
                      {regDiags.length > 0 && (
                        <div className="flex items-start gap-3 py-2.5 px-2 hover:bg-slate-50/50 rounded-lg transition-colors group">
                          <div className="w-6.5 h-6.5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black text-white bg-violet-500 shadow-sm uppercase">
                            Dx
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wide leading-none mb-1">Diagnosis</div>
                            <div className="text-[11.5px] font-bold text-slate-800 leading-normal">
                              {regDiags.map((d, idx) => (
                                <div key={d.diagnosis_id} className="block">
                                  {d.name} {d.icd10_code ? `[${d.icd10_code}]` : ""}
                                </div>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              for (const diag of regDiags) await reassignDiagnosis(diag);
                            }}
                            className="p-1 hover:bg-indigo-50 border border-transparent rounded text-indigo-650 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                            title="Reassign diagnosis to today"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Medications row (Shows every single detail and can reassign) */}
                      {regMeds.length > 0 && (
                        <div className="flex items-start gap-3 py-2.5 px-2 hover:bg-slate-50/50 rounded-lg transition-colors group">
                          <div className="w-6.5 h-6.5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black text-white bg-pink-500 shadow-sm uppercase">
                            Rx
                          </div>
                          <div className="flex-1 text-left space-y-2">
                            <div className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wide leading-none flex items-center justify-between">
                              <span>Medications</span>
                              <button
                                type="button"
                                onClick={() => reassignAllMedications(reg.registration_id)}
                                className="text-indigo-650 hover:text-indigo-850 text-[8.5px] font-extrabold flex items-center gap-0.5 hover:underline"
                                title="Reassign all medications to today"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                                Assign All
                              </button>
                            </div>
                            {regMeds.map((med) => {
                              const medName = med.name || med.medicine?.name || "";
                              const medGeneric = med.generic || med.medicine?.salt_composition || med.medicine?.short_composition1 || "";
                              const detailsList = [
                                med.dosage,
                                med.frequency,
                                med.instruction,
                                med.duration,
                                med.route,
                                med.note
                              ].filter(Boolean);

                              return (
                                <div key={med.patient_medication_id} className="text-[11.5px] leading-tight border-b border-[#F8FAFC] pb-1.5 last:border-0 last:pb-0">
                                  <div className="font-extrabold text-slate-800 flex justify-between items-center">
                                    <span className="uppercase tracking-tight select-text">{medName}</span>
                                    <button
                                      onClick={() => reassignMedication(med)}
                                      className="p-0.5 text-indigo-650 hover:text-indigo-850 shrink-0 ml-1 rounded hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100"
                                      title="Reassign medication to today"
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                      </svg>
                                    </button>
                                  </div>
                                  {medGeneric && <p className="text-[9px] text-slate-450 font-bold uppercase leading-none mt-0.5 select-text">{medGeneric}</p>}
                                  {detailsList.length > 0 && (
                                    <span className="text-[9.5px] text-slate-500 font-bold block mt-1 leading-normal select-text">
                                      {detailsList.join(" | ")}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Investigations row */}
                      {regLabs.length > 0 && (
                        <div className="flex items-start gap-3 py-2.5 px-2 hover:bg-slate-50/50 rounded-lg transition-colors group">
                          <div className="w-6.5 h-6.5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black text-white bg-amber-500 shadow-sm uppercase">
                            Lab
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wide leading-none mb-1">Investigations</div>
                            <div className="text-[11.5px] font-bold text-slate-800 leading-normal">
                              {regLabs.map((l, idx) => (
                                <span key={l.patient_lab_id}>
                                  {l.name}{idx < regLabs.length - 1 ? " | " : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              for (const l of regLabs) await reassignLab(l);
                            }}
                            className="p-1 hover:bg-indigo-50 border border-transparent rounded text-indigo-650 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                            title="Reassign investigations to today"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Procedures row */}
                      {regProcs.length > 0 && (
                        <div className="flex items-start gap-3 py-2.5 px-2 hover:bg-slate-50/50 rounded-lg transition-colors group">
                          <div className="w-6.5 h-6.5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black text-white bg-teal-500 shadow-sm uppercase">
                            Pr
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wide leading-none mb-1">Procedures</div>
                            <div className="text-[11.5px] font-bold text-slate-800 leading-normal">
                              {regProcs.map((p, idx) => (
                                <span key={p.procedure_id}>
                                  {p.name}{idx < regProcs.length - 1 ? " | " : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              for (const p of regProcs) await reassignProcedure(p);
                            }}
                            className="p-1 hover:bg-indigo-50 border border-transparent rounded text-indigo-650 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                            title="Reassign procedures to today"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Referrals row */}
                      {regRefs.length > 0 && (
                        <div className="flex items-start gap-3 py-2.5 px-2 hover:bg-slate-50/50 rounded-lg transition-colors group">
                          <div className="w-6.5 h-6.5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black text-white bg-pink-650 shadow-sm uppercase">
                            Rf
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wide leading-none mb-1">Referrals</div>
                            <div className="text-[11.5px] font-bold text-slate-800 leading-normal">
                              {regRefs.map((r, idx) => (
                                <span key={r.refer_id}>
                                  Dr. {r.doctor_name}{idx < regRefs.length - 1 ? " | " : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              for (const r of regRefs) await reassignReferral(r);
                            }}
                            className="p-1 hover:bg-indigo-50 border border-transparent rounded text-indigo-650 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                            title="Reassign referrals to today"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Advice row */}
                      {(reg.advice || reg.advice_rest || reg.advice_water) && (
                        <div className="flex items-start gap-3 py-2.5 px-2 hover:bg-slate-50/50 rounded-lg transition-colors group">
                          <div className="w-6.5 h-6.5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black text-white bg-purple-600 shadow-sm uppercase">
                            Ad
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wide leading-none mb-1">Advice</div>
                            <div className="text-[11.5px] font-bold text-slate-800 leading-tight">
                              {reg.advice}
                              {reg.advice_rest && <span className="block text-[10px] text-slate-500 mt-0.5">• Take some rest</span>}
                              {reg.advice_water && <span className="block text-[10px] text-slate-500 mt-0.5">• Drink water</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => reassignAdvice(reg.advice || "", reg.advice_rest || false, reg.advice_water || false)}
                            className="p-1 hover:bg-indigo-50 border border-transparent rounded text-indigo-650 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                            title="Reassign advice to today"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                          </button>
                        </div>
                      )}

                    </div>

                  </div>
                );
              })
            )}
          </div>
          </div>
        </div>

        {/* BOTTOM SECTION: LAB RESULTS & TODAY'S VITALS (SIDE BY SIDE ROW) */}
        <div className="grid grid-cols-2 gap-6 items-start w-full shrink-0">
          
          {/* LAB RESULTS CARD */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] flex flex-col overflow-hidden shadow-2xs text-left h-[500px]">
            <div className="px-4 py-3.5 border-b border-[#E5E7EB] bg-[#FAFBFC] flex items-center justify-between shrink-0">
              <span className="text-[12px] font-extrabold text-[#1E293B] uppercase tracking-wider flex items-center gap-1.5">
                🧪 Lab Results
              </span>
              <button 
                type="button"
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[9.5px] font-bold rounded-lg text-[#4F46E5] shadow-2xs transition-all"
              >
                See Historical Data
              </button>
            </div>

            {/* Search Field */}
            <div className="p-3 border-b border-[#F1F5F9] bg-[#FAFBFC] shrink-0">
              <input
                type="text"
                placeholder="Search lab test results..."
                value={labSearchQuery}
                onChange={(e) => setLabSearchQuery(e.target.value)}
                className="w-full h-8.5 px-3 border border-[#E2E8F0] focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 rounded-lg text-[11px] bg-white focus:outline-none placeholder:text-[#C0CADC] font-semibold transition-all"
              />
            </div>

            {/* Lab Readings Table */}
            <div className="flex-1 overflow-y-auto">
              {uniqueLabReadings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-350 bg-white">
                  <span className="text-3xl mb-1.5">🔬</span>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider">No Lab Readings Recorded</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-slate-50 text-[9px] font-extrabold text-[#718096] uppercase select-none">
                      <th className="px-4 py-2 w-[55%]">Test Name</th>
                      <th className="px-4 py-2 w-[35%]">Latest Reading</th>
                      <th className="px-4 py-2 w-[10%] text-center">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueLabReadings.map((res) => {
                      const readingDateStr = res.result_date || new Date(res.created_date || res.created_at).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      });
                      
                      return (
                        <tr key={res.lab_result_id} className="border-b border-[#F1F5F9] hover:bg-slate-50/50 transition-colors text-[11.5px] font-semibold text-slate-800">
                          <td className="px-4 py-2.5 leading-tight">{res.name}</td>
                          <td className="px-4 py-2.5 leading-tight text-slate-600">
                            <span className="font-extrabold text-[#1E293B] block">
                              {res.reading} {res.unit}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">{readingDateStr}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button className="p-1 hover:bg-indigo-50 border border-transparent rounded transition-all">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-indigo-650">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* VITALS CARD */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] flex flex-col overflow-hidden shadow-2xs text-left h-[500px]">
            <div className="px-4 py-3.5 border-b border-[#E5E7EB] bg-[#FAFBFC] flex items-center shrink-0">
              <span className="text-[12px] font-extrabold text-[#1E293B] uppercase tracking-wider flex items-center gap-1.5">
                🩺 Today's Vitals
              </span>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-6">
              {!currentRxPatient.vitals?.bp && 
               !currentRxPatient.vitals?.pulse && 
               !currentRxPatient.vitals?.weight && 
               !currentRxPatient.vitals?.spo2 && 
               !currentRxPatient.vitals?.sugar ? (
                <div className="text-center space-y-2">
                  <div className="w-18 h-18 mx-auto relative opacity-85 text-[#818CF8]">
                    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full text-indigo-350">
                      <rect x="12" y="6" width="40" height="52" rx="4" stroke="currentColor" strokeWidth="2.5" />
                      <line x1="20" y1="18" x2="44" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="20" y1="28" x2="36" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="20" y1="38" x2="40" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx="40" cy="28" r="2.5" fill="currentColor" />
                    </svg>
                  </div>
                  <p className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">No Vitals Added for Today!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 w-full">
                  {currentRxPatient.vitals.bp && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide">Blood Pressure</div>
                      <div className="text-[15px] font-extrabold text-slate-800 mt-1">{currentRxPatient.vitals.bp} <span className="text-[10.5px] text-slate-500 font-semibold">mmHg</span></div>
                    </div>
                  )}
                  {currentRxPatient.vitals.pulse && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide">Pulse Rate</div>
                      <div className="text-[15px] font-extrabold text-slate-800 mt-1">{currentRxPatient.vitals.pulse} <span className="text-[10.5px] text-slate-500 font-semibold">bpm</span></div>
                    </div>
                  )}
                  {currentRxPatient.vitals.spo2 && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide">Oxygen (SpO2)</div>
                      <div className="text-[15px] font-extrabold text-slate-800 mt-1">{currentRxPatient.vitals.spo2}%</div>
                    </div>
                  )}
                  {currentRxPatient.vitals.weight && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide">Weight</div>
                      <div className="text-[15px] font-extrabold text-slate-800 mt-1">{currentRxPatient.vitals.weight} <span className="text-[10.5px] text-slate-500 font-semibold">kg</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        </div>

        {/* Right Side: PDF Preview Pane & Controls */}
        <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden relative border-l border-slate-200">
          
          {/* Preview Header / Controls */}
          <div className="bg-white border-b border-[#E2E8F0] px-4 py-2.5 flex items-center justify-between shrink-0 shadow-2xs">
            <span className="text-[11px] font-extrabold text-[#1E293B] uppercase tracking-wider flex items-center gap-1.5 select-none">
              📄 Prescription Preview
            </span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#4A5568] font-bold text-[10.5px]">
                <input
                  type="checkbox"
                  checked={printShowLetterhead}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPrintShowLetterhead(checked);
                    setPrintShowLetterheadPage2(checked);
                  }}
                  className="w-3.5 h-3.5 text-indigo-650 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                />
                <span>Print with Letterhead</span>
              </label>
            </div>
          </div>

          {/* Preview Body (Iframe) */}
          <div className="flex-1 p-4 bg-slate-100/50">
            {previewBlobUrl ? (
              <iframe src={previewBlobUrl} className="w-full h-full rounded-xl border border-slate-250 shadow-sm bg-white" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm">
                <svg className="w-8 h-8 text-indigo-500 animate-spin mb-2" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">Generating PDF Preview...</span>
              </div>
            )}
          </div>

          {/* Action Footer for Preview Pane */}
          {activePrintData && (
            <div className="bg-white border-t border-[#E2E8F0] px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    showToast("Prescription saved as template successfully!", "success");
                  }}
                  className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[10px] font-bold text-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  📂 Save as Template
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activePrintData?.registration_id) {
                      reassignFullVisit(activePrintData.registration_id);
                    }
                  }}
                  className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[10px] font-bold text-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  📋 Use as Template
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    router.push(`/rx?rx=${rxPatientId}`);
                  }}
                  className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[10px] font-bold text-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const phone = currentRxPatient.phone || "";
                    const text = `Hello, here is your prescription from Dr. ${activePrintData?.treating_doctor || "Doctor"}. Please access it here: ${previewBlobUrl}`;
                    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, "_blank");
                    showToast("Redirecting to WhatsApp to send prescription...", "success");
                  }}
                  className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[10px] font-bold text-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
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
                  className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-750 text-[10.5px] font-extrabold text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  🖨️ Print
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="h-12 bg-[#1e293b] px-4 flex items-center justify-between shrink-0 select-none shadow-2xl border-t border-slate-800 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-650 text-white rounded-lg text-[10px] font-bold border border-slate-700 transition-colors"
          >
            Dashboard
          </button>
        </div>

        <div className="text-[10.5px] text-slate-400 font-bold tracking-wide">
          Overview mode
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/rx?rx=${rxPatientId}`)}
            className="px-5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-[11px] font-extrabold shadow-md transition-colors flex items-center gap-1.5"
          >
            Continue to Prescription
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </footer>

      {/* HIDDEN PRINT PRESCRIPTION MOUNT FOR GENERATING BLOB PDF URLS */}
      {currentRxPatient && (
        <div className="hidden">
          <PrintPrescription
            ref={printRef}
            patient={{
              id: currentRxPatient.id,
              title: currentRxPatient.title,
              name: currentRxPatient.name,
              age: currentRxPatient.age,
              ageUnit: currentRxPatient.ageUnit,
              gender: currentRxPatient.gender,
              phone: currentRxPatient.phone,
              permanentAddress: currentRxPatient.permanentAddress,
              opdRegistration: activePrintData ? {
                clinic_name: activePrintData.clinic_name,
                treating_doctor: activePrintData.treating_doctor,
                referring_doctor: activePrintData.referring_doctor
              } : undefined
            }}
            bp={activePrintData?.bp || ""}
            pulse={activePrintData?.pulse || ""}
            weight={activePrintData?.weight || ""}
            spo2={activePrintData?.spo2 || ""}
            sugar={activePrintData?.sugar || ""}
            symptoms={activePrintData?.symptoms || []}
            diagnoses={activePrintData?.diagnoses || []}
            medications={activePrintData?.medications || []}
            labs={activePrintData?.labs || []}
            labResults={activePrintData?.labResults || []}
            rxProcedures={activePrintData?.procedures || []}
            referrals={activePrintData?.referrals || []}
            advicesInput={activePrintData?.advice || ""}
            advRest={activePrintData?.advice_rest || false}
            advWater={activePrintData?.advice_water || false}
            notesForPatient={activePrintData?.notes_for_patient || ""}
            followUpVal={activePrintData?.follow_up || ""}
            followUpNotes={activePrintData?.follow_up_notes || ""}

            histNoKnown={medicalHistory?.no_known_history || false}
            familyItems={medicalHistory?.family_history || []}
            conditions={medicalHistory?.existing_conditions || []}
            allergies={medicalHistory?.drug_allergies || []}
            procedures={medicalHistory?.surgical_procedures || []}
            currentMeds={medicalHistory?.current_medications || []}
            habits={medicalHistory?.lifestyle_habits || []}
            foodAllergies={medicalHistory?.food_allergies || []}
            otherHistory={medicalHistory?.other_history || []}
            otherHistoryTitle={medicalHistory?.other_history_title || ""}
            travelHistory={medicalHistory?.travel_history || []}

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
      )}



    </div>
  );
}

export default function OverviewPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F6F8] font-sans">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preparing Overview...</p>
        </div>
      </div>
    }>
      <OverviewContent />
    </Suspense>
  );
}
