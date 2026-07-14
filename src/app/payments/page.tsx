"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
  bill_amount: number;
  payment_method: string;
  discount_amount: number;
  created_at: string;
  patient?: Patient;
  services?: any;
  payments?: any;
}

function PaymentsContent() {
  const router = useRouter();
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filter dates state
  const getTodayDateStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [startDate, setStartDate] = useState(getTodayDateStr());
  const [endDate, setEndDate] = useState(getTodayDateStr());
  const [registrations, setRegistrations] = useState<Registration[]>([]);

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

  // Load billing records based on date filter
  const fetchBillingData = async () => {
    if (!sessionLoaded) return;
    try {
      setLoading(true);
      
      // Query registrations within selected date bounds
      const startIso = `${startDate}T00:00:00.000Z`;
      const endIso = `${endDate}T23:59:59.999Z`;

      const { data: regData, error: regError } = await supabase
        .from("aka_opd_registration")
        .select("*")
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .order("created_at", { ascending: false });

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

        const servicesList = Array.isArray(reg.services) ? reg.services : [];
        const paymentsList = Array.isArray(reg.payments) ? reg.payments : [];

        // 1. Calculate Gross Total (sum of all services fees * quantity if product)
        const grossTotal = servicesList.reduce((acc: number, s: any) => {
          const fee = Number(s.fee) || 0;
          const qty = s.type === "product" ? (Number(s.qty) || 1) : 1;
          return acc + (fee * qty);
        }, 0);

        // 2. Discount Amount
        const discountAmount = Number(reg.discount_amount) || 0;

        // 3. Net Paid (sum of all payments in the payments array)
        let netPaid = paymentsList.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
        if (paymentsList.length === 0 && grossTotal > 0) {
          netPaid = Math.max(0, grossTotal - discountAmount);
        }

        // 4. Payment Modes description (e.g. "Cash", "UPI", "Cash, UPI")
        const uniqueModes = Array.from(new Set(paymentsList.map((p: any) => p.mode).filter(Boolean))) as string[];
        const paymentMethod = uniqueModes.length > 0 ? uniqueModes.join(", ") : "Cash";

        return {
          registration_id: String(reg.registration_id),
          patient_uhid: reg.patient_uhid,
          appointment_date_time: reg.appointment_date_time,
          clinic_name: reg.clinic_name,
          treating_doctor: reg.treating_doctor,
          visit_category: reg.visit_category,
          bill_amount: grossTotal,
          payment_method: paymentMethod,
          discount_amount: discountAmount,
          created_at: reg.created_at,
          patient: patientObj,
          services: reg.services,
          payments: reg.payments,
        };
      });

      setRegistrations(mappedRegs);
    } catch (err) {
      console.error("Failed to load billing details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [sessionLoaded, startDate, endDate]);

  // Aggregate totals
  const totals = useMemo(() => {
    let cash = 0;
    let online = 0;
    let total = 0;

    registrations.forEach((reg) => {
      const paymentsList = Array.isArray(reg.payments) ? reg.payments : [];
      if (paymentsList.length > 0) {
        paymentsList.forEach((p: any) => {
          const amount = Number(p.amount) || 0;
          if (p.mode?.toLowerCase() === "cash") {
            cash += amount;
          } else {
            online += amount;
          }
          total += amount;
        });
      } else {
        const netAmount = Math.max(0, reg.bill_amount - reg.discount_amount);
        cash += netAmount;
        total += netAmount;
      }
    });

    return { cash, online, total };
  }, [registrations]);

  // Trigger browser blob url PDF export
  const exportPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Formatting Helpers
    const formattedRange = `${new Date(startDate).toLocaleDateString("en-IN")} to ${new Date(endDate).toLocaleDateString("en-IN")}`;

    // Title / Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("HMS BILLING & COLLECTION AUDIT REPORT", 14, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}  |  Audit Period: ${formattedRange}`, 14, 23);

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 26, 196, 26);

    // KPI Cards block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // primary purple
    doc.text("COLLECTION SUMMARY", 14, 33);

    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Cash Collection:  INR ${totals.cash.toLocaleString("en-IN")}/-`, 14, 39);
    doc.text(`Total Online Collection: INR ${totals.online.toLocaleString("en-IN")}/-`, 80, 39);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total Collected: INR ${totals.total.toLocaleString("en-IN")}/-`, 142, 39);

    // Table Content
    const tableHeaders = [["OPD ID", "Patient Name", "UHID", "Method", "Discount", "Net Paid", "Date"]];
    const tableRows = registrations.map((reg) => {
      const netPaid = Math.max(0, reg.bill_amount - reg.discount_amount);
      const visitDate = new Date(reg.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      return [
        `#${reg.registration_id}`,
        reg.patient?.name || "Unknown Patient",
        reg.patient_uhid,
        reg.payment_method,
        `INR ${reg.discount_amount}`,
        `INR ${netPaid}`,
        visitDate
      ];
    });

    autoTable(doc, {
      startY: 44,
      head: tableHeaders,
      body: tableRows,
      theme: "striped",
      headStyles: {
        fillColor: [79, 70, 229], // primary indigo
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: "bold"
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      margin: { left: 14, right: 14 }
    });

    // Output as Blob URL and Open in new window/tab
    const pdfBlob = doc.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, "_blank");
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
      <Sidebar active="payments" />

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden h-full relative">
        
        {/* HEADER BAR */}
        <header className="h-12 bg-white border-b border-[#E5E7EB] px-4 flex items-center justify-between shrink-0 select-none shadow-xs">
          <div className="flex items-center gap-2">
            <h1 className="text-[14px] font-bold text-slate-800 tracking-tight">
              Financial Billing & Payments
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Start Date */}
            <div className="flex items-center gap-1.5 border border-[#E5E7EB] bg-white rounded-lg px-2.5 py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-[11px] font-semibold text-foreground focus:outline-none bg-transparent cursor-pointer"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-1.5 border border-[#E5E7EB] bg-white rounded-lg px-2.5 py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-[11px] font-semibold text-foreground focus:outline-none bg-transparent cursor-pointer"
              />
            </div>

            {/* Export PDF Button */}
            <button
              onClick={exportPDF}
              className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-[11px] font-extrabold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Export Report (PDF)
            </button>
          </div>
        </header>

        {/* SUMMARY KPI CARDS */}
        <section className="p-4 grid grid-cols-4 gap-4.5 shrink-0 select-none">
          {/* Card: Total Visit count */}
          <div className="bg-white p-4.5 rounded-xl border border-[#E5E7EB] shadow-2xs text-left">
            <span className="text-[10px] font-extrabold text-[#A0AEC0] uppercase tracking-wider block">Total Invoices</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-[20px] font-black text-slate-800 leading-none">{registrations.length}</span>
              <span className="text-[10px] font-bold text-slate-400">Bills Raised</span>
            </div>
          </div>

          {/* Card: Grand Total */}
          <div className="bg-white p-4.5 rounded-xl border border-[#E5E7EB] shadow-2xs text-left border-l-4 border-l-primary">
            <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider block">Total Revenue</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-[20px] font-black text-slate-800 leading-none">₹{totals.total.toLocaleString("en-IN")}</span>
              <span className="text-[10px] font-bold text-slate-400">Net Paid</span>
            </div>
          </div>

          {/* Card: Cash total */}
          <div className="bg-white p-4.5 rounded-xl border border-[#E5E7EB] shadow-2xs text-left border-l-4 border-l-emerald-500">
            <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">Cash Collected</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-[20px] font-black text-slate-800 leading-none">₹{totals.cash.toLocaleString("en-IN")}</span>
              <span className="text-[10px] font-bold text-slate-400">Physical Cash</span>
            </div>
          </div>

          {/* Card: Online total */}
          <div className="bg-white p-4.5 rounded-xl border border-[#E5E7EB] shadow-2xs text-left border-l-4 border-l-indigo-500">
            <span className="text-[10px] font-extrabold text-indigo-650 uppercase tracking-wider block">Online Collected</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-[20px] font-black text-slate-800 leading-none">₹{totals.online.toLocaleString("en-IN")}</span>
              <span className="text-[10px] font-bold text-slate-400">UPI / Card</span>
            </div>
          </div>
        </section>

        {/* PATIENT BILLING LIST TABLE */}
        <main className="flex-1 px-4 pb-4 overflow-hidden flex flex-col min-h-0">
          <div className="bg-white rounded-xl border border-[#E5E7EB] flex flex-col flex-1 overflow-hidden shadow-2xs">
            <div className="px-4 py-3 border-b border-[#F1F5F9] bg-[#FAFBFC] shrink-0 flex items-center justify-between">
              <span className="text-[11.5px] font-extrabold text-[#1E293B] uppercase tracking-wider">
                Audited Patient Receipts
              </span>
              <span className="text-[9.5px] font-semibold text-slate-400">
                Sorted by most recent transaction
              </span>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fetching ledger...</p>
                </div>
              ) : registrations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-28 text-slate-350 bg-[#FAFBFC]">
                  <span className="text-3xl mb-1.5">📊</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">No Transactions In Date Range</span>
                  <p className="text-[9px] text-slate-400 mt-1 max-w-[200px] text-center">Change your filter dates at the top to display auditing data.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse select-text">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[9px] font-extrabold border-b border-[#E2E8F0] tracking-wider select-none shrink-0 sticky top-0 z-10">
                      <th className="py-2.5 px-4">OPD ID</th>
                      <th className="py-2.5 px-4">Patient Profile</th>
                      <th className="py-2.5 px-4">Visit Type</th>
                      <th className="py-2.5 px-4">Date & Time</th>
                      <th className="py-2.5 px-4">Payment Mode</th>
                      <th className="py-2.5 px-4 text-right">Discount</th>
                      <th className="py-2.5 px-4 text-right">Gross Total</th>
                      <th className="py-2.5 px-4 text-right">Net Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[12px] font-medium text-slate-650">
                    {registrations.map((reg) => {
                      const isCash = reg.payment_method?.toLowerCase() === "cash";
                      const netPaid = Math.max(0, reg.bill_amount - reg.discount_amount);
                      const formattedTime = new Date(reg.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      });

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
                          <td className="py-2.5 px-4 select-none">
                            <span className="px-2 py-0.5 bg-[#EEF2F6] text-[#475569] text-[9.5px] font-bold rounded-full">
                              {reg.visit_category || "General"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-semibold">
                            {formattedTime}
                          </td>
                          <td className="py-2.5 px-4 select-none">
                            <span className={`px-2 py-0.5 rounded-[4px] text-[9.5px] font-extrabold uppercase ${
                              isCash 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            }`}>
                              {reg.payment_method}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-450 font-bold select-all">
                            ₹{reg.discount_amount}
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-500 font-bold select-all">
                            ₹{reg.bill_amount}
                          </td>
                          <td className="py-2.5 px-4 text-right font-black text-slate-800 select-all">
                            ₹{netPaid}
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

export default function PaymentsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F6F8] font-sans">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preparing Ledger...</p>
        </div>
      </div>
    }>
      <PaymentsContent />
    </Suspense>
  );
}
