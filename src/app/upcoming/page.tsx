"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

interface Patient {
  uhid: string;
  name: string;
  phone: string;
  gender: string;
  age: number;
  ageUnit: string;
}

interface Registration {
  registration_id: string;
  patient_uhid: string;
  appointment_date_time: string | null;
  clinic_name: string | null;
  treating_doctor: string | null;
  visit_category: string | null;
  follow_up: string | null;
  follow_up_notes: string | null;
  notes_for_patient: string | null;
  is_completed: boolean | null;
  created_at: string;
  patient?: Patient;
}

const getDateOffsetStr = (offsetDays: number = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
};

export default function UpcomingPage() {
  const router = useRouter();
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [activeTab, setActiveTab] = useState<"FOLLOW_UPS" | "BOOKED">("FOLLOW_UPS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState("All");
  const [selectedClinicFilter, setSelectedClinicFilter] = useState("All");
  const [startDate, setStartDate] = useState(() => getDateOffsetStr(0));
  const [endDate, setEndDate] = useState(() => getDateOffsetStr(0));

  // Check URL tab param on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "BOOKED") {
        setActiveTab("BOOKED");
      }
    }
  }, []);

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

  // Fetch registrations & patients on mount
  useEffect(() => {
    if (!sessionLoaded) return;

    const fetchUpcomingData = async () => {
      try {
        setLoading(true);

        const { data: regData, error: regError } = await supabase
          .from("aka_opd_registration")
          .select("*")
          .or("is_deleted.is.null,is_deleted.eq.false");

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

        // Map and join registrations with patient details
        const mappedRegs: Registration[] = regData.map((reg) => {
          const p = (patientsData || []).find((pat) => pat.uhid === reg.patient_uhid);
          const patientObj: Patient | undefined = p
            ? {
                uhid: p.uhid,
                name: p.name,
                phone: String(p.number || ""),
                gender: p.gender || "Male",
                age: p.age || 25,
                ageUnit: p.age_unit || "Year",
              }
            : undefined;

          return {
            registration_id: String(reg.registration_id),
            patient_uhid: reg.patient_uhid,
            appointment_date_time: reg.appointment_date_time,
            clinic_name: reg.clinic_name,
            treating_doctor: reg.treating_doctor,
            visit_category: reg.visit_category,
            follow_up: reg.follow_up,
            follow_up_notes: reg.follow_up_notes,
            notes_for_patient: reg.notes_for_patient,
            is_completed: reg.is_completed || false,
            created_at: reg.created_at,
            patient: patientObj,
          };
        });

        setRegistrations(mappedRegs);
      } catch (err) {
        console.error("Failed to load upcoming data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingData();
  }, [sessionLoaded]);

  // Derived filter options (Doctor / Clinic caches)
  const doctorCache = useMemo(() => {
    const docs = registrations
      .map((r) => r.treating_doctor)
      .filter((d): d is string => !!d && d.trim() !== "");
    return Array.from(new Set(docs));
  }, [registrations]);

  const clinicCache = useMemo(() => {
    const clins = registrations
      .map((r) => r.clinic_name)
      .filter((c): c is string => !!c && c.trim() !== "");
    return Array.from(new Set(clins));
  }, [registrations]);

  // Get Kolkata local date today as Date object for comparison
  const todayDateObj = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const todayStr = formatter.format(new Date());
    return new Date(todayStr);
  }, []);

  // Filter and split registrations based on activeTab, filters, date range, and search
  const displayedRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      // 1. Tab filter
      if (activeTab === "FOLLOW_UPS") {
        if (!reg.follow_up) return false;
      } else {
        if (reg.is_completed) return false;
        if (!reg.appointment_date_time) return false;
      }

      // 2. Doctor Filter
      if (selectedDoctorFilter !== "All") {
        if (reg.treating_doctor !== selectedDoctorFilter) return false;
      }

      // 3. Clinic Filter
      if (selectedClinicFilter !== "All") {
        if (reg.clinic_name !== selectedClinicFilter) return false;
      }

      // 4. Date Range Filter
      if (startDate || endDate) {
        let itemDate = "";
        if (activeTab === "FOLLOW_UPS") {
          itemDate = reg.follow_up ? reg.follow_up.slice(0, 10) : "";
        } else {
          itemDate = reg.appointment_date_time ? reg.appointment_date_time.slice(0, 10) : "";
        }
        if (!itemDate) return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
      }

      // 5. Global Search Query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const pName = reg.patient?.name.toLowerCase() || "";
        const pPhone = reg.patient?.phone || "";
        const pUhid = reg.patient_uhid.toLowerCase();
        const notes = (reg.follow_up_notes || "").toLowerCase();
        return pName.includes(query) || pPhone.includes(query) || pUhid.includes(query) || notes.includes(query);
      }

      return true;
    }).sort((a, b) => {
      // Sort in ascending order (closest upcoming first)
      if (activeTab === "FOLLOW_UPS") {
        const dateA = a.follow_up ? new Date(a.follow_up).getTime() : 0;
        const dateB = b.follow_up ? new Date(b.follow_up).getTime() : 0;
        return dateA - dateB;
      } else {
        const dateA = a.appointment_date_time ? new Date(a.appointment_date_time).getTime() : 0;
        const dateB = b.appointment_date_time ? new Date(b.appointment_date_time).getTime() : 0;
        return dateA - dateB;
      }
    });
  }, [registrations, activeTab, selectedDoctorFilter, selectedClinicFilter, startDate, endDate, searchQuery]);

  // Tab counts
  const followUpsCount = useMemo(() => {
    return registrations.filter((reg) => {
      if (!reg.follow_up) return false;
      const itemDate = reg.follow_up.slice(0, 10);
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      return true;
    }).length;
  }, [registrations, startDate, endDate]);

  const bookedCount = useMemo(() => {
    return registrations.filter((reg) => {
      if (reg.is_completed) return false;
      if (!reg.appointment_date_time) return false;
      const itemDate = reg.appointment_date_time.slice(0, 10);
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      return true;
    }).length;
  }, [registrations, startDate, endDate]);

  // Formatter for follow-up dates
  const formatFollowUpDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Formatter for appointment datetime
  const formatAppointmentTime = (dateTimeStr: string) => {
    try {
      const d = new Date(dateTimeStr);
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateTimeStr;
    }
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
      <Sidebar active="upcoming" />

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden h-full relative">
        {/* HEADER BAR */}
        <header className="h-10 bg-white border-b border-[#E5E7EB] px-3 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[14px] font-bold text-foreground tracking-tight mr-2">
              Upcoming & Follow-up Queue
            </h1>

            {/* Clinic Filter Dropdown */}
            <div className="flex items-center border border-[#E5E7EB] rounded-md bg-white px-2 py-0.5 cursor-pointer hover:bg-gray-50">
              <div className="w-2 h-2 rounded-full bg-indigo-500 mr-1.5 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-white"></div>
              </div>
              <select
                value={selectedClinicFilter}
                onChange={(e) => setSelectedClinicFilter(e.target.value)}
                className="text-[11px] font-semibold text-foreground focus:outline-none bg-transparent pr-1.5 cursor-pointer max-w-[130px] truncate"
              >
                <option value="All">All Clinics</option>
                {clinicCache.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor Filter Dropdown */}
            <div className="flex items-center border border-[#E5E7EB] rounded-md bg-white px-2 py-0.5 cursor-pointer hover:bg-gray-50">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-white"></div>
              </div>
              <select
                value={selectedDoctorFilter}
                onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                className="text-[11px] font-semibold text-foreground focus:outline-none bg-transparent pr-1.5 cursor-pointer max-w-[130px] truncate"
              >
                <option value="All">All Doctors</option>
                {doctorCache.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start & End Date Range Filter */}
            <div className="flex items-center gap-1.5 border border-[#E5E7EB] rounded-md bg-white px-2 py-0.5 hover:bg-gray-50 text-[11px] font-semibold text-foreground">
              <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px] text-gray-500 font-bold">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-[11px] font-semibold text-foreground focus:outline-none bg-transparent cursor-pointer"
                title="Start Date"
              />
              <span className="text-[10px] text-gray-500 font-bold ml-1">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-[11px] font-semibold text-foreground focus:outline-none bg-transparent cursor-pointer"
                title="End Date"
              />
              <div className="flex items-center gap-1 ml-1 shrink-0">
                <button
                  onClick={() => {
                    const today = getDateOffsetStr(0);
                    setStartDate(today);
                    setEndDate(today);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold transition-colors ${
                    startDate === getDateOffsetStr(0) && endDate === getDateOffsetStr(0)
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600"
                  }`}
                  title="Today"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const tomorrow = getDateOffsetStr(1);
                    setStartDate(tomorrow);
                    setEndDate(tomorrow);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold transition-colors ${
                    startDate === getDateOffsetStr(1) && endDate === getDateOffsetStr(1)
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600"
                  }`}
                  title="Tomorrow"
                >
                  Tomorrow
                </button>
                <button
                  onClick={() => {
                    const dayAfter = getDateOffsetStr(2);
                    setStartDate(dayAfter);
                    setEndDate(dayAfter);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold transition-colors ${
                    startDate === getDateOffsetStr(2) && endDate === getDateOffsetStr(2)
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600"
                  }`}
                  title="Day After Tomorrow"
                >
                  Day After Tomorrow
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Global Search */}
            <div className="relative flex items-center border border-[#E5E7EB] bg-white rounded-md px-2 py-0.5 w-48 sm:w-56">
              <svg className="w-3 h-3 text-[#A0AEC0] mr-1.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search name, phone, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-[11px] text-foreground focus:outline-none w-full bg-transparent placeholder:text-[#A0AEC0]"
              />
            </div>

            <div className="flex items-center border border-[#E5E7EB] rounded-md bg-white px-2 py-0.5 hover:bg-gray-50 cursor-pointer select-none">
              <span className="text-[11px] font-semibold text-foreground truncate max-w-[120px]">
                Doctor Admin
              </span>
              <svg className="w-2.5 h-2.5 text-[#718096] ml-1 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </header>

        {/* DARK TOOLBAR FOR TABS */}
        <section className="bg-[#475569] h-9 px-3 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center h-full gap-0.5">
            <button
              onClick={() => setActiveTab("FOLLOW_UPS")}
              className={`h-full px-4 text-[11px] font-bold transition-colors flex items-center justify-center ${
                activeTab === "FOLLOW_UPS"
                  ? "bg-primary text-white border-b-2 border-white"
                  : "text-gray-200 hover:text-white hover:bg-slate-600/30"
              }`}
            >
              FOLLOW-UP EXPECTED ({followUpsCount.toString().padStart(2, "0")})
            </button>

            <button
              onClick={() => setActiveTab("BOOKED")}
              className={`h-full px-4 text-[11px] font-bold transition-colors flex items-center justify-center ${
                activeTab === "BOOKED"
                  ? "bg-primary text-white border-b-2 border-white"
                  : "text-gray-200 hover:text-white hover:bg-slate-600/30"
              }`}
            >
              BOOKED APPOINTMENTS ({bookedCount.toString().padStart(2, "0")})
            </button>
          </div>

          <div className="text-[10px] text-gray-200 font-semibold italic">
            Sorted by earliest date first
          </div>
        </section>

        {/* LIST / WORKSPACE */}
        <main className="flex-1 p-4 overflow-y-auto space-y-2 max-w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-[#E5E7EB] mt-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-3 text-[12px] font-semibold text-text-secondary">Loading upcoming queue...</p>
            </div>
          ) : displayedRegistrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-[#E5E7EB] mt-4">
              <p className="text-[12px] font-semibold text-text-secondary">
                No upcoming {activeTab === "FOLLOW_UPS" ? "follow-ups" : "booked appointments"} found.
              </p>
              <Link
                href="/?book=true"
                className="mt-3 px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg hover:bg-primary-hover transition-colors"
              >
                Book New Appointment
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedRegistrations.map((reg) => (
                <div
                  key={reg.registration_id}
                  className="bg-white rounded-lg border border-[#E5E7EB] p-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5 hover:shadow-xs transition-shadow w-full animate-in fade-in duration-100"
                >
                  {/* Left Column: Date & Patient Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Date Badge */}
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-primary shrink-0 select-none min-w-[90px] text-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider leading-none">
                        {activeTab === "FOLLOW_UPS" ? "Follow Up" : "Booked"}
                      </span>
                      <span className="text-[11px] font-bold mt-1 text-slate-800 leading-tight">
                        {activeTab === "FOLLOW_UPS"
                          ? formatFollowUpDate(reg.follow_up!)
                          : formatAppointmentTime(reg.appointment_date_time!)}
                      </span>
                    </div>

                    <div className="h-12 w-[1px] bg-[#E5E7EB] shrink-0 select-none"></div>

                    {/* Patient detail */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <svg className="w-3.5 h-3.5 text-[#A0AEC0] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <h4 className="text-[13px] font-bold text-foreground truncate max-w-[180px]">
                          {reg.patient?.name || "Unknown Patient"}
                        </h4>
                        <span className="text-[11px] font-medium text-text-secondary shrink-0">
                          | {reg.patient?.gender || "M"} | {reg.patient?.age || "25"}y | UHID: <span className="font-semibold text-foreground select-all">{reg.patient_uhid}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-text-secondary select-all">
                          {reg.patient?.phone || "N/A"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-text-secondary font-medium pt-0.5">
                        {reg.treating_doctor && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-sm">
                            Dr: <span className="font-bold">{reg.treating_doctor}</span>
                          </span>
                        )}
                        {reg.clinic_name && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-sm">
                            Clinic: <span className="font-bold">{reg.clinic_name}</span>
                          </span>
                        )}
                        {reg.visit_category && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-sm">
                            Visit: <span className="font-bold">{reg.visit_category}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Doctor Remarks / Follow-up notes */}
                  <div className="flex-1 md:max-w-md w-full text-left self-stretch md:self-auto md:border-l md:border-[#E5E7EB] md:pl-4 py-1 md:py-0">
                    <span className="text-[10px] font-extrabold uppercase text-[#718096] block tracking-wider mb-0.5 select-none">
                      {activeTab === "FOLLOW_UPS" ? "Follow-up Notes" : "Visit Notes"}
                    </span>
                    <p className="text-[11.5px] font-medium text-slate-700 line-clamp-2 italic leading-relaxed">
                      {activeTab === "FOLLOW_UPS"
                        ? reg.follow_up_notes || "No notes written for this follow-up."
                        : reg.notes_for_patient || "No specific instructions."}
                    </p>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="w-full md:w-auto flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 self-stretch md:self-auto border-t md:border-t-0 border-[#E5E7EB] pt-2 md:pt-0">
                    <div className="text-[10px] text-text-secondary font-medium md:mb-1 select-none">
                      Reg ID: <span className="font-bold select-all">#{reg.registration_id}</span>
                    </div>

                    <Link
                      href={`/?book=${reg.patient_uhid}`}
                      className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Register Visit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
