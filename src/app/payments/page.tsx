"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase, getUserRole } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

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
  is_completed?: boolean;
}

function getRegistrationPaymentDetails(reg: Registration) {
  const netPaid = Math.max(0, reg.bill_amount - reg.discount_amount);
  const paymentsList = Array.isArray(reg.payments) ? reg.payments : [];
  const totalPaymentsSum = paymentsList.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);

  let cashPaid = 0;
  let onlinePaid = 0;

  if (totalPaymentsSum > 0) {
    paymentsList.forEach((p: any) => {
      const amount = Number(p.amount) || 0;
      const ratio = amount / totalPaymentsSum;
      const allocatedAmount = ratio * netPaid;
      if (p.mode?.toLowerCase() === "cash") {
        cashPaid += allocatedAmount;
      } else {
        onlinePaid += allocatedAmount;
      }
    });
  } else {
    const methodLower = (reg.payment_method || "cash").toLowerCase();
    if (methodLower === "cash") {
      cashPaid = netPaid;
    } else if (!methodLower.includes("cash")) {
      onlinePaid = netPaid;
    } else {
      const modes = methodLower.split(",").map((m) => m.trim());
      const cashModes = modes.filter((m) => m === "cash");
      const onlineModes = modes.filter((m) => m !== "cash");
      if (cashModes.length > 0 && onlineModes.length > 0) {
        cashPaid = netPaid / 2;
        onlinePaid = netPaid / 2;
      } else if (cashModes.length > 0) {
        cashPaid = netPaid;
      } else {
        onlinePaid = netPaid;
      }
    }
  }

  return { netPaid, cashPaid, onlinePaid };
}

const downloadSingleReceiptPDF = async (reg: Registration) => {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true
    });

    const PAGE_W = 210;
    const PAGE_H = 297;
    const MARGIN = 15;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    // Load Poppins font
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
      console.error("Failed to load Poppins web fonts, falling back to Helvetica:", e);
    }

    doc.setFont(fontName);

    // Color system
    const primaryColor: [number, number, number] = [107, 33, 168];   // Deep Purple
    const primaryLight: [number, number, number] = [243, 232, 255];  // Purple-100
    const textDark: [number, number, number] = [15, 23, 42];          // slate-900
    const textGray: [number, number, number] = [100, 116, 139];       // slate-500
    const borderColor: [number, number, number] = [226, 232, 240];    // slate-200
    const redColor: [number, number, number] = [220, 38, 38];
    const greenColor: [number, number, number] = [22, 163, 74];

    // QR Code
    const qrData = await QRCode.toDataURL(`BILL_${reg.registration_id}_${reg.patient_uhid}`, {
      margin: 1,
      width: 100,
      errorCorrectionLevel: 'L'
    });

    // ── HEADER ───────────────────────────────────────────────────────
    let currentY = 15;

    // Clinic Info (Left)
    doc.setFont("Poppins", "bold").setFontSize(18).setTextColor(...primaryColor);
    doc.text((reg.clinic_name || "OPD CLINIC").toUpperCase(), MARGIN, currentY);
    
    doc.setFont("Poppins", "normal").setFontSize(8.5).setTextColor(...textGray);
    doc.text("Comprehensive & Advanced Healthcare Clinic", MARGIN, currentY + 5.5);
    
    // Doctor Details (Right)
    doc.setFont("Poppins", "bold").setFontSize(10).setTextColor(...textDark);
    doc.text((reg.treating_doctor || "DR. LAXMAN SALVE").toUpperCase(), PAGE_W - MARGIN, currentY, { align: "right" });
    
    doc.setFont("Poppins", "normal").setFontSize(8).setTextColor(...textGray);
    doc.text("Consulting Physician / Specialist", PAGE_W - MARGIN, currentY + 4.5, { align: "right" });
    doc.text("Reg. No: FMC-98745-A", PAGE_W - MARGIN, currentY + 8.5, { align: "right" });

    // Divider Line
    currentY += 12;
    doc.setDrawColor(...borderColor).setLineWidth(0.3).line(MARGIN, currentY, PAGE_W - MARGIN, currentY);

    // Title
    currentY += 8;
    doc.setFont("Poppins", "bold").setFontSize(12).setTextColor(...primaryColor);
    doc.text("TAX INVOICE / RECEIPT", PAGE_W / 2, currentY, { align: "center" });

    // ── PATIENT & INVOICE CARD ───────────────────────────────────────
    currentY += 4;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.2);
    doc.roundedRect(MARGIN, currentY, CONTENT_W, 25, 1, 1, "FD");

    // Left Side - Patient Details
    const detailsCardY = currentY;
    doc.setFont("Poppins", "bold").setFontSize(7).setTextColor(...textGray);
    doc.text("PATIENT DETAILS", MARGIN + 5, detailsCardY + 5.5);
    
    doc.setFont("Poppins", "bold").setFontSize(11).setTextColor(...textDark);
    doc.text(reg.patient?.name || "Unknown Patient", MARGIN + 5, detailsCardY + 11.5);
    
    doc.setFont("Poppins", "normal").setFontSize(8.5).setTextColor(...textDark);
    const ageGender = reg.patient ? `${reg.patient.age} Y / ${reg.patient.gender}` : "N/A";
    doc.text(`${ageGender}   •   UHID: ${reg.patient_uhid}`, MARGIN + 5, detailsCardY + 16.5);
    if (reg.patient?.phone) {
      doc.text(`Phone: ${reg.patient.phone}`, MARGIN + 5, detailsCardY + 21.5);
    }

    // Right Side - Invoice Details
    doc.setFont("Poppins", "bold").setFontSize(7).setTextColor(...textGray);
    doc.text("INVOICE DETAILS", PAGE_W - MARGIN - 30, detailsCardY + 5.5, { align: "right" });
    
    doc.setFont("Poppins", "bold").setFontSize(10).setTextColor(...textDark);
    doc.text(`Invoice ID: #${reg.registration_id}`, PAGE_W - MARGIN - 30, detailsCardY + 10.5, { align: "right" });
    
    doc.setFont("Poppins", "normal").setFontSize(8.5).setTextColor(...textDark);
    const formattedDate = new Date(reg.created_at).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    doc.text(`Date: ${formattedDate}`, PAGE_W - MARGIN - 30, detailsCardY + 15.5, { align: "right" });
    doc.text(`Payment: ${reg.payment_method || "Cash"}`, PAGE_W - MARGIN - 30, detailsCardY + 20.5, { align: "right" });

    // QR Code
    doc.addImage(qrData, 'PNG', PAGE_W - MARGIN - 23, detailsCardY + 2.5, 20, 20, undefined, 'FAST');

    currentY += 29;

    // ── BILL ITEMS TABLE ─────────────────────────────────────────────
    const servicesList = reg.services || [];
    let tableBody = [];
    if (servicesList.length > 0) {
      tableBody = servicesList.map((s: any, idx: number) => {
        const qty = s.type === "product" ? (Number(s.qty) || 1) : 1;
        const rate = Number(s.fee) || 0;
        const lineTotal = rate * qty;
        return [
          (idx + 1).toString(),
          s.name || "Consultation / Visit",
          s.type === "product" ? "Product" : "Service",
          qty.toString(),
          `₹${rate.toFixed(2)}`,
          `₹${lineTotal.toFixed(2)}`
        ];
      });
    } else {
      tableBody = [[
        "1",
        reg.visit_category || "Outpatient Consultation",
        "Service",
        "1",
        `₹${reg.bill_amount.toFixed(2)}`,
        `₹${reg.bill_amount.toFixed(2)}`
      ]];
    }

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'ITEM DESCRIPTION', 'TYPE', 'QTY', 'RATE', 'AMOUNT']],
      body: tableBody,
      theme: 'plain',
      headStyles: {
        fillColor: primaryLight,
        textColor: primaryColor,
        fontSize: 8.5,
        font: 'Poppins',
        fontStyle: 'bold',
        lineWidth: { bottom: 0.3 },
        lineColor: [216, 180, 254],
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }
      },
      bodyStyles: {
        fontSize: 8.5,
        font: 'Poppins',
        cellPadding: 3,
        textColor: textDark,
        lineWidth: 0.05,
        lineColor: [241, 245, 249]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'right', cellWidth: 25 },
        5: { halign: 'right', fontStyle: 'bold', cellWidth: 25 }
      },
      margin: { left: MARGIN, right: MARGIN }
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;
    const totalsStartY = currentY;

    // ── TOTALS SECTION ─────────────────────────────────────────────
    const { netPaid, cashPaid, onlinePaid } = getRegistrationPaymentDetails(reg);
    const paymentsList = Array.isArray(reg.payments) ? reg.payments : [];
    const amountPaid = paymentsList.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
    const actualPaid = paymentsList.length > 0 ? amountPaid : netPaid;
    const balance = Math.max(0, netPaid - actualPaid);

    const totalsLabelX = PAGE_W - MARGIN - 50;
    const totalsValueX = PAGE_W - MARGIN;

    const drawRow = (label: string, value: number, color: [number, number, number] = textDark, isBold = false, size = 9) => {
      doc.setFont("Poppins", isBold ? "bold" : "normal")
         .setFontSize(size)
         .setTextColor(color[0], color[1], color[2]);
      doc.text(label, totalsLabelX, currentY);
      doc.text(`₹${value.toFixed(2)}`, totalsValueX, currentY, { align: "right" });
      currentY += 4.5;
    };

    drawRow("Sub Total (Gross):", reg.bill_amount, textGray);
    if (reg.discount_amount > 0) {
      drawRow("Discount:", reg.discount_amount, greenColor);
    }
    
    currentY += 1;
    doc.setDrawColor(...borderColor).setLineWidth(0.2).line(PAGE_W - MARGIN - 60, currentY, PAGE_W - MARGIN, currentY);
    currentY += 4.5;

    drawRow("Net Amount Payable:", netPaid, textDark, true, 9.5);
    drawRow("Amount Paid:", actualPaid, textGray, false, 9);

    // Balance Due Callout Box
    const isDue = balance > 0;
    const balanceBg = isDue ? [254, 242, 242] : [240, 253, 244];
    const balanceText = isDue ? redColor : greenColor;
    const balanceBorderColor = isDue ? [254, 202, 202] : [187, 247, 208];

    doc.setFillColor(balanceBg[0], balanceBg[1], balanceBg[2]);
    doc.setDrawColor(balanceBorderColor[0], balanceBorderColor[1], balanceBorderColor[2]);
    doc.setLineWidth(0.2);
    doc.roundedRect(PAGE_W - MARGIN - 60, currentY - 2.5, 60, 7.5, 0.5, 0.5, "FD");
    
    doc.setFont("Poppins", "bold").setFontSize(9.5).setTextColor(balanceText[0], balanceText[1], balanceText[2]);
    doc.text("BALANCE DUE:", PAGE_W - MARGIN - 56, currentY + 2.5);
    doc.text(`₹${balance.toFixed(2)}`, totalsValueX - 2, currentY + 2.5, { align: "right" });
    
    currentY += 10;

    // Payment Entries Table (if any)
    if (paymentsList.length > 0) {
      doc.setFont("Poppins", "bold").setFontSize(8.5).setTextColor(...textGray);
      doc.text("PAYMENT METHOD DISTRIBUTION", MARGIN, totalsStartY);
      autoTable(doc, {
        startY: totalsStartY + 2,
        head: [['Transaction Date', 'Mode', 'Amount']],
        body: paymentsList.map((e: any) => [
          e.time ? new Date(e.time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : formattedDate,
          (e.mode || 'CASH').toUpperCase(),
          `₹${(Number(e.amount) || 0).toFixed(2)}`
        ]),
        theme: 'grid',
        headStyles: { fillColor: primaryLight, textColor: primaryColor, fontSize: 7.5, font: 'Poppins', fontStyle: 'bold', cellPadding: 1.5 },
        bodyStyles: { fontSize: 7.5, font: 'Poppins', cellPadding: 1.5 },
        margin: { left: MARGIN, right: PAGE_W - (PAGE_W - MARGIN - 60) + 5 }
      });
    }

    // ── FOOTER ───────────────────────────────────────────────────────
    const contentEndY = Math.max(currentY, (paymentsList.length > 0 && (doc as any).lastAutoTable) ? (doc as any).lastAutoTable.finalY : 0);
    const footerY = Math.max(PAGE_H - 30, contentEndY + 10);

    doc.setDrawColor(...borderColor).setLineWidth(0.25).line(MARGIN, footerY, PAGE_W - MARGIN, footerY);

    doc.setFont("Poppins", "bold").setFontSize(7).setTextColor(...textGray);
    doc.text("Scan QR on invoice to verify authenticity", MARGIN, footerY + 5);
    doc.setFont("Poppins", "normal").setFontSize(6.5).setTextColor(...textGray);
    doc.text("System generated invoice — No physical signature required.", MARGIN, footerY + 9);

    // Signature
    doc.setDrawColor(...borderColor).setLineWidth(0.25).line(PAGE_W - MARGIN - 50, footerY + 8, PAGE_W - MARGIN, footerY + 8);
    doc.setFont("Poppins", "bold").setFontSize(7.5).setTextColor(...textGray);
    doc.text("AUTHORIZED SIGNATURE", PAGE_W - MARGIN, footerY + 12, { align: "right" });

    // Open PDF
    const pdfBlob = doc.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, "_blank");

  } catch (err) {
    console.error("Error generating invoice PDF:", err);
  }
};

function PaymentsContent() {
  const router = useRouter();
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
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
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [selectedHospital, setSelectedHospital] = useState<string>("all");
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  // Force today's date if user is staff
  useEffect(() => {
    if (userRole === "staff") {
      const today = getTodayDateStr();
      setStartDate(today);
      setEndDate(today);
    }
  }, [userRole]);

  // Auth session check
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        const role = await getUserRole(session.user?.email || "");
        setUserRole(role);
        setSessionLoaded(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        router.push("/login");
      } else {
        const role = await getUserRole(session.user?.email || "");
        setUserRole(role);
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
      const todayStr = getTodayDateStr();
      const start = userRole === "staff" ? todayStr : startDate;
      const end = userRole === "staff" ? todayStr : endDate;

      const startIso = `${start}T00:00:00+05:30`;
      const endIso = `${end}T23:59:59+05:30`;

      const { data: regData, error: regError } = await supabase
        .from("aka_opd_registration")
        .select("*")
        .gte("appointment_date_time", startIso)
        .lte("appointment_date_time", endIso)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .order("registration_id", { ascending: false });

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
      const mappedRegs = regData.map((reg) => {
        const paymentsList = Array.isArray(reg.payments) ? reg.payments : [];
        const isPaidOnlyCash = paymentsList.length === 0 || paymentsList.every((p: any) => p.mode?.toLowerCase() === "cash");

        // If user is adminnocash, hide appointments paid only in cash
        if (userRole === "adminnocash" && isPaidOnlyCash) {
          return null;
        }

        // Check if the appointment is completed (either in DB or localStorage)
        let isComp = reg.is_completed || false;
        if (typeof window !== "undefined" && !isComp) {
          const completedList = JSON.parse(localStorage.getItem("completed_appointments") || "[]");
          isComp = completedList.includes(String(reg.registration_id));
        }

        // Only count and show completed appointments
        if (!isComp) {
          return null;
        }

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
          is_completed: true,
        } as Registration;
      }).filter((r): r is Registration => r !== null);

      setRegistrations(mappedRegs);
    } catch (err) {
      console.error("Failed to load billing details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
    setSelectedDoctor("all");
    setSelectedHospital("all");
  }, [sessionLoaded, startDate, endDate, userRole]);

  // Unique doctors and hospitals computed from registrations
  const uniqueDoctors = useMemo(() => {
    return Array.from(new Set(registrations.map((r) => r.treating_doctor).filter(Boolean))) as string[];
  }, [registrations]);

  const uniqueHospitals = useMemo(() => {
    return Array.from(new Set(registrations.map((r) => r.clinic_name).filter(Boolean))) as string[];
  }, [registrations]);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      const matchesDoc = selectedDoctor === "all" || reg.treating_doctor === selectedDoctor;
      const matchesHosp = selectedHospital === "all" || reg.clinic_name === selectedHospital;
      return matchesDoc && matchesHosp;
    });
  }, [registrations, selectedDoctor, selectedHospital]);

  // Aggregate totals
  const totals = useMemo(() => {
    let cash = 0;
    let online = 0;
    let total = 0;

    filteredRegistrations.forEach((reg) => {
      const { netPaid, cashPaid, onlinePaid } = getRegistrationPaymentDetails(reg);
      cash += cashPaid;
      online += onlinePaid;
      total += netPaid;
    });

    return { cash, online, total };
  }, [filteredRegistrations]);

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
    const filterText = `Doctor: ${selectedDoctor === "all" ? "All" : selectedDoctor} | Hospital: ${selectedHospital === "all" ? "All" : selectedHospital}`;
    doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}  |  Audit Period: ${formattedRange}  |  ${filterText}`, 14, 23);

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
    const tableRows = filteredRegistrations.map((reg) => {
      const { netPaid } = getRegistrationPaymentDetails(reg);
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
                disabled={userRole === "staff"}
                className="text-[11px] font-semibold text-foreground focus:outline-none bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-1.5 border border-[#E5E7EB] bg-white rounded-lg px-2.5 py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={userRole === "staff"}
                className="text-[11px] font-semibold text-foreground focus:outline-none bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Doctor Filter */}
            <div className="flex items-center gap-1.5 border border-[#E5E7EB] bg-white rounded-lg px-2.5 py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Doctor</span>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="text-[11px] font-semibold text-[#111827] focus:outline-none bg-transparent cursor-pointer max-w-[120px]"
              >
                <option value="all">All Doctors</option>
                {uniqueDoctors.map((doc) => (
                  <option key={doc} value={doc}>
                    {doc}
                  </option>
                ))}
              </select>
            </div>

            {/* Hospital/Clinic Filter */}
            <div className="flex items-center gap-1.5 border border-[#E5E7EB] bg-white rounded-lg px-2.5 py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Hospital</span>
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="text-[11px] font-semibold text-[#111827] focus:outline-none bg-transparent cursor-pointer max-w-[120px]"
              >
                <option value="all">All Hospitals</option>
                {uniqueHospitals.map((hosp) => (
                  <option key={hosp} value={hosp}>
                    {hosp}
                  </option>
                ))}
              </select>
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
              <span className="text-[20px] font-black text-slate-800 leading-none">{filteredRegistrations.length}</span>
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
              ) : filteredRegistrations.length === 0 ? (
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
                      <th className="py-2.5 px-4 text-center select-none">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[12px] font-medium text-slate-650">
                    {filteredRegistrations.map((reg) => {
                      const isCash = reg.payment_method?.toLowerCase() === "cash";
                      const { netPaid } = getRegistrationPaymentDetails(reg);
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
                            <div className="flex flex-col gap-0.5 items-start">
                              <span className="px-2 py-0.5 bg-[#EEF2F6] text-[#475569] text-[9.5px] font-bold rounded-full">
                                {reg.visit_category || "General"}
                              </span>
                              {(reg.treating_doctor || reg.clinic_name) && (
                                <span className="text-[9.5px] text-slate-400 font-semibold mt-0.5 leading-none">
                                  {reg.treating_doctor || ""}{reg.treating_doctor && reg.clinic_name ? " | " : ""}{reg.clinic_name || ""}
                                </span>
                              )}
                            </div>
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
                          <td className="py-2.5 px-4 text-center select-none">
                            <button
                              onClick={() => downloadSingleReceiptPDF(reg)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 rounded-lg border border-indigo-200 transition-colors shadow-2xs"
                              title="Download professional PDF receipt"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                              </svg>
                              PDF Receipt
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
