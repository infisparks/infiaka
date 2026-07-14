"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";

interface Patient {
  uhid: string;
  name: string;
  phone: string;
  gender: string;
  age: number;
}

interface Registration {
  registration_id: string;
  patient_uhid: string;
  appointment_date_time: string | null;
  clinic_name: string | null;
  treating_doctor: string | null;
  visit_category: string | null;
  deleted_reason: string | null;
  deleted_date: string | null;
  created_at: string;
  patient?: Patient;
}

function DeletedContent() {
  const router = useRouter();
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Auth session check
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

  // Load deleted registrations
  const fetchDeletedData = async () => {
    if (!sessionLoaded) return;
    try {
      setLoading(true);
      
      const { data: regData, error: regError } = await supabase
        .from("aka_opd_registration")
        .select("*")
        .eq("is_deleted", true)
        .order("deleted_date", { ascending: false });

      if (regError) throw regError;

      if (!regData || regData.length === 0) {
        setRegistrations([]);
        setLoading(false);
        return;
      }

      // Fetch patient details matching these patient_uhid values
      const uniqueUhids = Array.from(new Set(regData.map((r) => r.patient_uhid)));
      const { data: patientsData, error: patError } = await supabase
        .from("patient_detail")
        .select("*")
        .in("uhid", uniqueUhids);

      if (patError) throw patError;

      // Join registrations with patient details
      const mappedRegs: Registration[] = regData.map((reg) => {
        const p = (patientsData || []).find((pat) => pat.uhid === reg.patient_uhid);
        const patientObj: Patient | undefined = p
          ? {
              uhid: p.uhid,
              name: p.name,
              phone: String(p.number || ""),
              gender: p.gender || "Male",
              age: p.age || 25,
            }
          : undefined;

        return {
          registration_id: String(reg.registration_id),
          patient_uhid: reg.patient_uhid,
          appointment_date_time: reg.appointment_date_time,
          clinic_name: reg.clinic_name,
          treating_doctor: reg.treating_doctor,
          visit_category: reg.visit_category,
          deleted_reason: reg.deleted_reason,
          deleted_date: reg.deleted_date,
          created_at: reg.created_at,
          patient: patientObj,
        };
      });

      setRegistrations(mappedRegs);
    } catch (err) {
      console.error("Failed to load deleted appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedData();
  }, [sessionLoaded]);

  // Restore handler
  const handleRestore = async (regId: string) => {
    if (!confirm("Are you sure you want to restore this appointment?")) return;

    try {
      const { error } = await supabase
        .from("aka_opd_registration")
        .update({
          is_deleted: false,
          deleted_reason: null,
          deleted_date: null
        })
        .eq("registration_id", Number(regId));

      if (error) throw error;

      alert("Appointment restored successfully!");
      fetchDeletedData();
    } catch (err) {
      console.error("Failed to restore appointment:", err);
      alert("Failed to restore appointment. Please try again.");
    }
  };

  // Filtered registrations
  const filteredRegs = registrations.filter((reg) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = reg.patient?.name.toLowerCase() || "";
    const uhid = reg.patient_uhid.toLowerCase();
    const reason = (reg.deleted_reason || "").toLowerCase();
    const id = reg.registration_id;
    return name.includes(query) || uhid.includes(query) || reason.includes(query) || id.includes(query);
  });

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
      <Sidebar active="deleted" />

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden h-full relative">
        
        {/* HEADER BAR */}
        <header className="h-12 bg-white border-b border-[#E5E7EB] px-4 flex items-center justify-between shrink-0 select-none shadow-xs">
          <div className="flex items-center gap-2">
            <h1 className="text-[14px] font-bold text-slate-800 tracking-tight">
              Deleted Appointments Audit Directory
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex items-center border border-[#E5E7EB] bg-white rounded-md px-2.5 py-1 w-64 shadow-2xs">
              <svg className="w-3.5 h-3.5 text-[#A0AEC0] mr-1.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search name, UHID, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-[11px] text-foreground focus:outline-none w-full bg-transparent placeholder:text-[#A0AEC0]"
              />
            </div>
          </div>
        </header>

        {/* SUMMARY DELETED TOTALS */}
        <section className="p-4 grid grid-cols-4 gap-4.5 shrink-0 select-none">
          <div className="bg-white p-4.5 rounded-xl border border-[#E5E7EB] shadow-2xs text-left border-l-4 border-l-red-500">
            <span className="text-[10px] font-extrabold text-red-600 uppercase tracking-wider block">Deleted Count</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-[20px] font-black text-slate-800 leading-none">{registrations.length}</span>
              <span className="text-[10px] font-bold text-slate-400">Total Deleted Visits</span>
            </div>
          </div>
        </section>

        {/* DELETED LIST TABLE */}
        <main className="flex-1 px-4 pb-4 overflow-hidden flex flex-col min-h-0">
          <div className="bg-white rounded-xl border border-[#E5E7EB] flex flex-col flex-1 overflow-hidden shadow-2xs">
            <div className="px-4 py-3 border-b border-[#F1F5F9] bg-[#FAFBFC] shrink-0 flex items-center justify-between">
              <span className="text-[11.5px] font-extrabold text-[#1E293B] uppercase tracking-wider">
                Archived & Cancelled Appointments
              </span>
              <span className="text-[9.5px] font-semibold text-slate-400">
                Sorted by most recently deleted
              </span>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Loading Archive...</p>
                </div>
              ) : filteredRegs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-28 text-slate-350 bg-[#FAFBFC]">
                  <span className="text-3xl mb-1.5">🗑️</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Archive Empty</span>
                  <p className="text-[9px] text-slate-400 mt-1 max-w-[200px] text-center">No deleted appointments match your filter query.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse select-text">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[9px] font-extrabold border-b border-[#E2E8F0] tracking-wider select-none shrink-0 sticky top-0 z-10">
                      <th className="py-2.5 px-4">OPD ID</th>
                      <th className="py-2.5 px-4">Patient Profile</th>
                      <th className="py-2.5 px-4">Clinic / Doctor</th>
                      <th className="py-2.5 px-4">Visit Type</th>
                      <th className="py-2.5 px-4">Deleted Date</th>
                      <th className="py-2.5 px-4">Deletion Reason</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[12px] font-medium text-slate-650">
                    {filteredRegs.map((reg) => {
                      const formattedTime = reg.deleted_date 
                        ? new Date(reg.deleted_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })
                        : "N/A";

                      return (
                        <tr key={reg.registration_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-slate-800">
                            #{reg.registration_id}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="leading-tight text-left">
                              <span className="font-bold text-slate-800 block">
                                {reg.patient?.name || "Unknown Patient"}
                              </span>
                              <span className="text-[9.5px] text-slate-400 block font-semibold mt-0.5">
                                {reg.patient ? `${reg.patient.age}y / ${reg.patient.gender}` : "N/A"}  |  UHID: {reg.patient_uhid}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="leading-tight text-left">
                              <span className="font-bold text-slate-700 block">
                                Dr. {reg.treating_doctor || "Unknown"}
                              </span>
                              <span className="text-[9.5px] text-slate-400 block font-medium mt-0.5">
                                {reg.clinic_name || "General Clinic"}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 select-none">
                            <span className="px-2 py-0.5 bg-[#EEF2F6] text-[#475569] text-[9.5px] font-bold rounded-full">
                              {reg.visit_category || "General"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-semibold">
                            {formattedTime}
                          </td>
                          <td className="py-2.5 px-4 text-red-600 font-bold select-all max-w-[200px] truncate" title={reg.deleted_reason || ""}>
                            {reg.deleted_reason || "No reason specified"}
                          </td>
                          <td className="py-2.5 px-4 text-right select-none">
                            <button
                              onClick={() => handleRestore(reg.registration_id)}
                              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold transition-colors"
                            >
                              Restore
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
        </main>
      </div>
    </div>
  );
}

export default function DeletedPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F6F8] font-sans">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preparing Archive...</p>
        </div>
      </div>
    }>
      <DeletedContent />
    </Suspense>
  );
}
