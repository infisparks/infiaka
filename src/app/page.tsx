"use client";

import React, { useState, useMemo, Suspense, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

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
import CurrentMedicationsDrawer, { CurrentMedication } from "@/components/CurrentMedicationsDrawer";
import ExistingConditionsDrawer, { ExistingCondition } from "@/components/ExistingConditionsDrawer";
import SurgicalProceduresDrawer, { SurgicalProcedure } from "@/components/SurgicalProceduresDrawer";
import FamilyHistoryDrawer, { FamilyHistoryItem } from "@/components/FamilyHistoryDrawer";
import DrugAllergiesDrawer, { DrugAllergy } from "@/components/DrugAllergiesDrawer";
import LifestyleHabitsDrawer, { LifestyleHabit } from "@/components/LifestyleHabitsDrawer";
import FoodAllergyDrawer, { FoodAllergy } from "@/components/FoodAllergyDrawer";
import OtherMedHistoryDrawer, { OtherMedHistory } from "@/components/OtherMedHistoryDrawer";
import TravelHistoryDrawer, { TravelHistoryItem } from "@/components/TravelHistoryDrawer";


interface Patient {
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
  };
  customTags: string[];
  isCompleted: boolean;
  isOngoing: boolean;
  arrivalTime: string;
  arrivalMinutesAgo: number;
}

// Initial suggestion caches
const initialAddressCache = ["mumbra", "thane", "dadar", "mumbai", "bandra", "kalyan"];
const initialDoctorCache = ["DR. LAXMAN SALVE", "DR. KABIR SHAH", "DR. POOJA SHARMA"];
const initialServiceCache = [
  { name: "First consultation", price: 2000 },
  { name: "Follow-up consultation", price: 1000 },
  { name: "Routine checkup", price: 500 },
  { name: "ECG Test", price: 800 },
  { name: "Blood Report Analysis", price: 1200 }
];

const SUGGESTED_SYMPTOMS = [
  "Pain Radiating To Head",
  "Pain Of Head And Neck Region",
  "Raises Head",
  "Head Lag",
  "Head Engaged",
  "Head Pain",
  "Body Pain",
  "Fever",
  "Cough"
];

const SUGGESTED_DURATIONS = [
  "1 Hour",
  "1 Day",
  "1 Week",
  "1 Month",
  "1 Year"
];

const SUGGESTED_SEVERITIES = [
  "Severe",
  "Moderate",
  "Mild"
];

const SUGGESTED_HEADACHE_SITES = [
  "Unilateral left sided headache",
  "Unilateral right sided headache",
  "Bilateral headache",
  "Frontal headache",
  "Occipital headache",
  "Temporal headache"
];

const SUGGESTED_PAIN_TYPES = [
  "Throbbing pain",
  "Dull ache",
  "Sharp shooting pain",
  "Burning pain"
];

// Frequently prescribed medications matching screenshot #5
const freqMedications = [
  { name: "Cyclopam Tablet", generic: "DICYCLOMINE (20MG) + PARACETAMOL (500MG)" },
  { name: "Enzoflam Tablet", generic: "DICLOFENAC (50MG) + PARACETAMOL (325MG) + SERRATIOPEPTIDASE (15MG)" },
  { name: "Drotin-M Tablet", generic: "DROTAVERINE (80MG) + MEFENAMIC ACID (250MG)" },
  { name: "Ultracet Tablet", generic: "PARACETAMOL/ACETAMINOPHEN (325MG) + TRAMADOL (37.5MG)" },
  { name: "Drotin Plus Tablet", generic: "DROTAVERINE (80MG) + PARACETAMOL (500MG)" },
  { name: "Ultracet Semi Tablet", generic: "PARACETAMOL/ACETAMINOPHEN (162.5MG) + TRAMADOL (18.75MG)" },
  { name: "Naproxen 250mg Tablet", generic: "NAPROXEN (250MG)" }
];

// Initial Patients list
const initialPatients: Patient[] = [
  {
    id: "1",
    queueNo: "01",
    title: "Mr",
    name: "mudassir s",
    phoneDialCode: "+91",
    phone: "9958399157",
    gender: "Male",
    age: 23,
    ageUnit: "Year",
    dob: "2003-05-23",
    permanentAddress: "mumbra",
    localAddress: "mumbra",
    country: "India",
    state: "Maharashtra",
    statusTags: ["Ongoing", "New Patient"],
    billAmount: 2000,
    paymentMethod: "Cash",
    isAbhaCreated: false,
    customTags: [],
    isCompleted: false,
    isOngoing: true,
    arrivalTime: "07:15 pm",
    arrivalMinutesAgo: 13,
  },
  {
    id: "2",
    queueNo: "02",
    title: "Mr",
    name: "Rahul Sharma",
    phoneDialCode: "+91",
    phone: "9876543210",
    gender: "Male",
    age: 32,
    ageUnit: "Year",
    dob: "1994-07-11",
    permanentAddress: "dadar",
    localAddress: "dadar",
    country: "India",
    state: "Maharashtra",
    statusTags: ["New Patient"],
    billAmount: 500,
    paymentMethod: "Online",
    isAbhaCreated: true,
    vitals: { bp: "120/80", pulse: "72" },
    customTags: ["Fever"],
    isCompleted: false,
    isOngoing: false,
    arrivalTime: "07:30 pm",
    arrivalMinutesAgo: 5,
  },
];

// Time slots list
const timeSlots = [
  "09:00 AM", "09:15 AM", "09:30 AM", "09:45 AM",
  "10:00 AM", "10:15 AM", "10:30 AM", "10:45 AM",
  "11:00 AM", "11:15 AM", "11:30 AM", "11:45 AM",
  "04:00 PM", "04:15 PM", "04:30 PM", "04:45 PM",
  "05:00 PM", "05:15 PM", "05:30 PM", "05:45 PM"
];

function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [patients, setPatients] = useState<Patient[]>(initialPatients);

  // --- VIEW TRANSITION CONTROLLERS (Synced with URL parameter ?rx=PATIENT_ID) ---
  const rxPatientId = searchParams.get("rx");

  const currentRxPatient = useMemo(() => {
    if (!rxPatientId) return null;
    return patients.find((p) => p.id === rxPatientId) || null;
  }, [patients, rxPatientId]);

  const activeView = rxPatientId && currentRxPatient ? "prescription" : "dashboard";

  const openPrescription = (patientId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("rx", patientId);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const closePrescription = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("rx");
    router.replace(`${pathname}?${params.toString()}`);
  };

  // URL State Synchronizer for Right Sidebar (Add OPD Registration)
  const isBookOpen = searchParams.get("book") === "true";

  const openBooking = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("book", "true");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const closeBooking = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("book");
    router.replace(`${pathname}?${params.toString()}`);
    setBookingSearch("");
    setSelectedBookingPatient(null);
    resetForm();
  };
  const [activeTab, setActiveTab] = useState<"MY_OPD" | "COMPLETED">("MY_OPD");
  const [searchQuery, setSearchQuery] = useState("");
  const [doctorSelect, setDoctorSelect] = useState("Madan");

  // Autocomplete cache variables
  const [addressCache, setAddressCache] = useState(initialAddressCache);
  const [doctorCache, setDoctorCache] = useState(initialDoctorCache);
  const [serviceCache, setServiceCache] = useState(initialServiceCache);

  // Standalone vitals modals
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [temp, setTemp] = useState("");
  const [weight, setWeight] = useState("");

  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState<string | null>(null);
  const [newTagText, setNewTagText] = useState("");
  const [selectedDate, setSelectedDate] = useState("Tdy, 11 Jul");

  // --- OPD REGISTRATION PANEL STATES ---
  const [bookingSearch, setBookingSearch] = useState("");
  const [selectedBookingPatient, setSelectedBookingPatient] = useState<Patient | null>(null);

  // DB Map: public.patients
  const [title, setTitle] = useState("Mr");
  const [fullName, setFullName] = useState("");
  const [phoneDialCode, setPhoneDialCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("Male");
  const [age, setAge] = useState("");
  const [ageUnit, setAgeUnit] = useState("Year");
  const [dob, setDob] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("Maharashtra");

  // DB Map: public.visits
  const [appointmentDateTime, setAppointmentDateTime] = useState("2026-07-11T19:48");
  const [clinicName, setClinicName] = useState("DLPC - Dadar");
  const [treatingDoctor, setTreatingDoctor] = useState("DR. LAXMAN SALVE");
  const [visitCategory, setVisitCategory] = useState("First consultation");
  const [referringDoctor, setReferringDoctor] = useState("Dadar East");
  const [discountAmount, setDiscountAmount] = useState(0);

  const [servicesRows, setServicesRows] = useState<Array<{ id: string; name: string; fee: number }>>([
    { id: "1", name: "First consultation", fee: 2000 }
  ]);
  const [paymentsRows, setPaymentsRows] = useState<Array<{ id: string; mode: string; amount: number }>>([
    { id: "1", mode: "Cash", amount: 0 }
  ]);

  // DB Map: public.visit_vitals
  const [initialBp, setInitialBp] = useState("120/80");
  const [initialPulse, setInitialPulse] = useState("");
  const [initialWeight, setInitialWeight] = useState("");
  const [initialSpo2, setInitialSpo2] = useState("98");
  const [initialSugar, setInitialSugar] = useState("100");

  // Tab counts
  const opdPatientsCount = useMemo(() => patients.filter((p) => !p.isCompleted).length, [patients]);
  const completedPatientsCount = useMemo(() => patients.filter((p) => p.isCompleted).length, [patients]);

  // Main Dashboard Filtered Patients List
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (activeTab === "MY_OPD" && p.isCompleted) return false;
      if (activeTab === "COMPLETED" && !p.isCompleted) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.phone.includes(query) ||
          p.queueNo.includes(query)
        );
      }
      return true;
    });
  }, [patients, activeTab, searchQuery]);

  // Right Sidebar Booking Patient Search Match
  const bookingSearchResults = useMemo(() => {
    if (!bookingSearch.trim()) return [];
    const query = bookingSearch.toLowerCase();
    return patients.filter(
      (p) => p.name.toLowerCase().includes(query) || p.phone.includes(query)
    );
  }, [patients, bookingSearch]);

  const [addressFocused, setAddressFocused] = useState(false);
  const [doctorFocused, setDoctorFocused] = useState(false);
  const [serviceRowFocused, setServiceRowFocused] = useState<string | null>(null);

  // --- PRESCRIPTION PAD DYNAMIC STATE VARIABLES (Screenshots #1-#5) ---
  // DB Map: public.visit_vitals
  const [rxSystolic, setRxSystolic] = useState("120");
  const [rxDiastolic, setRxDiastolic] = useState("80");
  const [rxTemp, setRxTemp] = useState("98.6");
  const [rxSpo2, setRxSpo2] = useState("98");
  const [rxPulse, setRxPulse] = useState("72");
  const [rxRespRate, setRxRespRate] = useState("16");
  const [rxHeight, setRxHeight] = useState("175");
  const [rxWeight, setRxWeight] = useState("70");
  const [rxBmi, setRxBmi] = useState("22.9");

  // Calculators states (BSA, CrCl, eGFR etc.)
  const [egfrScore, setEgfrScore] = useState("");
  const [cvdRisk, setCvdRisk] = useState("");
  const [crclScore, setCrclScore] = useState("");
  const [qriskScore, setQriskScore] = useState("");
  const [bsaScore, setBsaScore] = useState("");

  // Medical History states
  const [histDiabetes, setHistDiabetes] = useState(false);
  const [histDiabetesSince, setHistDiabetesSince] = useState("");
  const [histHypothyroid, setHistHypothyroid] = useState(false);
  const [histHypertension, setHistHypertension] = useState(false);
  const [histAlcohol, setHistAlcohol] = useState(false);
  const [histTobacco, setHistTobacco] = useState(false);
  const [histSmoke, setHistSmoke] = useState(false);
  const [histNoKnown, setHistNoKnown] = useState(false);

  // Current Medications state
  const [currentMeds, setCurrentMeds] = useState<CurrentMedication[]>([]);
  const [isCurrentMedsOpen, setIsCurrentMedsOpen] = useState(false);

  // Existing Conditions state
  const [conditions, setConditions] = useState<ExistingCondition[]>([]);
  const [isConditionsOpen, setIsConditionsOpen] = useState(false);

  // Past Surgical Procedures state
  const [procedures, setProcedures] = useState<SurgicalProcedure[]>([]);
  const [isProceduresOpen, setIsProceduresOpen] = useState(false);

  // Family History state
  const [familyItems, setFamilyItems] = useState<FamilyHistoryItem[]>([]);
  const [isFamilyOpen, setIsFamilyOpen] = useState(false);

  // Drug Allergies state
  const [allergies, setAllergies] = useState<DrugAllergy[]>([]);
  const [isAllergiesOpen, setIsAllergiesOpen] = useState(false);

  // Lifestyle Habits state
  const [habits, setHabits] = useState<LifestyleHabit[]>([]);
  const [isHabitsOpen, setIsHabitsOpen] = useState(false);

  // Food/Other Allergy state
  const [foodAllergies, setFoodAllergies] = useState<FoodAllergy[]>([]);
  const [isFoodAllergyOpen, setIsFoodAllergyOpen] = useState(false);

  // Other Medical History state
  const [otherHistory, setOtherHistory] = useState<OtherMedHistory[]>([]);
  const [otherHistoryTitle, setOtherHistoryTitle] = useState("");
  const [isOtherHistoryOpen, setIsOtherHistoryOpen] = useState(false);

  // Travel History state
  const [travelHistory, setTravelHistory] = useState<TravelHistoryItem[]>([]);
  const [isTravelOpen, setIsTravelOpen] = useState(false);

  // Symptoms state
  // DB Map: public.visit_symptoms
  const [symptoms, setSymptoms] = useState<Array<{
    id: string;
    name: string;
    duration: string;
    severity: string;
    headacheSite?: string;
    typeOfPain?: string;
    clinicalCourse?: string;
    note?: string;
  }>>([
    { id: "1", name: "Head Pain", duration: "1 Hour", severity: "Severe" }
  ]);
  const [symptomInput, setSymptomInput] = useState("");
  const [symptomFocusId, setSymptomFocusId] = useState<string | null>(null);
  const [symptomFocusField, setSymptomFocusField] = useState<string | null>(null); // "name" | "duration" | "severity"

  // Symptoms More Options Modal State
  const [activeMoreOptionsSymptomId, setActiveMoreOptionsSymptomId] = useState<string | null>(null);
  const [headacheSite, setHeadacheSite] = useState("");
  const [typeOfPain, setTypeOfPain] = useState("");
  const [clinicalCourse, setClinicalCourse] = useState("");
  const [moreOptionsNote, setMoreOptionsNote] = useState("");
  const [headacheSiteFocused, setHeadacheSiteFocused] = useState(false);
  const [typeOfPainFocused, setTypeOfPainFocused] = useState(false);

  // Diagnoses state
  // DB Map: public.visit_diagnoses
  const [diagnoses, setDiagnoses] = useState<Array<{ id: string; name: string; since: string; status: string }>>([
    { id: "1", name: "Period pain", since: "2 Days", status: "Active" }
  ]);
  const [diagnosisInput, setDiagnosisInput] = useState("");

  // Medications list
  // DB Map: public.visit_prescriptions
  const [medications, setMedications] = useState<Array<{ id: string; name: string; generic: string; dose: string; freq: string; timing: string; duration: string; start: string; instr: string }>>([
    { id: "1", name: "Dolopar 650 Tablets", generic: "PARACETAMOL (650MG)", dose: "2 capsule", freq: "1-1-1", timing: "After Meal", duration: "10 Days", start: "Today", instr: "" },
    { id: "2", name: "Meftal-Spas Tablet", generic: "DICYCLOMINE (10MG) + MEFENAMIC ACID (250MG)", dose: "1 Tablet", freq: "1-0-1", timing: "After Meal", duration: "3 Days", start: "Today", instr: "" }
  ]);
  const [medInput, setMedInput] = useState("");
  const [medInputFocused, setMedInputFocused] = useState(false);

  // Lab Investigations
  const [labs, setLabs] = useState<Array<{ id: string; name: string; testOn: string; repeatOn: string; remarks: string }>>([
    { id: "1", name: "Liver Function Test (LFT)", testOn: "2026-07-11", repeatOn: "2026-07-25", remarks: "" }
  ]);
  const [labInput, setLabInput] = useState("");

  // Lab Results
  const [labResults, setLabResults] = useState<Array<{ id: string; name: string; unit: string; reading: string; interpretation: string; date: string; notes: string }>>([
    { id: "1", name: "HbA1c (Glycosylated Hemoglobin)", unit: "%", reading: "23", interpretation: "High", date: "11 Jul 26", notes: "" }
  ]);
  const [labResultInput, setLabResultInput] = useState("");

  // Examination findings
  const [findings, setFindings] = useState<Array<{ id: string; text: string; note: string }>>([
    { id: "1", text: "2", note: "" }
  ]);
  const [findingInput, setFindingInput] = useState("");

  // Follow Ups, Advices, and Notes
  const [notesForPatient, setNotesForPatient] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [refDoctorInput, setRefDoctorInput] = useState("");
  const [followUpVal, setFollowUpVal] = useState("10 Days");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [advicesInput, setAdvicesInput] = useState("");
  const [advRest, setAdvRest] = useState(false);
  const [advWater, setAdvWater] = useState(false);

  // Reset form inputs helper
  const resetForm = () => {
    setTitle("Mr");
    setFullName("");
    setPhoneDialCode("+91");
    setPhone("");
    setGender("Male");
    setAge("");
    setAgeUnit("Year");
    setDob("");
    setPermanentAddress("");
    setLocalAddress("");
    setCountry("India");
    setState("Maharashtra");
    setAppointmentDateTime("2026-07-11T19:48");
    setClinicName("DLPC - Dadar");
    setTreatingDoctor("DR. LAXMAN SALVE");
    setVisitCategory("First consultation");
    setReferringDoctor("Dadar East");
    setDiscountAmount(0);
    setServicesRows([{ id: "1", name: "First consultation", fee: 2000 }]);
    setPaymentsRows([{ id: "1", mode: "Cash", amount: 0 }]);
    setInitialBp("120/80");
    setInitialPulse("");
    setInitialWeight("");
    setInitialSpo2("98");
    setInitialSugar("100");
  };

  // Pre-fill selected patient details in registration form
  useEffect(() => {
    if (selectedBookingPatient) {
      setTitle(selectedBookingPatient.title || "Mr");
      setFullName(selectedBookingPatient.name);
      setPhoneDialCode(selectedBookingPatient.phoneDialCode || "+91");
      setPhone(selectedBookingPatient.phone);
      setGender(selectedBookingPatient.gender);
      setAge(String(selectedBookingPatient.age));
      setAgeUnit(selectedBookingPatient.ageUnit || "Year");
      setDob(selectedBookingPatient.dob || "");
      setPermanentAddress(selectedBookingPatient.permanentAddress || "");
      setLocalAddress(selectedBookingPatient.localAddress || "");
      setCountry(selectedBookingPatient.country || "India");
      setState(selectedBookingPatient.state || "Maharashtra");
      
      if (selectedBookingPatient.vitals) {
        setInitialBp(selectedBookingPatient.vitals.bp || "120/80");
        setInitialPulse(selectedBookingPatient.vitals.pulse || "");
        setInitialWeight(selectedBookingPatient.vitals.weight || "");
        setInitialSpo2(selectedBookingPatient.vitals.spo2 || "98");
        setInitialSugar(selectedBookingPatient.vitals.sugar || "100");
      }
    }
  }, [selectedBookingPatient]);

  // Load patient context into Prescription Pad on view transition
  useEffect(() => {
    if (currentRxPatient) {
      if (currentRxPatient.vitals) {
        if (currentRxPatient.vitals.bp) {
          const bpParts = currentRxPatient.vitals.bp.split("/");
          setRxSystolic(bpParts[0] || "120");
          setRxDiastolic(bpParts[1] || "80");
        }
        setRxPulse(currentRxPatient.vitals.pulse || "72");
        setRxWeight(currentRxPatient.vitals.weight || "70");
        setRxSpo2(currentRxPatient.vitals.spo2 || "98");
      }
      
      // Auto compute BMI
      const h = Number(rxHeight) / 100;
      const w = Number(rxWeight);
      if (h > 0 && w > 0) {
        setRxBmi((w / (h * h)).toFixed(1));
      }
    }
  }, [currentRxPatient]);

  // Calculate BMI dynamically when height or weight shifts in Prescription Pad
  useEffect(() => {
    const h = Number(rxHeight) / 100;
    const w = Number(rxWeight);
    if (h > 0 && w > 0) {
      setRxBmi((w / (h * h)).toFixed(1));
    } else {
      setRxBmi("");
    }
  }, [rxHeight, rxWeight]);

  // Vitals Calculators triggers
  const handleCalculateBsa = () => {
    const h = Number(rxHeight);
    const w = Number(rxWeight);
    if (h > 0 && w > 0) {
      const bsa = Math.sqrt((h * w) / 3600);
      setBsaScore(bsa.toFixed(2) + " m²");
    } else {
      setBsaScore("0.00 m²");
    }
  };

  const handleCalculateCrCl = () => {
    if (!currentRxPatient) return;
    const ageVal = currentRxPatient.age;
    const w = Number(rxWeight);
    if (w > 0) {
      // Cockcroft-Gault (Serum Creatinine assumed as 1.0 mg/dL as reference base)
      const baseCrCl = ((140 - ageVal) * w) / 72;
      const finalCrCl = currentRxPatient.gender === "Female" ? baseCrCl * 0.85 : baseCrCl;
      setCrclScore(finalCrCl.toFixed(1) + " mL/min");
    } else {
      setCrclScore("0.0 mL/min");
    }
  };

  const handleCalculateEgfr = () => {
    if (!currentRxPatient) return;
    // MDRD Mocked based on gender
    const egfr = currentRxPatient.gender === "Female" ? 95 : 110;
    setEgfrScore(egfr + " mL/min/1.73m²");
  };

  const handleCalculateCvd = () => {
    // Framingham Risk Mocked
    setCvdRisk("4.2 %");
  };

  const handleCalculateQrisk = () => {
    // QRISK3 Mocked
    setQriskScore("2.1 %");
  };

  // Bidirectional calculations: Age ↔ DOB
  const calculateDobFromAge = (currentAge: string, unit: string) => {
    if (!currentAge || isNaN(Number(currentAge))) {
      setDob("");
      return;
    }
    const ageVal = Number(currentAge);
    const today = new Date(2026, 6, 11); // July 11, 2026 mock date
    
    if (unit === "Year") {
      today.setFullYear(2026 - ageVal);
    } else if (unit === "Month") {
      today.setMonth(6 - ageVal);
    } else if (unit === "Day") {
      today.setDate(11 - ageVal);
    }
    
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setDob(`${yyyy}-${mm}-${dd}`);
  };

  const handleAgeChange = (value: string) => {
    setAge(value);
    calculateDobFromAge(value, ageUnit);
  };

  const handleAgeUnitChange = (unit: string) => {
    setAgeUnit(unit);
    calculateDobFromAge(age, unit);
  };

  const handleDobChange = (value: string) => {
    setDob(value);
    if (!value) {
      setAge("");
      return;
    }
    const birthDate = new Date(value);
    const today = new Date(2026, 6, 11); // July 11, 2026
    
    if (isNaN(birthDate.getTime())) {
      setAge("");
      return;
    }
    
    const diffTime = today.getTime() - birthDate.getTime();
    if (diffTime < 0) {
      setAge("0");
      setAgeUnit("Day");
      return;
    }
    
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      setAge(String(diffDays));
      setAgeUnit("Day");
    } else {
      let months = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
      if (today.getDate() < birthDate.getDate()) {
        months--;
      }
      
      if (months < 12) {
        setAge(String(months > 0 ? months : 0));
        setAgeUnit("Month");
      } else {
        let years = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          years--;
        }
        setAge(String(years >= 0 ? years : 0));
        setAgeUnit("Year");
      }
    }
  };

  // Auto Country selector based on Phone Dial Code selection
  useEffect(() => {
    if (phoneDialCode === "+91") {
      setCountry("India");
    } else if (phoneDialCode === "+1") {
      setCountry("United States");
    } else if (phoneDialCode === "+44") {
      setCountry("United Kingdom");
    }
  }, [phoneDialCode]);

  // Autocomplete matching structures
  const matchingAddresses = useMemo(() => {
    if (permanentAddress.length < 2) return [];
    return addressCache.filter((addr) =>
      addr.toLowerCase().includes(permanentAddress.toLowerCase())
    );
  }, [addressCache, permanentAddress]);

  const matchingDoctors = useMemo(() => {
    if (treatingDoctor.length < 1) return doctorCache;
    return doctorCache.filter((doc) =>
      doc.toLowerCase().includes(treatingDoctor.toLowerCase())
    );
  }, [doctorCache, treatingDoctor]);

  // Services dynamic totals calculations
  const totalServiceFees = useMemo(() => {
    return servicesRows.reduce((acc, row) => acc + (row.fee || 0), 0);
  }, [servicesRows]);

  const totalPaid = useMemo(() => {
    return paymentsRows.reduce((acc, row) => acc + (row.amount || 0), 0);
  }, [paymentsRows]);

  const remainingAmount = useMemo(() => {
    return totalServiceFees - discountAmount - totalPaid;
  }, [totalServiceFees, discountAmount, totalPaid]);

  // Auto-fill primary payment amount on dynamic services total update
  useEffect(() => {
    if (paymentsRows.length === 1 && paymentsRows[0].amount === 0) {
      setPaymentsRows([{ ...paymentsRows[0], amount: Math.max(0, totalServiceFees - discountAmount) }]);
    }
  }, [totalServiceFees, discountAmount]);

  // Handlers for managing the patients in the main queue list
  const handleToggleCompleted = (patientId: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, isCompleted: !p.isCompleted } : p))
    );
  };

  const handleToggleOngoing = (patientId: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, isOngoing: !p.isOngoing } : p))
    );
  };

  const handleCreateAbha = (patientId: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, isAbhaCreated: true } : p))
    );
  };

  const handleBillAmountChange = (patientId: string, amount: number) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, billAmount: amount } : p))
    );
  };

  const handlePaymentMethodChange = (patientId: string, method: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, paymentMethod: method } : p))
    );
  };

  const handleAddTag = (patientId: string) => {
    if (!newTagText.trim()) return;
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === patientId) {
          return {
            ...p,
            customTags: [...p.customTags, newTagText.trim()],
          };
        }
        return p;
      })
    );
    setNewTagText("");
    setIsTagPopoverOpen(null);
  };

  // Vitals handlers
  const handleOpenVitalsModal = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      setSelectedPatientId(patientId);
      setBp(patient.vitals?.bp || "");
      setPulse(patient.vitals?.pulse || "");
      setTemp(patient.vitals?.temp || "");
      setWeight(patient.vitals?.weight || "");
      setIsVitalsOpen(true);
    }
  };

  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === selectedPatientId) {
          return {
            ...p,
            vitals: { ...p.vitals, bp, pulse, temp, weight },
          };
        }
        return p;
      })
    );
    setIsVitalsOpen(false);
    setSelectedPatientId(null);
  };

  // Dynamic Add / Remove Service Rows
  const addServiceRow = () => {
    const newId = Date.now().toString();
    setServicesRows([...servicesRows, { id: newId, name: "", fee: 0 }]);
  };

  const removeServiceRow = (id: string) => {
    if (servicesRows.length === 1) return;
    setServicesRows(servicesRows.filter((row) => row.id !== id));
  };

  const updateServiceRow = (id: string, name: string, fee: number) => {
    setServicesRows(
      servicesRows.map((row) => (row.id === id ? { ...row, name, fee } : row))
    );
  };

  // Dynamic Add / Remove Payment Rows
  const addPaymentRow = () => {
    const newId = Date.now().toString();
    setPaymentsRows([...paymentsRows, { id: newId, mode: "Cash", amount: 0 }]);
  };

  const removePaymentRow = (id: string) => {
    if (paymentsRows.length === 1) return;
    setPaymentsRows(paymentsRows.filter((row) => row.id !== id));
  };

  const updatePaymentRow = (id: string, mode: string, amount: number) => {
    setPaymentsRows(
      paymentsRows.map((row) => (row.id === id ? { ...row, mode, amount } : row))
    );
  };

  // Master Form submit handler saving registration details
  const handleRegisterAndBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) return;

    // Cache typed doctor if new
    if (treatingDoctor.trim() && !doctorCache.includes(treatingDoctor.trim().toUpperCase())) {
      setDoctorCache([...doctorCache, treatingDoctor.trim().toUpperCase()]);
    }

    // Cache typed address if new
    if (permanentAddress.trim() && !addressCache.includes(permanentAddress.trim().toLowerCase())) {
      setAddressCache([...addressCache, permanentAddress.trim().toLowerCase()]);
    }

    // Cache typed services if new
    servicesRows.forEach((row) => {
      if (row.name.trim() && !serviceCache.find((s) => s.name.toLowerCase() === row.name.toLowerCase())) {
        setServiceCache((prev) => [...prev, { name: row.name.trim(), price: row.fee }]);
      }
    });

    const isUpdate = !!selectedBookingPatient;
    const nextQueueNo = String(patients.length + 1).padStart(2, "0");

    const finalPatient: Patient = {
      id: isUpdate ? selectedBookingPatient!.id : Date.now().toString(),
      queueNo: isUpdate ? selectedBookingPatient!.queueNo || nextQueueNo : nextQueueNo,
      title,
      name: fullName,
      phoneDialCode,
      phone,
      gender,
      age: Number(age) || 25,
      ageUnit,
      dob,
      permanentAddress,
      localAddress,
      country,
      state,
      statusTags: isUpdate ? selectedBookingPatient!.statusTags : ["Ongoing", "New Patient"],
      billAmount: totalServiceFees,
      paymentMethod: paymentsRows[0]?.mode || "Cash",
      isAbhaCreated: isUpdate ? selectedBookingPatient!.isAbhaCreated : false,
      customTags: isUpdate ? selectedBookingPatient!.customTags : [],
      isCompleted: false,
      isOngoing: true,
      arrivalTime: isUpdate ? (selectedBookingPatient!.arrivalTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })) : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      arrivalMinutesAgo: isUpdate ? (selectedBookingPatient!.arrivalMinutesAgo ?? 0) : 0,
      vitals: {
        bp: initialBp,
        pulse: initialPulse,
        weight: initialWeight,
        spo2: initialSpo2,
        sugar: initialSugar,
      }
    };

    if (isUpdate) {
      setPatients((prev) => prev.map((p) => (p.id === selectedBookingPatient!.id ? finalPatient : p)));
    } else {
      setPatients((prev) => [...prev, finalPatient]);
    }

    closeBooking();
  };

  // --- PRESCRIPTION INTERACTIVE ACTIONS LOGIC ---
  const handleAddSymptom = (name: string) => {
    if (!name.trim()) return;
    const newSym = { id: Date.now().toString(), name: name.trim(), duration: "1 Day", severity: "Mild" };
    setSymptoms([...symptoms, newSym]);
    setSymptomInput("");
  };

  const handleAddDiagnosis = (name: string) => {
    if (!name.trim()) return;
    const newDiag = { id: Date.now().toString(), name: name.trim(), since: "1 Week", status: "Active" };
    setDiagnoses([...diagnoses, newDiag]);
    setDiagnosisInput("");
  };

  const handleAddMedicine = (med: { name: string; generic: string }) => {
    const newMed = {
      id: Date.now().toString(),
      name: med.name,
      generic: med.generic,
      dose: "1 Tablet",
      freq: "1-0-1",
      timing: "After Meal",
      duration: "5 Days",
      start: "Today",
      instr: ""
    };
    setMedications([...medications, newMed]);
    setMedInput("");
    setMedInputFocused(false);
  };

  const handleAddLab = (name: string) => {
    if (!name.trim()) return;
    const newLab = { id: Date.now().toString(), name: name.trim(), testOn: "2026-07-11", repeatOn: "", remarks: "" };
    setLabs([...labs, newLab]);
    setLabInput("");
  };

  const handleAddLabResult = (name: string) => {
    if (!name.trim()) return;
    const newResult = { id: Date.now().toString(), name: name.trim(), unit: "", reading: "", interpretation: "Normal", date: "11 Jul 26", notes: "" };
    setLabResults([...labResults, newResult]);
    setLabResultInput("");
  };

  const handleFinishPrescription = () => {
    if (!currentRxPatient) return;
    
    // Save Prescription details into the master patient record & mark as Completed
    const updatedPatient: Patient = {
      ...currentRxPatient,
      isCompleted: true,
      isOngoing: false,
      statusTags: ["Completed"],
      vitals: {
        bp: `${rxSystolic}/${rxDiastolic}`,
        pulse: rxPulse,
        weight: rxWeight,
        spo2: rxSpo2,
        height: rxHeight,
        bmi: rxBmi,
        respRate: rxRespRate
      }
    };

    setPatients((prev) => prev.map((p) => (p.id === currentRxPatient.id ? updatedPatient : p)));
    closePrescription();
  };

  // --- PRESCRIPTION VIEW RENDER ---
  const renderPrescriptionPad = () => {
    if (!currentRxPatient) return null;
    return (
      <div className="flex flex-col h-screen w-screen bg-white overflow-hidden font-sans select-none">
        
        {/* PRESCRIPTION HEADER (Screenshot #1 top layout details) */}
        <header className="h-12 bg-white border-b border-[#E2E8F0] px-4 flex items-center justify-between shrink-0 shadow-2xs">
          {/* Patient summary details */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                closePrescription();
              }}
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

            {/* Micro action shortcuts */}
            <div className="flex items-center gap-1 border-l pl-2 border-[#E2E8F0] select-text">
              <button className="p-1 hover:bg-[#F1F5F9] rounded text-[#718096]" title="Edit Details">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button className="p-1 hover:bg-[#F1F5F9] rounded text-[#718096]" title="Video Teleconsultation">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button className="p-1 hover:bg-[#F1F5F9] rounded text-[#718096]" title="Link record">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
              <button className="p-1 hover:bg-[#F1F5F9] rounded text-[#718096]" title="PDF upload">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
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

        {/* PRESCRIPTION pad CONTENT (Scrollable area containing screenshots components) */}
        <main className="flex-1 overflow-y-auto w-full bg-[#F8FAFC] p-5 space-y-5 pb-24">
          
          <VitalsCard
            rxSystolic={rxSystolic}
            setRxSystolic={setRxSystolic}
            rxDiastolic={rxDiastolic}
            setRxDiastolic={setRxDiastolic}
            rxTemp={rxTemp}
            setRxTemp={setRxTemp}
            rxSpo2={rxSpo2}
            setRxSpo2={setRxSpo2}
            rxPulse={rxPulse}
            setRxPulse={setRxPulse}
            rxRespRate={rxRespRate}
            setRxRespRate={setRxRespRate}
            rxHeight={rxHeight}
            setRxHeight={setRxHeight}
            rxWeight={rxWeight}
            setRxWeight={setRxWeight}
            rxBmi={rxBmi}
            currentRxPatient={currentRxPatient}
            egfrScore={egfrScore}
            setEgfrScore={setEgfrScore}
            cvdRisk={cvdRisk}
            setCvdRisk={setCvdRisk}
            crclScore={crclScore}
            setCrclScore={setCrclScore}
            qriskScore={qriskScore}
            setQriskScore={setQriskScore}
            bsaScore={bsaScore}
            setBsaScore={setBsaScore}
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

          {/* 6. ADVICES, NOTES, EXAMINATION, FOLLOW-UP */}
          <NotesCard
            notesForPatient={notesForPatient}
            setNotesForPatient={setNotesForPatient}
            privateNotes={privateNotes}
            setPrivateNotes={setPrivateNotes}
          />
 
          <FollowUpCard
            followUpVal={followUpVal}
            setFollowUpVal={setFollowUpVal}
            followUpNotes={followUpNotes}
            setFollowUpNotes={setFollowUpNotes}
            refDoctorInput={refDoctorInput}
            setRefDoctorInput={setRefDoctorInput}
          />
 
          <AdvicesCard
            advicesInput={advicesInput}
            setAdvicesInput={setAdvicesInput}
            advRest={advRest}
            setAdvRest={setAdvRest}
            advWater={advWater}
            setAdvWater={setAdvWater}
          />

        </main>

        {/* BOTTOM PRESCRIPTION STICKY TOOLBAR (Screenshot #1 bottom bar) */}
        <footer className="h-12 bg-[#1e293b] px-4 flex items-center justify-between shrink-0 select-none shadow-2xl border-t border-slate-800">
          {/* Settings / Config toolbar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setRxSystolic("120"); setRxDiastolic("80"); setRxTemp("98.6"); setRxPulse("72");
                setRxWeight("70"); setRxHeight("175"); setRxRespRate("16"); setRxSpo2("98");
                setSymptoms([]); setDiagnoses([]); setMedications([]); setLabs([]); setLabResults([]);
                setBsaScore(""); setCrclScore(""); setEgfrScore("");
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

            {/* Voice assistant widget */}
            <button className="px-3 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded text-[10px] font-extrabold flex items-center gap-1.5 shadow-xs transition-colors bg-indigo-600">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse border border-white"></span>
              Ask DocAssist AI
            </button>
          </div>

          <div className="text-[10px] text-slate-400 font-bold tracking-wide">
            Push Updates: Live
          </div>

          {/* Core finish buttons */}
          <div className="flex items-center gap-2">
            <button className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-[11px] font-bold flex items-center gap-1 transition-colors">
              Preview
            </button>
            <button className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">
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
  };

  // --- DASHBOARD SKELETON RENDER ---
  if (activeView === "prescription" && currentRxPatient) {
    return renderPrescriptionPad();
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F6F8]">
      {/* LEFT SIDEBAR */}
      <aside className="w-14 bg-white border-r border-[#E5E7EB] flex flex-col items-center py-2 select-none shrink-0 h-full">
        <div className="mb-4 flex flex-col items-center">
          <div className="w-9 h-9 rounded-full bg-[#1e293b] flex items-center justify-center border border-[#CBD5E0] shadow-xs cursor-pointer">
            <span className="text-white text-base font-bold">C</span>
          </div>
          <span className="text-[7px] text-[#A0AEC0] font-semibold mt-1">E-HMS</span>
        </div>

        <nav className="flex-1 w-full flex flex-col gap-1.5 px-1 items-center">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              closeBooking();
            }}
            className={`w-11 py-1.5 rounded-lg flex flex-col items-center justify-center transition-colors ${
              !isBookOpen ? "text-primary bg-primary/10" : "text-[#718096] hover:bg-gray-100"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[9px] font-bold mt-0.5 tracking-tight scale-90">Queue</span>
          </a>

          <button
            onClick={openBooking}
            className={`w-11 py-1.5 rounded-lg flex flex-col items-center justify-center transition-colors ${
              isBookOpen ? "text-primary bg-primary/10" : "text-[#718096] hover:bg-gray-100"
            }`}
            title="Book Appointment"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[9px] font-semibold mt-0.5 tracking-tight scale-90 leading-none text-center">
              Book Appt
            </span>
          </button>

          <a
            href="#"
            className="w-11 py-1.5 rounded-lg flex flex-col items-center justify-center text-[#718096] hover:bg-gray-100 hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-[9px] font-semibold mt-0.5 tracking-tight scale-90">Payments</span>
          </a>

          <a
            href="#"
            className="w-11 py-1.5 rounded-lg flex flex-col items-center justify-center text-[#718096] hover:bg-gray-100 hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-[9px] font-semibold mt-0.5 tracking-tight scale-90">Orders</span>
          </a>

          <a
            href="#"
            className="w-11 py-1.5 rounded-lg flex flex-col items-center justify-center text-[#718096] hover:bg-gray-100 hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
            <span className="text-[9px] font-semibold mt-0.5 tracking-tight scale-90">More</span>
          </a>
        </nav>

        <div className="w-full flex flex-col items-center gap-3 border-t border-[#E5E7EB] pt-2">
          <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-[#718096] hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>

          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#718096] hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>

          <img
            src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150"
            alt="Doctor profile"
            className="w-7 h-7 rounded-full object-cover border border-[#CBD5E0] cursor-pointer"
          />
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden h-full relative">
        
        {/* HEADER BAR */}
        <header className="h-10 bg-white border-b border-[#E5E7EB] px-3 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary cursor-pointer hover:bg-primary/20">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center border border-[#E5E7EB] rounded-md bg-white p-0.5 overflow-hidden">
              <button
                onClick={() => setSelectedDate("Yesterday")}
                className="p-1 hover:bg-gray-100 rounded text-[#718096]"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="px-2 text-[11px] font-bold text-primary tracking-tight">
                {selectedDate}
              </span>
              <button
                onClick={() => setSelectedDate("Tdy, 11 Jul")}
                className="p-1 hover:bg-gray-100 rounded text-[#718096]"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => setSelectedDate("Tdy, 11 Jul")}
              className="px-2 py-1 border border-[#E5E7EB] hover:bg-gray-50 rounded-md text-[11px] font-medium text-foreground bg-white"
            >
              Today
            </button>

            {/* Doctor Dropdown */}
            <div className="flex items-center border border-[#E5E7EB] rounded-md bg-white px-2 py-0.5 cursor-pointer hover:bg-gray-50">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-white"></div>
              </div>
              <select
                value={doctorSelect}
                onChange={(e) => setDoctorSelect(e.target.value)}
                className="text-[11px] font-semibold text-foreground focus:outline-none bg-transparent pr-1.5 cursor-pointer"
              >
                <option value="Madan">Madan</option>
                <option value="Kabir">Dr. Kabir</option>
                <option value="Pooja">Dr. Pooja</option>
              </select>
            </div>

            <button className="p-1 border border-[#E5E7EB] rounded-md bg-white hover:bg-gray-50">
              <svg className="w-3.5 h-3.5 text-[#718096]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button className="p-1 border border-[#E5E7EB] rounded-md bg-white hover:bg-gray-50">
              <svg className="w-3.5 h-3.5 text-[#718096]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Global Search command */}
            <div className="relative flex items-center border border-[#E5E7EB] bg-white rounded-md px-2 py-0.5 w-40 sm:w-48">
              <svg className="w-3 h-3 text-[#A0AEC0] mr-1.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-[11px] text-foreground focus:outline-none w-full bg-transparent placeholder:text-[#A0AEC0]"
              />
              <span className="text-[9px] text-[#A0AEC0] font-medium border border-gray-150 px-1 py-0.2 rounded shrink-0 bg-gray-50">
                ⌘ K
              </span>
            </div>

            <div className="flex items-center border border-[#E5E7EB] rounded-md bg-white px-2 py-0.5 hover:bg-gray-50 cursor-pointer">
              <span className="text-[11px] font-semibold text-foreground truncate max-w-[80px] sm:max-w-[120px]">
                Mr ahlakh mud...
              </span>
              <svg className="w-2.5 h-2.5 text-[#718096] ml-1 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <span className="px-2 py-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded text-[9px] font-bold tracking-wide shadow-xs shrink-0 select-none">
              ★ Premium
            </span>

            <div className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[10px] font-extrabold shadow-xs shrink-0 flex items-center justify-center">
              44
            </div>

            <button className="p-1 hover:bg-gray-100 rounded text-[#718096]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5" />
              </svg>
            </button>
          </div>
        </header>

        {/* DARK TOOLBAR */}
        <section className="bg-[#475569] h-9 px-3 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center h-full gap-0.5">
            <button
              onClick={() => setActiveTab("MY_OPD")}
              className={`h-full px-4 text-[11px] font-bold transition-colors flex items-center justify-center ${
                activeTab === "MY_OPD"
                  ? "bg-primary text-white border-b-2 border-white"
                  : "text-gray-200 hover:text-white hover:bg-slate-600/30"
              }`}
            >
              MY OPD ({opdPatientsCount.toString().padStart(2, "0")})
            </button>

            <button
              onClick={() => setActiveTab("COMPLETED")}
              className={`h-full px-4 text-[11px] font-bold transition-colors flex items-center justify-center ${
                activeTab === "COMPLETED"
                  ? "bg-primary text-white border-b-2 border-white"
                  : "text-gray-200 hover:text-white hover:bg-slate-600/30"
              }`}
            >
              COMPLETED ({completedPatientsCount.toString().padStart(2, "0")})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openBooking}
              className="p-1 text-white hover:bg-slate-600/50 rounded transition-colors"
              title="Book Appointment"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <button className="p-1 text-white hover:bg-slate-600/50 rounded transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <button className="p-1 text-white hover:bg-slate-600/50 rounded transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" />
              </svg>
            </button>

            <button className="p-1 text-white hover:bg-slate-600/50 rounded transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>

            <button className="p-1 text-white hover:bg-slate-600/50 rounded transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </section>

        {/* WORKSPACE & PATIENT CARDS */}
        <main className="flex-1 p-3 overflow-y-auto space-y-2 max-w-full">
          {filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-[#E5E7EB] mt-4">
              <p className="text-[12px] font-semibold text-text-secondary">No patients in the queue matching your filters.</p>
              <button
                onClick={openBooking}
                className="mt-3 px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary-hover transition-colors"
              >
                Book Appointment
              </button>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className="bg-white rounded-lg border border-[#E5E7EB] p-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 hover:shadow-xs transition-shadow w-full animate-in fade-in duration-100"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="text-[18px] font-extrabold text-[#718096] shrink-0 select-none mt-1 min-w-[24px]">
                    {patient.queueNo}
                  </div>

                  <div className="h-10 w-[1px] bg-[#E5E7EB] shrink-0 mt-1 select-none"></div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      {patient.statusTags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-sm tracking-wide ${
                            tag === "Ongoing"
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : tag === "Completed"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-blue-500/10 text-blue-600 border border-blue-55"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                      {patient.customTags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-sm tracking-wide bg-gray-100 text-text-secondary border border-gray-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <svg className="w-3 h-3 text-[#A0AEC0] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <h4 className="text-[12px] font-bold text-foreground truncate max-w-[150px]">
                        {patient.name}
                      </h4>
                      <span className="text-[11px] font-medium text-text-secondary shrink-0">
                        | {patient.gender} | {patient.age}y
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-text-secondary select-all">
                        {patient.phoneDialCode || "+91"} {patient.phone}
                      </span>
                      <button className="px-1 py-0.2 text-[9px] font-semibold bg-gray-100 border border-gray-200 text-text-secondary rounded-sm hover:bg-gray-200">
                        Notes
                      </button>
                    </div>

                    <div className="inline-flex items-center gap-1 bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] px-2 py-0.5 rounded text-[10px] font-bold select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse"></span>
                      Since: {patient.arrivalMinutesAgo}m - {patient.arrivalTime}
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-auto flex flex-col items-end gap-1.5 shrink-0 self-stretch md:self-auto border-t md:border-t-0 border-[#E5E7EB] pt-2 md:pt-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Add Tags */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setIsTagPopoverOpen(isTagPopoverOpen === patient.id ? null : patient.id)
                        }
                        className="px-2 py-0.5 border border-[#CBD5E0] hover:bg-gray-50 rounded text-[10px] font-bold text-[#4A5568] flex items-center gap-1 transition-colors"
                      >
                        Add Tags +
                      </button>
                      
                      {isTagPopoverOpen === patient.id && (
                        <div className="absolute right-0 bottom-full mb-1.5 z-20 w-44 bg-white border border-[#CBD5E0] rounded-md p-1.5 shadow-md">
                          <input
                            type="text"
                            placeholder="Tag name (e.g. Fever)"
                            value={newTagText}
                            onChange={(e) => setNewTagText(e.target.value)}
                            className="w-full p-1 border border-border rounded text-[11px] mb-1.5 focus:outline-none focus:border-primary"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setIsTagPopoverOpen(null)}
                              className="px-2 py-0.5 border border-border text-[9px] rounded hover:bg-gray-50 font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleAddTag(patient.id)}
                              className="px-2 py-0.5 bg-primary text-white text-[9px] rounded hover:bg-primary-hover font-semibold"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <button className="px-2 py-0.5 border border-[#CBD5E0] hover:bg-gray-50 rounded text-[10px] font-bold text-[#4A5568] flex items-center gap-1 transition-colors">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Walkin
                    </button>

                    <button className="px-2 py-0.5 border border-[#CBD5E0] hover:bg-gray-50 rounded text-[10px] font-bold text-[#4A5568] flex items-center gap-1.5 transition-colors">
                      <svg className="w-2.5 h-2.5 text-orange-500 fill-orange-500/20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h45m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Assessment
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 border border-white"></span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 w-full md:w-auto flex-wrap justify-end">
                    <div className="flex items-center border border-[#CBD5E0] rounded overflow-hidden h-6">
                      <span className="px-1 text-[10px] font-bold text-text-secondary select-none">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={patient.billAmount}
                        onChange={(e) => handleBillAmountChange(patient.id, Number(e.target.value))}
                        className="w-10 text-[10px] font-bold text-center focus:outline-none bg-transparent"
                      />
                      <div className="w-[1px] h-full bg-[#CBD5E0]"></div>
                      <select
                        value={patient.paymentMethod}
                        onChange={(e) => handlePaymentMethodChange(patient.id, e.target.value)}
                        className="text-[10px] font-bold bg-transparent px-1 focus:outline-none cursor-pointer"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Online">Online</option>
                      </select>
                      <span className="pr-1 text-[9px] text-[#A0AEC0] select-none">▶</span>
                    </div>

                    <button
                      onClick={() => handleCreateAbha(patient.id)}
                      disabled={patient.isAbhaCreated}
                      className={`px-2 h-6 border rounded text-[10px] font-bold transition-all ${
                        patient.isAbhaCreated
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50"
                      }`}
                    >
                      {patient.isAbhaCreated ? "✓ ABHA Card" : "+ Create Abha"}
                    </button>

                    <button
                      onClick={() => handleOpenVitalsModal(patient.id)}
                      className="px-2 h-6 border border-[#CBD5E0] hover:bg-gray-50 rounded text-[10px] font-bold text-[#4A5568] flex items-center gap-1"
                    >
                      <svg className="w-2.5 h-2.5 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Vitals
                      {patient.vitals && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      )}
                    </button>

                    <button className="w-6 h-6 border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 rounded flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => setSelectedBookingPatient(patient)}
                      className="w-6 h-6 border border-[#CBD5E0] hover:bg-gray-50 rounded flex items-center justify-center shrink-0 text-primary"
                      title="Edit Patient Info"
                    >
                      <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    {/* Add Prescription Primary Action Button replacing Ongoing/Resume */}
                    <button
                      onClick={() => {
                        openPrescription(patient.id);
                      }}
                      className="px-3 h-6 bg-primary hover:bg-primary-hover text-white rounded text-[10px] font-extrabold shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Rx
                    </button>

                    <button
                      onClick={() => handleToggleCompleted(patient.id)}
                      className="w-6 h-6 border border-red-200 text-red-500 bg-red-50/30 hover:bg-red-50 rounded flex items-center justify-center shrink-0 transition-colors"
                      title={patient.isCompleted ? "Restore patient to queue" : "Checkout patient"}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        {patient.isCompleted ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </main>

        {/* BOTTOM FOOTER */}
        <footer className="h-7 bg-white border-t border-[#E5E7EB] px-3 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-4">
            <span className="text-[9px] text-[#A0AEC0] font-semibold">
              Last Synced: 2 mins ago
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded text-[9px] font-bold flex items-center gap-1 shadow-xs transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Meet DocAssist AI
            </button>
            <button className="px-2 py-0.5 bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED] hover:bg-[#ECE9FE] rounded text-[9px] font-bold flex items-center gap-1 shadow-xs transition-colors">
              <svg className="w-2.5 h-2.5 text-[#7C3AED] animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
              Generate prescription from voice
            </button>
          </div>
        </footer>

        {/* BACKDROP OVERLAY FOR BOOKING DRAWER */}
        {isBookOpen && (
          <div
            onClick={closeBooking}
            className="fixed inset-0 bg-black/15 z-35 animate-in fade-in duration-200"
          ></div>
        )}

        {/* WIDE RIGHT SIDEBAR: NEW OPD REGISTRATION & BOOKING FORM */}
        <aside
          className={`fixed inset-y-0 right-0 z-40 w-full sm:w-[580px] md:w-[720px] lg:w-[860px] bg-white border-l border-[#E5E7EB] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out select-none ${
            isBookOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="p-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-[12px] font-bold text-foreground leading-tight">New OPD Registration</h3>
                <p className="text-[9px] text-[#718096] font-medium leading-none mt-0.5">Fill in patient and visit information</p>
              </div>
            </div>
            <button
              onClick={closeBooking}
              className="p-1 hover:bg-[#E2E8F0] rounded-md text-[#718096] hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleRegisterAndBook} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              
              {!selectedBookingPatient && (
                <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-lg space-y-2">
                  <label className="block text-[10px] font-bold text-[#4A5568] uppercase tracking-wider">
                    Quick Search Existing Patient Directory
                  </label>
                  <div className="relative flex items-center border border-[#CBD5E0] bg-white rounded-md px-2.5 py-1">
                    <svg className="w-3.5 h-3.5 text-[#A0AEC0] mr-2 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Type name or phone (e.g. mudassir)"
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      className="text-[11px] text-foreground focus:outline-none w-full bg-transparent placeholder:text-[#A0AEC0]"
                    />
                  </div>

                  {bookingSearch.trim() && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[9px] font-bold text-text-secondary">
                        {bookingSearchResults.length} Matches Found
                      </div>
                      
                      {bookingSearchResults.map((patient) => (
                        <div
                          key={patient.id}
                          onClick={() => setSelectedBookingPatient(patient)}
                          className="p-1.5 border border-[#E2E8F0] rounded-md bg-white hover:border-primary/50 hover:bg-primary/5 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                              {patient.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[10px] font-bold text-foreground">
                              {patient.name} ({patient.gender}, {patient.age}y) - {patient.phone}
                            </span>
                          </div>
                          <span className="text-[9px] font-semibold text-primary">Select →</span>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          setFullName(bookingSearch);
                          setSelectedBookingPatient({
                            id: Date.now().toString(),
                            queueNo: "",
                            name: bookingSearch,
                            gender: "Male",
                            age: 25,
                            phone: "",
                            statusTags: [],
                            billAmount: 0,
                            paymentMethod: "Cash",
                            isAbhaCreated: false,
                            customTags: [],
                            isCompleted: false,
                            isOngoing: false,
                            arrivalTime: "",
                            arrivalMinutesAgo: 0,
                          });
                        }}
                        className="w-full p-2 border border-dashed border-primary/40 rounded-md bg-primary/5 hover:bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center gap-1"
                      >
                        + Add New Patient "{bookingSearch}"
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedBookingPatient && (
                <div className="p-2 bg-emerald-50 border border-emerald-150 rounded-md flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-[10px] font-bold text-emerald-800">
                      OPD Registering: {fullName || "New Patient"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBookingPatient(null)}
                    className="text-[9px] font-bold text-red-500 hover:underline"
                  >
                    Clear Selector
                  </button>
                </div>
              )}

              {/* SECTION 1: PATIENT INFORMATION */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-primary border-l-2 border-primary pl-2 uppercase tracking-wide">
                  I. Patient Information
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#4A5568]">Title</label>
                    <select
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none"
                    >
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                      <option value="Dr">Dr</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#4A5568]">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none focus:border-primary placeholder:text-gray-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#4A5568]">Phone Number</label>
                    <div className="flex border border-[#CBD5E0] rounded-md overflow-hidden bg-white focus-within:border-primary h-8">
                      <select
                        value={phoneDialCode}
                        onChange={(e) => setPhoneDialCode(e.target.value)}
                        className="bg-slate-50 border-r border-[#CBD5E0] px-1 text-[11px] font-bold text-[#4A5568] focus:outline-none"
                      >
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                      </select>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9958399157"
                        className="w-full px-2 py-1 text-[11px] focus:outline-none placeholder:text-gray-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#4A5568]">Gender *</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#4A5568]">Age *</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        value={age}
                        onChange={(e) => handleAgeChange(e.target.value)}
                        placeholder="25"
                        className="w-1/2 h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] focus:outline-none focus:border-primary placeholder:text-gray-300 text-center"
                      />
                      <select
                        value={ageUnit}
                        onChange={(e) => handleAgeUnitChange(e.target.value)}
                        className="w-1/2 h-8 px-2 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none"
                      >
                        <option value="Year">Year</option>
                        <option value="Month">Month</option>
                        <option value="Day">Day</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#4A5568]">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => handleDobChange(e.target.value)}
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none focus:border-primary text-center"
                    />
                  </div>

                  <div className="space-y-1 relative sm:col-span-2">
                    <label className="text-[10px] font-bold text-[#4A5568]">Permanent Address</label>
                    <input
                      type="text"
                      value={permanentAddress}
                      onChange={(e) => setPermanentAddress(e.target.value)}
                      onFocus={() => setAddressFocused(true)}
                      onBlur={() => setTimeout(() => setAddressFocused(false), 200)}
                      placeholder="Type permanent address (e.g. mumbra)"
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none focus:border-primary placeholder:text-gray-300"
                    />
                    
                    {addressFocused && matchingAddresses.length > 0 && (
                      <div className="absolute left-0 top-full mt-1 z-30 w-full bg-white border border-[#CBD5E0] rounded-md shadow-lg max-h-32 overflow-y-auto p-1 space-y-0.5">
                        {matchingAddresses.map((addr) => (
                          <div
                            key={addr}
                            onClick={() => {
                              setPermanentAddress(addr);
                              setLocalAddress(addr);
                            }}
                            className="p-1.5 text-[11px] hover:bg-primary/5 rounded cursor-pointer text-left font-semibold text-foreground transition-colors"
                          >
                            {addr}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-[#4A5568]">Local Address</label>
                    <input
                      type="text"
                      value={localAddress}
                      onChange={(e) => setLocalAddress(e.target.value)}
                      placeholder="Type local address"
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none focus:border-primary placeholder:text-gray-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#4A5568]">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="India"
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#4A5568]">State (Optional)</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Maharashtra"
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: VISIT DETAILS */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[10px] font-bold text-primary border-l-2 border-primary pl-2 uppercase tracking-wide">
                  II. Visit Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#4A5568]">Appointment Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={appointmentDateTime}
                      onChange={(e) => setAppointmentDateTime(e.target.value)}
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#4A5568]">Hospital/Clinic Name *</label>
                    <select
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none"
                    >
                      <option value="DLPC - Dadar">DLPC - Dadar</option>
                      <option value="DLPC - East">DLPC - East</option>
                      <option value="DLPC - West">DLPC - West</option>
                    </select>
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-bold text-[#4A5568]">Treating Doctor *</label>
                    <input
                      type="text"
                      required
                      value={treatingDoctor}
                      onChange={(e) => setTreatingDoctor(e.target.value)}
                      onFocus={() => setDoctorFocused(true)}
                      onBlur={() => setTimeout(() => setDoctorFocused(false), 200)}
                      placeholder="Type doctor name"
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none focus:border-primary placeholder:text-gray-300"
                    />

                    {doctorFocused && matchingDoctors.length > 0 && (
                      <div className="absolute left-0 top-full mt-1 z-35 w-full bg-white border border-[#CBD5E0] rounded-md shadow-lg max-h-32 overflow-y-auto p-1 space-y-0.5">
                        {matchingDoctors.map((doc) => (
                          <div
                            key={doc}
                            onClick={() => setTreatingDoctor(doc)}
                            className="p-1.5 text-[11px] hover:bg-primary/5 rounded cursor-pointer text-left font-semibold text-foreground transition-colors"
                          >
                            {doc}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#4A5568]">Visit Category *</label>
                    <select
                      value={visitCategory}
                      onChange={(e) => setVisitCategory(e.target.value)}
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none"
                    >
                      <option value="First consultation">First consultation</option>
                      <option value="Follow-up consultation">Follow-up consultation</option>
                      <option value="Routine Check">Routine Check</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#4A5568]">Referring Doctor</label>
                    <input
                      type="text"
                      value={referringDoctor}
                      onChange={(e) => setReferringDoctor(e.target.value)}
                      placeholder="e.g. Dadar East"
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* SERVICES */}
                <div className="space-y-2 border border-[#E2E8F0] p-3 rounded-lg bg-slate-50/50">
                  <div className="flex justify-between items-center select-none border-b pb-1.5 mb-2">
                    <span className="text-[10px] font-extrabold text-[#4A5568] uppercase">Services Selection</span>
                    <button
                      type="button"
                      onClick={addServiceRow}
                      className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-[9px] font-bold rounded"
                    >
                      + Add Service
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {servicesRows.map((row) => (
                      <div key={row.id} className="flex gap-3 items-center relative animate-in slide-in-from-top-1 duration-100">
                        <div className="flex-1 space-y-0.5 relative">
                          <label className="text-[8px] font-bold text-[#718096] uppercase">Service Name *</label>
                          <input
                            type="text"
                            required
                            value={row.name}
                            onChange={(e) => {
                              const typedName = e.target.value;
                              updateServiceRow(row.id, typedName, row.fee);
                              const matched = serviceCache.find((s) => s.name.toLowerCase() === typedName.toLowerCase());
                              if (matched) {
                                updateServiceRow(row.id, matched.name, matched.price);
                              }
                            }}
                            onFocus={() => setServiceRowFocused(row.id)}
                            onBlur={() => setTimeout(() => setServiceRowFocused(null), 200)}
                            placeholder="Consultation"
                            className="w-full h-7 px-2 border border-[#CBD5E0] rounded text-[11px] bg-white focus:outline-none"
                          />
                          
                          {serviceRowFocused === row.id && (
                            <div className="absolute left-0 top-full mt-0.5 z-35 w-full bg-white border border-[#CBD5E0] rounded shadow-md max-h-32 overflow-y-auto p-1 space-y-0.5">
                              {serviceCache.map((s) => (
                                <div
                                  key={s.name}
                                  onClick={() => updateServiceRow(row.id, s.name, s.price)}
                                  className="p-1.5 text-[10px] hover:bg-primary/5 rounded cursor-pointer text-left font-semibold text-foreground transition-all"
                                >
                                  {s.name} (₹{s.price})
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="w-24 space-y-0.5">
                          <label className="text-[8px] font-bold text-[#718096] uppercase">Fee (₹) *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={row.fee}
                            onChange={(e) => updateServiceRow(row.id, row.name, Number(e.target.value))}
                            placeholder="2000"
                            className="w-full h-7 px-2 border border-[#CBD5E0] rounded text-[11px] bg-white focus:outline-none text-right font-bold"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeServiceRow(row.id)}
                          className="h-7 w-7 mt-3.5 flex items-center justify-center border border-red-200 text-red-500 bg-red-50/50 hover:bg-red-50 rounded shrink-0 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t mt-3 select-none">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-text-secondary uppercase">Discount Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(Number(e.target.value))}
                        className="w-full h-7 px-2 border border-[#CBD5E0] rounded text-[11px] bg-white text-right focus:outline-none"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-text-secondary uppercase">Total Fees (₹)</label>
                      <div className="w-full h-7 px-2 border border-[#E2E8F0] rounded text-[11px] bg-slate-100 flex items-center justify-end font-extrabold text-foreground select-text">
                        ₹ {Math.max(0, totalServiceFees - discountAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: PAYMENTS & SUMMARY */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[10px] font-bold text-primary border-l-2 border-primary pl-2 uppercase tracking-wide">
                  III. Payments & Summary
                </h4>

                <div className="space-y-2 border border-[#E2E8F0] p-3 rounded-lg bg-slate-50/50">
                  <div className="flex justify-between items-center select-none border-b pb-1.5 mb-2">
                    <span className="text-[10px] font-extrabold text-[#4A5568] uppercase">Payment Rows</span>
                    <button
                      type="button"
                      onClick={addPaymentRow}
                      className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-[9px] font-bold rounded"
                    >
                      + Add More
                    </button>
                  </div>

                  <div className="space-y-2">
                    {paymentsRows.map((pRow) => (
                      <div key={pRow.id} className="flex gap-3 items-center animate-in slide-in-from-top-1 duration-100">
                        <div className="flex-1 space-y-0.5">
                          <label className="text-[8px] font-bold text-[#718096] uppercase">Mode *</label>
                          <select
                            value={pRow.mode}
                            onChange={(e) => updatePaymentRow(pRow.id, e.target.value, pRow.amount)}
                            className="w-full h-7 px-2 border border-[#CBD5E0] rounded text-[11px] bg-white focus:outline-none"
                          >
                            <option value="Cash">Cash</option>
                            <option value="Online">Online</option>
                          </select>
                        </div>

                        <div className="w-32 space-y-0.5">
                          <label className="text-[8px] font-bold text-[#718096] uppercase">Amount (₹) *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={pRow.amount}
                            onChange={(e) => updatePaymentRow(pRow.id, pRow.mode, Number(e.target.value))}
                            className="w-full h-7 px-2 border border-[#CBD5E0] rounded text-[11px] bg-white focus:outline-none text-right font-bold"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removePaymentRow(pRow.id)}
                          className="h-7 w-7 mt-3.5 flex items-center justify-center border border-red-200 text-red-500 bg-red-50/50 hover:bg-red-50 rounded shrink-0 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 border border-[#E2E8F0] rounded-md p-3 select-none text-[11px] font-semibold space-y-2">
                  <div className="flex justify-between items-center text-text-secondary">
                    <span>Consultation Fee</span>
                    <span className="font-bold text-foreground">₹{totalServiceFees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-text-secondary">
                    <span>Discount</span>
                    <span className="font-bold text-foreground">₹{discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-text-secondary">
                    <span>Amount Paid</span>
                    <span className="font-bold text-foreground">₹{totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="h-[1px] bg-[#E2E8F0] my-1"></div>
                  <div className="flex justify-between items-center text-[12px] font-bold">
                    <span className="text-[#4A5568]">Remaining Amount</span>
                    <span className={remainingAmount > 0 ? "text-orange-500" : "text-emerald-600"}>
                      ₹{remainingAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: VITALS INITIAL */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[10px] font-bold text-primary border-l-2 border-primary pl-2 uppercase tracking-wide">
                  IV. Vitals (Initial)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50/30 border border-[#E2E8F0] p-3 rounded-lg">
                  <div className="space-y-0.5">
                    <label className="text-[8px] font-bold text-[#718096] uppercase">Blood Pressure</label>
                    <input
                      type="text"
                      value={initialBp}
                      onChange={(e) => setInitialBp(e.target.value)}
                      placeholder="120/80"
                      className="w-full h-7 px-2 border border-[#CBD5E0] rounded text-[11px] bg-white text-center focus:outline-none"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[8px] font-bold text-[#718096] uppercase">Pulse (BPM)</label>
                    <input
                      type="text"
                      value={initialPulse}
                      onChange={(e) => setInitialPulse(e.target.value)}
                      placeholder="BPM"
                      className="w-full h-7 px-2 border border-[#CBD5E0] rounded text-[11px] bg-white text-center focus:outline-none"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[8px] font-bold text-[#718096] uppercase">Weight (kg)</label>
                    <input
                      type="text"
                      value={initialWeight}
                      onChange={(e) => setInitialWeight(e.target.value)}
                      placeholder="0.0"
                      className="w-full h-7 px-2 border border-[#CBD5E0] rounded text-[11px] bg-white text-center focus:outline-none"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[8px] font-bold text-[#718096] uppercase">SpO2 (%)</label>
                    <input
                      type="text"
                      value={initialSpo2}
                      onChange={(e) => setInitialSpo2(e.target.value)}
                      placeholder="98"
                      className="w-full h-7 px-2 border border-[#CBD5E0] rounded text-[11px] bg-white text-center focus:outline-none"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[8px] font-bold text-[#718096] uppercase">Sugar (mg/dL)</label>
                    <input
                      type="text"
                      value={initialSugar}
                      onChange={(e) => setInitialSugar(e.target.value)}
                      placeholder="100"
                      className="w-full h-7 px-2 border border-[#CBD5E0] rounded text-[11px] bg-white text-center focus:outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-2.5 shrink-0 select-none">
              <button
                type="button"
                onClick={closeBooking}
                className="px-5 py-1.5 border border-[#CBD5E0] text-[11px] font-bold hover:bg-[#E2E8F0] rounded-md text-[#4A5568] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-1.5 bg-primary hover:bg-primary-hover rounded-md text-[11px] font-extrabold text-white transition-all shadow-xs"
              >
                Complete Registration
              </button>
            </div>
          </form>
        </aside>

        {/* STANDALONE VITALS MODAL */}
        {isVitalsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-sm rounded-lg border border-[#E5E7EB] shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-3 bg-[#475569] text-white flex items-center justify-between">
                <h3 className="text-[12px] font-bold">Record Vitals</h3>
                <button
                  onClick={() => {
                    setIsVitalsOpen(false);
                    setSelectedPatientId(null);
                  }}
                  className="p-1 hover:bg-slate-600 rounded text-white"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveVitals} className="p-4 space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Blood Pressure (BP)
                  </label>
                  <input
                    type="text"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    placeholder="e.g. 120/80 mmHg"
                    className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded-md text-[11px] bg-[#F9FAFB] focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#718096] uppercase tracking-wider">
                    Pulse Rate
                  </label>
                  <input
                    type="text"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    placeholder="e.g. 72 bpm"
                    className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded-md text-[11px] bg-[#F9FAFB] focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                      Temperature
                    </label>
                    <input
                      type="text"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                      placeholder="e.g. 98.6 °F"
                      className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded-md text-[11px] bg-[#F9FAFB] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                      Weight
                    </label>
                    <input
                      type="text"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 68 kg"
                      className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded-md text-[11px] bg-[#F9FAFB] focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVitalsOpen(false);
                      setSelectedPatientId(null);
                    }}
                    className="px-3 py-1.5 border border-border text-[11px] font-semibold hover:bg-gray-50 rounded-md text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-[11px] font-bold text-white rounded-md"
                  >
                    Save Vitals
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SYMPTOMS MORE OPTIONS MODAL */}
        {activeMoreOptionsSymptomId && (() => {
          const sym = symptoms.find(s => s.id === activeMoreOptionsSymptomId);
          if (!sym) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150">
              <div className="bg-white w-full max-w-lg rounded-lg border border-[#E5E7EB] shadow-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between select-none">
                  <h3 className="text-[13px] font-extrabold text-[#1e293b]">
                    {sym.name || "Symptom Detail"} | {sym.duration || "No duration"} | {sym.severity || "No severity"}
                  </h3>
                  <button
                    onClick={() => setActiveMoreOptionsSymptomId(null)}
                    className="text-[#94A3B8] hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Form fields */}
                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                  
                  {/* Select Headache site */}
                  <div className="space-y-1 relative">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase select-none">
                      Select Headache site
                    </label>
                    <input
                      type="text"
                      value={headacheSite}
                      onChange={(e) => setHeadacheSite(e.target.value)}
                      onFocus={() => setHeadacheSiteFocused(true)}
                      onBlur={() => setTimeout(() => setHeadacheSiteFocused(false), 200)}
                      placeholder="Select Headache site"
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] focus:border-primary rounded-md text-[11px] bg-white focus:outline-none"
                    />
                    {headacheSiteFocused && (
                      <div className="absolute left-0 top-full mt-1 z-35 w-full bg-white border border-[#CBD5E0] rounded-md shadow-lg max-h-40 overflow-y-auto p-1 space-y-0.5">
                        {SUGGESTED_HEADACHE_SITES.filter(h => !headacheSite || h.toLowerCase().includes(headacheSite.toLowerCase())).map(opt => (
                          <div
                            key={opt}
                            onMouseDown={() => setHeadacheSite(opt)}
                            className="p-1.5 hover:bg-slate-50 rounded cursor-pointer text-[11px] font-bold text-[#334155] border-b border-[#F1F5F9] last:border-b-0"
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Select Type of pain */}
                  <div className="space-y-1 relative">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase select-none">
                      Select Type of pain
                    </label>
                    <input
                      type="text"
                      value={typeOfPain}
                      onChange={(e) => setTypeOfPain(e.target.value)}
                      onFocus={() => setTypeOfPainFocused(true)}
                      onBlur={() => setTimeout(() => setTypeOfPainFocused(false), 200)}
                      placeholder="Select Type of pain"
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] focus:border-primary rounded-md text-[11px] bg-white focus:outline-none"
                    />
                    {typeOfPainFocused && (
                      <div className="absolute left-0 top-full mt-1 z-35 w-full bg-white border border-[#CBD5E0] rounded-md shadow-lg max-h-40 overflow-y-auto p-1 space-y-0.5">
                        {SUGGESTED_PAIN_TYPES.filter(p => !typeOfPain || p.toLowerCase().includes(typeOfPain.toLowerCase())).map(opt => (
                          <div
                            key={opt}
                            onMouseDown={() => setTypeOfPain(opt)}
                            className="p-1.5 hover:bg-slate-50 rounded cursor-pointer text-[11px] font-bold text-[#334155] border-b border-[#F1F5F9] last:border-b-0"
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Clinical course */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase select-none">
                      Clinical course
                    </label>
                    <select
                      value={clinicalCourse}
                      onChange={(e) => setClinicalCourse(e.target.value)}
                      className="w-full h-8 px-2 border border-[#CBD5E0] focus:border-primary rounded-md text-[11px] bg-white focus:outline-none font-bold text-[#334155]"
                    >
                      <option value="Acute">Acute</option>
                      <option value="Subacute">Subacute</option>
                      <option value="Chronic">Chronic</option>
                      <option value="Recurrent">Recurrent</option>
                    </select>
                  </div>

                  {/* Note with mockup styling controls */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center select-none">
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase">
                        Note
                      </label>
                      <span className="text-[10px] text-slate-400">ⓘ Info</span>
                    </div>
                    <div className="border border-[#CBD5E0] rounded-md overflow-hidden bg-white">
                      <div className="flex gap-2 text-[10.5px] font-extrabold text-[#718096] border-b pb-1.5 p-2 bg-slate-50 select-none">
                        <button type="button" className="px-2 py-0.5 hover:bg-slate-200 rounded">B</button>
                        <button type="button" className="px-2 py-0.5 hover:bg-slate-200 rounded italic">I</button>
                        <button type="button" className="px-2 py-0.5 hover:bg-slate-200 rounded">Bullet List</button>
                      </div>
                      <textarea
                        rows={4}
                        value={moreOptionsNote}
                        onChange={(e) => setMoreOptionsNote(e.target.value)}
                        placeholder="Enter detailed symptom notes here..."
                        className="w-full p-2.5 text-[11px] focus:outline-none bg-white font-medium text-[#334155] resize-none"
                      />
                    </div>
                  </div>

                </div>

                {/* Footer buttons */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50 select-none">
                  <button
                    type="button"
                    onClick={() => setActiveMoreOptionsSymptomId(null)}
                    className="px-4 py-1.5 border border-[#CBD5E0] rounded-md text-[11px] font-bold text-[#4A5568] hover:bg-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSymptoms(symptoms.map(s => s.id === activeMoreOptionsSymptomId ? {
                        ...s,
                        headacheSite,
                        typeOfPain,
                        clinicalCourse,
                        note: moreOptionsNote
                      } : s));
                      setActiveMoreOptionsSymptomId(null);
                    }}
                    className="px-4 py-1.5 bg-primary hover:bg-primary-hover rounded-md text-[11px] font-extrabold text-white transition-all shadow-xs"
                  >
                    Save
                  </button>
                </div>

              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default function OPDQueueDashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F6F8] font-sans">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-text-secondary">Loading HMS Dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
