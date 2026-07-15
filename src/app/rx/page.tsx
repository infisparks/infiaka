"use client";

import React, { useState, useMemo, Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, getUserRole } from "@/lib/supabase";

import VitalsCard from "@/components/VitalsCard";
import MedicalHistoryCard from "@/components/MedicalHistoryCard";
import SymptomsCard from "@/components/SymptomsCard";
import DiagnosisCard from "@/components/DiagnosisCard";
import MedicationsCard from "@/components/MedicationsCard";
import LabsCard from "@/components/LabsCard";
import ResultsCard from "@/components/ResultsCard";
import NotesCard from "@/components/NotesCard";
import FollowUpCard from "@/components/FollowUpCard";
import AdvicesCard from "@/components/AdvicesCard";
import AdvicesDrawer from "@/components/AdvicesDrawer";
import CurrentMedicationsDrawer from "@/components/CurrentMedicationsDrawer";
import ExistingConditionsDrawer from "@/components/ExistingConditionsDrawer";
import SurgicalProceduresDrawer from "@/components/SurgicalProceduresDrawer";
import FamilyHistoryDrawer, { FamilyHistoryItem } from "@/components/FamilyHistoryDrawer";
import DrugAllergiesDrawer, { DrugAllergy } from "@/components/DrugAllergiesDrawer";
import LifestyleHabitsDrawer, { LifestyleHabit } from "@/components/LifestyleHabitsDrawer";
import FoodAllergyDrawer, { FoodAllergy } from "@/components/FoodAllergyDrawer";
import OtherMedHistoryDrawer, { OtherMedHistory } from "@/components/OtherMedHistoryDrawer";
import TravelHistoryDrawer, { TravelHistoryItem } from "@/components/TravelHistoryDrawer";
import ProceduresCard, { ProcedureItem } from "@/components/ProceduresCard";
import ReferToDoctorCard, { ReferralItem } from "@/components/ReferToDoctorCard";
import PrintPrescription from "@/components/PrintPrescription";

const getFollowUpDateValue = (val: string): string | null => {
  if (!val || !val.trim()) return null;
  const trimmed = val.trim();
  
  if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return trimmed;
  }
  
  const match = trimmed.match(/^(\d+)\s*(day|week|month|year)s?$/i);
  let days = 0;
  if (match) {
    const num = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit.startsWith("day")) days = num;
    else if (unit.startsWith("week")) days = num * 7;
    else if (unit.startsWith("month")) days = num * 30;
    else if (unit.startsWith("year")) days = num * 365;
  } else {
    const rawNum = parseInt(trimmed.replace(/[^\d]/g, ""), 10);
    if (!isNaN(rawNum)) days = rawNum;
  }
  
  if (days > 0) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  
  return null;
};

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
}

export default function RxPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F6F8] font-sans select-none">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Prescription Page...</p>
        </div>
      </div>
    }>
      <RxPageContent />
    </Suspense>
  );
}

function RxPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rxPatientId = searchParams.get("rx");

  const printRef = useRef<any>(null);

  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRxPatient, setCurrentRxPatient] = useState<Patient | null>(null);
  const [pastVisitsCount, setPastVisitsCount] = useState<number>(0);
  const [legacyVisitsCount, setLegacyVisitsCount] = useState<number>(0);

  const fetchHeaderCounts = async (patientUhid: string, currentRegId: string | number, name: string, phone: any) => {
    if (!patientUhid) return;
    try {
      const { count: pastCount, error: pastErr } = await supabase
        .from("aka_opd_registration")
        .select("*", { count: "exact", head: true })
        .eq("patient_uhid", patientUhid)
        .neq("registration_id", Number(currentRegId))
        .or("is_deleted.is.null,is_deleted.eq.false");

      if (!pastErr && pastCount !== null) {
        setPastVisitsCount(pastCount);
      }

      if (name || phone) {
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
        
        const { count: legacyCount, error: legacyErr } = await query;
        if (!legacyErr && legacyCount !== null) {
          setLegacyVisitsCount(legacyCount);
        }
      }
    } catch (e) {
      console.error("Error fetching header counts:", e);
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

  // Vitals states
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [weight, setWeight] = useState("");
  const [spo2, setSpo2] = useState("");
  const [sugar, setSugar] = useState("");

  // Score states

  // History states
  const [histNoKnown, setHistNoKnown] = useState(false);
  const [histDiabetes, setHistDiabetes] = useState(false);
  const [histDiabetesSince, setHistDiabetesSince] = useState("1 Year");
  const [histHypothyroid, setHistHypothyroid] = useState(false);
  const [histHypertension, setHistHypertension] = useState(false);
  const [histAlcohol, setHistAlcohol] = useState(false);
  const [histTobacco, setHistTobacco] = useState(false);
  const [histSmoke, setHistSmoke] = useState(false);

  // Drawer trigger open states
  const [isCurrentMedsOpen, setIsCurrentMedsOpen] = useState(false);
  const [currentMeds, setCurrentMeds] = useState<any[]>([]);

  const [isConditionsOpen, setIsConditionsOpen] = useState(false);
  const [conditions, setConditions] = useState<any[]>([]);

  const [isProceduresOpen, setIsProceduresOpen] = useState(false);
  const [procedures, setProcedures] = useState<any[]>([]);

  const [isFamilyOpen, setIsFamilyOpen] = useState(false);
  const [familyItems, setFamilyItems] = useState<FamilyHistoryItem[]>([]);

  const [isAllergiesOpen, setIsAllergiesOpen] = useState(false);
  const [allergies, setAllergies] = useState<DrugAllergy[]>([]);

  const [isHabitsOpen, setIsHabitsOpen] = useState(false);
  const [habits, setHabits] = useState<LifestyleHabit[]>([]);

  const [isFoodAllergyOpen, setIsFoodAllergyOpen] = useState(false);
  const [foodAllergies, setFoodAllergies] = useState<FoodAllergy[]>([]);

  const [isOtherHistoryOpen, setIsOtherHistoryOpen] = useState(false);
  const [otherHistory, setOtherHistory] = useState<OtherMedHistory[]>([]);
  const [otherHistoryTitle, setOtherHistoryTitle] = useState("");

  const [isTravelOpen, setIsTravelOpen] = useState(false);
  const [travelHistory, setTravelHistory] = useState<TravelHistoryItem[]>([]);
  const [isAdvicesDrawerOpen, setIsAdvicesDrawerOpen] = useState(false);

  // Prescription cards data states
  const [symptoms, setSymptoms] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  
  const [notesForPatient, setNotesForPatient] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [refDoctorInput, setRefDoctorInput] = useState("");
  const [followUpVal, setFollowUpVal] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [advicesInput, setAdvicesInput] = useState("");
  const [advRest, setAdvRest] = useState(false);
  const [advWater, setAdvWater] = useState(false);
  
  const [rxProcedures, setRxProcedures] = useState<ProcedureItem[]>([]);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [printShowHeader, setPrintShowHeader] = useState(true);
  const [printHeaderHeight, setPrintHeaderHeight] = useState(30);
  const [printShowFooter, setPrintShowFooter] = useState(true);
  const [printFooterHeight, setPrintFooterHeight] = useState(30);
  const [printShowLetterhead, setPrintShowLetterhead] = useState(true);

  // Subsequent page settings
  const [printShowHeaderPage2, setPrintShowHeaderPage2] = useState(false);
  const [printHeaderHeightPage2, setPrintHeaderHeightPage2] = useState(15);
  const [printShowFooterPage2, setPrintShowFooterPage2] = useState(true);
  const [printFooterHeightPage2, setPrintFooterHeightPage2] = useState(15);
  const [printShowLetterheadPage2, setPrintShowLetterheadPage2] = useState(false);

  // Load prescription print settings from Supabase on mount
  useEffect(() => {
    if (!sessionLoaded) return;
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
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
      } catch (err) {
        console.error("Error loading prescription settings:", err);
      }
    };
    loadSettings();
  }, [sessionLoaded]);

  // Save settings helper
  const savePrescriptionSettings = async (updates: {
    showLetterhead?: boolean;
    showHeader?: boolean;
    showFooter?: boolean;
    headerHeight?: number;
    footerHeight?: number;
    showLetterheadPage2?: boolean;
    showHeaderPage2?: boolean;
    showFooterPage2?: boolean;
    headerHeightPage2?: number;
    footerHeightPage2?: number;
  }) => {
    try {
      const { data } = await supabase
        .from("aka_setting")
        .select("metadata")
        .eq("setting_key", "prescription_settings")
        .maybeSingle();

      const existingMeta = data?.metadata || {};
      const newMeta = { ...existingMeta, ...updates };

      await supabase
        .from("aka_setting")
        .upsert(
          { setting_key: "prescription_settings", metadata: newMeta },
          { onConflict: "setting_key" }
        );
    } catch (err) {
      console.error("Error saving prescription settings:", err);
    }
  };

  // Load patient context from DB on mount
  useEffect(() => {
    if (!sessionLoaded) return;
    if (!rxPatientId) {
      setLoading(false);
      return;
    }

    // Reset all patient-specific states to prevent leaking previous patient details while loading
    setCurrentRxPatient(null);
    setBp("");
    setPulse("");
    setWeight("");
    setSpo2("");
    setSugar("");
    setSymptoms([]);
    setDiagnoses([]);
    setMedications([]);
    setLabs([]);
    setLabResults([]);
    setNotesForPatient("");
    setPrivateNotes("");
    setRefDoctorInput("");
    setFollowUpVal("");
    setFollowUpNotes("");
    setAdvicesInput("");
    setAdvRest(false);
    setAdvWater(false);
    setRxProcedures([]);
    setReferrals([]);
    setFamilyItems([]);
    setConditions([]);
    setAllergies([]);
    setProcedures([]);
    setCurrentMeds([]);
    setHabits([]);
    setFoodAllergies([]);
    setOtherHistory([]);
    setOtherHistoryTitle("");
    setTravelHistory([]);
    setHistNoKnown(false);

    const loadPatientData = async () => {
      try {
        setLoading(true);
        // Fetch OPD registration details first (rxPatientId corresponds to the OPD registration_id)
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
        fetchHeaderCounts(patientUhid, rxPatientId || "", pData.name || "", pData.number || "");

        // Fetch patient medical history from the table
        const { data: histData, error: hError } = await supabase
          .from("aka_patient_medical_history")
          .select("*")
          .eq("patient_uhid", patientUhid)
          .maybeSingle();

        if (hError) {
          console.error("Failed to load patient history:", hError);
        } else if (histData) {
          setHistNoKnown(histData.no_known_history || false);
          if (Array.isArray(histData.family_history)) setFamilyItems(histData.family_history);
          if (Array.isArray(histData.existing_conditions)) setConditions(histData.existing_conditions);
          if (Array.isArray(histData.drug_allergies)) setAllergies(histData.drug_allergies);
          if (Array.isArray(histData.surgical_procedures)) setProcedures(histData.surgical_procedures);
          if (Array.isArray(histData.current_medications)) setCurrentMeds(histData.current_medications);
          if (Array.isArray(histData.lifestyle_habits)) setHabits(histData.lifestyle_habits);
          if (Array.isArray(histData.food_allergies)) setFoodAllergies(histData.food_allergies);
          if (Array.isArray(histData.other_history)) setOtherHistory(histData.other_history);
          if (histData.other_history_title !== undefined) setOtherHistoryTitle(histData.other_history_title);
          if (Array.isArray(histData.travel_history)) setTravelHistory(histData.travel_history);
        }

        // Fetch patient symptoms from the table
        if (regData?.registration_id) {
          const { data: symRows, error: sError } = await supabase
            .from("aka_symptoms")
            .select("*")
            .eq("registration_id", regData.registration_id);

          if (sError) {
            console.error("Failed to load patient symptoms:", sError);
          } else if (symRows) {
            const mappedSymptoms = symRows.map((row: any) => ({
              id: String(row.symptom_id),
              name: row.name || "",
              duration: row.duration || "",
              severity: row.severity || "",
              headacheSites: row.headache_sites || [],
              painTypes: row.pain_types || [],
              clinicalCourse: row.clinical_course || "",
              note: row.note || ""
            }));
            setSymptoms(mappedSymptoms);
          }
        }

        // Fetch patient diagnoses from the table
        if (regData?.registration_id) {
          const { data: diagRows, error: dError } = await supabase
            .from("aka_diagnoses")
            .select("*")
            .eq("registration_id", regData.registration_id);

          if (dError) {
            console.error("Failed to load patient diagnoses:", dError);
          } else if (diagRows) {
            const mappedDiagnoses = diagRows.map((row: any) => ({
              id: String(row.diagnosis_id),
              name: row.name || "",
              since: row.since || "",
              status: row.status || "",
              severity: row.severity || "",
              abdominalRegions: row.abdominal_regions || [],
              painTypes: row.pain_types || [],
              relievedBy: row.relieved_by || [],
              abdominalTenderness: row.abdominal_tenderness || "",
              palpations: row.palpations || [],
              auscultations: row.auscultations || [],
              clinicalCourse: row.clinical_course || "",
              note: row.note || ""
            }));
            setDiagnoses(mappedDiagnoses);
          }
        }

        // Fetch patient medications from the table
        if (regData?.registration_id) {
          const { data: medRows, error: mError } = await supabase
            .from("aka_patient_medications")
            .select(`
              patient_medication_id,
              medicine_id,
              dose,
              freq,
              timing,
              duration,
              start_from,
              instruction,
              medicine:medicine_id (
                name,
                salt_composition,
                short_composition1,
                type
              )
            `)
            .eq("registration_id", regData.registration_id);

          if (mError) {
            console.error("Failed to load patient medications:", mError);
          } else if (medRows) {
            const mappedMeds = medRows.map((row: any) => ({
              id: String(row.patient_medication_id),
              medicineId: row.medicine_id,
              name: row.medicine?.name || "",
              generic: row.medicine?.salt_composition || row.medicine?.short_composition1 || "",
              form: row.medicine?.type?.toLowerCase() || "tablet",
              dose: row.dose || "",
              freq: row.freq || "",
              timing: row.timing || "",
              duration: row.duration || "",
              start: row.start_from || "",
              instr: row.instruction || ""
            }));
            setMedications(mappedMeds);
          }
        }

        // Fetch patient labs from the table
        if (regData?.registration_id) {
          const { data: labRows, error: lError } = await supabase
            .from("aka_patient_labs")
            .select("*")
            .eq("registration_id", regData.registration_id);

          if (lError) {
            console.error("Failed to load patient labs:", lError);
          } else if (labRows) {
            const mappedLabs = labRows.map((row: any) => ({
              id: String(row.patient_lab_id),
              name: row.name || "",
              testOn: row.test_on || "",
              repeatOn: row.repeat_on || "",
              remarks: row.remarks || ""
            }));
            setLabs(mappedLabs);
          }
        }

        // Fetch patient lab results from aka_lab_result table
        if (regData?.registration_id) {
          const { data: resultRows, error: resError } = await supabase
            .from("aka_lab_result")
            .select("*")
            .eq("registration_id", regData.registration_id);

          if (resError) {
            console.error("Failed to load patient lab results:", resError);
          } else if (resultRows && resultRows.length > 0) {
            const mappedResults = resultRows.map((row: any) => ({
              id: String(row.lab_result_id),
              name: row.name || "",
              unit: row.unit || "",
              reading: row.reading || "",
              interpretation: row.interpretation || "",
              date: row.result_date || "",
              notes: row.notes || ""
            }));
            setLabResults(mappedResults);
          } else {
            setLabResults([]);
          }
        } else {
          setLabResults([]);
        }

        // Load vitals into state
        if (mappedPatient.vitals) {
          setBp(mappedPatient.vitals.bp || "");
          setPulse(mappedPatient.vitals.pulse || "");
          setWeight(mappedPatient.vitals.weight || "");
          setSpo2(mappedPatient.vitals.spo2 || "");
          setSugar(mappedPatient.vitals.sugar || "");
        }

        // Fetch referrals from aka_refer_to table
        if (regData?.registration_id) {
          const { data: refRows, error: refError } = await supabase
            .from("aka_refer_to")
            .select("*")
            .eq("registration_id", regData.registration_id);

          if (refError) {
            console.error("Failed to load referrals:", refError);
          } else if (refRows && refRows.length > 0) {
            setReferrals(refRows.map((r: any) => ({
              id: String(r.refer_id),
              doctorName: r.doctor_name || "",
              notes: r.notes || ""
            })));
          } else {
            setReferrals([]);
          }
        } else {
          setReferrals([{ id: "1", doctorName: "shaikh mudassir", notes: "" }]);
        }

        // Fetch procedures from aka_procedure table
        if (regData?.registration_id) {
          const { data: procRows, error: procError } = await supabase
            .from("aka_procedure")
            .select("*")
            .eq("registration_id", regData.registration_id);

          if (procError) {
            console.error("Failed to load procedures:", procError);
          } else if (procRows && procRows.length > 0) {
            setRxProcedures(procRows.map((r: any) => ({
              id: String(r.procedure_id),
              name: r.name || "",
              duration: r.duration || "",
              note: r.note || ""
            })));
          } else {
            setRxProcedures([]);
          }
        } else {
          setRxProcedures([
            { id: "1", name: "Actinotherapy", duration: "After 3 Days", note: "" },
            { id: "2", name: "APTT", duration: "After 3 Days", note: "" }
          ]);
        }

        // Load notes, follow-up and advice from aka_opd_registration if exists
        if (regData) {
          setNotesForPatient(regData.notes_for_patient || "");
          setPrivateNotes(regData.private_notes || "");
          setFollowUpVal(regData.follow_up || "");
          setFollowUpNotes(regData.follow_up_notes || "");
          setAdvicesInput(regData.advice || "");
          setAdvRest(regData.advice_rest || false);
          setAdvWater(regData.advice_water || false);
        }

        // Try load from local storage
        const savedRx = localStorage.getItem(`saved_rx_${rxPatientId}`);
        if (savedRx) {
          const parsed = JSON.parse(savedRx);
          if (parsed.medications && !regData?.registration_id) setMedications(parsed.medications);
          if (parsed.symptoms && !regData?.registration_id) setSymptoms(parsed.symptoms);
          if (parsed.diagnoses && !regData?.registration_id) setDiagnoses(parsed.diagnoses);
          if (parsed.labs && !regData?.registration_id) setLabs(parsed.labs);
          if (parsed.labResults && !regData?.registration_id) setLabResults(parsed.labResults);
          if (parsed.notesForPatient && !regData) setNotesForPatient(parsed.notesForPatient);
          if (parsed.privateNotes && !regData) setPrivateNotes(parsed.privateNotes);
          if (parsed.refDoctorInput) setRefDoctorInput(parsed.refDoctorInput);
          if (parsed.followUpVal && !regData) setFollowUpVal(parsed.followUpVal);
          if (parsed.followUpNotes && !regData) setFollowUpNotes(parsed.followUpNotes);
          if (parsed.advicesInput && !regData) setAdvicesInput(parsed.advicesInput);
          if (parsed.advRest !== undefined && !regData) setAdvRest(parsed.advRest);
          if (parsed.advWater !== undefined && !regData) setAdvWater(parsed.advWater);
          if (parsed.rxProcedures && !regData) setRxProcedures(parsed.rxProcedures);
          if (parsed.referrals && !regData) setReferrals(parsed.referrals);
        } else {
          // Initialize defaults
          if (!regData?.registration_id) {
            setSymptoms([]);
          }
          if (!regData?.registration_id) {
            setDiagnoses([{ id: "1", name: "Period pain", since: "2 Days", status: "Active" }]);
          }
          if (!regData?.registration_id) {
            setMedications([
              { id: "1", name: "Dolopar 650 Tablets", generic: "PARACETAMOL (650MG)", dose: "2 capsule", freq: "1-1-1", timing: "After Meal", duration: "10 Days", start: "Today", instr: "" },
              { id: "2", name: "Meftal-Spas Tablet", generic: "DICYCLOMINE (10MG) + MEFENAMIC ACID (250MG)", dose: "1 Tablet", freq: "1-0-1", timing: "After Meal", duration: "3 Days", start: "Today", instr: "" }
            ]);
          }
          if (!regData?.registration_id) {
            setLabs([{ id: "1", name: "Liver Function Test (LFT)", testOn: "2026-07-11", repeatOn: "2026-07-25", remarks: "" }]);
          }
          if (!regData?.registration_id) {
            setLabResults([]);
          }
          if (!regData) {
            setNotesForPatient("");
            setPrivateNotes("");
            setRefDoctorInput("");
            setFollowUpVal("");
            setFollowUpNotes("");
            setAdvicesInput("");
            setAdvRest(false);
            setAdvWater(false);
            setRxProcedures([
              { id: "1", name: "Actinotherapy", duration: "After 3 Days", note: "" },
              { id: "2", name: "APTT", duration: "After 3 Days", note: "" }
            ]);
            setReferrals([{ id: "1", doctorName: "shaikh mudassir", notes: "" }]);
          }
        }

      } catch (err) {
        console.error("Failed to load patient:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPatientData();
  }, [rxPatientId, sessionLoaded]);

  // Debounced auto-save effect for vitals and Rx metadata directly updating Supabase columns
  useEffect(() => {
    if (!currentRxPatient || loading) return;

    const regId = currentRxPatient.opdRegistration?.registration_id;
    if (!regId) return;

    const timer = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from("aka_opd_registration")
          .update({
            bp,
            pulse,
            weight,
            spo2,
            sugar,
            notes_for_patient: notesForPatient,
            private_notes: privateNotes,
            follow_up: getFollowUpDateValue(followUpVal),
            follow_up_notes: followUpNotes,
            advice: advicesInput,
            advice_rest: advRest,
            advice_water: advWater
          })
          .eq("registration_id", regId);

        if (error) throw error;
        console.log("Vitals and Rx metadata updated directly in DB via auto-save!");
      } catch (err) {
        console.error("Failed to auto-save vitals and metadata:", err);
      }
    }, 1000); // 1-second debounce to throttle database requests

    return () => clearTimeout(timer);
  }, [bp, pulse, weight, spo2, sugar, notesForPatient, privateNotes, followUpVal, followUpNotes, advicesInput, advRest, advWater, currentRxPatient, loading]);

  // Debounced auto-save effect for patient medical history
  useEffect(() => {
    if (!currentRxPatient || loading) return;

    const patientId = currentRxPatient.patient_id;
    const uhid = currentRxPatient.id;
    if (!uhid) return;

    const timer = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from("aka_patient_medical_history")
          .upsert({
            patient_id: patientId || 1,
            patient_uhid: uhid,
            no_known_history: histNoKnown,
            family_history: familyItems,
            existing_conditions: conditions,
            drug_allergies: allergies,
            surgical_procedures: procedures,
            current_medications: currentMeds,
            lifestyle_habits: habits,
            food_allergies: foodAllergies,
            other_history: otherHistory,
            other_history_title: otherHistoryTitle,
            travel_history: travelHistory,
            updated_at: new Date().toISOString()
          }, {
            onConflict: "patient_uhid"
          });

        if (error) throw error;
        console.log("Patient medical history auto-saved successfully!");
      } catch (err) {
        console.error("Failed to auto-save patient medical history:", err);
      }
    }, 1200); // 1.2 second debounce to group changes

    return () => clearTimeout(timer);
  }, [
    histNoKnown,
    familyItems,
    conditions,
    allergies,
    procedures,
    currentMeds,
    habits,
    foodAllergies,
    otherHistory,
    otherHistoryTitle,
    travelHistory,
    currentRxPatient,
    loading
  ]);

  // Debounced auto-save effect for patient symptoms
  useEffect(() => {
    if (!currentRxPatient || loading) return;

    const regId = currentRxPatient.opdRegistration?.registration_id;
    if (!regId) return;

    const timer = setTimeout(async () => {
      try {
        // 1. Delete rows from database that are no longer in our active list
        const activeDbIds = symptoms
          .map((sym) => Number(sym.id))
          .filter((id) => !isNaN(id) && id > 0);

        if (activeDbIds.length > 0) {
          const { error: delError } = await supabase
            .from("aka_symptoms")
            .delete()
            .eq("registration_id", regId)
            .not("symptom_id", "in", `(${activeDbIds.join(",")})`);
          if (delError) throw delError;
        } else {
          const { error: delError } = await supabase
            .from("aka_symptoms")
            .delete()
            .eq("registration_id", regId);
          if (delError) throw delError;
        }

        // 2. Separate symptoms into existing (upsert) and new (insert)
        const rowsToUpdate = symptoms
          .filter((sym) => !isNaN(Number(sym.id)) && Number(sym.id) > 0 && Number(sym.id) < 10000000000)
          .map((sym) => ({
            symptom_id: Number(sym.id),
            registration_id: regId,
            name: sym.name || "",
            duration: sym.duration || "",
            severity: sym.severity || "",
            headache_sites: sym.headacheSites || [],
            pain_types: sym.painTypes || [],
            clinical_course: sym.clinicalCourse || "",
            note: sym.note || ""
          }));

        const rowsToInsert = symptoms
          .filter((sym) => isNaN(Number(sym.id)) || Number(sym.id) >= 10000000000)
          .map((sym) => ({
            registration_id: regId,
            name: sym.name || "",
            duration: sym.duration || "",
            severity: sym.severity || "",
            headache_sites: sym.headacheSites || [],
            pain_types: sym.painTypes || [],
            clinical_course: sym.clinicalCourse || "",
            note: sym.note || ""
          }));

        if (rowsToUpdate.length > 0) {
          const { error: upsertError } = await supabase
            .from("aka_symptoms")
            .upsert(rowsToUpdate, { onConflict: "symptom_id" });
          if (upsertError) throw upsertError;
        }

        if (rowsToInsert.length > 0) {
          const { data: insertedRows, error: insError } = await supabase
            .from("aka_symptoms")
            .insert(rowsToInsert)
            .select("symptom_id, name");

          if (insError) throw insError;

          // Update local state IDs for newly inserted symptoms
          if (insertedRows) {
            setSymptoms((prev) => {
              return prev.map((s) => {
                const matchingRow = insertedRows.find((r) => r.name === s.name);
                if (matchingRow && (isNaN(Number(s.id)) || Number(s.id) >= 10000000000)) {
                  return { ...s, id: String(matchingRow.symptom_id) };
                }
                return s;
              });
            });
          }
        }

        console.log("Symptoms auto-saved successfully (IDs preserved)!");
      } catch (err) {
        console.error("Failed to auto-save symptoms:", err);
      }
    }, 1200); // 1.2 second debounce

    return () => clearTimeout(timer);
  }, [symptoms, currentRxPatient, loading]);

  // Debounced auto-save effect for patient diagnoses
  useEffect(() => {
    if (!currentRxPatient || loading) return;

    const regId = currentRxPatient.opdRegistration?.registration_id;
    if (!regId) return;

    const timer = setTimeout(async () => {
      try {
        // 1. Delete rows from database that are no longer in our active list
        const activeDbIds = diagnoses
          .map((d) => Number(d.id))
          .filter((id) => !isNaN(id) && id > 0);

        if (activeDbIds.length > 0) {
          const { error: delError } = await supabase
            .from("aka_diagnoses")
            .delete()
            .eq("registration_id", regId)
            .not("diagnosis_id", "in", `(${activeDbIds.join(",")})`);
          if (delError) throw delError;
        } else {
          const { error: delError } = await supabase
            .from("aka_diagnoses")
            .delete()
            .eq("registration_id", regId);
          if (delError) throw delError;
        }

        // 2. Separate into update and insert
        const rowsToUpdate = diagnoses
          .filter((d) => !isNaN(Number(d.id)) && Number(d.id) > 0 && Number(d.id) < 10000000000)
          .map((d) => ({
            diagnosis_id: Number(d.id),
            registration_id: regId,
            name: d.name || "",
            since: d.since || "",
            status: d.status || "",
            severity: d.severity || "",
            abdominal_regions: d.abdominalRegions || [],
            pain_types: d.painTypes || [],
            relieved_by: d.relievedBy || [],
            abdominal_tenderness: d.abdominalTenderness || "",
            palpations: d.palpations || [],
            auscultations: d.auscultations || [],
            clinical_course: d.clinicalCourse || "",
            note: d.note || ""
          }));

        const rowsToInsert = diagnoses
          .filter((d) => isNaN(Number(d.id)) || Number(d.id) >= 10000000000)
          .map((d) => ({
            registration_id: regId,
            name: d.name || "",
            since: d.since || "",
            status: d.status || "",
            severity: d.severity || "",
            abdominal_regions: d.abdominalRegions || [],
            pain_types: d.painTypes || [],
            relieved_by: d.relievedBy || [],
            abdominal_tenderness: d.abdominalTenderness || "",
            palpations: d.palpations || [],
            auscultations: d.auscultations || [],
            clinical_course: d.clinicalCourse || "",
            note: d.note || ""
          }));

        if (rowsToUpdate.length > 0) {
          const { error: upsertError } = await supabase
            .from("aka_diagnoses")
            .upsert(rowsToUpdate, { onConflict: "diagnosis_id" });
          if (upsertError) throw upsertError;
        }

        if (rowsToInsert.length > 0) {
          const { data: insertedRows, error: insError } = await supabase
            .from("aka_diagnoses")
            .insert(rowsToInsert)
            .select("diagnosis_id, name");

          if (insError) throw insError;

          // Update local state IDs for newly inserted diagnoses
          if (insertedRows) {
            setDiagnoses((prev) => {
              return prev.map((d) => {
                const matchingRow = insertedRows.find((r) => r.name === d.name);
                if (matchingRow && (isNaN(Number(d.id)) || Number(d.id) >= 10000000000)) {
                  return { ...d, id: String(matchingRow.diagnosis_id) };
                }
                return d;
              });
            });
          }
        }

        console.log("Diagnoses auto-saved successfully (IDs preserved)!");
      } catch (err) {
        console.error("Failed to auto-save diagnoses:", err);
      }
    }, 1200); // 1.2 second debounce

    return () => clearTimeout(timer);
  }, [diagnoses, currentRxPatient, loading]);

  // Debounced auto-save effect for patient medications
  useEffect(() => {
    if (!currentRxPatient || loading) return;

    const regId = currentRxPatient.opdRegistration?.registration_id;
    if (!regId) return;

    const timer = setTimeout(async () => {
      try {
        // 1. Delete rows from database that are no longer in our active list
        const activeDbIds = medications
          .map((m) => Number(m.id))
          .filter((id) => !isNaN(id) && id > 0);

        if (activeDbIds.length > 0) {
          const { error: delError } = await supabase
            .from("aka_patient_medications")
            .delete()
            .eq("registration_id", regId)
            .not("patient_medication_id", "in", `(${activeDbIds.join(",")})`);
          if (delError) throw delError;
        } else {
          const { error: delError } = await supabase
            .from("aka_patient_medications")
            .delete()
            .eq("registration_id", regId);
          if (delError) throw delError;
        }

        // 2. Separate into update and insert
        // Only sync medications that have a valid medicineId from public.medicine!
        const rowsToUpdate = medications
          .filter((m) => m.medicineId && !isNaN(Number(m.id)) && Number(m.id) > 0 && Number(m.id) < 10000000000)
          .map((m) => ({
            patient_medication_id: Number(m.id),
            registration_id: regId,
            medicine_id: m.medicineId,
            dose: m.dose || "",
            freq: m.freq || "",
            timing: m.timing || "",
            duration: m.duration || "",
            start_from: m.start || "",
            instruction: m.instr || ""
          }));

        const rowsToInsert = medications
          .filter((m) => m.medicineId && (isNaN(Number(m.id)) || Number(m.id) >= 10000000000))
          .map((m) => ({
            registration_id: regId,
            medicine_id: m.medicineId,
            dose: m.dose || "",
            freq: m.freq || "",
            timing: m.timing || "",
            duration: m.duration || "",
            start_from: m.start || "",
            instruction: m.instr || ""
          }));

        if (rowsToUpdate.length > 0) {
          const { error: upsertError } = await supabase
            .from("aka_patient_medications")
            .upsert(rowsToUpdate, { onConflict: "patient_medication_id" });
          if (upsertError) throw upsertError;
        }

        if (rowsToInsert.length > 0) {
          const { data: insertedRows, error: insError } = await supabase
            .from("aka_patient_medications")
            .insert(rowsToInsert)
            .select("patient_medication_id, medicine_id");

          if (insError) throw insError;

          // Update local state IDs for newly inserted medications
          if (insertedRows) {
            setMedications((prev) => {
              return prev.map((m) => {
                const matchingRow = insertedRows.find((r) => r.medicine_id === m.medicineId);
                if (matchingRow && (isNaN(Number(m.id)) || Number(m.id) >= 10000000000)) {
                  return { ...m, id: String(matchingRow.patient_medication_id) };
                }
                return m;
              });
            });
          }
        }

        console.log("Medications auto-saved successfully (IDs preserved)!");
      } catch (err) {
        console.error("Failed to auto-save medications:", err);
      }
    }, 1200); // 1.2 second debounce

    return () => clearTimeout(timer);
  }, [medications, currentRxPatient, loading]);

  // Debounced auto-save effect for patient labs
  useEffect(() => {
    if (!currentRxPatient || loading) return;

    const regId = currentRxPatient.opdRegistration?.registration_id;
    if (!regId) return;

    const timer = setTimeout(async () => {
      try {
        // 1. Delete rows from database that are no longer in our active list
        const activeDbIds = labs
          .map((l) => Number(l.id))
          .filter((id) => !isNaN(id) && id > 0);

        if (activeDbIds.length > 0) {
          const { error: delError } = await supabase
            .from("aka_patient_labs")
            .delete()
            .eq("registration_id", regId)
            .not("patient_lab_id", "in", `(${activeDbIds.join(",")})`);
          if (delError) throw delError;
        } else {
          const { error: delError } = await supabase
            .from("aka_patient_labs")
            .delete()
            .eq("registration_id", regId);
          if (delError) throw delError;
        }

        // 2. Separate into update and insert
        const rowsToUpdate = labs
          .filter((l) => !isNaN(Number(l.id)) && Number(l.id) > 0 && Number(l.id) < 10000000000)
          .map((l) => ({
            patient_lab_id: Number(l.id),
            registration_id: regId,
            name: l.name || "",
            test_on: l.testOn || "",
            repeat_on: l.repeatOn || "",
            remarks: l.remarks || ""
          }));

        const rowsToInsert = labs
          .filter((l) => isNaN(Number(l.id)) || Number(l.id) >= 10000000000)
          .map((l) => ({
            registration_id: regId,
            name: l.name || "",
            test_on: l.testOn || "",
            repeat_on: l.repeatOn || "",
            remarks: l.remarks || ""
          }));

        if (rowsToUpdate.length > 0) {
          const { error: upsertError } = await supabase
            .from("aka_patient_labs")
            .upsert(rowsToUpdate, { onConflict: "patient_lab_id" });
          if (upsertError) throw upsertError;
        }

        if (rowsToInsert.length > 0) {
          const { data: insertedRows, error: insError } = await supabase
            .from("aka_patient_labs")
            .insert(rowsToInsert)
            .select("patient_lab_id, name");

          if (insError) throw insError;

          // Update local state IDs for newly inserted labs
          if (insertedRows) {
            setLabs((prev) => {
              return prev.map((l) => {
                const matchingRow = insertedRows.find((r) => r.name === l.name);
                if (matchingRow && (isNaN(Number(l.id)) || Number(l.id) >= 10000000000)) {
                  return { ...l, id: String(matchingRow.patient_lab_id) };
                }
                return l;
              });
            });
          }
        }

        console.log("Labs auto-saved successfully (IDs preserved)!");
      } catch (err) {
        console.error("Failed to auto-save labs:", err);
      }
    }, 1200); // 1.2 second debounce

    return () => clearTimeout(timer);
  }, [labs, currentRxPatient, loading]);

  // Debounced auto-save effect for patient lab results
  useEffect(() => {
    if (!currentRxPatient || loading) return;

    const regId = currentRxPatient.opdRegistration?.registration_id;
    if (!regId) return;

    const timer = setTimeout(async () => {
      try {
        // 1. Delete rows from database that are no longer in our active list
        const activeDbIds = labResults
          .map((r) => Number(r.id))
          .filter((id) => !isNaN(id) && id > 0);

        if (activeDbIds.length > 0) {
          const { error: delError } = await supabase
            .from("aka_lab_result")
            .delete()
            .eq("registration_id", regId)
            .not("lab_result_id", "in", `(${activeDbIds.join(",")})`);
          if (delError) throw delError;
        } else {
          const { error: delError } = await supabase
            .from("aka_lab_result")
            .delete()
            .eq("registration_id", regId);
          if (delError) throw delError;
        }

        // 2. Separate into update and insert
        const rowsToUpdate = labResults
          .filter((r) => !isNaN(Number(r.id)) && Number(r.id) > 0 && Number(r.id) < 10000000000)
          .map((r) => ({
            lab_result_id: Number(r.id),
            registration_id: regId,
            patient_uhid: currentRxPatient.id,
            name: r.name || "",
            unit: r.unit || "",
            reading: r.reading || "",
            interpretation: r.interpretation || "",
            result_date: r.date || "",
            notes: r.notes || ""
          }));

        const rowsToInsert = labResults
          .filter((r) => isNaN(Number(r.id)) || Number(r.id) >= 10000000000)
          .map((r) => ({
            registration_id: regId,
            patient_uhid: currentRxPatient.id,
            name: r.name || "",
            unit: r.unit || "",
            reading: r.reading || "",
            interpretation: r.interpretation || "",
            result_date: r.date || "",
            notes: r.notes || ""
          }));

        if (rowsToUpdate.length > 0) {
          const { error: upsertError } = await supabase
            .from("aka_lab_result")
            .upsert(rowsToUpdate, { onConflict: "lab_result_id" });
          if (upsertError) throw upsertError;
        }

        if (rowsToInsert.length > 0) {
          const { data: insertedRows, error: insError } = await supabase
            .from("aka_lab_result")
            .insert(rowsToInsert)
            .select("lab_result_id, name");

          if (insError) throw insError;

          // Update local state IDs for newly inserted lab results
          if (insertedRows) {
            setLabResults((prev) => {
              return prev.map((item) => {
                const matchingRow = insertedRows.find((r) => r.name === item.name);
                if (matchingRow && (isNaN(Number(item.id)) || Number(item.id) >= 10000000000)) {
                  return { ...item, id: String(matchingRow.lab_result_id) };
                }
                return item;
              });
            });
          }
        }

        console.log("Lab results auto-saved successfully (IDs preserved)!");
      } catch (err) {
        console.error("Failed to auto-save lab results:", err);
      }
    }, 1200); // 1.2 second debounce

    return () => clearTimeout(timer);
  }, [labResults, currentRxPatient, loading]);

  // Debounced auto-save effect for patient procedures
  useEffect(() => {
    if (!currentRxPatient || loading) return;

    const regId = currentRxPatient.opdRegistration?.registration_id;
    if (!regId) return;

    const timer = setTimeout(async () => {
      try {
        // 1. Delete rows from database that are no longer in our active list
        const activeDbIds = rxProcedures
          .map((p) => Number(p.id))
          .filter((id) => !isNaN(id) && id > 0);

        if (activeDbIds.length > 0) {
          const { error: delError } = await supabase
            .from("aka_procedure")
            .delete()
            .eq("registration_id", regId)
            .not("procedure_id", "in", `(${activeDbIds.join(",")})`);
          if (delError) throw delError;
        } else {
          const { error: delError } = await supabase
            .from("aka_procedure")
            .delete()
            .eq("registration_id", regId);
          if (delError) throw delError;
        }

        // 2. Separate into update and insert
        const rowsToUpdate = rxProcedures
          .filter((p) => !isNaN(Number(p.id)) && Number(p.id) > 0 && Number(p.id) < 10000000000)
          .map((p) => ({
            procedure_id: Number(p.id),
            registration_id: regId,
            patient_uhid: currentRxPatient.id,
            name: p.name || "",
            duration: p.duration || "",
            note: p.note || ""
          }));

        const rowsToInsert = rxProcedures
          .filter((p) => isNaN(Number(p.id)) || Number(p.id) >= 10000000000)
          .map((p) => ({
            registration_id: regId,
            patient_uhid: currentRxPatient.id,
            name: p.name || "",
            duration: p.duration || "",
            note: p.note || ""
          }));

        if (rowsToUpdate.length > 0) {
          const { error: upsertError } = await supabase
            .from("aka_procedure")
            .upsert(rowsToUpdate, { onConflict: "procedure_id" });
          if (upsertError) throw upsertError;
        }

        if (rowsToInsert.length > 0) {
          const { data: insertedRows, error: insError } = await supabase
            .from("aka_procedure")
            .insert(rowsToInsert)
            .select("procedure_id, name");

          if (insError) throw insError;

          // Update local state IDs for newly inserted procedures
          if (insertedRows) {
            setRxProcedures((prev) => {
              return prev.map((item) => {
                const matchingRow = insertedRows.find((r) => r.name === item.name);
                if (matchingRow && (isNaN(Number(item.id)) || Number(item.id) >= 10000000000)) {
                  return { ...item, id: String(matchingRow.procedure_id) };
                }
                return item;
              });
            });
          }
        }

        console.log("Procedures auto-saved successfully!");
      } catch (err) {
        console.error("Failed to auto-save procedures:", err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [rxProcedures, currentRxPatient, loading]);

  // Debounced auto-save effect for patient doctor referrals
  useEffect(() => {
    if (!currentRxPatient || loading) return;

    const regId = currentRxPatient.opdRegistration?.registration_id;
    if (!regId) return;

    const timer = setTimeout(async () => {
      try {
        // 1. Delete rows from database that are no longer in our active list
        const activeDbIds = referrals
          .map((r) => Number(r.id))
          .filter((id) => !isNaN(id) && id > 0);

        if (activeDbIds.length > 0) {
          const { error: delError } = await supabase
            .from("aka_refer_to")
            .delete()
            .eq("registration_id", regId)
            .not("refer_id", "in", `(${activeDbIds.join(",")})`);
          if (delError) throw delError;
        } else {
          const { error: delError } = await supabase
            .from("aka_refer_to")
            .delete()
            .eq("registration_id", regId);
          if (delError) throw delError;
        }

        // 2. Separate into update and insert
        const rowsToUpdate = referrals
          .filter((r) => !isNaN(Number(r.id)) && Number(r.id) > 0 && Number(r.id) < 10000000000)
          .map((r) => ({
            refer_id: Number(r.id),
            registration_id: regId,
            patient_uhid: currentRxPatient.id,
            doctor_name: r.doctorName || "",
            notes: r.notes || ""
          }));

        const rowsToInsert = referrals
          .filter((r) => isNaN(Number(r.id)) || Number(r.id) >= 10000000000)
          .map((r) => ({
            registration_id: regId,
            patient_uhid: currentRxPatient.id,
            doctor_name: r.doctorName || "",
            notes: r.notes || ""
          }));

        if (rowsToUpdate.length > 0) {
          const { error: upsertError } = await supabase
            .from("aka_refer_to")
            .upsert(rowsToUpdate, { onConflict: "refer_id" });
          if (upsertError) throw upsertError;
        }

        if (rowsToInsert.length > 0) {
          const { data: insertedRows, error: insError } = await supabase
            .from("aka_refer_to")
            .insert(rowsToInsert)
            .select("refer_id, doctor_name");

          if (insError) throw insError;

          // Update local state IDs for newly inserted referrals
          if (insertedRows) {
            setReferrals((prev) => {
              return prev.map((item) => {
                const matchingRow = insertedRows.find((r) => r.doctor_name === item.doctorName);
                if (matchingRow && (isNaN(Number(item.id)) || Number(item.id) >= 10000000000)) {
                  return { ...item, id: String(matchingRow.refer_id) };
                }
                return item;
              });
            });
          }
        }

        console.log("Referrals auto-saved successfully!");
      } catch (err) {
        console.error("Failed to auto-save referrals:", err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [referrals, currentRxPatient, loading]);

  const handleFinishPrescription = async () => {
    if (!currentRxPatient) return;
    
    try {
      // 1. Save state in local storage
      const rxState = {
        medications,
        symptoms,
        diagnoses,
        labs,
        labResults,
        notesForPatient,
        privateNotes,
        refDoctorInput,
        followUpVal,
        followUpNotes,
        advicesInput,
        advRest,
        advWater,
        rxProcedures,
        referrals
      };
      localStorage.setItem(`saved_rx_${currentRxPatient.id}`, JSON.stringify(rxState));

      // 2. Add to completed appointments list
      const regId = currentRxPatient.opdRegistration?.registration_id;
      if (regId) {
        const completedList = JSON.parse(localStorage.getItem("completed_appointments") || "[]");
        if (!completedList.includes(String(regId))) {
          localStorage.setItem("completed_appointments", JSON.stringify([...completedList, String(regId)]));
        }
      }

      // 3. Save updated vitals in aka_opd_registration database table
      if (currentRxPatient.opdRegistration?.registration_id) {
        const regId = currentRxPatient.opdRegistration.registration_id;
        const { error } = await supabase
          .from("aka_opd_registration")
          .update({
            bp,
            pulse,
            weight,
            spo2,
            sugar,
            notes_for_patient: notesForPatient,
            private_notes: privateNotes,
            follow_up: getFollowUpDateValue(followUpVal),
            follow_up_notes: followUpNotes,
            advice: advicesInput,
            advice_rest: advRest,
            advice_water: advWater,
            is_completed: true
          })
          .eq("registration_id", regId);
        
        if (error) throw error;

        const activeDbIds = symptoms
          .map((sym) => Number(sym.id))
          .filter((id) => !isNaN(id) && id > 0);

        if (activeDbIds.length > 0) {
          const { error: delError } = await supabase
            .from("aka_symptoms")
            .delete()
            .eq("registration_id", regId)
            .not("symptom_id", "in", `(${activeDbIds.join(",")})`);
          if (delError) throw delError;
        } else {
          const { error: delError } = await supabase
            .from("aka_symptoms")
            .delete()
            .eq("registration_id", regId);
          if (delError) throw delError;
        }

        const rowsToUpdate = symptoms
          .filter((sym) => !isNaN(Number(sym.id)) && Number(sym.id) > 0 && Number(sym.id) < 10000000000)
          .map((sym) => ({
            symptom_id: Number(sym.id),
            registration_id: regId,
            name: sym.name || "",
            duration: sym.duration || "",
            severity: sym.severity || "",
            headache_sites: sym.headacheSites || [],
            pain_types: sym.painTypes || [],
            clinical_course: sym.clinicalCourse || "",
            note: sym.note || ""
          }));

        const rowsToInsert = symptoms
          .filter((sym) => isNaN(Number(sym.id)) || Number(sym.id) >= 10000000000)
          .map((sym) => ({
            registration_id: regId,
            name: sym.name || "",
            duration: sym.duration || "",
            severity: sym.severity || "",
            headache_sites: sym.headacheSites || [],
            pain_types: sym.painTypes || [],
            clinical_course: sym.clinicalCourse || "",
            note: sym.note || ""
          }));

        if (rowsToUpdate.length > 0) {
          const { error: upsertError } = await supabase
            .from("aka_symptoms")
            .upsert(rowsToUpdate, { onConflict: "symptom_id" });
          if (upsertError) throw upsertError;
        }

        if (rowsToInsert.length > 0) {
          const { error: insError } = await supabase
            .from("aka_symptoms")
            .insert(rowsToInsert);
          if (insError) throw insError;
        }

        const diagActiveIds = diagnoses
          .map((d) => Number(d.id))
          .filter((id) => !isNaN(id) && id > 0);

        if (diagActiveIds.length > 0) {
          const { error: delError } = await supabase
            .from("aka_diagnoses")
            .delete()
            .eq("registration_id", regId)
            .not("diagnosis_id", "in", `(${diagActiveIds.join(",")})`);
          if (delError) throw delError;
        } else {
          const { error: delError } = await supabase
            .from("aka_diagnoses")
            .delete()
            .eq("registration_id", regId);
          if (delError) throw delError;
        }

        const diagToUpdate = diagnoses
          .filter((d) => !isNaN(Number(d.id)) && Number(d.id) > 0 && Number(d.id) < 10000000000)
          .map((d) => ({
            diagnosis_id: Number(d.id),
            registration_id: regId,
            name: d.name || "",
            since: d.since || "",
            status: d.status || "",
            severity: d.severity || "",
            abdominal_regions: d.abdominalRegions || [],
            pain_types: d.painTypes || [],
            relieved_by: d.relievedBy || [],
            abdominal_tenderness: d.abdominalTenderness || "",
            palpations: d.palpations || [],
            auscultations: d.auscultations || [],
            clinical_course: d.clinicalCourse || "",
            note: d.note || ""
          }));

        const diagToInsert = diagnoses
          .filter((d) => isNaN(Number(d.id)) || Number(d.id) >= 10000000000)
          .map((d) => ({
            registration_id: regId,
            name: d.name || "",
            since: d.since || "",
            status: d.status || "",
            severity: d.severity || "",
            abdominal_regions: d.abdominalRegions || [],
            pain_types: d.painTypes || [],
            relieved_by: d.relievedBy || [],
            abdominal_tenderness: d.abdominalTenderness || "",
            palpations: d.palpations || [],
            auscultations: d.auscultations || [],
            clinical_course: d.clinicalCourse || "",
            note: d.note || ""
          }));

        if (diagToUpdate.length > 0) {
          const { error: upsertError } = await supabase
            .from("aka_diagnoses")
            .upsert(diagToUpdate, { onConflict: "diagnosis_id" });
          if (upsertError) throw upsertError;
        }

        if (diagToInsert.length > 0) {
          const { error: insError } = await supabase
            .from("aka_diagnoses")
            .insert(diagToInsert);
          if (insError) throw insError;
        }

        const medActiveIds = medications
          .map((m) => Number(m.id))
          .filter((id) => !isNaN(id) && id > 0);

        if (medActiveIds.length > 0) {
          const { error: delError } = await supabase
            .from("aka_patient_medications")
            .delete()
            .eq("registration_id", regId)
            .not("patient_medication_id", "in", `(${medActiveIds.join(",")})`);
          if (delError) throw delError;
        } else {
          const { error: delError } = await supabase
            .from("aka_patient_medications")
            .delete()
            .eq("registration_id", regId);
          if (delError) throw delError;
        }

        const medToUpdate = medications
          .filter((m) => m.medicineId && !isNaN(Number(m.id)) && Number(m.id) > 0 && Number(m.id) < 10000000000)
          .map((m) => ({
            patient_medication_id: Number(m.id),
            registration_id: regId,
            medicine_id: m.medicineId,
            dose: m.dose || "",
            freq: m.freq || "",
            timing: m.timing || "",
            duration: m.duration || "",
            start_from: m.start || "",
            instruction: m.instr || ""
          }));

        const medToInsert = medications
          .filter((m) => m.medicineId && (isNaN(Number(m.id)) || Number(m.id) >= 10000000000))
          .map((m) => ({
            registration_id: regId,
            medicine_id: m.medicineId,
            dose: m.dose || "",
            freq: m.freq || "",
            timing: m.timing || "",
            duration: m.duration || "",
            start_from: m.start || "",
            instruction: m.instr || ""
          }));

        if (medToUpdate.length > 0) {
          const { error: upsertError } = await supabase
            .from("aka_patient_medications")
            .upsert(medToUpdate, { onConflict: "patient_medication_id" });
          if (upsertError) throw upsertError;
        }

        if (medToInsert.length > 0) {
          const { error: insError } = await supabase
            .from("aka_patient_medications")
            .insert(medToInsert);
          if (insError) throw insError;
        }

        // Save labs to database
        const labActiveIds = labs
          .map((l) => Number(l.id))
          .filter((id) => !isNaN(id) && id > 0);

        if (labActiveIds.length > 0) {
          const { error: delError } = await supabase
            .from("aka_patient_labs")
            .delete()
            .eq("registration_id", regId)
            .not("patient_lab_id", "in", `(${labActiveIds.join(",")})`);
          if (delError) throw delError;
        } else {
          const { error: delError } = await supabase
            .from("aka_patient_labs")
            .delete()
            .eq("registration_id", regId);
          if (delError) throw delError;
        }

        const labToUpdate = labs
          .filter((l) => !isNaN(Number(l.id)) && Number(l.id) > 0 && Number(l.id) < 10000000000)
          .map((l) => ({
            patient_lab_id: Number(l.id),
            registration_id: regId,
            name: l.name || "",
            test_on: l.testOn || "",
            repeat_on: l.repeatOn || "",
            remarks: l.remarks || ""
          }));

        const labToInsert = labs
          .filter((l) => isNaN(Number(l.id)) || Number(l.id) >= 10000000000)
          .map((l) => ({
            registration_id: regId,
            name: l.name || "",
            test_on: l.testOn || "",
            repeat_on: l.repeatOn || "",
            remarks: l.remarks || ""
          }));

        if (labToUpdate.length > 0) {
          const { error: upsertError } = await supabase
            .from("aka_patient_labs")
            .upsert(labToUpdate, { onConflict: "patient_lab_id" });
          if (upsertError) throw upsertError;
        }

        if (labToInsert.length > 0) {
          const { error: insError } = await supabase
            .from("aka_patient_labs")
            .insert(labToInsert);
          if (insError) throw insError;
        }

        // Save lab results to database aka_lab_result
        const resultActiveIds = labResults
          .map((r) => Number(r.id))
          .filter((id) => !isNaN(id) && id > 0);

        if (resultActiveIds.length > 0) {
          const { error: delError } = await supabase
            .from("aka_lab_result")
            .delete()
            .eq("registration_id", regId)
            .not("lab_result_id", "in", `(${resultActiveIds.join(",")})`);
          if (delError) throw delError;
        } else {
          const { error: delError } = await supabase
            .from("aka_lab_result")
            .delete()
            .eq("registration_id", regId);
          if (delError) throw delError;
        }

        const resultToUpdate = labResults
          .filter((r) => !isNaN(Number(r.id)) && Number(r.id) > 0 && Number(r.id) < 10000000000)
          .map((r) => ({
            lab_result_id: Number(r.id),
            registration_id: regId,
            patient_uhid: currentRxPatient.id,
            name: r.name || "",
            unit: r.unit || "",
            reading: r.reading || "",
            interpretation: r.interpretation || "",
            result_date: r.date || "",
            notes: r.notes || ""
          }));

        const resultToInsert = labResults
          .filter((r) => isNaN(Number(r.id)) || Number(r.id) >= 10000000000)
          .map((r) => ({
            registration_id: regId,
            patient_uhid: currentRxPatient.id,
            name: r.name || "",
            unit: r.unit || "",
            reading: r.reading || "",
            interpretation: r.interpretation || "",
            result_date: r.date || "",
            notes: r.notes || ""
          }));

        if (resultToUpdate.length > 0) {
          const { error: upsertError } = await supabase
            .from("aka_lab_result")
            .upsert(resultToUpdate, { onConflict: "lab_result_id" });
          if (upsertError) throw upsertError;
        }

        if (resultToInsert.length > 0) {
          const { error: insError } = await supabase
            .from("aka_lab_result")
            .insert(resultToInsert);
          if (insError) throw insError;
        }

        // Save procedures to database aka_procedure
        const procedureActiveIds = rxProcedures
          .map((p) => Number(p.id))
          .filter((id) => !isNaN(id) && id > 0);

        if (procedureActiveIds.length > 0) {
          const { error: delError } = await supabase
            .from("aka_procedure")
            .delete()
            .eq("registration_id", regId)
            .not("procedure_id", "in", `(${procedureActiveIds.join(",")})`);
          if (delError) throw delError;
        } else {
          const { error: delError } = await supabase
            .from("aka_procedure")
            .delete()
            .eq("registration_id", regId);
          if (delError) throw delError;
        }

        const procToUpdate = rxProcedures
          .filter((p) => !isNaN(Number(p.id)) && Number(p.id) > 0 && Number(p.id) < 10000000000)
          .map((p) => ({
            procedure_id: Number(p.id),
            registration_id: regId,
            patient_uhid: currentRxPatient.id,
            name: p.name || "",
            duration: p.duration || "",
            note: p.note || ""
          }));

        const procToInsert = rxProcedures
          .filter((p) => isNaN(Number(p.id)) || Number(p.id) >= 10000000000)
          .map((p) => ({
            registration_id: regId,
            patient_uhid: currentRxPatient.id,
            name: p.name || "",
            duration: p.duration || "",
            note: p.note || ""
          }));

        if (procToUpdate.length > 0) {
          const { error: upsertError } = await supabase
            .from("aka_procedure")
            .upsert(procToUpdate, { onConflict: "procedure_id" });
          if (upsertError) throw upsertError;
        }

        if (procToInsert.length > 0) {
          const { error: insError } = await supabase
            .from("aka_procedure")
            .insert(procToInsert);
          if (insError) throw insError;
        }

        // Save referrals to database aka_refer_to
        const referActiveIds = referrals
          .map((r) => Number(r.id))
          .filter((id) => !isNaN(id) && id > 0);

        if (referActiveIds.length > 0) {
          const { error: delError } = await supabase
            .from("aka_refer_to")
            .delete()
            .eq("registration_id", regId)
            .not("refer_id", "in", `(${referActiveIds.join(",")})`);
          if (delError) throw delError;
        } else {
          const { error: delError } = await supabase
            .from("aka_refer_to")
            .delete()
            .eq("registration_id", regId);
          if (delError) throw delError;
        }

        const referToUpdate = referrals
          .filter((r) => !isNaN(Number(r.id)) && Number(r.id) > 0 && Number(r.id) < 10000000000)
          .map((r) => ({
            refer_id: Number(r.id),
            registration_id: regId,
            patient_uhid: currentRxPatient.id,
            doctor_name: r.doctorName || "",
            notes: r.notes || ""
          }));

        const referToInsert = referrals
          .filter((r) => isNaN(Number(r.id)) || Number(r.id) >= 10000000000)
          .map((r) => ({
            registration_id: regId,
            patient_uhid: currentRxPatient.id,
            doctor_name: r.doctorName || "",
            notes: r.notes || ""
          }));

        if (referToUpdate.length > 0) {
          const { error: upsertError } = await supabase
            .from("aka_refer_to")
            .upsert(referToUpdate, { onConflict: "refer_id" });
          if (upsertError) throw upsertError;
        }

        if (referToInsert.length > 0) {
          const { error: insError } = await supabase
            .from("aka_refer_to")
            .insert(referToInsert);
          if (insError) throw insError;
        }
      }

      // 4. Redirect to dynamic prescription print page
      if (regId) {
        router.push(`/prescription/${regId}`);
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error("Failed to save prescription:", err);
    }
  };

  const handlePrintPrescription = async () => {
    if (!currentRxPatient) return;
    if (printRef.current) {
      await printRef.current.generatePDF();
    } else {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F6F8] font-sans select-none">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Patient Records...</p>
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

  return (
    <>
      <div id="main-rx-container" className="flex flex-col h-screen w-screen bg-white overflow-hidden font-sans select-none">
      
      {/* PRESCRIPTION HEADER */}
      <header className="h-12 bg-white border-b border-[#E2E8F0] px-4 flex items-center justify-between shrink-0 shadow-2xs">
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
          <button 
            onClick={() => router.push(`/rx/overview?rx=${rxPatientId}`)}
            className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground transition-all"
          >
            Overview {pastVisitsCount > 0 ? `(${pastVisitsCount})` : `(0)`}
          </button>
          <button className="h-full px-3 text-[11px] font-bold text-primary border-b-2 border-primary">Pad</button>
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

      {/* PRESCRIPTION PAD CONTENT */}
      <main className="flex-1 overflow-y-auto w-full bg-[#F8FAFC] p-5 space-y-5 pb-24">
        
        <VitalsCard
          bp={bp}
          setBp={setBp}
          pulse={pulse}
          setPulse={setPulse}
          weight={weight}
          setWeight={setWeight}
          spo2={spo2}
          setSpo2={setSpo2}
          sugar={sugar}
          setSugar={setSugar}
        />

        <MedicalHistoryCard
          histNoKnown={histNoKnown}
          setHistNoKnown={setHistNoKnown}
          histDiabetes={histDiabetes}
          setHistDiabetes={setHistDiabetes}
          histDiabetesSince={histDiabetesSince}
          setHistDiabetesSince={setHistDiabetesSince}
          histHypothyroid={histHypothyroid}
          setHistHypothyroid={setHistHypothyroid}
          histHypertension={histHypertension}
          setHistHypertension={setHistHypertension}
          histAlcohol={histAlcohol}
          setHistAlcohol={setHistAlcohol}
          histTobacco={histTobacco}
          setHistTobacco={setHistTobacco}
          histSmoke={histSmoke}
          setHistSmoke={setHistSmoke}
          currentMeds={currentMeds}
          setCurrentMeds={setCurrentMeds}
          onOpenCurrentMeds={() => setIsCurrentMedsOpen(true)}
          conditions={conditions}
          setConditions={setConditions}
          onOpenConditions={() => setIsConditionsOpen(true)}
          procedures={procedures}
          setProcedures={setProcedures}
          onOpenProcedures={() => setIsProceduresOpen(true)}
          familyItems={familyItems}
          setFamilyItems={setFamilyItems}
          onOpenFamily={() => setIsFamilyOpen(true)}
          allergies={allergies}
          setAllergies={setAllergies}
          onOpenAllergies={() => setIsAllergiesOpen(true)}
          habits={habits}
          setHabits={setHabits}
          onOpenHabits={() => setIsHabitsOpen(true)}
          foodAllergies={foodAllergies}
          setFoodAllergies={setFoodAllergies}
          onOpenFoodAllergies={() => setIsFoodAllergyOpen(true)}
          otherHistory={otherHistory}
          setOtherHistory={setOtherHistory}
          otherHistoryTitle={otherHistoryTitle}
          setOtherHistoryTitle={setOtherHistoryTitle}
          onOpenOtherHistory={() => setIsOtherHistoryOpen(true)}
          travelHistory={travelHistory}
          setTravelHistory={setTravelHistory}
          onOpenTravelHistory={() => setIsTravelOpen(true)}
        />

        <CurrentMedicationsDrawer
          isOpen={isCurrentMedsOpen}
          onClose={() => setIsCurrentMedsOpen(false)}
          currentMeds={currentMeds}
          setCurrentMeds={setCurrentMeds}
        />

        <ExistingConditionsDrawer
          isOpen={isConditionsOpen}
          onClose={() => setIsConditionsOpen(false)}
          conditions={conditions}
          setConditions={setConditions}
        />

        <SurgicalProceduresDrawer
          isOpen={isProceduresOpen}
          onClose={() => setIsProceduresOpen(false)}
          procedures={procedures}
          setProcedures={setProcedures}
        />

        <FamilyHistoryDrawer
          isOpen={isFamilyOpen}
          onClose={() => setIsFamilyOpen(false)}
          items={familyItems}
          setItems={setFamilyItems}
        />

        <DrugAllergiesDrawer
          isOpen={isAllergiesOpen}
          onClose={() => setIsAllergiesOpen(false)}
          allergies={allergies}
          setAllergies={setAllergies}
        />

        <LifestyleHabitsDrawer
          isOpen={isHabitsOpen}
          onClose={() => setIsHabitsOpen(false)}
          habits={habits}
          setHabits={setHabits}
        />

        <FoodAllergyDrawer
          isOpen={isFoodAllergyOpen}
          onClose={() => setIsFoodAllergyOpen(false)}
          items={foodAllergies}
          setItems={setFoodAllergies}
        />

        <OtherMedHistoryDrawer
          isOpen={isOtherHistoryOpen}
          onClose={() => setIsOtherHistoryOpen(false)}
          items={otherHistory}
          setItems={setOtherHistory}
          title={otherHistoryTitle}
          setTitle={setOtherHistoryTitle}
        />

        <TravelHistoryDrawer
          isOpen={isTravelOpen}
          onClose={() => setIsTravelOpen(false)}
          items={travelHistory}
          setItems={setTravelHistory}
        />

        <AdvicesDrawer
          isOpen={isAdvicesDrawerOpen}
          onClose={() => setIsAdvicesDrawerOpen(false)}
          advicesInput={advicesInput}
          setAdvicesInput={setAdvicesInput}
        />

        <SymptomsCard
          symptoms={symptoms}
          setSymptoms={setSymptoms}
        />

        <DiagnosisCard
          diagnoses={diagnoses}
          setDiagnoses={setDiagnoses}
        />

        <MedicationsCard
          medications={medications}
          setMedications={setMedications}
        />

        <LabsCard
          labs={labs}
          setLabs={setLabs}
        />

        <ResultsCard
          labResults={labResults}
          setLabResults={setLabResults}
        />

        <NotesCard
          notesForPatient={notesForPatient}
          setNotesForPatient={setNotesForPatient}
          privateNotes={privateNotes}
          setPrivateNotes={setPrivateNotes}
        />

        <ReferToDoctorCard
          referrals={referrals}
          setReferrals={setReferrals}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full items-start">
          <FollowUpCard
            followUpVal={followUpVal}
            setFollowUpVal={setFollowUpVal}
            followUpNotes={followUpNotes}
            setFollowUpNotes={setFollowUpNotes}
          />

          <AdvicesCard
            advicesInput={advicesInput}
            setAdvicesInput={setAdvicesInput}
            advRest={advRest}
            setAdvRest={setAdvRest}
            advWater={advWater}
            setAdvWater={setAdvWater}
            onOpenDrawer={() => setIsAdvicesDrawerOpen(true)}
          />
        </div>

        <ProceduresCard
          procedures={rxProcedures}
          setProcedures={setRxProcedures}
        />

      </main>

      {/* BOTTOM PRESCRIPTION STICKY TOOLBAR */}
      <footer className="h-12 bg-[#1e293b] px-4 flex items-center justify-between shrink-0 select-none shadow-2xl border-t border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setBp(""); setPulse(""); setWeight(""); setSpo2(""); setSugar("");
              setSymptoms([]); setDiagnoses([]); setMedications([]); setLabs([]); setLabResults([]);
            }}
            className="px-3 py-1 bg-slate-700/50 hover:bg-slate-700 text-white rounded text-[10px] font-bold border border-slate-700 transition-colors"
          >
            Clear
          </button>
        </div>

        <div className="text-[10px] text-slate-400 font-bold tracking-wide">
          Push Updates: Live
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleFinishPrescription}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
            title="Print Prescription"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
          <button
            onClick={handleFinishPrescription}
            className="px-5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded text-[11px] font-extrabold shadow-md transition-colors"
          >
            Finish Prescription
          </button>
        </div>
      </footer>

      {/* PROFESSIONAL RX PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-text">
          <div className="bg-[#F8FAFC] w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-white border-b border-[#E2E8F0] px-5 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-[#1E293B]">Prescription Preview</span>
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Professional Print Layout
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFinishPrescription}
                  className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors border border-slate-250 bg-white"
                  title="Close Preview"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body with Settings Sidebar + Paper representation */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Settings Sidebar */}
              <div className="w-72 bg-white border-r border-[#E2E8F0] p-5 flex flex-col gap-6 overflow-y-auto shrink-0 text-left select-none no-print">
                <div>
                  <h4 className="text-[12px] font-black text-slate-700 uppercase tracking-wider mb-2">Print Adjustments</h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-4">
                    Adjust space to align the print precisely with your pre-printed prescription pad/stationery.
                  </p>
                </div>

                {/* Letterhead Background Settings */}
                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Use Letterhead Background</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={printShowLetterhead} 
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPrintShowLetterhead(val);
                          savePrescriptionSettings({ showLetterhead: val });
                        }}
                        className="sr-only peer" 
                      />
                      <div className="w-8 h-4 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                {/* Header Settings */}
                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Show Header</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={printShowHeader} 
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPrintShowHeader(val);
                          savePrescriptionSettings({ showHeader: val });
                        }}
                        className="sr-only peer" 
                      />
                      <div className="w-8 h-4 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  {!printShowHeader && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-150 mt-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-555">
                        <span>Header Space Height</span>
                        <span className="text-primary">{printHeaderHeight} mm</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5"
                        value={printHeaderHeight}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPrintHeaderHeight(val);
                          savePrescriptionSettings({ headerHeight: val });
                        }}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  )}
                </div>

                {/* Footer Settings */}
                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Show Footer & Sign</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={printShowFooter} 
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPrintShowFooter(val);
                          savePrescriptionSettings({ showFooter: val });
                        }}
                        className="sr-only peer" 
                      />
                      <div className="w-8 h-4 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  {!printShowFooter && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-150 mt-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-555">
                        <span>Footer Space Height</span>
                        <span className="text-primary">{printFooterHeight} mm</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5"
                        value={printFooterHeight}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPrintFooterHeight(val);
                          savePrescriptionSettings({ footerHeight: val });
                        }}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  )}
                </div>

                {/* Second Page Adjustments Separator */}
                <div className="border-t border-[#E2E8F0] pt-4 mt-2">
                  <h4 className="text-[12px] font-black text-slate-700 uppercase tracking-wider mb-2">Second Page Adjustments</h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-4">
                    Customize layouts for content overflowing onto Page 2 and subsequent pages.
                  </p>
                </div>

                {/* Page 2 Letterhead Settings */}
                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Use Background on Page 2</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={printShowLetterheadPage2} 
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPrintShowLetterheadPage2(val);
                          savePrescriptionSettings({ showLetterheadPage2: val });
                        }}
                        className="sr-only peer" 
                      />
                      <div className="w-8 h-4 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                {/* Page 2 Header Settings */}
                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Show Header on Page 2</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={printShowHeaderPage2} 
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPrintShowHeaderPage2(val);
                          savePrescriptionSettings({ showHeaderPage2: val });
                        }}
                        className="sr-only peer" 
                      />
                      <div className="w-8 h-4 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  {!printShowHeaderPage2 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-150 mt-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-555">
                        <span>Header Space Height</span>
                        <span className="text-primary">{printHeaderHeightPage2} mm</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5"
                        value={printHeaderHeightPage2}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPrintHeaderHeightPage2(val);
                          savePrescriptionSettings({ headerHeightPage2: val });
                        }}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  )}
                </div>

                {/* Page 2 Footer Settings */}
                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Show Footer on Page 2</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={printShowFooterPage2} 
                        onChange={(e) => {
                          const val = e.target.checked;
                          setPrintShowFooterPage2(val);
                          savePrescriptionSettings({ showFooterPage2: val });
                        }}
                        className="sr-only peer" 
                      />
                      <div className="w-8 h-4 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  {!printShowFooterPage2 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-150 mt-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-555">
                        <span>Footer Space Height</span>
                        <span className="text-primary">{printFooterHeightPage2} mm</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5"
                        value={printFooterHeightPage2}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPrintFooterHeightPage2(val);
                          savePrescriptionSettings({ footerHeightPage2: val });
                        }}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-auto border-t border-slate-100 pt-3 text-center">
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    Prescription Pad Controls
                  </div>
                </div>
              </div>

              {/* Right Scrollable Paper Preview Area */}
              <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-200">
                {/* Paper representation */}
                <div className="bg-white w-[794px] min-h-[1123px] shadow-lg rounded border border-slate-300 p-10 flex flex-col justify-between text-left text-[#111827] font-sans relative overflow-hidden">
                  {printShowLetterhead && (
                    <img 
                      src="/letterhead.jpg" 
                      alt="Letterhead Background" 
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-85 z-0" 
                    />
                  )}
                  {/* Paper Top Header */}
                  <div className="relative z-10 flex-1 flex flex-col">
                    {(printShowHeader && !printShowLetterhead) ? (
                      <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-5">
                        <div>
                          <div className="text-[20px] font-black text-primary tracking-tight uppercase">
                            {currentRxPatient.opdRegistration?.clinic_name || "OPD CLINIC"}
                          </div>
                          <p className="m-0 text-[#718096] text-[11px] font-semibold mt-0.5">
                            Comprehensive & Advanced Healthcare Clinic
                          </p>
                        </div>
                        <div className="text-right text-[11px] text-[#4A5568] leading-normal font-semibold">
                          <strong className="text-primary text-[13px] block mb-0.5">
                            {currentRxPatient.opdRegistration?.treating_doctor || "DR. TREATING DOCTOR"}
                          </strong>
                          <span>MBBS, MD (Medicine)</span><br />
                          <span>Reg No: 123456</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ height: `${printHeaderHeight}mm` }} className="w-full shrink-0 border-b border-dashed border-slate-200 mb-5 flex items-center justify-center text-[10px] text-slate-400 select-none">
                        [Pre-printed Letterhead Header Space: {printHeaderHeight}mm]
                      </div>
                    )}

                  {/* Patient Info Bar */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-[#E2E8F0] p-4 rounded-lg text-[11.5px] font-semibold mb-6">
                    <div className="space-y-1">
                      <div>
                        <span className="text-[#718096]">Patient Name:</span>{" "}
                        <span className="text-[#1A202C] font-extrabold select-text">
                          {currentRxPatient.title || "Mr/Mrs"} {currentRxPatient.name}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#718096]">Age / Gender:</span>{" "}
                        <span className="text-[#1A202C]">
                          {currentRxPatient.age} {currentRxPatient.ageUnit || 'Year'}(s) / {currentRxPatient.gender}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#718096]">Phone:</span>{" "}
                        <span className="text-[#1A202C] select-text">{currentRxPatient.phone}</span>
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div>
                        <span className="text-[#718096]">Prescription Date:</span>{" "}
                        <span className="text-[#1A202C]">
                          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#718096]">UHID / Queue No:</span>{" "}
                        <span className="text-[#1A202C] select-text">
                          {currentRxPatient.id} / Q-{currentRxPatient.queueNo || "01"}
                        </span>
                      </div>
                      {currentRxPatient.opdRegistration?.referring_doctor && (
                        <div>
                          <span className="text-[#718096]">Referred By:</span>{" "}
                          <span className="text-[#1A202C] select-text">
                            {currentRxPatient.opdRegistration.referring_doctor}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vitals Ribbon */}
                  {(bp || pulse || weight || spo2 || sugar) && (
                    <div className="mb-6">
                      <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 border-b pb-1">Vitals</div>
                      <div className="grid grid-cols-5 gap-3 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 rounded-lg text-center select-text">
                        {bp && (
                          <div>
                            <div className="text-[9px] font-bold text-[#718096] uppercase">BP</div>
                            <div className="text-[12px] font-extrabold text-[#2D3748]">{bp} <span className="text-[9px] font-semibold text-slate-400">mmHg</span></div>
                          </div>
                        )}
                        {pulse && (
                          <div>
                            <div className="text-[9px] font-bold text-[#718096] uppercase">Pulse</div>
                            <div className="text-[12px] font-extrabold text-[#2D3748]">{pulse} <span className="text-[9px] font-semibold text-slate-400">bpm</span></div>
                          </div>
                        )}
                        {weight && (
                          <div>
                            <div className="text-[9px] font-bold text-[#718096] uppercase">Weight</div>
                            <div className="text-[12px] font-extrabold text-[#2D3748]">{weight} <span className="text-[9px] font-semibold text-slate-400">kg</span></div>
                          </div>
                        )}
                        {spo2 && (
                          <div>
                            <div className="text-[9px] font-bold text-[#718096] uppercase">SpO2</div>
                            <div className="text-[12px] font-extrabold text-[#2D3748]">{spo2}<span className="text-[9px] font-semibold text-slate-400">%</span></div>
                          </div>
                        )}
                        {sugar && (
                          <div>
                            <div className="text-[9px] font-bold text-[#718096] uppercase">Sugar</div>
                            <div className="text-[12px] font-extrabold text-[#2D3748]">{sugar} <span className="text-[9px] font-semibold text-slate-400">mg/dL</span></div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Main Grid: Symptoms, Diagnosis | Rx Medications */}
                  <div className="grid grid-cols-3 gap-6 items-start mt-4">
                    {/* Left Column (Symptoms, Diagnoses, Suggested Labs, Lab Results, Procedures, Referrals) */}
                    <div className="col-span-1 border-r border-[#E2E8F0] pr-6 space-y-5 select-text">
                      {/* Symptoms */}
                      {symptoms.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 border-b pb-1">
                            Symptoms / Complaints
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-[11px] font-semibold text-slate-700">
                            {symptoms.map((s, idx) => (
                              <li key={idx}>
                                {s.name}{" "}
                                {s.duration && (
                                  <span className="text-slate-400 font-medium">({s.duration})</span>
                                )}{" "}
                                {s.severity && (
                                  <span className="text-[9.5px] uppercase font-bold text-[#718096] bg-slate-100 px-1.5 py-0.5 rounded ml-1">
                                    {s.severity}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Diagnoses */}
                      {diagnoses.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 border-b pb-1">
                            Diagnoses
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-[11px] font-semibold text-slate-700">
                            {diagnoses.map((d, idx) => (
                              <li key={idx}>
                                {d.name}{" "}
                                {d.since && (
                                  <span className="text-slate-400 font-medium">(since {d.since})</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Suggested Labs */}
                      {labs.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 border-b pb-1">
                            Suggested Investigations
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-[11px] font-semibold text-slate-700">
                            {labs.map((l, idx) => (
                              <li key={idx}>
                                {l.name}{" "}
                                {l.testOn && (
                                  <span className="text-slate-400 font-medium">(Test: {l.testOn})</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Lab Results */}
                      {labResults.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 border-b pb-1">
                            Lab Results
                          </div>
                          <div className="space-y-2 text-[10.5px] font-semibold text-slate-700">
                            {labResults.map((r, idx) => (
                              <div key={idx} className="border-b pb-1.5 last:border-0">
                                <div className="font-bold text-[#1a202c]">{r.name}</div>
                                <div className="flex gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span>Reading: <strong className="text-slate-700">{r.reading} {r.unit}</strong></span>
                                  {r.interpretation && (
                                    <span className={`px-1 rounded font-bold text-[9px] uppercase ${
                                      r.interpretation.toLowerCase() === "high" ? "bg-red-50 text-red-600" :
                                      r.interpretation.toLowerCase() === "low" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                                    }`}>
                                      {r.interpretation}
                                    </span>
                                  )}
                                </div>
                                {r.notes && <div className="text-[9.5px] text-slate-400 mt-0.5 italic">Note: {r.notes}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Procedures */}
                      {rxProcedures.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 border-b pb-1">
                            Suggested Procedures
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-[11px] font-semibold text-slate-700">
                            {rxProcedures.map((p, idx) => (
                              <li key={idx}>
                                {p.name}{" "}
                                {p.duration && (
                                  <span className="text-slate-400 font-medium">({p.duration})</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Doctor Referrals */}
                      {referrals.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 border-b pb-1">
                            Refer To Specialist
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-[11px] font-semibold text-slate-700">
                            {referrals.map((ref, idx) => (
                              <li key={idx}>
                                {ref.doctorName}{" "}
                                {ref.notes && (
                                  <span className="text-slate-400 font-medium">({ref.notes})</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Right Column (Medications Rx Symbol & Medicine Cards) */}
                    <div className="col-span-2 space-y-4 select-text">
                      <div className="text-[32px] font-bold text-primary font-serif -mt-2 leading-none">Rₓ</div>
                      
                      {medications.length > 0 ? (
                        <div className="space-y-3">
                          {medications.map((m, idx) => (
                            <div key={idx} className="border-l-4 border-primary pl-3 py-1 space-y-0.5 bg-slate-50/50 rounded-r-md">
                              <div className="text-[12.5px] font-bold text-[#1E293B]">{m.name}</div>
                              {m.generic && <div className="text-[9.5px] text-[#718096] uppercase font-semibold">{m.generic}</div>}
                              <div className="text-[11px] font-semibold text-slate-700 flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                                <span><strong>Dose:</strong> {m.dose}</span>
                                <span><strong>Frequency:</strong> {m.freq}</span>
                                <span><strong>Timing:</strong> {m.timing}</span>
                                {m.duration && <span><strong>Duration:</strong> {m.duration}</span>}
                              </div>
                              {m.instr && (
                                <div className="text-[10px] text-slate-500 italic mt-0.5">
                                  Instruction: {m.instr}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">No medications prescribed.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Segment: Follow Up, Advice, Notes, Signature */}
                <div className="border-t border-[#E2E8F0] pt-4 mt-8 flex flex-col space-y-4">
                  <div className="grid grid-cols-2 gap-6 text-[11px] font-semibold text-slate-700 select-text">
                    <div className="space-y-2">
                      {/* Follow Up */}
                      {followUpVal && (
                        <div>
                          <strong className="text-primary text-[10px] uppercase block tracking-wider mb-0.5">Follow Up</strong>
                          <div>
                            {followUpVal}{" "}
                            {followUpNotes && <span className="text-slate-500">({followUpNotes})</span>}
                          </div>
                        </div>
                      )}

                      {/* Doctor Notes */}
                      {notesForPatient && (
                        <div>
                          <strong className="text-primary text-[10px] uppercase block tracking-wider mb-0.5">Doctor Notes for Patient</strong>
                          <div className="bg-slate-50 p-2 rounded text-[10.5px] leading-relaxed border border-[#E2E8F0] white-space-pre-line font-medium text-slate-600">
                            {notesForPatient}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {/* Advices */}
                      {(advicesInput || advRest || advWater) && (
                        <div>
                          <strong className="text-primary text-[10px] uppercase block tracking-wider mb-0.5">General Advice</strong>
                          <div className="space-y-1">
                            {advicesInput && <div>{advicesInput}</div>}
                            <div className="flex gap-3 text-[10px] font-bold text-slate-500">
                              {advRest && <span className="bg-slate-100 px-2 py-0.5 rounded">🛌 Rest Recommended</span>}
                              {advWater && <span className="bg-slate-100 px-2 py-0.5 rounded">💧 Drink Plentiful Water</span>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sign-off row */}
                  {printShowFooter ? (
                    <div className="flex justify-between items-end pt-5 border-t border-[#F1F5F9] text-[10.5px] font-semibold text-slate-400 relative z-10">
                      <div>
                        <span>Generated by DLPC Clinic Portal</span>
                      </div>
                      <div className="text-center w-40">
                        <div className="border-b border-[#CBD5E0] h-8"></div>
                        <div className="text-[9.5px] uppercase font-bold text-slate-500 mt-1">Doctor Signature</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: `${printFooterHeight}mm` }} className="w-full shrink-0 border-t border-dashed border-slate-200 mt-5 flex items-center justify-center text-[10px] text-slate-400 select-none relative z-10">
                      [Pre-printed Letterhead Footer Space: {printFooterHeight}mm]
                    </div>
                  )}
                </div>

              </div>
            </div>
            
          </div>

        </div>
      </div>
      )}

    </div>

    <PrintPrescription
      ref={printRef}
      patient={currentRxPatient}
      bp={bp}
      pulse={pulse}
      weight={weight}
      spo2={spo2}
      sugar={sugar}
      symptoms={symptoms}
      diagnoses={diagnoses}
      medications={medications}
      labs={labs}
      labResults={labResults}
      rxProcedures={rxProcedures}
      referrals={referrals}
      notesForPatient={notesForPatient}
      followUpVal={followUpVal}
      followUpNotes={followUpNotes}
      advicesInput={advicesInput}
      advRest={advRest}
      advWater={advWater}
      histNoKnown={histNoKnown}
      familyItems={familyItems}
      conditions={conditions}
      allergies={allergies}
      procedures={procedures}
      currentMeds={currentMeds}
      habits={habits}
      foodAllergies={foodAllergies}
      otherHistory={otherHistory}
      otherHistoryTitle={otherHistoryTitle}
      travelHistory={travelHistory}
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
  </>
);
}
