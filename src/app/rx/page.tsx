"use client";

import React, { useState, useMemo, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

  const [loading, setLoading] = useState(true);
  const [currentRxPatient, setCurrentRxPatient] = useState<Patient | null>(null);

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

  // Prescription cards data states
  const [symptoms, setSymptoms] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  
  const [notesForPatient, setNotesForPatient] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [refDoctorInput, setRefDoctorInput] = useState("");
  const [followUpVal, setFollowUpVal] = useState("10 Days");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [advicesInput, setAdvicesInput] = useState("");
  const [advRest, setAdvRest] = useState(false);
  const [advWater, setAdvWater] = useState(false);
  
  const [rxProcedures, setRxProcedures] = useState<ProcedureItem[]>([]);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);

  // Load patient context from DB on mount
  useEffect(() => {
    if (!rxPatientId) {
      setLoading(false);
      return;
    }

    const loadPatientData = async () => {
      try {
        setLoading(true);
        // Fetch patient details
        const { data: pData, error: pError } = await supabase
          .from("patient_detail")
          .select("*")
          .eq("uhid", rxPatientId)
          .maybeSingle();

        if (pError) throw pError;
        if (!pData) {
          setCurrentRxPatient(null);
          setLoading(false);
          return;
        }

        // Fetch latest registration
        const { data: regData, error: rError } = await supabase
          .from("aka_opd_registration")
          .select("*")
          .eq("patient_uhid", rxPatientId)
          .order("registration_id", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rError) throw rError;

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

        // Fetch patient medical history from the table
        const { data: histData, error: hError } = await supabase
          .from("aka_patient_medical_history")
          .select("*")
          .eq("patient_uhid", rxPatientId)
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
            setLabResults([{ id: "1", name: "HbA1c (Glycosylated Hemoglobin)", unit: "%", reading: "23", interpretation: "High", date: "11 Jul 26", notes: "" }]);
          }
        } else {
          setLabResults([{ id: "1", name: "HbA1c (Glycosylated Hemoglobin)", unit: "%", reading: "23", interpretation: "High", date: "11 Jul 26", notes: "" }]);
        }

        // Load vitals into state
        if (mappedPatient.vitals) {
          setBp(mappedPatient.vitals.bp || "");
          setPulse(mappedPatient.vitals.pulse || "");
          setWeight(mappedPatient.vitals.weight || "");
          setSpo2(mappedPatient.vitals.spo2 || "");
          setSugar(mappedPatient.vitals.sugar || "");
        }

        // Try load from local storage
        const savedRx = localStorage.getItem(`saved_rx_${rxPatientId}`);
        if (savedRx) {
          const parsed = JSON.parse(savedRx);
          if (parsed.medications && !regData?.registration_id) setMedications(parsed.medications);
          if (parsed.symptoms && !regData?.registration_id) setSymptoms(parsed.symptoms);
          if (parsed.diagnoses && !regData?.registration_id) setDiagnoses(parsed.diagnoses);
          if (parsed.labs && !regData?.registration_id) setLabs(parsed.labs);
          if (parsed.notesForPatient) setNotesForPatient(parsed.notesForPatient);
          if (parsed.privateNotes) setPrivateNotes(parsed.privateNotes);
          if (parsed.refDoctorInput) setRefDoctorInput(parsed.refDoctorInput);
          if (parsed.followUpVal) setFollowUpVal(parsed.followUpVal);
          if (parsed.followUpNotes) setFollowUpNotes(parsed.followUpNotes);
          if (parsed.advicesInput) setAdvicesInput(parsed.advicesInput);
          if (parsed.advRest !== undefined) setAdvRest(parsed.advRest);
          if (parsed.advWater !== undefined) setAdvWater(parsed.advWater);
          if (parsed.rxProcedures) setRxProcedures(parsed.rxProcedures);
          if (parsed.referrals) setReferrals(parsed.referrals);
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
          setLabResults([]);
          setNotesForPatient("");
          setPrivateNotes("");
          setRefDoctorInput("");
          setFollowUpVal("10 Days");
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

      } catch (err) {
        console.error("Failed to load patient:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPatientData();
  }, [rxPatientId]);

  // Debounced auto-save effect for vitals directly updating Supabase columns
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
            sugar
          })
          .eq("registration_id", regId);

        if (error) throw error;
        console.log("Vitals updated directly in DB via auto-save!");
      } catch (err) {
        console.error("Failed to auto-save vitals:", err);
      }
    }, 1000); // 1-second debounce to throttle database requests

    return () => clearTimeout(timer);
  }, [bp, pulse, weight, spo2, sugar, currentRxPatient, loading]);

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

  const handleFinishPrescription = async () => {
    if (!currentRxPatient) return;
    
    try {
      // 1. Save state in local storage
      const rxState = {
        medications,
        symptoms,
        diagnoses,
        labs,
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

      // 2. Add to completed patients list
      const completedList = JSON.parse(localStorage.getItem("completed_patients") || "[]");
      if (!completedList.includes(currentRxPatient.id)) {
        localStorage.setItem("completed_patients", JSON.stringify([...completedList, currentRxPatient.id]));
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
            sugar
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
      }

      // 4. Redirect to home page
      router.push("/");
    } catch (err) {
      console.error("Failed to save prescription:", err);
    }
  };

  const handlePrintPrescription = () => {
    if (!currentRxPatient) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Prescription - ${currentRxPatient.name}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #111827; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 2px solid #7C3AED; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .clinic-name { font-size: 24px; font-weight: bold; color: #7C3AED; }
            .doc-info { text-align: right; font-size: 13px; color: #4A5568; line-height: 1.4; }
            .info-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; background: #F8FAFC; padding: 15px; border-radius: 8px; margin-bottom: 25px; font-size: 13px; line-height: 1.5; border: 1px solid #E2E8F0; }
            .rx-section { margin-bottom: 25px; }
            .rx-title { font-size: 13px; font-weight: bold; color: #7C3AED; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
            .med-item { margin-bottom: 15px; padding-left: 10px; border-left: 2px solid #7C3AED; }
            .med-name { font-size: 14px; font-weight: bold; color: #1F2937; }
            .med-generic { font-size: 11px; color: #6B7280; text-transform: uppercase; margin-top: 1px; }
            .med-instructions { font-size: 13px; color: #374151; font-weight: 500; margin-top: 4px; display: flex; gap: 15px; }
            .vitals-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; font-size: 13px; background: #F9FAFB; padding: 12px; border-radius: 6px; border: 1px dashed #CBD5E0; }
            .rx-symbol { font-size: 36px; font-weight: bold; color: #7C3AED; font-family: Georgia, serif; margin: 15px 0; }
            .footer { text-align: center; font-size: 11px; color: #9CA3AF; margin-top: 80px; border-top: 1px solid #E5E7EB; padding-top: 15px; }
            .list-disc { padding-left: 20px; margin: 0; }
            .list-disc li { margin-bottom: 5px; font-size: 13.5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="clinic-name">${currentRxPatient.opdRegistration?.clinic_name || "OPD CLINIC"}</div>
              <p style="margin: 3px 0 0 0; color: #6B7280; font-size: 13px; font-weight: 500;">Comprehensive Care Clinic</p>
            </div>
            <div class="doc-info">
              <strong>${currentRxPatient.opdRegistration?.treating_doctor || "Dr. Treating Doctor"}</strong><br>
              MBBS, MD<br>
              Reg No: 123456
            </div>
          </div>

          <div class="info-grid">
            <div>
              <strong>Patient Name:</strong> ${currentRxPatient.title || "Mr/Mrs"} ${currentRxPatient.name}<br>
              <strong>Age/Gender:</strong> ${currentRxPatient.age} ${currentRxPatient.ageUnit || 'Year'}(s) / ${currentRxPatient.gender}<br>
              <strong>Phone:</strong> ${currentRxPatient.phone}
            </div>
            <div style="text-align: right;">
              <strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}<br>
              <strong>UHID / Queue No:</strong> ${currentRxPatient.id} / Q-${currentRxPatient.queueNo || "00"}<br>
            </div>
          </div>

          <div class="rx-section">
            <div class="rx-title">Vitals</div>
            <div class="vitals-grid">
              <div><strong>BP:</strong> ${bp} mmHg</div>
              <div><strong>Pulse:</strong> ${pulse} bpm</div>
              <div><strong>Weight:</strong> ${weight} kg</div>
              <div><strong>SpO2:</strong> ${spo2}%</div>
              <div><strong>Blood Sugar:</strong> ${sugar} mg/dL</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            ${symptoms.length > 0 ? `
              <div class="rx-section">
                <div class="rx-title">Symptoms / Complaints</div>
                <ul class="list-disc">
                  ${symptoms.map(s => `<li>${s.name} ${s.duration ? `(${s.duration})` : ''} - <span style="text-transform: capitalize; font-size: 11px; font-weight: bold; color: #4B5563;">${s.severity}</span></li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${diagnoses.length > 0 ? `
              <div class="rx-section">
                <div class="rx-title">Diagnoses</div>
                <ul class="list-disc">
                  ${diagnoses.map(d => `<li>${d.name} ${d.since ? `(since ${d.since})` : ''}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>

          <div class="rx-symbol">Rₓ</div>

          <div class="rx-section">
            <div class="rx-title">Medications (Rx)</div>
            ${medications.map(m => `
              <div class="med-item">
                <div class="med-name">${m.name}</div>
                ${m.generic ? `<div class="med-generic">${m.generic}</div>` : ''}
                <div class="med-instructions">
                  <span><strong>Dosage:</strong> ${m.dose}</span>
                  <span><strong>Frequency:</strong> ${m.freq}</span>
                  <span><strong>Timing:</strong> ${m.timing}</span>
                  ${m.duration ? `<span><strong>Duration:</strong> ${m.duration}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>

          ${labs.length > 0 ? `
            <div class="rx-section">
              <div class="rx-title">Lab Investigations Suggested</div>
              <ul class="list-disc">
                ${labs.map(l => `<li>${l.name}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${notesForPatient ? `
            <div class="rx-section">
              <div class="rx-title">Doctor Notes</div>
              <div style="font-size: 13px; color: #374151; background: #F9FAFB; padding: 10px; border-radius: 6px; border: 1px solid #E5E7EB; white-space: pre-line;">
                ${notesForPatient}
              </div>
            </div>
          ` : ''}

          <div class="footer">
            Please follow the prescribed dosage carefully. Return for follow-up if symptoms persist.
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F6F8] font-sans select-none">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verifying Session...</p>
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
    <div className="flex flex-col h-screen w-screen bg-white overflow-hidden font-sans select-none">
      
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
          <button className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground">Overview</button>
          <button className="h-full px-3 text-[11px] font-bold text-primary border-b-2 border-primary">Pad</button>
          <button className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground">Canvas</button>
          <button className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground">Medical Records</button>
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
          <button className="px-3 py-1 bg-slate-700/50 hover:bg-slate-700 text-white rounded text-[10px] font-bold border border-slate-700 transition-colors">
            Print Settings
          </button>
          <button className="px-3 py-1 bg-slate-700/50 hover:bg-slate-700 text-white rounded text-[10px] font-bold border border-slate-700 transition-colors">
            Select Language
          </button>

          <button className="px-3 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded text-[10px] font-extrabold flex items-center gap-1.5 shadow-xs transition-colors bg-indigo-600">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse border border-white"></span>
            Ask DocAssist AI
          </button>
        </div>

        <div className="text-[10px] text-slate-400 font-bold tracking-wide">
          Push Updates: Live
        </div>

        <div className="flex items-center gap-2">
          <button className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-[11px] font-bold flex items-center gap-1 transition-colors">
            Preview
          </button>
          <button 
            onClick={handlePrintPrescription}
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

    </div>
  );
}
