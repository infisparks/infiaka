"use client";

import React from "react";

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
}

export default function PrintPrescription({
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
}: PrintPrescriptionProps) {
  
  // Compile medical history elements into display format
  const compileHistoryText = (items: any[], title: string) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="text-[11px] leading-relaxed">
        <span className="font-bold text-primary mr-1">{title}:</span>
        <span className="text-[#334155]">
          {items.map((item) => {
            const name = item.name || item.medicineName || item.relation || item.condition || item.item || item.title || "";
            const details = [];
            if (item.status) details.push(`Status: ${item.status}`);
            if (item.severity) details.push(`Severity: ${item.severity}`);
            if (item.duration) details.push(`Duration: ${item.duration}`);
            if (item.since) details.push(`Since: ${item.since}`);
            if (item.relation) details.push(`Relation: ${item.relation}`);
            
            return name + (details.length > 0 ? ` (${details.join(", ")})` : "");
          }).join(" | ")}
        </span>
      </div>
    );
  };

  return (
    <div className="print-prescription-container w-full bg-white text-[#0f172a] font-sans p-8 select-text">
      
      {/* ─── PRINT ONLY STYLES ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media screen {
          .print-prescription-container {
            display: none !important;
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
              {patient?.age} {patient?.ageUnit || 'Year'}(s) / {patient?.gender}
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

      {/* ─── VITALS RIBBON ─── */}
      {(bp || pulse || weight || spo2 || sugar) && (
        <div className="mb-5">
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5 border-b pb-0.5">Vitals</div>
          <div className="grid grid-cols-5 gap-3 bg-[#f8fafc] border border-[#e2e8f0] px-3 py-2 rounded-lg text-center select-text">
            {bp && (
              <div>
                <div className="text-[9px] font-bold text-[#64748b] uppercase">BP</div>
                <div className="text-[12px] font-extrabold text-[#334155]">{bp} <span className="text-[9px] font-semibold text-slate-400">mmHg</span></div>
              </div>
            )}
            {pulse && (
              <div>
                <div className="text-[9px] font-bold text-[#64748b] uppercase">Pulse</div>
                <div className="text-[12px] font-extrabold text-[#334155]">{pulse} <span className="text-[9px] font-semibold text-slate-400">bpm</span></div>
              </div>
            )}
            {weight && (
              <div>
                <div className="text-[9px] font-bold text-[#64748b] uppercase">Weight</div>
                <div className="text-[12px] font-extrabold text-[#334155]">{weight} <span className="text-[9px] font-semibold text-slate-400">kg</span></div>
              </div>
            )}
            {spo2 && (
              <div>
                <div className="text-[9px] font-bold text-[#64748b] uppercase">SpO2</div>
                <div className="text-[12px] font-extrabold text-[#334155]">{spo2}<span className="text-[9px] font-semibold text-slate-400">%</span></div>
              </div>
            )}
            {sugar && (
              <div>
                <div className="text-[9px] font-bold text-[#64748b] uppercase">Sugar</div>
                <div className="text-[12px] font-extrabold text-[#334155]">{sugar} <span className="text-[9px] font-semibold text-slate-400">mg/dL</span></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MEDICAL HISTORY SECTION ─── */}
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

      {/* ─── CLINICAL DIAGNOSTICS & SYMPTOMS ─── */}
      {(symptoms.length > 0 || diagnoses.length > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-5 avoid-break">
          {/* Symptoms */}
          {symptoms.length > 0 && (
            <div className="border border-[#e2e8f0] p-3 rounded-lg">
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

          {/* Diagnoses */}
          {diagnoses.length > 0 && (
            <div className="border border-[#e2e8f0] p-3 rounded-lg">
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
        </div>
      )}

      {/* ─── MEDICATIONS (Rx) TABLE ─── */}
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
                  <td className="border border-[#cbd5e1] px-2.5 py-2 text-center font-semibold">{m.duration}</td>
                  <td className="border border-[#cbd5e1] px-3 py-2 text-slate-600 font-medium italic">{m.instr || "-"}</td>
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

      {/* ─── INVESTIGATIONS & CLINICAL FINDINGS ─── */}
      {(labs.length > 0 || labResults.length > 0 || rxProcedures.length > 0 || referrals.length > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-5 avoid-break">
          {/* Left Block: Suggested Labs & Lab Results */}
          {(labs.length > 0 || labResults.length > 0) && (
            <div className="border border-[#e2e8f0] p-3 rounded-lg space-y-3">
              {labs.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5 border-b pb-0.5">
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

              {labResults.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5 border-b pb-0.5">
                    Lab Results
                  </div>
                  <div className="space-y-2 text-[10.5px] font-semibold text-slate-700">
                    {labResults.map((r, idx) => (
                      <div key={idx} className="border-b pb-1 last:border-0">
                        <div className="font-bold text-[#0f172a]">{r.name}</div>
                        <div className="flex gap-2 text-[9.5px] text-slate-500 mt-0.5">
                          <span>Reading: <strong className="text-slate-700">{r.reading} {r.unit}</strong></span>
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
            </div>
          )}

          {/* Right Block: Suggested Procedures & Doctor Referrals */}
          {(rxProcedures.length > 0 || referrals.length > 0) && (
            <div className="border border-[#e2e8f0] p-3 rounded-lg space-y-3">
              {rxProcedures.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5 border-b pb-0.5">
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

              {referrals.length > 0 && (
                <div>
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
          )}
        </div>
      )}

      {/* ─── BOTTOM DETAILS: NOTES, ADVICE, FOLLOWUP ─── */}
      <div className="border-t border-[#cbd5e1] pt-3.5 mt-6 grid grid-cols-2 gap-6 text-[11px] font-semibold text-slate-700 avoid-break">
        <div className="space-y-3">
          {/* Follow Up */}
          {followUpVal && (
            <div>
              <strong className="text-primary text-[10px] uppercase block tracking-wider mb-0.5">Follow Up</strong>
              <div className="text-[#0f172a]">
                {followUpVal}{" "}
                {followUpNotes && <span className="text-slate-500">({followUpNotes})</span>}
              </div>
            </div>
          )}

          {/* Doctor Notes */}
          {notesForPatient && (
            <div>
              <strong className="text-primary text-[10px] uppercase block tracking-wider mb-0.5">Doctor Notes for Patient</strong>
              <div className="bg-slate-50 p-2.5 rounded border border-[#e2e8f0] text-[10.5px] leading-relaxed white-space-pre-line font-medium text-slate-600">
                {notesForPatient}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {/* Advices */}
          {(advicesInput || advRest || advWater) && (
            <div>
              <strong className="text-primary text-[10px] uppercase block tracking-wider mb-0.5">General Advice</strong>
              <div className="space-y-1.5 text-[#0f172a]">
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

      {/* ─── FOOTER SIGNATURE ROW ─── */}
      {showFooter ? (
        <div className="flex justify-between items-end pt-8 mt-12 border-t border-[#f1f5f9] text-[10px] font-semibold text-slate-400 avoid-break">
          <div>
            <span>Generated via DLPC Clinic Management System</span>
          </div>
          <div className="text-center w-40">
            <div className="border-b border-[#cbd5e1] h-8"></div>
            <div className="text-[9px] uppercase font-bold text-slate-500 mt-1">Doctor Signature</div>
          </div>
        </div>
      ) : (
        <div style={{ height: `${footerHeight}mm` }} className="w-full shrink-0" />
      )}

    </div>
  );
}
