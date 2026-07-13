"use client";

import React, { useState, useMemo, Suspense, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";




const getKolkataDateString = (offset = 0): string => {
  const date = new Date();
  if (offset !== 0) {
    date.setDate(date.getDate() + offset);
  }
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
};

const getTodayLabel = (): string => {
  const date = new Date();
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', day: 'numeric' }).format(date);
  const month = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', month: 'short' }).format(date);
  return `Tdy, ${day} ${month}`;
};

const getInitialAppointmentDateTime = (): string => {
  const date = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const yyyy = parts.find(p => p.type === 'year')?.value || '2026';
  const mm = parts.find(p => p.type === 'month')?.value || '07';
  const dd = parts.find(p => p.type === 'day')?.value || '12';
  const hh = parts.find(p => p.type === 'hour')?.value || '12';
  const min = parts.find(p => p.type === 'minute')?.value || '00';
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
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

// Initial suggestion caches
const initialAddressCache: string[] = [];
const initialDoctorCache: string[] = [];
const initialServiceCache: { name: string; price: number; type: "service" | "product" }[] = [];

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
const initialPatients: Patient[] = [];

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

  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => getTodayLabel());

  const loadPatientsFromDb = async (dateLabel: string = "Tdy, 12 Jul") => {
    try {
      // 1. Determine target date string (e.g. '2026-07-12')
      let targetDate = getKolkataDateString(0);
      if (dateLabel === "Yesterday") {
        targetDate = getKolkataDateString(-1);
      } else if (dateLabel.startsWith("Tdy")) {
        targetDate = getKolkataDateString(0);
      } else {
        const match = dateLabel.match(/(\d+)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (match) {
          const day = match[1].padStart(2, "0");
          const monthStr = match[2];
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const monthIdx = months.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
          if (monthIdx !== -1) {
            const month = String(monthIdx + 1).padStart(2, "0");
            const currentYear = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(new Date());
            targetDate = `${currentYear}-${month}-${day}`;
          }
        }
      }

      // 2. Fetch registrations for that target date range in India timezone (+05:30)
      const startRange = `${targetDate}T00:00:00+05:30`;
      const endRange = `${targetDate}T23:59:59+05:30`;

      const { data: regData, error: rError } = await supabase
        .from("aka_opd_registration")
        .select("*")
        .gte("appointment_date_time", startRange)
        .lte("appointment_date_time", endRange)
        .order("registration_id", { ascending: false });

      if (rError) throw rError;

      // Fetch all patient details for search autocomplete directory
      const { data: allPatientsData, error: dirError } = await supabase
        .from("patient_detail")
        .select("*");
      
      if (!dirError && allPatientsData) {
        const dir: Patient[] = allPatientsData.map((p) => ({
          id: p.uhid,
          queueNo: "",
          title: p.title || "Mr",
          name: p.name,
          phoneDialCode: "+91",
          phone: String(p.number || ""),
          gender: p.gender || "Male",
          age: p.age || 25,
          ageUnit: p.age_unit || "Year",
          dob: p.dob || "",
          permanentAddress: p.address || "",
          localAddress: p.local_address || "",
          country: p.country || "India",
          state: p.state || "Maharashtra",
          statusTags: [],
          billAmount: 0,
          paymentMethod: "Cash",
          isAbhaCreated: false,
          customTags: [],
          isCompleted: false,
          isOngoing: false,
          arrivalTime: "",
          arrivalMinutesAgo: 0,
        }));
        setPatientDirectory(dir);
      }

      if (!regData || regData.length === 0) {
        setPatients([]);
        return;
      }

      // 3. Fetch patient_details matching these patient_uhid values
      const uniqueUhids = Array.from(new Set(regData.map(r => r.patient_uhid)));
      const { data: patientsData, error: pError } = await supabase
        .from("patient_detail")
        .select("*")
        .in("uhid", uniqueUhids);

      if (pError) throw pError;

      // 4. Map registrations to Patient view representation
      const mapped: Patient[] = regData.map((reg, idx) => {
        const p = (patientsData || []).find(pat => pat.uhid === reg.patient_uhid);
        if (!p) return null;

        const billAmt = reg.services 
          ? reg.services.reduce((acc: number, s: any) => acc + (Number(s.fee) || 0), 0)
          : 0;
        const paymentsList = reg.payments && Array.isArray(reg.payments) ? reg.payments : [];
        const modesWithAmount: string[] = paymentsList.filter((p: any) => (p.amount || 0) > 0).map((p: any) => String(p.mode));
        const uniqueModes: string[] = Array.from(new Set(modesWithAmount.length > 0 ? modesWithAmount : paymentsList.map((p: any) => String(p.mode))));
        let pMethod = "Cash";
        if (uniqueModes.includes("Cash") && uniqueModes.includes("Online")) {
          pMethod = "Cash + Online";
        } else if (uniqueModes.length > 0) {
          pMethod = uniqueModes[0];
        }


        let isComp = false;
        if (typeof window !== "undefined") {
          const completedList = JSON.parse(localStorage.getItem("completed_appointments") || "[]");
          isComp = completedList.includes(String(reg.registration_id));
        }

        return {
          patient_id: p.patient_id,
          id: p.uhid,
          queueNo: String(idx + 1).padStart(2, "0"),
          title: p.title || "Mr",
          name: p.name,
          phoneDialCode: "+91",
          phone: String(p.number || ""),
          gender: p.gender || "Male",
          age: p.age || 25,
          ageUnit: p.age_unit || "Year",
          dob: p.dob || "",
          permanentAddress: p.address || "",
          localAddress: p.local_address || "",
          country: p.country || "India",
          state: p.state || "Maharashtra",
          statusTags: isComp ? ["Completed"] : ["Ongoing"],
          billAmount: billAmt,
          paymentMethod: pMethod,
          isAbhaCreated: false,
          customTags: [],
          isCompleted: isComp,
          isOngoing: !isComp,
          arrivalTime: reg.created_at 
            ? new Date(reg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          arrivalMinutesAgo: 0,
          vitals: {
            bp: reg.bp || "",
            pulse: reg.pulse || "",
            weight: reg.weight || "",
            spo2: reg.spo2 || "",
            sugar: reg.sugar || "",
          },
          opdRegistration: {
            registration_id: reg.registration_id,
            appointment_date_time: reg.appointment_date_time,
            clinic_name: reg.clinic_name,
            treating_doctor: reg.treating_doctor,
            visit_category: reg.visit_category,
            referring_doctor: reg.referring_doctor,
            discount_amount: reg.discount_amount,
            services: reg.services,
            payments: reg.payments
          }
        };
      }).filter(Boolean) as Patient[];

      setPatients(mapped);
    } catch (err) {
      console.error("Failed to load patients:", err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setSessionLoaded(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/login");
      } else {
        setSessionLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (sessionLoaded) {
      loadPatientsFromDb(selectedDate);
    }
  }, [sessionLoaded, selectedDate]);

  // Load master booking suggestions from Supabase on mount/session loaded
  useEffect(() => {
    if (!sessionLoaded) return;
    const fetchMasterCaches = async () => {
      try {
        const { data: dbCatalog, error: cError } = await supabase
          .from("aka_master_dropdown_catalog")
          .select("category_id, value, metadata")
          .in("category_id", [160, 161, 162, 163, 164, 165, 166])
          .order("usage_count", { ascending: false });

        if (!cError && dbCatalog) {
          const docList = dbCatalog.filter(c => c.category_id === 160).map(c => c.value);
          const addrList = dbCatalog.filter(c => c.category_id === 161).map(c => c.value);
          const clinicList = dbCatalog.filter(c => c.category_id === 162).map(c => c.value);
          const refDocList = dbCatalog.filter(c => c.category_id === 163).map(c => c.value);
          
          const servicesList = dbCatalog.filter(c => c.category_id === 164).map(c => {
            const meta = c.metadata && typeof c.metadata === "object" ? c.metadata as any : {};
            return {
              name: c.value,
              price: Number(meta.price) || 0,
              type: (meta.type === "product" ? "product" : "service") as "service" | "product"
            };
          });

          const countries = dbCatalog.filter(c => c.category_id === 165).map(c => c.value);
          const states = dbCatalog.filter(c => c.category_id === 166).map(c => c.value);

          if (docList.length > 0) setDoctorCache(docList);
          if (addrList.length > 0) setAddressCache(addrList);
          if (servicesList.length > 0) setServiceCache(servicesList);
          if (countries.length > 0) setCountryCache(countries);
          if (states.length > 0) setStateCache(states);
          if (clinicList.length > 0) setClinicCache(clinicList);
          if (refDocList.length > 0) setReferringDoctorCache(refDocList);
        }
      } catch (err) {
        console.error("Error loading master dropdown caches:", err);
      }
    };
    fetchMasterCaches();
  }, [sessionLoaded]);

  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [patientDirectory, setPatientDirectory] = useState<Patient[]>([]);

  // --- VIEW TRANSITION CONTROLLERS (Synced with URL parameter ?rx=PATIENT_ID) ---
  const openPrescription = (patientId: string) => {
    router.push(`/rx?rx=${patientId}`);
  };

  const closePrescription = () => {
    router.push("/");
  };

  // URL State Synchronizer for Right Sidebar (Add OPD Registration)
  const bookParam = searchParams.get("book");
  const isBookOpen = !!bookParam;

  const openBooking = (patientId?: string | React.MouseEvent) => {
    const params = new URLSearchParams(searchParams.toString());
    const val = typeof patientId === "string" ? patientId : "true";
    params.set("book", val);
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
  const [countryCache, setCountryCache] = useState<string[]>([]);
  const [stateCache, setStateCache] = useState<string[]>([]);
  const [clinicCache, setClinicCache] = useState<string[]>([]);
  const [referringDoctorCache, setReferringDoctorCache] = useState<string[]>([]);

  // Autocomplete focus states
  const [addressFocused, setAddressFocused] = useState(false);
  const [doctorFocused, setDoctorFocused] = useState(false);
  const [countryFocused, setCountryFocused] = useState(false);
  const [stateFocused, setStateFocused] = useState(false);
  const [referringDoctorFocused, setReferringDoctorFocused] = useState(false);
  const [serviceRowFocused, setServiceRowFocused] = useState<string | null>(null);

  // Autocomplete key navigation states
  const [activeDDFocus, setActiveDDFocus] = useState<string | null>(null);
  const [activeDDIndex, setActiveDDIndex] = useState<number>(-1);

  // Standalone vitals modals
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [temp, setTemp] = useState("");
  const [weight, setWeight] = useState("");

  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState<string | null>(null);
  const [newTagText, setNewTagText] = useState("");

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
  const [appointmentDateTime, setAppointmentDateTime] = useState(() => getInitialAppointmentDateTime());
  const [clinicName, setClinicName] = useState("DLPC - Dadar");
  const [treatingDoctor, setTreatingDoctor] = useState("DR. LAXMAN SALVE");
  const [visitCategory, setVisitCategory] = useState("First consultation");
  const [referringDoctor, setReferringDoctor] = useState("Dadar East");
  const [discountAmount, setDiscountAmount] = useState<number | "">("");

  const [servicesRows, setServicesRows] = useState<Array<{ id: string; name: string; fee: number; qty?: number; type?: 'service' | 'product' }>>([
    { id: "1", name: "First consultation", fee: 2000, qty: 1, type: "service" }
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
    return patientDirectory.filter(
      (p) => p.name.toLowerCase().includes(query) || p.phone.includes(query)
    );
  }, [patientDirectory, bookingSearch]);





  const incrementOption = async (categoryId: number, value: string, metadata?: any) => {
    if (!value?.trim()) return;
    try {
      const { data: existing } = await supabase
        .from("aka_master_dropdown_catalog")
        .select("id, usage_count, metadata")
        .eq("category_id", categoryId)
        .ilike("value", value.trim())
        .maybeSingle();
      
      if (existing) {
        const mergedMeta = metadata ? { ...(existing.metadata || {}), ...metadata } : existing.metadata;
        await supabase
          .from("aka_master_dropdown_catalog")
          .update({ 
            usage_count: (existing.usage_count || 0) + 1,
            metadata: mergedMeta
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("aka_master_dropdown_catalog")
          .insert({ 
            category_id: categoryId, 
            value: value.trim(), 
            usage_count: 1,
            metadata: metadata || null
          });
      }
    } catch (err) {
      console.error("Error incrementing option:", err);
    }
  };

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
    setAppointmentDateTime(getInitialAppointmentDateTime());
    setClinicName("DLPC - Dadar");
    setTreatingDoctor("DR. LAXMAN SALVE");
    setVisitCategory("First consultation");
    setReferringDoctor("Dadar East");
    setDiscountAmount(0);
    setServicesRows([{ id: "1", name: "First consultation", fee: 2000, qty: 1, type: "service" }]);
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

      if (selectedBookingPatient.opdRegistration) {
        const reg = selectedBookingPatient.opdRegistration;
        if (reg.appointment_date_time) {
          setAppointmentDateTime(reg.appointment_date_time.slice(0, 16));
        }
        setClinicName(reg.clinic_name || "DLPC - Dadar");
        setTreatingDoctor(reg.treating_doctor || "DR. LAXMAN SALVE");
        setVisitCategory(reg.visit_category || "First consultation");
        setReferringDoctor(reg.referring_doctor || "Dadar East");
        setDiscountAmount(Number(reg.discount_amount) || 0);
        
        if (reg.services && reg.services.length > 0) {
          setServicesRows(reg.services);
        } else {
          setServicesRows([{ id: "1", name: "First consultation", fee: 2000 }]);
        }
        
        if (reg.payments && reg.payments.length > 0) {
          setPaymentsRows(reg.payments);
        } else {
          setPaymentsRows([{ id: "1", mode: "Cash", amount: 0 }]);
        }
      }
    }
  }, [selectedBookingPatient]);

  // Keep Edit Patient loaded in drawer if page is refreshed while editing (ID is in book param)
  useEffect(() => {
    if (bookParam && bookParam !== "true" && patientDirectory.length > 0) {
      const matched = patientDirectory.find((p) => String(p.id) === bookParam);
      if (matched && (!selectedBookingPatient || selectedBookingPatient.id !== matched.id)) {
        setSelectedBookingPatient(matched);
      }
    }
  }, [bookParam, patientDirectory, selectedBookingPatient]);



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

  const matchingReferringDoctors = useMemo(() => {
    if (referringDoctor.length < 1) return referringDoctorCache;
    return referringDoctorCache.filter((doc) =>
      doc.toLowerCase().includes(referringDoctor.toLowerCase())
    );
  }, [referringDoctorCache, referringDoctor]);

  const matchingCountries = useMemo(() => {
    if (country.length < 1) return countryCache;
    return countryCache.filter((c) =>
      c.toLowerCase().includes(country.toLowerCase())
    );
  }, [countryCache, country]);

  const matchingStates = useMemo(() => {
    if (state.length < 1) return stateCache;
    return stateCache.filter((s) =>
      s.toLowerCase().includes(state.toLowerCase())
    );
  }, [stateCache, state]);

  // Autocomplete full option builders (with dynamic "+ Create" buttons inside)
  const getDoctorOptions = () => {
    const list = [...matchingDoctors];
    if (treatingDoctor.trim() && !doctorCache.some(d => d.toLowerCase() === treatingDoctor.trim().toLowerCase())) {
      list.push(`+ Create "${treatingDoctor.trim()}"`);
    }
    return list;
  };

  const getAddressOptions = () => {
    const list = [...matchingAddresses];
    if (permanentAddress.trim() && !addressCache.some(a => a.toLowerCase() === permanentAddress.trim().toLowerCase())) {
      list.push(`+ Create "${permanentAddress.trim()}"`);
    }
    return list;
  };

  const getReferringDoctorOptions = () => {
    const list = [...matchingReferringDoctors];
    if (referringDoctor.trim() && !referringDoctorCache.some(r => r.toLowerCase() === referringDoctor.trim().toLowerCase())) {
      list.push(`+ Create "${referringDoctor.trim()}"`);
    }
    return list;
  };

  const getCountryOptions = () => {
    const list = [...matchingCountries];
    if (country.trim() && !countryCache.some(c => c.toLowerCase() === country.trim().toLowerCase())) {
      list.push(`+ Create "${country.trim()}"`);
    }
    return list;
  };

  const getStateOptions = () => {
    const list = [...matchingStates];
    if (state.trim() && !stateCache.some(s => s.toLowerCase() === state.trim().toLowerCase())) {
      list.push(`+ Create "${state.trim()}"`);
    }
    return list;
  };

  const getServiceOptions = (val: string) => {
    const filtered = serviceCache.filter(s => !val || s.name.toLowerCase().includes(val.toLowerCase()));
    let list = filtered.map(s => s.name);
    if (val.trim() && !serviceCache.some(s => s.name.toLowerCase() === val.trim().toLowerCase())) {
      list.push(`+ Create "${val.trim()}" (Service)`);
      list.push(`+ Create "${val.trim()}" (Product)`);
    }
    return list;
  };

  // Autocomplete generic keydown navigation
  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: string,
    optionsList: string[],
    onSelect: (val: string) => void
  ) => {
    if (activeDDFocus !== type) {
      setActiveDDFocus(type);
      setActiveDDIndex(-1);
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveDDIndex((prev) => {
        const nextIdx = Math.min(prev + 1, optionsList.length - 1);
        return nextIdx;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveDDIndex((prev) => {
        const nextIdx = Math.max(prev - 1, 0);
        return nextIdx;
      });
    } else if (e.key === "Enter") {
      if (activeDDIndex >= 0 && optionsList[activeDDIndex]) {
        e.preventDefault();
        onSelect(optionsList[activeDDIndex]);
        setActiveDDFocus(null);
        setActiveDDIndex(-1);
      }
    } else if (e.key === "Escape") {
      setActiveDDFocus(null);
      setActiveDDIndex(-1);
    }
  };

  const handleSelectService = (rowId: string, rowFee: number, val: string) => {
    const isCreateService = val.startsWith('+ Create "') && val.endsWith('" (Service)');
    const isCreateProduct = val.startsWith('+ Create "') && val.endsWith('" (Product)');
    let finalVal = val;
    if (isCreateService || isCreateProduct) {
      const match = val.match(/\+ Create "(.*)" \((Service|Product)\)/);
      finalVal = match ? match[1] : val;
      const type = isCreateProduct ? "product" : "service";
      incrementOption(164, finalVal, { type, price: rowFee });
      updateServiceRow(rowId, finalVal, rowFee, type);
    } else {
      const matched = serviceCache.find((s) => s.name.toLowerCase() === val.toLowerCase());
      if (matched) {
        updateServiceRow(rowId, matched.name, matched.price, matched.type);
      } else {
        updateServiceRow(rowId, val, rowFee);
      }
    }
    setServiceRowFocused(null);
  };

  // Services dynamic totals calculations
  const totalServiceFees = useMemo(() => {
    return servicesRows.reduce((acc, row) => acc + (row.fee || 0) * (row.type === "product" ? (row.qty || 1) : 1), 0);
  }, [servicesRows]);

  const totalPaid = useMemo(() => {
    return paymentsRows.reduce((acc, row) => acc + (row.amount || 0), 0);
  }, [paymentsRows]);

  const remainingAmount = useMemo(() => {
    return totalServiceFees - (Number(discountAmount) || 0) - totalPaid;
  }, [totalServiceFees, discountAmount, totalPaid]);

  // Auto-fill primary payment amount on dynamic services total update
  useEffect(() => {
    if (paymentsRows.length === 1) {
      const expectedAmount = Math.max(0, totalServiceFees - (Number(discountAmount) || 0));
      if (paymentsRows[0].amount !== expectedAmount) {
        setPaymentsRows([{ ...paymentsRows[0], amount: expectedAmount }]);
      }
    }
  }, [totalServiceFees, discountAmount, paymentsRows.length]);

  // Handlers for managing the patients in the main queue list
  const handleToggleCompleted = (patientId: string, regId?: string) => {
    setPatients((prev) =>
      prev.map((p) => {
        const match = regId && p.opdRegistration?.registration_id 
          ? String(p.opdRegistration.registration_id) === String(regId)
          : p.id === patientId;

        if (match) {
          const nextVal = !p.isCompleted;
          const completedList = JSON.parse(localStorage.getItem("completed_appointments") || "[]");
          let updatedList;
          const trackingKey = regId || p.opdRegistration?.registration_id || patientId;
          if (nextVal) {
            updatedList = Array.from(new Set([...completedList, String(trackingKey)]));
          } else {
            updatedList = completedList.filter((id: string) => id !== String(trackingKey));
          }
          localStorage.setItem("completed_appointments", JSON.stringify(updatedList));
          return {
            ...p,
            isCompleted: nextVal,
            isOngoing: !nextVal,
            statusTags: nextVal ? ["Completed"] : ["Ongoing"]
          };
        }
        return p;
      })
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
    setServicesRows([...servicesRows, { id: newId, name: "", fee: 0, qty: 1, type: "service" }]);
  };

  const removeServiceRow = (id: string) => {
    if (servicesRows.length === 1) return;
    setServicesRows(servicesRows.filter((row) => row.id !== id));
  };

  const updateServiceRow = (
    id: string,
    name: string,
    fee: number,
    type?: "service" | "product",
    qty?: number
  ) => {
    setServicesRows(
      servicesRows.map((row) =>
        row.id === id
          ? {
              ...row,
              name,
              fee,
              type: type ?? row.type ?? "service",
              qty: qty ?? row.qty ?? 1
            }
          : row
      )
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

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement && e.target.type !== "submit" && e.target.type !== "textarea") {
      e.preventDefault();
    }
  };

  // Master Form submit handler saving registration details
  const handleRegisterAndBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) return;

    // Cache typed doctor if new
    // Cache local states
    if (treatingDoctor.trim() && !doctorCache.includes(treatingDoctor.trim())) {
      setDoctorCache([...doctorCache, treatingDoctor.trim()]);
    }
    if (permanentAddress.trim() && !addressCache.includes(permanentAddress.trim())) {
      setAddressCache([...addressCache, permanentAddress.trim()]);
    }
    if (referringDoctor.trim() && !referringDoctorCache.includes(referringDoctor.trim())) {
      setReferringDoctorCache([...referringDoctorCache, referringDoctor.trim()]);
    }
    if (country.trim() && !countryCache.includes(country.trim())) {
      setCountryCache([...countryCache, country.trim()]);
    }
    if (state.trim() && !stateCache.includes(state.trim())) {
      setStateCache([...stateCache, state.trim()]);
    }
    servicesRows.forEach((row) => {
      if (row.name.trim() && !serviceCache.find((s) => s.name.toLowerCase() === row.name.toLowerCase())) {
        setServiceCache((prev) => [...prev, { name: row.name.trim(), price: row.fee, type: row.type || "service" }]);
      }
    });

    try {
      // Async database increments
      if (treatingDoctor.trim()) incrementOption(160, treatingDoctor);
      if (permanentAddress.trim()) incrementOption(161, permanentAddress);
      if (referringDoctor.trim()) incrementOption(163, referringDoctor);
      if (country.trim()) incrementOption(165, country);
      if (state.trim()) incrementOption(166, state);
      servicesRows.forEach((row) => {
        if (row.name.trim()) {
          incrementOption(164, row.name, { type: row.type || "service", price: row.fee });
        }
      });

      const isUpdate = !!selectedBookingPatient;
      let targetUhid = "";

      if (isUpdate) {
        targetUhid = selectedBookingPatient!.id;
        const { error: pError } = await supabase
          .from("patient_detail")
          .update({
            name: fullName,
            number: Number(phone) || null,
            age: Number(age) || null,
            gender: gender,
            address: permanentAddress,
            age_unit: ageUnit,
            dob: dob || null,
            title: title,
            state: state,
            local_address: localAddress,
            country: country,
            updated_at: new Date().toISOString()
          })
          .eq("uhid", targetUhid);
        if (pError) throw pError;
      } else {
        const tempUhid = "TEMP-" + Date.now();
        const { data: newP, error: pError } = await supabase
          .from("patient_detail")
          .insert({
            name: fullName,
            number: Number(phone) || null,
            age: Number(age) || null,
            gender: gender,
            address: permanentAddress,
            age_unit: ageUnit,
            dob: dob || null,
            title: title,
            state: state,
            local_address: localAddress,
            country: country,
            uhid: tempUhid
          })
          .select()
          .single();
        if (pError) throw pError;
        targetUhid = newP.uhid;
      }

      if (isUpdate && selectedBookingPatient!.opdRegistration?.registration_id) {
        // Update existing registration details
        const { error: rError } = await supabase
          .from("aka_opd_registration")
          .update({
            appointment_date_time: appointmentDateTime ? `${appointmentDateTime}:00+05:30` : null,
            clinic_name: clinicName,
            treating_doctor: treatingDoctor,
            visit_category: visitCategory,
            referring_doctor: referringDoctor,
            discount_amount: discountAmount || 0,
            services: servicesRows,
            payments: paymentsRows,
            bp: initialBp,
            pulse: initialPulse,
            weight: initialWeight,
            spo2: initialSpo2,
            sugar: initialSugar
          })
          .eq("registration_id", selectedBookingPatient!.opdRegistration.registration_id);
        if (rError) throw rError;
      } else {
        // Insert new registration details
        const { error: rError } = await supabase
          .from("aka_opd_registration")
          .insert({
            patient_uhid: targetUhid,
            appointment_date_time: appointmentDateTime ? `${appointmentDateTime}:00+05:30` : null,
            clinic_name: clinicName,
            treating_doctor: treatingDoctor,
            visit_category: visitCategory,
            referring_doctor: referringDoctor,
            discount_amount: discountAmount || 0,
            services: servicesRows,
            payments: paymentsRows,
            bp: initialBp,
            pulse: initialPulse,
            weight: initialWeight,
            spo2: initialSpo2,
            sugar: initialSugar
          });
        if (rError) throw rError;
      }

      await loadPatientsFromDb(selectedDate);
      closeBooking();
    } catch (err) {
      console.error("Failed to save registration:", err);
    }
  };



  const handlePrintBill = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const servicesList = patient.opdRegistration?.services || [];
    const discount = patient.opdRegistration?.discount_amount || 0;
    const totalFees = servicesList.reduce((acc: number, s: any) => acc + (Number(s.fee) || 0), 0);
    const amountPaid = totalFees - discount;

    printWindow.document.write(`
      <html>
        <head>
          <title>Bill Receipt - ${patient.name}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #111827; max-width: 600px; margin: 0 auto; }
            .header { border-bottom: 2px solid #E5E7EB; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #7C3AED; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px; font-size: 14px; }
            .table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
            .table th { border-bottom: 2px solid #E5E7EB; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; color: #6B7280; }
            .table td { border-bottom: 1px solid #E5E7EB; padding: 10px; font-size: 14px; }
            .summary { margin-left: auto; width: 300px; font-size: 14px; }
            .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .total { font-weight: bold; border-top: 1px solid #E5E7EB; padding-top: 10px; font-size: 16px; color: #7C3AED; }
            .footer { text-align: center; font-size: 12px; color: #9CA3AF; margin-top: 50px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${patient.opdRegistration?.clinic_name || "OPD CLINIC"}</div>
            <p style="margin: 5px 0 0 0; color: #6B7280; font-size: 14px;">Receipt of Payment</p>
          </div>
          <div class="info-grid">
            <div>
              <strong>Patient Name:</strong> ${patient.title || "Mr/Mrs"} ${patient.name}<br>
              <strong>Age/Gender:</strong> ${patient.age}y / ${patient.gender}<br>
              <strong>Phone:</strong> ${patient.phone}
            </div>
            <div style="text-align: right;">
              <strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}<br>
              <strong>Receipt No:</strong> REC-${patientId.slice(-6)}<br>
              <strong>Treating Doctor:</strong> ${patient.opdRegistration?.treating_doctor || "N/A"}
            </div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Service / Item</th>
                <th>Type</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${servicesList.length > 0 ? servicesList.map((s: any) => `
                <tr>
                  <td>${s.name}</td>
                  <td>${s.type === 'product' ? 'Product' : 'Service'}</td>
                  <td style="text-align: right;">₹${s.fee}</td>
                </tr>
              `).join('') : `
                <tr>
                  <td>Consultation Fee</td>
                  <td>Service</td>
                  <td style="text-align: right;">₹${patient.billAmount}</td>
                </tr>
              `}
            </tbody>
          </table>
          <div class="summary">
            <div class="summary-row">
              <span>Subtotal</span>
              <span>₹${totalFees || patient.billAmount}</span>
            </div>
            ${discount > 0 ? `
              <div class="summary-row">
                <span>Discount</span>
                <span>- ₹${discount}</span>
              </div>
            ` : ''}
            <div class="summary-row total">
              <span>Total Paid (${patient.paymentMethod})</span>
              <span>₹${amountPaid || patient.billAmount}</span>
            </div>
          </div>
          <div class="footer">
            Thank you for visiting! Get well soon.
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

  const handlePrintPrescription = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const saved = typeof window !== "undefined" ? JSON.parse(localStorage.getItem(`saved_rx_${patientId}`) || "null") : null;
    const medList: any[] = saved ? saved.medications : [
      { name: "Dolopar 650 Tablets", generic: "PARACETAMOL (650MG)", dose: "2 capsule", freq: "1-1-1", timing: "After Meal", duration: "10 Days", instr: "" },
      { name: "Meftal-Spas Tablet", generic: "DICYCLOMINE (10MG) + MEFENAMIC ACID (250MG)", dose: "1 Tablet", freq: "1-0-1", timing: "After Meal", duration: "3 Days", instr: "" }
    ];
    const symList: any[] = saved ? saved.symptoms : [
      { name: "Head Pain", duration: "1 Hour", severity: "Severe" }
    ];
    const diagList: any[] = saved ? saved.diagnoses : [
      { name: "Period pain", since: "2 Days", status: "Active" }
    ];
    const labList: any[] = saved ? saved.labs : [
      { name: "Liver Function Test (LFT)", remarks: "" }
    ];
    const notes = saved ? saved.notesForPatient : "";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Prescription - ${patient.name}</title>
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
              <div class="clinic-name">${patient.opdRegistration?.clinic_name || "OPD CLINIC"}</div>
              <p style="margin: 3px 0 0 0; color: #6B7280; font-size: 13px; font-weight: 500;">Comprehensive Care Clinic</p>
            </div>
            <div class="doc-info">
              <strong>${patient.opdRegistration?.treating_doctor || "Dr. Treating Doctor"}</strong><br>
              MBBS, MD<br>
              Reg No: 123456
            </div>
          </div>

          <div class="info-grid">
            <div>
              <strong>Patient Name:</strong> ${patient.title || "Mr/Mrs"} ${patient.name}<br>
              <strong>Age/Gender:</strong> ${patient.age} ${patient.ageUnit || 'Year'}(s) / ${patient.gender}<br>
              <strong>Phone:</strong> ${patient.phone}
            </div>
            <div style="text-align: right;">
              <strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}<br>
              <strong>UHID / Queue No:</strong> ${patient.id} / Q-${patient.queueNo || "00"}<br>
            </div>
          </div>

          ${patient.vitals && (patient.vitals.bp || patient.vitals.pulse || patient.vitals.weight || patient.vitals.spo2 || patient.vitals.sugar) ? `
            <div class="rx-section">
              <div class="rx-title">Vitals</div>
              <div class="vitals-grid">
                ${patient.vitals.bp ? `<div><strong>BP:</strong> ${patient.vitals.bp} mmHg</div>` : ''}
                ${patient.vitals.pulse ? `<div><strong>Pulse:</strong> ${patient.vitals.pulse} bpm</div>` : ''}
                ${patient.vitals.weight ? `<div><strong>Weight:</strong> ${patient.vitals.weight} kg</div>` : ''}
                ${patient.vitals.spo2 ? `<div><strong>SpO2:</strong> ${patient.vitals.spo2}%</div>` : ''}
                ${patient.vitals.sugar ? `<div><strong>Sugar:</strong> ${patient.vitals.sugar} mg/dL</div>` : ''}
              </div>
            </div>
          ` : ''}

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            ${symList.length > 0 ? `
              <div class="rx-section">
                <div class="rx-title">Symptoms / Complaints</div>
                <ul class="list-disc">
                  ${symList.map(s => `<li>${s.name} ${s.duration ? `(${s.duration})` : ''} - <span style="text-transform: capitalize; font-size: 11px; font-weight: bold; color: #4B5563;">${s.severity}</span></li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${diagList.length > 0 ? `
              <div class="rx-section">
                <div class="rx-title">Diagnoses</div>
                <ul class="list-disc">
                  ${diagList.map(d => `<li>${d.name} ${d.since ? `(since ${d.since})` : ''}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>

          <div class="rx-symbol">Rₓ</div>

          <div class="rx-section">
            <div class="rx-title">Medications (Rx)</div>
            ${medList.map(m => `
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

          ${labList.length > 0 ? `
            <div class="rx-section">
              <div class="rx-title">Lab Investigations Suggested</div>
              <ul class="list-disc">
                ${labList.map(l => `<li>${l.name}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${notes ? `
            <div class="rx-section">
              <div class="rx-title">Doctor Notes</div>
              <div style="font-size: 13px; color: #374151; background: #F9FAFB; padding: 10px; border-radius: 6px; border: 1px solid #E5E7EB; white-space: pre-line;">
                ${notes}
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

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Sign Out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
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
                onClick={() => setSelectedDate(getTodayLabel())}
                className="p-1 hover:bg-gray-100 rounded text-[#718096]"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => setSelectedDate(getTodayLabel())}
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
                  </div>

                  <div className="flex items-center gap-1.5 w-full md:w-auto flex-wrap justify-end">
                    {/* Non-editable Bill amount and Payment badge */}
                    <div className="flex items-center border border-[#CBD5E0] bg-gray-50 rounded overflow-hidden h-6 select-none px-2 gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold text-[#4A5568]">₹ {patient.billAmount}</span>
                      <div className="w-[1px] h-3 bg-[#CBD5E0]"></div>
                      <span className="text-[9px] font-extrabold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {patient.paymentMethod}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenVitalsModal(patient.id)}
                      className="px-2 h-6 border border-[#CBD5E0] hover:bg-gray-50 rounded text-[10px] font-bold text-[#4A5568] flex items-center gap-1 transition-colors shrink-0"
                    >
                      <svg className="w-2.5 h-2.5 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Vitals
                      {patient.vitals && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      )}
                    </button>

                    <button className="w-6 h-6 border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 rounded flex items-center justify-center shrink-0 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedBookingPatient(patient);
                        openBooking(patient.id);
                      }}
                      className="w-6 h-6 border border-[#CBD5E0] hover:bg-gray-50 rounded flex items-center justify-center shrink-0 text-primary transition-colors"
                      title="Edit Patient Info"
                    >
                      <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => {
                        openPrescription(patient.opdRegistration?.registration_id || patient.id);
                      }}
                      className="px-3 h-6 bg-primary hover:bg-primary-hover text-white rounded text-[10px] font-extrabold shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Rx
                    </button>

                    {/* Print Bill Button */}
                    <button
                      onClick={() => handlePrintBill(patient.id)}
                      className="px-2 h-6 border border-[#CBD5E0] hover:bg-gray-50 rounded text-[10px] font-bold text-[#4A5568] flex items-center gap-1 transition-colors shrink-0"
                      title="Print Bill"
                    >
                      <svg className="w-2.5 h-2.5 text-[#4A5568]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print Bill
                    </button>

                    {/* Print Prescription Button */}
                    <button
                      onClick={() => handlePrintPrescription(patient.id)}
                      className="px-2 h-6 border border-[#CBD5E0] hover:bg-gray-50 rounded text-[10px] font-bold text-[#4A5568] flex items-center gap-1 transition-colors shrink-0"
                      title="Print Prescription"
                    >
                      <svg className="w-2.5 h-2.5 text-[#4A5568]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Print Prescription
                    </button>

                    <button
                      onClick={() => handleToggleCompleted(patient.id, patient.opdRegistration?.registration_id)}
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

          <form onSubmit={handleRegisterAndBook} onKeyDown={handleFormKeyDown} className="flex-1 flex flex-col overflow-hidden">
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
                      onChange={(e) => {
                        setPermanentAddress(e.target.value);
                        setActiveDDFocus("address");
                        setActiveDDIndex(-1);
                      }}
                      onKeyDown={(e) =>
                        handleInputKeyDown(e, "address", getAddressOptions(), (val) => {
                          let finalVal = val;
                          const isCreate = val.startsWith('+ Create "');
                          if (isCreate) {
                            const match = val.match(/\+ Create "(.*)"/);
                            finalVal = match ? match[1] : val;
                            incrementOption(161, finalVal);
                          }
                          setPermanentAddress(finalVal);
                          setLocalAddress(finalVal);
                          setAddressFocused(false);
                        })
                      }
                      onFocus={() => {
                        setAddressFocused(true);
                        setActiveDDFocus("address");
                        setActiveDDIndex(-1);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setAddressFocused(false);
                          if (activeDDFocus === "address") setActiveDDFocus(null);
                        }, 200);
                      }}
                      placeholder="Type permanent address (e.g. mumbra)"
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none focus:border-primary placeholder:text-gray-300"
                    />
                    
                    {addressFocused && getAddressOptions().length > 0 && (
                      <div className="absolute left-0 top-full mt-1 z-30 w-full bg-white border border-[#CBD5E0] rounded-md shadow-lg max-h-32 overflow-y-auto p-1 space-y-0.5">
                        {getAddressOptions().map((addr, idx) => {
                          const isCreate = addr.startsWith('+ Create "');
                          let displayVal = addr;
                          if (isCreate) {
                            const match = addr.match(/\+ Create "(.*)"/);
                            displayVal = match ? match[1] : addr;
                          }
                          const isHighlighted = idx === activeDDIndex && activeDDFocus === "address";
                          return (
                            <div
                              key={addr}
                              onMouseDown={() => {
                                let finalVal = displayVal;
                                if (isCreate) {
                                  incrementOption(161, displayVal);
                                }
                                setPermanentAddress(finalVal);
                                setLocalAddress(finalVal);
                                setAddressFocused(false);
                              }}
                              className={`p-1.5 text-[11px] rounded cursor-pointer text-left font-semibold transition-colors
                                ${isHighlighted ? "bg-primary/10 text-primary" : "hover:bg-primary/5 text-foreground"}`}
                            >
                              {isCreate ? (
                                <span className="text-primary font-bold">
                                  + Create <span className="italic font-semibold">"{displayVal}"</span>
                                </span>
                              ) : (
                                addr
                              )}
                            </div>
                          );
                        })}
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

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-bold text-[#4A5568]">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        setActiveDDFocus("country");
                        setActiveDDIndex(-1);
                      }}
                      onKeyDown={(e) =>
                        handleInputKeyDown(e, "country", getCountryOptions(), (val) => {
                          let finalVal = val;
                          const isCreate = val.startsWith('+ Create "');
                          if (isCreate) {
                            const match = val.match(/\+ Create "(.*)"/);
                            finalVal = match ? match[1] : val;
                            incrementOption(165, finalVal);
                          }
                          setCountry(finalVal);
                          setCountryFocused(false);
                        })
                      }
                      onFocus={() => {
                        setCountryFocused(true);
                        setActiveDDFocus("country");
                        setActiveDDIndex(-1);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setCountryFocused(false);
                          if (activeDDFocus === "country") setActiveDDFocus(null);
                        }, 200);
                      }}
                      placeholder="India"
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none focus:border-primary"
                    />

                    {countryFocused && getCountryOptions().length > 0 && (
                      <div className="absolute left-0 top-full mt-1 z-35 w-full bg-white border border-[#CBD5E0] rounded-md shadow-lg max-h-32 overflow-y-auto p-1 space-y-0.5">
                        {getCountryOptions().map((c, idx) => {
                          const isCreate = c.startsWith('+ Create "');
                          let displayVal = c;
                          if (isCreate) {
                            const match = c.match(/\+ Create "(.*)"/);
                            displayVal = match ? match[1] : c;
                          }
                          const isHighlighted = idx === activeDDIndex && activeDDFocus === "country";
                          return (
                            <div
                              key={c}
                              onMouseDown={() => {
                                let finalVal = displayVal;
                                if (isCreate) {
                                  incrementOption(165, displayVal);
                                }
                                setCountry(finalVal);
                                setCountryFocused(false);
                              }}
                              className={`p-1.5 text-[11px] rounded cursor-pointer text-left font-semibold transition-colors
                                ${isHighlighted ? "bg-primary/10 text-primary" : "hover:bg-primary/5 text-foreground"}`}
                            >
                              {isCreate ? (
                                <span className="text-primary font-bold">
                                  + Create <span className="italic font-semibold">"{displayVal}"</span>
                                </span>
                              ) : (
                                c
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-bold text-[#4A5568]">State (Optional)</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => {
                        setState(e.target.value);
                        setActiveDDFocus("state");
                        setActiveDDIndex(-1);
                      }}
                      onKeyDown={(e) =>
                        handleInputKeyDown(e, "state", getStateOptions(), (val) => {
                          let finalVal = val;
                          const isCreate = val.startsWith('+ Create "');
                          if (isCreate) {
                            const match = val.match(/\+ Create "(.*)"/);
                            finalVal = match ? match[1] : val;
                            incrementOption(166, finalVal);
                          }
                          setState(finalVal);
                          setStateFocused(false);
                        })
                      }
                      onFocus={() => {
                        setStateFocused(true);
                        setActiveDDFocus("state");
                        setActiveDDIndex(-1);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setStateFocused(false);
                          if (activeDDFocus === "state") setActiveDDFocus(null);
                        }, 200);
                      }}
                      placeholder="Maharashtra"
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none focus:border-primary"
                    />

                    {stateFocused && getStateOptions().length > 0 && (
                      <div className="absolute left-0 top-full mt-1 z-35 w-full bg-white border border-[#CBD5E0] rounded-md shadow-lg max-h-32 overflow-y-auto p-1 space-y-0.5">
                        {getStateOptions().map((s, idx) => {
                          const isCreate = s.startsWith('+ Create "');
                          let displayVal = s;
                          if (isCreate) {
                            const match = s.match(/\+ Create "(.*)"/);
                            displayVal = match ? match[1] : s;
                          }
                          const isHighlighted = idx === activeDDIndex && activeDDFocus === "state";
                          return (
                            <div
                              key={s}
                              onMouseDown={() => {
                                let finalVal = displayVal;
                                if (isCreate) {
                                  incrementOption(166, displayVal);
                                }
                                setState(finalVal);
                                setStateFocused(false);
                              }}
                              className={`p-1.5 text-[11px] rounded cursor-pointer text-left font-semibold transition-colors
                                ${isHighlighted ? "bg-primary/10 text-primary" : "hover:bg-primary/5 text-foreground"}`}
                            >
                              {isCreate ? (
                                <span className="text-primary font-bold">
                                  + Create <span className="italic font-semibold">"{displayVal}"</span>
                                </span>
                              ) : (
                                s
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none cursor-pointer"
                    >
                      {clinicCache.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-bold text-[#4A5568]">Treating Doctor *</label>
                    <input
                      type="text"
                      required
                      value={treatingDoctor}
                      onChange={(e) => {
                        setTreatingDoctor(e.target.value);
                        setActiveDDFocus("doctor");
                        setActiveDDIndex(-1);
                      }}
                      onKeyDown={(e) =>
                        handleInputKeyDown(e, "doctor", getDoctorOptions(), (val) => {
                          let finalVal = val;
                          const isCreate = val.startsWith('+ Create "');
                          if (isCreate) {
                            const match = val.match(/\+ Create "(.*)"/);
                            finalVal = match ? match[1] : val;
                            incrementOption(160, finalVal);
                          }
                          setTreatingDoctor(finalVal);
                          setDoctorFocused(false);
                        })
                      }
                      onFocus={() => {
                        setDoctorFocused(true);
                        setActiveDDFocus("doctor");
                        setActiveDDIndex(-1);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setDoctorFocused(false);
                          if (activeDDFocus === "doctor") setActiveDDFocus(null);
                        }, 200);
                      }}
                      placeholder="Type doctor name"
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none focus:border-primary placeholder:text-gray-300"
                    />

                    {doctorFocused && getDoctorOptions().length > 0 && (
                      <div className="absolute left-0 top-full mt-1 z-35 w-full bg-white border border-[#CBD5E0] rounded-md shadow-lg max-h-32 overflow-y-auto p-1 space-y-0.5">
                        {getDoctorOptions().map((doc, idx) => {
                          const isCreate = doc.startsWith('+ Create "');
                          let displayVal = doc;
                          if (isCreate) {
                            const match = doc.match(/\+ Create "(.*)"/);
                            displayVal = match ? match[1] : doc;
                          }
                          const isHighlighted = idx === activeDDIndex && activeDDFocus === "doctor";
                          return (
                            <div
                              key={doc}
                              onMouseDown={() => {
                                let finalVal = displayVal;
                                if (isCreate) {
                                  incrementOption(160, displayVal);
                                }
                                setTreatingDoctor(finalVal);
                                setDoctorFocused(false);
                              }}
                              className={`p-1.5 text-[11px] rounded cursor-pointer text-left font-semibold transition-colors
                                ${isHighlighted ? "bg-primary/10 text-primary" : "hover:bg-primary/5 text-foreground"}`}
                            >
                              {isCreate ? (
                                <span className="text-primary font-bold">
                                  + Create <span className="italic font-semibold">"{displayVal}"</span>
                                </span>
                              ) : (
                                doc
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#4A5568]">Visit Category *</label>
                    <select
                      value={visitCategory}
                      onChange={(e) => setVisitCategory(e.target.value)}
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="First consultation">First consultation</option>
                      <option value="Follow-up consultation">Follow-up consultation</option>
                      <option value="Routine Check">Routine Check</option>
                    </select>
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-bold text-[#4A5568]">Referring Doctor</label>
                    <input
                      type="text"
                      value={referringDoctor}
                      onChange={(e) => {
                        setReferringDoctor(e.target.value);
                        setActiveDDFocus("referringDoctor");
                        setActiveDDIndex(-1);
                      }}
                      onKeyDown={(e) =>
                        handleInputKeyDown(e, "referringDoctor", getReferringDoctorOptions(), (val) => {
                          let finalVal = val;
                          const isCreate = val.startsWith('+ Create "');
                          if (isCreate) {
                            const match = val.match(/\+ Create "(.*)"/);
                            finalVal = match ? match[1] : val;
                            incrementOption(163, finalVal);
                          }
                          setReferringDoctor(finalVal);
                          setReferringDoctorFocused(false);
                        })
                      }
                      onFocus={() => {
                        setReferringDoctorFocused(true);
                        setActiveDDFocus("referringDoctor");
                        setActiveDDIndex(-1);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setReferringDoctorFocused(false);
                          if (activeDDFocus === "referringDoctor") setActiveDDFocus(null);
                        }, 200);
                      }}
                      placeholder="e.g. Dadar East"
                      className="w-full h-8 px-2.5 border border-[#CBD5E0] rounded-md text-[11px] bg-white focus:outline-none focus:border-primary placeholder:text-gray-300"
                    />

                    {referringDoctorFocused && getReferringDoctorOptions().length > 0 && (
                      <div className="absolute left-0 top-full mt-1 z-35 w-full bg-white border border-[#CBD5E0] rounded-md shadow-lg max-h-32 overflow-y-auto p-1 space-y-0.5">
                        {getReferringDoctorOptions().map((doc, idx) => {
                          const isCreate = doc.startsWith('+ Create "');
                          let displayVal = doc;
                          if (isCreate) {
                            const match = doc.match(/\+ Create "(.*)"/);
                            displayVal = match ? match[1] : doc;
                          }
                          const isHighlighted = idx === activeDDIndex && activeDDFocus === "referringDoctor";
                          return (
                            <div
                              key={doc}
                              onMouseDown={() => {
                                let finalVal = displayVal;
                                if (isCreate) {
                                  incrementOption(163, displayVal);
                                }
                                setReferringDoctor(finalVal);
                                setReferringDoctorFocused(false);
                              }}
                              className={`p-1.5 text-[11px] rounded cursor-pointer text-left font-semibold transition-colors
                                ${isHighlighted ? "bg-primary/10 text-primary" : "hover:bg-primary/5 text-foreground"}`}
                            >
                              {isCreate ? (
                                <span className="text-primary font-bold">
                                  + Create <span className="italic font-semibold">"{displayVal}"</span>
                                </span>
                              ) : (
                                doc
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                                updateServiceRow(row.id, matched.name, matched.price, matched.type);
                              }
                              setActiveDDFocus("service-" + row.id);
                              setActiveDDIndex(-1);
                            }}
                            onKeyDown={(e) =>
                              handleInputKeyDown(e, "service-" + row.id, getServiceOptions(row.name), (val) => {
                                handleSelectService(row.id, row.fee, val);
                              })
                            }
                            onFocus={() => {
                              setServiceRowFocused(row.id);
                              setActiveDDFocus("service-" + row.id);
                              setActiveDDIndex(-1);
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setServiceRowFocused(null);
                                if (activeDDFocus === "service-" + row.id) setActiveDDFocus(null);
                              }, 200);
                            }}
                            placeholder="Consultation"
                            className="w-full h-7 px-2 border border-[#CBD5E0] rounded text-[11px] bg-white focus:outline-none"
                          />
                          
                          {serviceRowFocused === row.id && getServiceOptions(row.name).length > 0 && (
                            <div className="absolute left-0 top-full mt-0.5 z-35 w-full bg-white border border-[#CBD5E0] rounded shadow-md max-h-32 overflow-y-auto p-1 space-y-0.5">
                              {getServiceOptions(row.name).map((opt, idx) => {
                                const isCreateService = opt.startsWith('+ Create "') && opt.endsWith('" (Service)');
                                const isCreateProduct = opt.startsWith('+ Create "') && opt.endsWith('" (Product)');
                                const isCreate = isCreateService || isCreateProduct;
                                let displayVal = opt;
                                let displayType = "Service";
                                if (isCreate) {
                                  const match = opt.match(/\+ Create "(.*)" \((Service|Product)\)/);
                                  displayVal = match ? match[1] : opt;
                                  displayType = isCreateProduct ? "Product" : "Service";
                                } else {
                                  const matchedObj = serviceCache.find(s => s.name === opt);
                                  displayType = matchedObj && matchedObj.type === "product" ? "Product" : "Service";
                                }
                                const isHighlighted = idx === activeDDIndex && activeDDFocus === ("service-" + row.id);
                                return (
                                  <div
                                    key={opt}
                                    onMouseDown={() => {
                                      handleSelectService(row.id, row.fee, opt);
                                    }}
                                    className={`p-1.5 text-[10px] rounded cursor-pointer text-left font-semibold transition-colors
                                      ${isHighlighted ? "bg-primary/10 text-primary" : "hover:bg-primary/5 text-foreground"}`}
                                  >
                                    {isCreate ? (
                                      <span className="text-primary font-bold">
                                        + Create <span className="italic font-semibold">"{displayVal}"</span> ({displayType})
                                      </span>
                                    ) : (
                                      <span>{opt} <span className="text-gray-400 font-normal">({displayType})</span></span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="w-20 space-y-0.5">
                          <label className="text-[8px] font-bold text-[#718096] uppercase">Type</label>
                          <select
                            value={row.type || "service"}
                            onChange={(e) => {
                              const newType = e.target.value as "service" | "product";
                              updateServiceRow(row.id, row.name, row.fee, newType, newType === "service" ? 1 : (row.qty || 1));
                            }}
                            className="w-full h-7 px-1.5 border border-[#CBD5E0] rounded text-[11px] bg-white focus:outline-none cursor-pointer"
                          >
                            <option value="service">Service</option>
                            <option value="product">Product</option>
                          </select>
                        </div>

                        {row.type === "product" ? (
                          <div className="w-16 space-y-0.5 animate-in fade-in duration-100">
                            <label className="text-[8px] font-bold text-[#718096] uppercase">Qty</label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={row.qty || 1}
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => updateServiceRow(row.id, row.name, row.fee, row.type, Number(e.target.value))}
                              className="w-full h-7 px-2 border border-[#CBD5E0] rounded text-[11px] bg-white focus:outline-none text-center font-bold"
                            />
                          </div>
                        ) : (
                          <div className="w-16"></div>
                        )}
 
                        <div className="w-24 space-y-0.5">
                          <label className="text-[8px] font-bold text-[#718096] uppercase">Fee (₹) *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={row.fee}
                            onWheel={(e) => e.currentTarget.blur()}
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
                        onWheel={(e) => e.currentTarget.blur()}
                        onChange={(e) => setDiscountAmount(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full h-7 px-2 border border-[#CBD5E0] rounded text-[11px] bg-white text-right focus:outline-none"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-text-secondary uppercase">Total Fees (₹)</label>
                      <div className="w-full h-7 px-2 border border-[#E2E8F0] rounded text-[11px] bg-slate-100 flex items-center justify-end font-extrabold text-foreground select-text">
                        ₹ {Math.max(0, totalServiceFees - (Number(discountAmount) || 0))}
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
                            onWheel={(e) => e.currentTarget.blur()}
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
                    <span className="font-bold text-foreground">₹{(Number(discountAmount) || 0).toFixed(2)}</span>
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
