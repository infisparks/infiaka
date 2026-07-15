"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, getUserRole } from "@/lib/supabase";

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

function EkaCarePageContent() {
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

  const fetchHeaderCounts = async (patientUhid: string, currentRegId: string | number, name: string, phone: string) => {
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

  // Legacy data state variables
  const [legacyVisits, setLegacyVisits] = useState<any[]>([]);
  const [loadingLegacy, setLoadingLegacy] = useState(false);
  const [selectedLegacyVisit, setSelectedLegacyVisit] = useState<any>(null);

  const fetchLegacyVisits = async (name: string, phone: any) => {
    if (!name && !phone) return;
    try {
      setLoadingLegacy(true);
      const cleanPhone = String(phone || "").replace(/\D/g, "");
      
      let query = supabase.from("legacy_patients").select("*");
      
      let orClause = "";
      if (name) orClause += `name.ilike.*${name.trim()}*`;
      if (cleanPhone) {
        if (orClause) orClause += ",";
        orClause += `phone.ilike.*${cleanPhone}*`;
      }
      
      if (orClause) {
        query = query.or(orClause);
      }
      
      const { data, error } = await query
        .not("prescription_url", "is", null)
        .order("visit_date", { ascending: false });
        
      if (error) throw error;
      
      setLegacyVisits(data || []);
      setLegacyVisitsCount(data ? data.length : 0);
      if (data && data.length > 0) {
        setSelectedLegacyVisit(data[0]);
      }
    } catch (e) {
      console.error("Error loading legacy visits:", e);
    } finally {
      setLoadingLegacy(false);
    }
  };

  useEffect(() => {
    if (!sessionLoaded) return;
    if (!rxPatientId) return;

    const loadPatientData = async () => {
      try {
        setLoading(true);
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
          billAmount: 0,
          paymentMethod: "Cash",
          isAbhaCreated: false,
          customTags: [],
          isCompleted: false,
          isOngoing: true,
          arrivalTime: "",
          arrivalMinutesAgo: 0,
        };

        setCurrentRxPatient(mappedPatient);
        fetchHeaderCounts(patientUhid, rxPatientId || "", pData.name || "", pData.number || "");
        
        if (mappedPatient.name || mappedPatient.phone) {
          await fetchLegacyVisits(mappedPatient.name, mappedPatient.phone);
        }
      } catch (err) {
        console.error("Error loading patient data:", err);
        setToast({ message: "Failed to load patient records", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    loadPatientData();
  }, [rxPatientId, sessionLoaded]);

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
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F6F8] font-sans">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Legacy Records...</p>
        </div>
      </div>
    );
  }

  if (!currentRxPatient) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F5F6F8] font-sans text-center p-5">
        <h1 className="text-lg font-bold text-slate-800">Registration Not Found</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          The registration parameters are missing or invalid. Please check the queue and try again.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-md"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans select-none overflow-hidden">
      {toast && <CustomToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ─── HEADER BAR ─── */}
      <header className="h-12 bg-white border-b border-[#E2E8F0] px-4 flex items-center justify-between shrink-0 shadow-2xs">
        {/* Left Back Arrow and Patient Meta */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/")}
            className="p-1 hover:bg-[#E2E8F0] rounded-md text-[#718096] transition-colors"
            title="Go to Dashboard"
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
          <button
            onClick={() => router.push(`/rx?rx=${rxPatientId}`)}
            className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground transition-all"
          >
            Pad
          </button>
          <button className="h-full px-3 text-[11px] font-bold text-primary border-b-2 border-primary">
            EkaCare Old Data{legacyVisitsCount > 0 ? ` (${legacyVisitsCount} found)` : ""}
          </button>
          <button 
            onClick={() => router.push(`/rx/certificate?rx=${rxPatientId}`)}
            className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground transition-all"
          >
            Medical Certificate
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

      {/* ─── MAIN WORKSPACE ─── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel: Legacy Visits list */}
        <div className="w-[300px] border-r border-[#E2E8F0] bg-white flex flex-col h-full overflow-hidden shrink-0">
          <div className="p-4 border-b border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">Legacy Visits</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">{legacyVisits.length} Records Found</p>
            </div>
            {loadingLegacy && (
              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {legacyVisits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-[10.5px] font-bold text-slate-700">No records found</p>
                <p className="text-[9px] text-slate-400 mt-1 max-w-[180px]">No EkaCare prescriptions match this patient's name or number.</p>
              </div>
            ) : (
              legacyVisits.map((visit) => {
                const isSelected = selectedLegacyVisit?.id === visit.id;
                const formattedDate = new Date(visit.visit_date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                });
                return (
                  <div
                    key={visit.id}
                    onClick={() => setSelectedLegacyVisit(visit)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-[#E2E8F0] bg-white hover:border-slate-355 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-foreground">{formattedDate}</p>
                        <p className="text-[9.5px] text-slate-500 mt-0.5 font-medium">{visit.clinic_name || "DLPC"}</p>
                      </div>
                      <span className="text-[8px] bg-red-105 text-red-700 font-extrabold px-1.5 py-0.5 rounded uppercase">
                        PDF
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[8px] text-slate-400 font-semibold">
                      <span>Dr. {visit.doctor_name || "Laxman Salve"}</span>
                      <span>UHID: {visit.uhid}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Right Panel: PDF Preview */}
        <div className="flex-1 bg-slate-100 flex flex-col h-full overflow-hidden">
          {selectedLegacyVisit ? (
            <div className="w-full h-full flex flex-col min-h-0">
              <div className="p-3 bg-white border-b border-[#E2E8F0] flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-bold text-foreground">
                    Prescription Preview - {selectedLegacyVisit.name}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Visit Date: {new Date(selectedLegacyVisit.visit_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedLegacyVisit.prescription_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-primary hover:bg-primary-hover text-white rounded text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    Open PDF
                  </a>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-hidden">
                <iframe
                  src={selectedLegacyVisit.prescription_url}
                  className="w-full h-full rounded-xl border border-[#CBD5E0] bg-white shadow-md"
                  title="Legacy PDF Preview"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <svg className="w-12 h-12 text-slate-300 mb-2 animate-pulse" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-[12px] font-bold text-slate-600">Select a visit from the left menu</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[240px]">Preview the legacy PDF prescription documents directly in the workspace.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EkaCarePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F6F8] font-sans">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preparing Legacy Records...</p>
        </div>
      </div>
    }>
      <EkaCarePageContent />
    </Suspense>
  );
}
