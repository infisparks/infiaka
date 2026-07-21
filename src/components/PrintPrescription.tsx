"use client";

import React, { useState, useImperativeHandle, forwardRef, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface SymptomsItem {
  id: string;
  name: string;
  duration?: string;
  severity?: string;
  headacheSites?: string[];
  painTypes?: string[];
  clinicalCourse?: string;
  note?: string;
}

interface DiagnosisItem {
  id: string;
  name: string;
  since?: string;
  status?: string;
  severity?: string;
  abdominalRegions?: string[];
  painTypes?: string[];
  relievedBy?: string[];
  abdominalTenderness?: string;
  palpations?: string[];
  auscultations?: string[];
  clinicalCourse?: string;
  note?: string;
}

interface MedicationItem {
  id: string;
  name: string;
  generic?: string;
  form?: string;
  dose?: string;
  freq?: string;
  timing?: string;
  duration?: string;
  start?: string;
  instr?: string;
}

interface LabItem {
  id: string;
  name: string;
  testOn?: string;
  repeatOn?: string;
  remarks?: string;
}

interface LabResult {
  id: string;
  name: string;
  unit: string;
  reading: string;
  interpretation: string;
  date: string;
  notes: string;
}

interface ProcedureItem {
  id: string;
  name: string;
  duration?: string;
  note?: string;
}

interface ReferralItem {
  id: string;
  doctorName: string;
  notes?: string;
}

interface Patient {
  id: string;
  title?: string;
  name: string;
  age: number;
  ageUnit?: string;
  gender: string;
  phone: string;
  queueNo?: string;
  permanentAddress?: string;
  localAddress?: string;
  opdRegistration?: {
    clinic_name?: string;
    treating_doctor?: string;
    referring_doctor?: string;
  };
}

interface PrintPrescriptionProps {
  patient: Patient;
  bp?: string;
  pulse?: string;
  weight?: string;
  spo2?: string;
  sugar?: string;
  symptoms?: SymptomsItem[];
  diagnoses?: DiagnosisItem[];
  medications?: MedicationItem[];
  labs?: LabItem[];
  labResults?: LabResult[];
  rxProcedures?: ProcedureItem[];
  referrals?: ReferralItem[];
  notesForPatient?: string;
  followUpVal?: string;
  followUpNotes?: string;
  advicesInput?: string;
  advRest?: boolean;
  advWater?: boolean;
  
  // New fields
  examinationFindings?: string;
  surgeryPerformed?: string;
  surgeryDate?: string;
  surgeryNotes?: string;
  planSurgeryAdvised?: string;
  procedureDone?: string;
  
  // Medical history properties
  histNoKnown?: boolean;
  familyItems?: any[];
  conditions?: any[];
  allergies?: any[];
  procedures?: any[];
  currentMeds?: any[];
  habits?: any[];
  foodAllergies?: any[];
  otherHistory?: any[];
  otherHistoryTitle?: string;
  travelHistory?: any[];

  // Header & Footer adjustments
  showHeader?: boolean;
  headerHeight?: number;
  showFooter?: boolean;
  footerHeight?: number;
  showLetterhead?: boolean;
  showHeaderPage2?: boolean;
  headerHeightPage2?: number;
  showFooterPage2?: boolean;
  footerHeightPage2?: number;
  showLetterheadPage2?: boolean;
}

function calculateFollowUpDate(baseDate: Date, durationStr: string | undefined): Date | null {
    if (!durationStr) return null;
    const dur = durationStr.toLowerCase().trim();
    const date = new Date(baseDate);
    
    const match = dur.match(/^(\d+)([dwmy])$/);
    if (!match) {
        const numberMatch = dur.match(/^(\d+)\s*(day|week|month|year)s?$/);
        if (numberMatch) {
            const val = parseInt(numberMatch[1], 10);
            const unit = numberMatch[2];
            if (unit === 'day') date.setDate(date.getDate() + val);
            else if (unit === 'week') date.setDate(date.getDate() + val * 7);
            else if (unit === 'month') date.setMonth(date.getMonth() + val);
            else if (unit === 'year') date.setFullYear(date.getFullYear() + val);
            return date;
        }
        const parsed = Date.parse(durationStr);
        if (!isNaN(parsed)) {
            return new Date(parsed);
        }
        return null;
    }
    
    const val = parseInt(match[1], 10);
    const unit = match[2];
    
    if (unit === 'd') {
        date.setDate(date.getDate() + val);
    } else if (unit === 'w') {
        date.setDate(date.getDate() + val * 7);
    } else if (unit === 'm') {
        date.setMonth(date.getMonth() + val);
    } else if (unit === 'y') {
        date.setFullYear(date.getFullYear() + val);
    }
    return date;
}

function formatFollowUpDate(date: Date): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${dayName} ${monthName} ${day} ${year}`;
}

function formatDuration(raw: string | undefined): string {
    if (!raw || raw.trim() === "") return '';
    raw = raw.trim().toLowerCase();
    const match = raw.match(/^(\d+)\s*([a-zA-Z]+)$/);
    if (match) {
        const count = parseInt(match[1]);
        const suffix = match[2];
        if (suffix.startsWith('d')) {
            return `${count} ${count === 1 ? 'Day' : 'Days'}`;
        } else if (suffix.startsWith('w')) {
            return `${count} ${count === 1 ? 'Week' : 'Weeks'}`;
        } else if (suffix.startsWith('m')) {
            return `${count} ${count === 1 ? 'Mth' : 'Mths'}`;
        } else if (suffix.startsWith('y')) {
            return `${count} ${count === 1 ? 'Yr' : 'Yrs'}`;
        }
    }
    let formatted = raw
        .replace(/(\d+)\s*d/, (m, g1) => `${g1} ${g1 === '1' ? 'Day' : 'Days'}`)
        .replace(/(\d+)\s*w/, (m, g1) => `${g1} ${g1 === '1' ? 'Week' : 'Weeks'}`)
        .replace(/(\d+)\s*m/, (m, g1) => `${g1} ${g1 === '1' ? 'Mth' : 'Mths'}`)
        .replace(/(\d+)\s*y/, (m, g1) => `${g1} ${g1 === '1' ? 'Yr' : 'Yrs'}`);
    if (!formatted) return raw;
    return formatted;
}

const PrintPrescription = forwardRef<any, PrintPrescriptionProps>(function PrintPrescription({
  patient,
  bp,
  pulse,
  weight,
  spo2,
  sugar,
  symptoms = [],
  diagnoses = [],
  medications = [],
  labs = [],
  labResults = [],
  rxProcedures = [],
  referrals = [],
  notesForPatient = "",
  followUpVal = "",
  followUpNotes = "",
  advicesInput = "",
  advRest = false,
  advWater = false,
  
  examinationFindings = "",
  surgeryPerformed = "",
  surgeryDate = "",
  surgeryNotes = "",
  planSurgeryAdvised = "",
  procedureDone = "",
  
  histNoKnown = false,
  familyItems = [],
  conditions = [],
  allergies = [],
  procedures = [],
  currentMeds = [],
  habits = [],
  foodAllergies = [],
  otherHistory = [],
  otherHistoryTitle = "",
  travelHistory = [],

  showHeader = true,
  headerHeight = 0,
  showFooter = true,
  footerHeight = 0,
  showLetterhead = true,
  showHeaderPage2 = false,
  headerHeightPage2 = 0,
  showFooterPage2 = true,
  footerHeightPage2 = 0,
  showLetterheadPage2 = false,
}, ref) {

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    generatePDF: async (openInNewTab = true) => {
      try {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
        const pageWidth = doc.internal.pageSize.getWidth(); // 210
        const pageHeight = doc.internal.pageSize.getHeight(); // 297

        // Load background letterhead image if enabled
        let letterheadBase64 = "";
        if (showLetterhead || showLetterheadPage2) {
          try {
            const response = await fetch("/letterhead.jpg");
            if (response.ok) {
              const buffer = await response.arrayBuffer();
              let binary = "";
              const bytes = new Uint8Array(buffer);
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              letterheadBase64 = window.btoa(binary);
            }
          } catch (e) {
            console.error("Failed to load background letterhead image:", e);
          }
        }

        let pagesCount = 1;

        const getPageParams = (pageNum: number) => {
          if (pageNum === 1) {
            return {
              headerHeight: headerHeight,
              maxContentY: pageHeight - footerHeight - 15,
              showFooter: showFooter,
              footerHeight: footerHeight,
              drawBg: showLetterhead
            };
          } else {
            return {
              headerHeight: headerHeightPage2 || 15,
              maxContentY: pageHeight - (footerHeightPage2 || 15) - 15,
              showFooter: showFooterPage2,
              footerHeight: footerHeightPage2 || 15,
              drawBg: showLetterhead || showLetterheadPage2
            };
          }
        };

        const drawBackgroundForPage = (pageNum: number) => {
          const params = getPageParams(pageNum);
          if (params.drawBg && letterheadBase64) {
            doc.addImage(letterheadBase64, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
          }
        };

        const drawTextHeaderForPage = (pageNum: number) => {
          // Spacing and margins are kept identical; no digital text header is drawn
        };

        // Draw background letterhead on first page
        drawBackgroundForPage(1);

        // Page addition is manually tracked and drawn at the call site.

        // Load Poppins fonts from jsDelivr CDN
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

          const regularBase64 = toBase64(regRes);
          const boldBase64 = toBase64(boldRes);

          doc.addFileToVFS("Poppins-Regular.ttf", regularBase64);
          doc.addFont("Poppins-Regular.ttf", "Poppins", "normal");
          doc.addFileToVFS("Poppins-Bold.ttf", boldBase64);
          doc.addFont("Poppins-Bold.ttf", "Poppins", "bold");
          fontName = "Poppins";
        } catch (e) {
          console.error("Failed to load Poppins web fonts, falling back to Helvetica:", e);
        }

        doc.setFont(fontName, "normal");
        
        // Theme Colors
        const colorPrimary: [number, number, number] = [99, 102, 241]; // Indigo Purple matches the UI
        const colorHeader: [number, number, number] = [0, 102, 204]; // Blue for section titles to match requested image
        const textDark = [17, 24, 39];
        const textGray = [107, 114, 128];

        let currentY = headerHeight;

        const checkPageBreak = (neededHeight = 0) => {
            const currentParams = getPageParams(pagesCount);
            if (currentY + neededHeight > currentParams.maxContentY) {
                doc.addPage();
                pagesCount += 1;
                drawBackgroundForPage(pagesCount);
                drawTextHeaderForPage(pagesCount);
                const nextParams = getPageParams(pagesCount);
                currentY = nextParams.headerHeight;
                return true;
            }
            return false;
        };

        const drawInlineSection = (title: string, items: any[]) => {
            if (!items || items.length === 0) return;
            checkPageBreak(8);

            let startX = 20;
            let y = currentY;
            const maxWidth = 190;
            const lineHeight = 5.5;

            // Draw Title
            doc.setFont(fontName, "bold").setFontSize(9).setTextColor(colorHeader[0], colorHeader[1], colorHeader[2]);
            doc.text(title + " : ", startX, y);
            let currentX = startX + doc.getTextWidth(title + " : ");

            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                const drawText = (text: string, isBold: boolean) => {
                    if (!text) return;
                    doc.setFont(fontName, isBold ? "bold" : "normal").setFontSize(9);
                    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

                    const lines = text.split(/\r?\n/);
                    lines.forEach((line, lineIdx) => {
                        if (lineIdx > 0) {
                            currentY += lineHeight;
                            y = currentY;
                            currentX = startX + 10;
                            checkPageBreak(lineHeight);
                            y = currentY;
                        }

                        const words = line.split(' ');
                        words.forEach((word) => {
                            if (!word) return;
                            const wWidth = doc.getTextWidth(word + " ");
                            if (currentX + wWidth > maxWidth) {
                                currentY += lineHeight;
                                y = currentY;
                                currentX = startX + 10;
                                checkPageBreak(lineHeight);
                                y = currentY;
                            }
                            doc.text(word, currentX, y);
                            currentX += doc.getTextWidth(word + " ");
                        });
                    });
                };

                drawText(item.main, true);
                drawText(item.sub, false);

                if (i < items.length - 1) {
                    doc.setFont(fontName, "bold").setFontSize(9).setTextColor(textDark[0], textDark[1], textDark[2]);
                    const sep = " | ";
                    const wWidth = doc.getTextWidth(sep);
                    if (currentX + wWidth > maxWidth) {
                        currentY += lineHeight;
                        y = currentY;
                        currentX = startX + 10;
                        checkPageBreak(lineHeight);
                        y = currentY;
                    }
                    doc.text(sep, currentX, y);
                    currentX += wWidth;
                }
            }
            currentY = y + lineHeight;
        };

        const getHistItems = (arr: any[], mainKey: string) => {
            if (!arr) return [];
            return arr.map(item => {
                let main = item[mainKey] || item.name || item.destination || item.member || item.relation || item.condition || item.medicineName || item.item || item.title || 'Unknown';
                let subs = [];
                if (item.severity) subs.push(`Severity: ${item.severity}`);
                if (item.duration) subs.push(`Duration: ${item.duration}`);
                if (item.since) subs.push(`Since: ${item.since}`);
                if (item.travelDate) subs.push(`Since: ${item.travelDate}`);
                if (item.relation) subs.push(`Relation: ${item.relation}`);
                if (item.member) subs.push(`Relation: ${item.member}`);
                if (item.note) subs.push(`Note: ${item.note}`);
                if (item.notes) subs.push(`Note: ${item.notes}`);
                let subStr = subs.length > 0 ? `(${subs.join(', ')})` : '';
                return { main: main, sub: subStr ? ` ${subStr}` : '' };
            });
        };

        // 1. Header Row
        if (false) {
          doc.setFontSize(18);
          doc.setFont(fontName, "bold");
          doc.setTextColor(99, 102, 241); // #4f46e5 (Indigo primary)
          const clinicName = (patient?.opdRegistration?.clinic_name || "OPD CLINIC").toUpperCase();
          doc.text(clinicName, 20, currentY);

          doc.setFontSize(9);
          doc.setFont(fontName, "bold");
          doc.setTextColor(100, 116, 139); // Slate-500
          doc.text("Comprehensive & Advanced Healthcare Clinic", 20, currentY + 5);

          // Right aligned doctor details
          doc.setFontSize(12);
          doc.setFont(fontName, "bold");
          doc.setTextColor(99, 102, 241);
          const doctorName = (patient?.opdRegistration?.treating_doctor || "DR. TREATING DOCTOR").toUpperCase();
          doc.text(doctorName, pageWidth - 20, currentY, { align: "right" });

          doc.setFontSize(9);
          doc.setFont(fontName, "normal");
          doc.setTextColor(17, 24, 39); // slate-900
          doc.text("MBBS, MD (Medicine)", pageWidth - 20, currentY + 5, { align: "right" });
          doc.text("Reg No: 123456", pageWidth - 20, currentY + 9, { align: "right" });

          currentY += 14;

          // Header border line
          doc.setDrawColor(99, 102, 241);
          doc.setLineWidth(0.6);
          doc.line(20, currentY, pageWidth - 20, currentY);
          currentY += 8; // Margin before patient info
        }

        // 2. Patient Info Grid
        doc.setFont(fontName, "bold").setFontSize(11).setTextColor(textDark[0], textDark[1], textDark[2]);
        const nameStr = `${patient?.title || "Mr/Mrs"} ${patient?.name || ""}`;
        doc.text(nameStr, 20, currentY);
        const nameWidth = doc.getTextWidth(nameStr);

        doc.setFont(fontName, "normal").setFontSize(10).setTextColor(textDark[0], textDark[1], textDark[2]);
        const formattedGender = patient?.gender 
          ? (patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase()) 
          : "N/A";
        const ageInfo = `, ${formattedGender}, ${patient?.age || '0'} ${patient?.ageUnit || 'Y'}(s), +${patient?.phone || 'N/A'}`;
        doc.text(ageInfo, 20 + nameWidth, currentY);

        const dDate = new Date();
        const formattedDateStr = dDate.toLocaleDateString('en-GB');
        doc.setFont(fontName, "bold").setFontSize(10).setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text(formattedDateStr, 190, currentY, { align: "right" });

        currentY += 6;

        doc.setFont(fontName, "bold").setFontSize(9).setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text("UHID : ", 20, currentY);
        let curX = 20 + doc.getTextWidth("UHID : ");

        doc.setFont(fontName, "normal").setFontSize(9);
        const uhidStr = `${patient?.id || 'N/A'}`;
        doc.text(uhidStr, curX, currentY);
        curX += doc.getTextWidth(uhidStr);

        const displayAddress = patient?.localAddress || patient?.permanentAddress;
        if (displayAddress) {
            doc.setFont(fontName, "bold");
            doc.text(", Address : ", curX, currentY);
            curX += doc.getTextWidth(", Address : ");
            doc.setFont(fontName, "normal");
            const addrSplit = displayAddress.split(',')[0];
            doc.text(addrSplit, curX, currentY);
            curX += doc.getTextWidth(addrSplit);
        }

        if (patient?.opdRegistration?.referring_doctor) {
            doc.setFont(fontName, "bold");
            doc.text(", Reference : ", curX, currentY);
            curX += doc.getTextWidth(", Reference : ");
            doc.setFont(fontName, "normal");
            doc.text(patient.opdRegistration.referring_doctor + ".", curX, currentY);
        }

        currentY += 4;
        doc.setDrawColor(226, 232, 240).line(20, currentY, 190, currentY);
        currentY += 6;

        // Vitals
        const activeVitals = [];
        if (weight) activeVitals.push({ main: `Weight: ${weight} kg`, sub: "" });
        if (activeVitals.length > 0) {
            drawInlineSection("VITALS", activeVitals);
        }

        // 1. SYMPTOMS
        if (symptoms && symptoms.length > 0) {
            const symItems = symptoms.map(i => {
                let subs = [];
                if (i.duration) subs.push(`Since: ${i.duration}`);
                if (i.severity) subs.push(`Severity: ${i.severity}`);
                if (i.headacheSites && i.headacheSites.length > 0) subs.push(`Headache site: ${i.headacheSites.join(', ')}`);
                if (i.painTypes && i.painTypes.length > 0) subs.push(`Type of pain: ${i.painTypes.join(', ')}`);
                if (i.clinicalCourse) subs.push(`Clinical course: ${i.clinicalCourse}`);
                if (i.note) subs.push(`Note: ${i.note}`);
                return { main: i.name, sub: subs.length > 0 ? ` (${subs.join(' | ')})` : '' };
            });
            drawInlineSection("SYMPTOMS", symItems);
        }

        // 2. PATIENT MEDICAL HISTORY
        const hasHistory = !histNoKnown || familyItems.length > 0 || conditions.length > 0 || allergies.length > 0 || procedures.length > 0 || currentMeds.length > 0 || habits.length > 0 || foodAllergies.length > 0 || travelHistory.length > 0 || otherHistory.length > 0;
        if (hasHistory) {
            checkPageBreak(12);
            doc.setFont(fontName, "bold").setFontSize(9.5).setTextColor(colorHeader[0], colorHeader[1], colorHeader[2]);
            doc.text("PATIENT MEDICAL HISTORY", 20, currentY);
            currentY += 5;
            
            const drawHistoryInline = (title: string, items: any[], nameKey: string) => {
                if (!items || items.length === 0) return;
                const displayItems = items.map(item => {
                    const name = item[nameKey] || item.name || item.medicineName || item.relation || item.condition || item.item || item.title || "";
                    const details = [];
                    if (item.severity) details.push(`Severity: ${item.severity}`);
                    if (item.duration) details.push(`Duration: ${item.duration}`);
                    if (item.since) details.push(`Since: ${item.since}`);
                    if (item.relation) details.push(`Relation: ${item.relation}`);
                    return { main: name, sub: details.length > 0 ? ` (${details.join(", ")})` : "" };
                });
                
                checkPageBreak(10);
                doc.setFont(fontName, "bold").setFontSize(8.5).setTextColor(textDark[0], textDark[1], textDark[2]);
                doc.text(title + ": ", 20, currentY);
                const prefixWidth = doc.getTextWidth(title + ": ");
                
                doc.setFont(fontName, "normal").setFontSize(8.5).setTextColor(textDark[0], textDark[1], textDark[2]);
                const textParts = displayItems.map(item => item.main + item.sub).join(" | ");
                const lines = doc.splitTextToSize(textParts, pageWidth - 40 - prefixWidth);
                
                for (let i = 0; i < lines.length; i++) {
                    if (i > 0) {
                        checkPageBreak(8);
                        doc.text(lines[i], 20, currentY);
                    } else {
                        doc.text(lines[i], 20 + prefixWidth, currentY);
                    }
                    currentY += 4.5;
                }
                currentY += 1.5;
            };

            if (conditions && conditions.length > 0) drawHistoryInline("Patient Medical History", conditions, 'name');
            if (familyItems && familyItems.length > 0) drawHistoryInline("Family History", familyItems, 'name');
            if (habits && habits.length > 0) drawHistoryInline("Lifestyle Habits", habits, 'name');
            if (currentMeds && currentMeds.length > 0) drawHistoryInline("Current Medications", currentMeds, 'name');
            if (allergies && allergies.length > 0) drawHistoryInline("Drug Allergies", allergies, 'name');
            if (foodAllergies && foodAllergies.length > 0) drawHistoryInline("Food Allergies", foodAllergies, 'name');
            if (procedures && procedures.length > 0) drawHistoryInline("Past Surgical Procedures", procedures, 'name');
            if (travelHistory && travelHistory.length > 0) drawHistoryInline("Travel History", travelHistory, 'destination');
            if (otherHistory && otherHistory.length > 0) drawHistoryInline(otherHistoryTitle || "Other Medical History", otherHistory, 'name');
        }

        // 3. EXAMINATION FINDINGS
        if (examinationFindings) {
            drawInlineSection("EXAMINATION FINDINGS", [{ main: examinationFindings, sub: '' }]);
        }

        // 4. INVESTIGATIVE READINGS
        if (labResults && labResults.length > 0) {
            const resultItems = labResults.map(r => {
                let info = r.name;
                let subs = [];
                if (r.reading) subs.push(r.reading + (r.unit ? ` ${r.unit}` : ''));
                if (r.interpretation) subs.push(`[${r.interpretation}]`);
                if (r.date) subs.push(r.date);
                if (r.notes) subs.push(r.notes);
                return { main: info, sub: subs.length > 0 ? `: ${subs.join(' - ')}` : '' };
            });
            drawInlineSection("INVESTIGATIVE READINGS", resultItems);
        }

        // 5. DIAGNOSIS
        if (diagnoses && diagnoses.length > 0) {
            const diagItems = diagnoses.map(d => {
                let subs = [];
                if (d.since) subs.push(`Since: ${d.since}`);
                if (d.status) subs.push(`Status: ${d.status}`);
                if (d.severity) subs.push(`Severity: ${d.severity}`);
                if (d.abdominalRegions && d.abdominalRegions.length > 0) subs.push(`Abdominal region: ${d.abdominalRegions.join(', ')}`);
                if (d.painTypes && d.painTypes.length > 0) subs.push(`Type of pain: ${d.painTypes.join(', ')}`);
                if (d.relievedBy && d.relievedBy.length > 0) subs.push(`Abdominal symptom relieved by: ${d.relievedBy.join(', ')}`);
                if (d.abdominalTenderness) subs.push(`Abdominal tenderness: ${d.abdominalTenderness}`);
                if (d.palpations && d.palpations.length > 0) subs.push(`Per abdomen palpation: ${d.palpations.join(', ')}`);
                if (d.auscultations && d.auscultations.length > 0) subs.push(`Abdomen auscultatory finding: ${d.auscultations.join(', ')}`);
                if (d.clinicalCourse) subs.push(`Clinical course: ${d.clinicalCourse}`);
                if (d.note) subs.push(`Note: ${d.note}`);
                return { main: d.name, sub: subs.length > 0 ? ` (${subs.join(' | ')})` : '' };
            });
            drawInlineSection("DIAGNOSIS", diagItems);
        }

        // 6. SURGERY
        if (surgeryPerformed) {
            const surgDetails = [];
            surgDetails.push({ main: `Surgery Performed: ${surgeryPerformed}`, sub: '' });
            if (surgeryDate) surgDetails.push({ main: `Date of Surgery: ${surgeryDate}`, sub: '' });
            if (surgeryNotes) surgDetails.push({ main: `Post Operative Periods: ${surgeryNotes}`, sub: '' });
            drawInlineSection("SURGERY", surgDetails);
        }

        // --- PRESCRIPTION TITLE ---
        if (medications && medications.length > 0) {
            checkPageBreak(15);
            currentY += 4;
            doc.setFont(fontName, "bold").setFontSize(11).setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
            const titleText = "PRESCRIPTION";
            const tWidth = doc.getTextWidth(titleText);
            doc.text(titleText, 105, currentY, { align: "center" });
            doc.setDrawColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]).setLineWidth(0.5);
            doc.line(105 - tWidth / 2, currentY + 1, 105 + tWidth / 2, currentY + 1);
            currentY += 6;

            const tableBody = medications.map((m, index) => {
                const category = m.form ? `(${m.form})` : '';
                const name = m.name || '';
                const comp = m.generic || '';

                let medText = name;
                if (category) medText += `\n${category}`;
                if (comp) medText += `\n${comp}`;

                let freqText = m.freq || '';
                if (m.timing) {
                    if (freqText) freqText += `\n${m.timing}`;
                    else freqText = m.timing;
                }

                return [
                    (index + 1).toString(),
                    { content: medText },
                    m.dose || '',
                    freqText,
                    formatDuration(m.duration),
                    m.instr || ''
                ];
            });

            autoTable(doc, {
                startY: currentY,
                margin: { 
                    left: 15, 
                    right: 15, 
                    bottom: footerHeight + 15, 
                    top: showHeader ? 20 : headerHeight 
                },
                head: [['', 'Medications', 'Dose', 'Frequency', 'Duration', 'Remarks']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [240, 235, 255], textColor: [0, 0, 0], fontSize: 9, font: fontName, fontStyle: 'bold', halign: 'center', lineColor: colorPrimary, lineWidth: 0.2 },
                bodyStyles: { fontSize: 8.5, font: fontName, cellPadding: 3, textColor: [0, 0, 0], lineColor: colorPrimary, lineWidth: 0.2 },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8, fontStyle: 'bold' },
                    1: { cellWidth: 55 },
                    2: { halign: 'center', cellWidth: 20 },
                    3: { halign: 'center', cellWidth: 25 },
                    4: { halign: 'center', cellWidth: 20 },
                    5: { cellWidth: 52 }
                },
                willDrawCell: (data) => {
                    const pageNum = doc.getNumberOfPages();
                    const params = getPageParams(pageNum);
                    data.settings.margin.bottom = params.footerHeight + 15;
                    data.settings.margin.top = params.headerHeight;

                    if (data.column.index === 1 && data.cell.section === 'body') {
                        const cell = data.cell;
                        (data.cell as any).originalTextLines = data.cell.text;
                        data.cell.text = [];

                        const originalText = (cell.raw && typeof cell.raw === 'object') ? (cell.raw as any).content : (cell.raw || '');
                        const originalName = originalText.split('\n')[0] || '';
                        const textWidth = cell.width - cell.padding('left') - cell.padding('right');

                        const oldFont = doc.getFont();
                        doc.setFont(fontName, "bold");
                        doc.setFontSize(cell.styles.fontSize || 8.5);
                        const wrappedNameLines = doc.splitTextToSize(originalName, textWidth);
                        doc.setFont(oldFont.fontName, oldFont.fontStyle);

                        (data.cell as any).nameLineCount = wrappedNameLines.length;
                        data.cell.styles.minCellHeight = 11;
                    }
                },
                didDrawCell: (data) => {
                    if (data.column.index === 1 && data.cell.section === 'body') {
                        const cell = data.cell;
                        const lines = (cell as any).originalTextLines;
                        const nameLineCount = (cell as any).nameLineCount || 1;
                        if (lines && lines.length > 0) {
                            let textY = cell.y + cell.padding('top') + (cell.styles.fontSize / doc.internal.scaleFactor);
                            const textX = cell.x + cell.padding('left');
                            const lineSpacing = (cell.styles as any).lineHeight || 1.15;
                            const fontSizeMm = cell.styles.fontSize / doc.internal.scaleFactor;

                            for (let i = 0; i < lines.length; i++) {
                                const isName = i < nameLineCount;
                                if (isName) {
                                    doc.setFont(fontName, "bold");
                                } else {
                                    doc.setFont(fontName, "normal");
                                }
                                doc.text(lines[i], textX, textY);
                                textY += fontSizeMm * lineSpacing;
                            }
                            doc.setFont(fontName, "normal");
                        }
                    }
                }
            });
            currentY = (doc as any).lastAutoTable.finalY + 8;
            pagesCount = doc.getNumberOfPages();
        }

        // 8. ADVISED INVESTIGATIONS (LAB/RADIOLOGY)
        if (labs && labs.length > 0) {
            const labItems = labs.map(l => {
                let subs = [];
                if (l.testOn) subs.push(`On: ${l.testOn}`);
                if (l.repeatOn) subs.push(`Repeat: ${l.repeatOn}`);
                if (l.remarks) subs.push(`Remark: ${l.remarks}`);
                return { main: l.name, sub: subs.length > 0 ? ` (${subs.join(' | ')})` : '' };
            });
            drawInlineSection("ADVISED INVESTIGATIONS (LAB/RADIOLOGY)", labItems);
        }

        // 9. PLAN / SURGERY ADVISED
        if (planSurgeryAdvised) {
            drawInlineSection("PLAN / SURGERY ADVISED", [{ main: planSurgeryAdvised, sub: '' }]);
        }

        // 10. FOLLOW UP & GENERAL ADVICE
        const advList = [];
        let adviceLines = [];
        if (advicesInput) {
            const lines = advicesInput.split('\n').filter(line => line.trim() !== '');
            adviceLines.push(...lines.map(line => `• ${line.trim()}`));
        }
        if (advRest) {
            adviceLines.push("• Please take some rest.");
        }
        if (advWater) {
            adviceLines.push("• Drink plenty of water.");
        }
        if (adviceLines.length > 0) {
            advList.push({ main: adviceLines.join('\n'), sub: '' });
            drawInlineSection("GENERAL ADVICE", advList);
        }

        let followUpDate: Date | null = null;
        if (followUpVal) {
            followUpDate = calculateFollowUpDate(new Date(), followUpVal);
        }
        if (followUpDate || followUpVal) {
            checkPageBreak(10);
            doc.setFont(fontName, "bold").setFontSize(9).setTextColor(colorHeader[0], colorHeader[1], colorHeader[2]);
            const label = "FOLLOWUP: ";
            doc.text(label, 20, currentY);
            let curX = 20 + doc.getTextWidth(label);
            
            doc.setFont(fontName, "normal").setFontSize(9).setTextColor(textDark[0], textDark[1], textDark[2]);
            const visitOnText = "Visit on ";
            doc.text(visitOnText, curX, currentY);
            curX += doc.getTextWidth(visitOnText);
            
            doc.setFont(fontName, "bold").setFontSize(9).setTextColor(textDark[0], textDark[1], textDark[2]);
            const displayDate = followUpDate ? formatFollowUpDate(followUpDate) : followUpVal;
            doc.text(displayDate, curX, currentY);
            curX += doc.getTextWidth(displayDate);

            if (followUpNotes) {
                doc.setFont(fontName, "normal").setFontSize(9).setTextColor(textGray[0], textGray[1], textGray[2]);
                doc.text(` (${followUpNotes})`, curX, currentY);
            }
            currentY += 6;
        }

        // 11. DOCTOR NOTES FOR PATIENT
        if (notesForPatient) {
            drawInlineSection("DOCTOR NOTES FOR PATIENT", [{ main: notesForPatient, sub: '' }]);
        }

        // 12. PROCEDURE DONE
        if (procedureDone) {
            drawInlineSection("PROCEDURE DONE", [{ main: procedureDone, sub: '' }]);
        }

        // 13. REFER TO SPECIALIST / DOCTOR (Last)
        if (referrals && referrals.length > 0) {
            const refItems = referrals.map(ref => {
                let info = ref.doctorName;
                let subs = [];
                if (ref.notes) subs.push(ref.notes);
                return { main: info, sub: subs.length > 0 ? `, ${subs.join(' | ')}` : '' };
            });
            drawInlineSection("REFER TO SPECIALIST / DOCTOR", refItems);
        }

        // --- SIGNATURE FOOTER ---
        pagesCount = doc.getNumberOfPages();
        const footerParams = getPageParams(pagesCount);
        if (currentY + 25 > footerParams.maxContentY) {
            doc.addPage();
            pagesCount += 1;
            drawBackgroundForPage(pagesCount);
            drawTextHeaderForPage(pagesCount);
            const newParams = getPageParams(pagesCount);
            currentY = newParams.headerHeight;
        }

        const finalParams = getPageParams(pagesCount);
        const footerY = Math.max(currentY + 10, pageHeight - finalParams.footerHeight - 20);

        // Add P.T.O to every page except the last page
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i < totalPages; i++) {
            doc.setPage(i);
            const params = getPageParams(i);
            const ptoY = pageHeight - params.footerHeight - 12;
            doc.setFont(fontName, "bold").setFontSize(9).setTextColor(textGray[0], textGray[1], textGray[2]);
            doc.text("P.T.O", pageWidth - 20, ptoY, { align: "right" });
        }
        // Restore active page to the last page
        doc.setPage(totalPages);

        const pdfBlob = doc.output("blob");
        const blobURL = URL.createObjectURL(pdfBlob);
        if (openInNewTab) {
          window.open(blobURL, "_blank");
        }
        return blobURL;
      } catch (err) {
        console.error("Error generating PDF:", err);
        return null;
      }
    }
  }));
  
  // Compile medical history elements into display format
  const compileHistoryText = (items: any[], title: string) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="text-[11px] leading-relaxed">
        <span className="font-bold text-primary mr-1">{title}:</span>
        <span className="text-[#334155]">
          {items.map((item) => {
            const name = item.name || item.medicineName || item.relation || item.condition || item.item || item.title || item.destination || "";
            const details = [];
            if (item.member) details.push(`Member: ${item.member}`);
            if (item.severity) details.push(`Severity: ${item.severity}`);
            if (item.duration) details.push(`Duration: ${item.duration}`);
            if (item.since) details.push(`Since: ${item.since}`);
            if (item.dose) details.push(`Dose: ${item.dose}`);
            if (item.freq) details.push(`Freq: ${item.freq}`);
            if (item.timing) details.push(`Timing: ${item.timing}`);
            if (item.date) details.push(`Date: ${item.date}`);
            if (item.travelDate) details.push(`Date: ${item.travelDate}`);
            if (item.relation) details.push(`Relation: ${item.relation}`);
            if (item.notes) details.push(`Note: ${item.notes}`);
            
            return name + (details.length > 0 ? ` (${details.join(", ")})` : "");
          }).join(" | ")}
        </span>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={`print-prescription-container w-full bg-white text-[#0f172a] font-sans p-8 select-text ${isGeneratingPDF ? "force-visible-pdf" : ""}`}
    >
      
      {/* ─── PRINT ONLY STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media screen {
          .print-prescription-container {
            display: none !important;
          }
          .print-prescription-container.force-visible-pdf {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: -9999px !important;
            width: 800px !important;
            z-index: -9999 !important;
          }
        }
        @media print {
          /* Print configuration overrides */
          @page {
            size: A4;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            background-color: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #main-rx-container {
            display: none !important;
          }
          .print-prescription-container {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .border-primary {
            border-color: #4f46e5 !important;
          }
          .text-primary {
            color: #4f46e5 !important;
          }
          .bg-primary-light {
            background-color: #f5f3ff !important;
          }
          .bg-slate-light {
            background-color: #f8fafc !important;
          }
        }
      `}} />

      {/* ─── HEADER ─── */}
      {showHeader ? (
        <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-4">
          <div>
            <div className="text-[20px] font-black text-[#4f46e5] uppercase tracking-tight">
              {patient?.opdRegistration?.clinic_name || "OPD CLINIC"}
            </div>
            <p className="m-0 text-[#64748b] text-[11px] font-semibold mt-0.5">
              Comprehensive & Advanced Healthcare Clinic
            </p>
          </div>
          <div className="text-right text-[11.5px] leading-normal font-semibold">
            <strong className="text-[#4f46e5] text-[13.5px] block mb-0.5">
              {patient?.opdRegistration?.treating_doctor || "DR. TREATING DOCTOR"}
            </strong>
            <span>MBBS, MD (Medicine)</span><br />
            <span>Reg No: 123456</span>
          </div>
        </div>
      ) : (
        <div style={{ height: `${headerHeight}mm` }} className="w-full shrink-0" />
      )}

      {/* ─── PATIENT INFORMATION GRID ─── */}
      <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-[#e2e8f0] p-4 rounded-lg text-[11.5px] font-semibold mb-5">
        <div className="space-y-1">
          <div>
            <span className="text-[#64748b]">Patient Name:</span>{" "}
            <span className="text-[#0f172a] font-extrabold select-text">
              {patient?.title || "Mr/Mrs"} {patient?.name}
            </span>
          </div>
          <div>
            <span className="text-[#64748b]">Age / Gender:</span>{" "}
            <span className="text-[#0f172a]">
              {patient?.age} {patient?.ageUnit || 'Year'}(s) / {patient?.gender ? (patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase()) : "N/A"}
            </span>
          </div>
          <div>
            <span className="text-[#64748b]">Phone:</span>{" "}
            <span className="text-[#0f172a] select-text">{patient?.phone}</span>
          </div>
        </div>
        <div className="space-y-1 text-right">
          <div>
            <span className="text-[#64748b]">Prescription Date:</span>{" "}
            <span className="text-[#0f172a]">
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div>
            <span className="text-[#64748b]">UHID / Queue No:</span>{" "}
            <span className="text-[#0f172a] select-text">
              {patient?.id} / Q-{patient?.queueNo || "01"}
            </span>
          </div>
          {patient?.opdRegistration?.referring_doctor && (
            <div>
              <span className="text-[#64748b]">Referred By:</span>{" "}
              <span className="text-[#0f172a] select-text">
                {patient.opdRegistration.referring_doctor}
              </span>
            </div>
          )}
        </div>
      </div>
      {weight && (
        <div className="mb-5 w-fit">
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5 border-b pb-0.5">Vitals</div>
          <div className="bg-[#f8fafc] border border-[#e2e8f0] px-4 py-2 rounded-lg text-center select-text">
            <div>
              <div className="text-[9px] font-bold text-[#64748b] uppercase">Weight</div>
              <div className="text-[12px] font-extrabold text-[#334155]">{weight} <span className="text-[9px] font-semibold text-slate-400">kg</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. SYMPTOMS ─── */}
      {symptoms && symptoms.length > 0 && (
        <div className="mb-5 border border-[#e2e8f0] p-3 rounded-lg avoid-break">
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 border-b pb-0.5">
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
                  <span className="text-[9px] uppercase font-bold text-[#64748b] bg-slate-100 px-1 py-0.2 rounded ml-1">
                    {s.severity}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── 3. PATIENT MEDICAL HISTORY ─── */}
      {(!histNoKnown || familyItems.length > 0 || conditions.length > 0 || allergies.length > 0 || procedures.length > 0 || currentMeds.length > 0 || habits.length > 0 || foodAllergies.length > 0 || travelHistory.length > 0 || otherHistory.length > 0) && (
        <div className="mb-5 border border-[#e2e8f0] p-3 rounded-lg bg-slate-50/50 space-y-1.5 avoid-break">
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider border-b pb-0.5 mb-1">
            Patient Medical History
          </div>
          {conditions.length > 0 && compileHistoryText(conditions, "Patient Medical History")}
          {familyItems.length > 0 && compileHistoryText(familyItems, "Family History")}
          {habits.length > 0 && compileHistoryText(habits, "Lifestyle Habits")}
          {currentMeds.length > 0 && compileHistoryText(currentMeds, "Current Medications")}
          {allergies.length > 0 && compileHistoryText(allergies, "Drug Allergies")}
          {foodAllergies.length > 0 && compileHistoryText(foodAllergies, "Food Allergies")}
          {procedures.length > 0 && compileHistoryText(procedures, "Past Surgical Procedures")}
          {travelHistory.length > 0 && compileHistoryText(travelHistory, "Travel History")}
          {otherHistory.length > 0 && compileHistoryText(otherHistory, otherHistoryTitle || "Other Medical History")}
        </div>
      )}

      {/* ─── 4. EXAMINATION FINDING ─── */}
      {examinationFindings && (
        <div className="mb-5 border border-[#e2e8f0] p-3 rounded-lg bg-slate-50/50 avoid-break">
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider border-b pb-0.5 mb-1">
            Examination Findings
          </div>
          <div className="text-[11px] font-medium text-slate-750 whitespace-pre-line leading-relaxed">
            {examinationFindings}
          </div>
        </div>
      )}

      {/* ─── 5. LAB RESULTS ─── */}
      {labResults && labResults.length > 0 && (
        <div className="mb-5 border border-[#e2e8f0] p-3 rounded-lg avoid-break">
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 border-b pb-0.5">
            Lab Results
          </div>
          <div className="grid grid-cols-2 gap-4 text-[10.5px] font-semibold text-slate-700">
            {labResults.map((r, idx) => (
              <div key={idx} className="border-b pb-1 last:border-0">
                <div className="font-bold text-[#0f172a]">{r.name}</div>
                <div className="flex gap-2 text-[9.5px] text-slate-500 mt-0.5">
                  <span>Reading: <strong className="text-slate-700">{r.reading} {r.unit}</strong></span>
                  {r.date && (
                    <span>| Date: <strong className="text-slate-700">{r.date}</strong></span>
                  )}
                  {r.interpretation && (
                    <span className={`px-1 rounded font-bold text-[8.5px] uppercase ${
                      r.interpretation.toLowerCase() === "high" ? "bg-red-50 text-red-600" :
                      r.interpretation.toLowerCase() === "low" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                    }`}>
                      {r.interpretation}
                    </span>
                  )}
                </div>
                {r.notes && <div className="text-[9px] text-slate-400 mt-0.5 italic">Note: {r.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 6. DIAGNOSIS ─── */}
      {diagnoses && diagnoses.length > 0 && (
        <div className="mb-5 border border-[#e2e8f0] p-3 rounded-lg avoid-break">
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 border-b pb-0.5">
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

      {/* ─── 7. SURGERY ─── */}
      {surgeryPerformed && (
        <div className="mb-5 border border-[#e2e8f0] p-3 rounded-lg bg-slate-50/50 avoid-break">
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider border-b pb-0.5 mb-1.5">
            Surgery
          </div>
          <div className="text-[11px] font-semibold text-slate-700 space-y-1">
            <div><span className="text-slate-400 font-medium">Surgery Performed:</span> {surgeryPerformed}</div>
            {surgeryDate && <div><span className="text-slate-400 font-medium">Date of Surgery:</span> {surgeryDate}</div>}
            {surgeryNotes && <div><span className="text-slate-400 font-medium">Post Operative Periods:</span> {surgeryNotes}</div>}
          </div>
        </div>
      )}

      {/* ─── 8. MEDICATIONS (Rx) TABLE ─── */}
      <div className="mb-5 avoid-break">
        <div className="text-[32px] font-bold text-primary font-serif -mt-2 leading-none mb-2">Rₓ</div>
        {medications.length > 0 ? (
          <table className="w-full border-collapse border border-[#cbd5e1] text-[11px] text-[#0f172a]">
            <thead>
              <tr className="bg-slate-100/80">
                <th className="border border-[#cbd5e1] px-2 py-1.5 text-center w-7">S.No</th>
                <th className="border border-[#cbd5e1] px-3 py-1.5 text-left">Medication / Generic Name</th>
                <th className="border border-[#cbd5e1] px-2.5 py-1.5 text-center w-20">Dose</th>
                <th className="border border-[#cbd5e1] px-2.5 py-1.5 text-center w-28">Frequency</th>
                <th className="border border-[#cbd5e1] px-2.5 py-1.5 text-center w-24">Duration</th>
                <th className="border border-[#cbd5e1] px-3 py-1.5 text-left">Remarks / Instructions</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="border border-[#cbd5e1] px-2 py-2 text-center font-bold">{idx + 1}</td>
                  <td className="border border-[#cbd5e1] px-3 py-2 font-semibold">
                    <div className="font-bold text-[12px]">{m.name}</div>
                    {m.generic && <div className="text-[9px] text-[#64748b] uppercase font-semibold mt-0.5">{m.generic}</div>}
                  </td>
                  <td className="border border-[#cbd5e1] px-2.5 py-2 text-center font-semibold">{m.dose}</td>
                  <td className="border border-[#cbd5e1] px-2.5 py-2 text-center font-semibold">
                    <div>{m.freq}</div>
                    {m.timing && <div className="text-[9.5px] text-slate-500 font-medium mt-0.5">{m.timing}</div>}
                  </td>
                  <td className="border border-[#cbd5e1] px-2.5 py-2 text-center font-semibold">{formatDuration(m.duration)}</td>
                  <td className="border border-[#cbd5e1] px-3 py-2 text-slate-600 font-medium italic">{m.instr || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-[11px] text-slate-400 italic p-3 border border-dashed rounded-lg text-center">
            No medications prescribed.
          </div>
        )}
      </div>

      {/* ─── 9. ADVISED INVESTIGATIONS ─── */}
      {labs && labs.length > 0 && (
        <div className="mb-5 border border-[#e2e8f0] p-3 rounded-lg avoid-break">
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5 border-b pb-0.5">
            Advised Investigations (Lab/Radiology)
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

      {/* ─── 10. PLAN/SURGERY ADVISED ─── */}
      {planSurgeryAdvised && (
        <div className="mb-5 border border-[#e2e8f0] p-3 rounded-lg bg-slate-50/50 avoid-break">
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider border-b pb-0.5 mb-1">
            Plan / Surgery Advised
          </div>
          <div className="text-[11px] font-medium text-slate-750 whitespace-pre-line leading-relaxed">
            {planSurgeryAdvised}
          </div>
        </div>
      )}

      {/* ─── 11. FOLLOWUPS & ADVICE ─── */}
      {/* ─── 11. FOLLOWUPS & ADVICE ─── */}
      {(followUpVal || advicesInput || advRest || advWater) && (
        <div className="mb-5 border border-[#e2e8f0] p-3 rounded-lg avoid-break space-y-3">
          {followUpVal && (
            <div>
              <strong className="text-primary text-[10px] uppercase block tracking-wider mb-0.5 border-b pb-0.5">Follow Up</strong>
              <div className="text-[11px] font-semibold text-slate-700 mt-1">
                {followUpVal}{" "}
                {followUpNotes && <span className="text-slate-400 font-medium">({followUpNotes})</span>}
              </div>
            </div>
          )}

          {(advicesInput || advRest || advWater) && (
            <div>
              <strong className="text-primary text-[10px] uppercase block tracking-wider mb-0.5 border-b pb-0.5">General Advice</strong>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] font-semibold text-slate-700 mt-1">
                {advicesInput && advicesInput.split('\n').filter(line => line.trim() !== '').map((line, idx) => (
                  <li key={idx}>{line.trim()}</li>
                ))}
                {advRest && <li>Please take some rest.</li>}
                {advWater && <li>Drink plenty of water.</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ─── 12. NOTES / REMARKS ─── */}
      {notesForPatient && (
        <div className="mb-5 border border-[#e2e8f0] p-3 rounded-lg bg-slate-50/50 avoid-break">
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider border-b pb-0.5 mb-1">
            Doctor Notes for Patient
          </div>
          <div className="text-[11px] font-medium text-slate-750 whitespace-pre-line leading-relaxed">
            {notesForPatient}
          </div>
        </div>
      )}

      {/* ─── 13. PROCEDURE DONE ─── */}
      {procedureDone && (
        <div className="mb-5 border border-[#e2e8f0] p-3 rounded-lg bg-slate-50/50 avoid-break">
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider border-b pb-0.5 mb-1">
            Procedure Done
          </div>
          <div className="text-[11px] font-medium text-slate-750 whitespace-pre-line leading-relaxed">
            {procedureDone}
          </div>
        </div>
      )}

      {/* ─── 14. REFER TO SPECIALIST ─── */}
      {referrals && referrals.length > 0 && (
        <div className="mb-5 border border-[#e2e8f0] p-3 rounded-lg avoid-break">
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5 border-b pb-0.5">
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
  );
});

export default PrintPrescription;
