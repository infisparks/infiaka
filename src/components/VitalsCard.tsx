"use client";

import React from "react";

interface VitalsCardProps {
  rxSystolic: string;
  setRxSystolic: (v: string) => void;
  rxDiastolic: string;
  setRxDiastolic: (v: string) => void;
  rxTemp: string;
  setRxTemp: (v: string) => void;
  rxSpo2: string;
  setRxSpo2: (v: string) => void;
  rxPulse: string;
  setRxPulse: (v: string) => void;
  rxRespRate: string;
  setRxRespRate: (v: string) => void;
  rxHeight: string;
  setRxHeight: (v: string) => void;
  rxWeight: string;
  setRxWeight: (v: string) => void;
  rxBmi: string;
  currentRxPatient: { gender: string; age: number } | null;
  egfrScore: string;
  setEgfrScore: (v: string) => void;
  cvdRisk: string;
  setCvdRisk: (v: string) => void;
  crclScore: string;
  setCrclScore: (v: string) => void;
  qriskScore: string;
  setQriskScore: (v: string) => void;
  bsaScore: string;
  setBsaScore: (v: string) => void;
}

export default function VitalsCard({
  rxSystolic,
  setRxSystolic,
  rxDiastolic,
  setRxDiastolic,
  rxTemp,
  setRxTemp,
  rxSpo2,
  setRxSpo2,
  rxPulse,
  setRxPulse,
  rxRespRate,
  setRxRespRate,
  rxHeight,
  setRxHeight,
  rxWeight,
  setRxWeight,
  rxBmi,
  currentRxPatient,
  egfrScore,
  setEgfrScore,
  cvdRisk,
  setCvdRisk,
  crclScore,
  setCrclScore,
  qriskScore,
  setQriskScore,
  bsaScore,
  setBsaScore,
}: VitalsCardProps) {
  // Calculators triggers inside the component
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
      const baseCrCl = ((140 - ageVal) * w) / 72;
      const finalCrCl = currentRxPatient.gender === "Female" ? baseCrCl * 0.85 : baseCrCl;
      setCrclScore(finalCrCl.toFixed(1) + " mL/min");
    } else {
      setCrclScore("0.0 mL/min");
    }
  };

  const handleCalculateEgfr = () => {
    if (!currentRxPatient) return;
    const egfr = currentRxPatient.gender === "Female" ? 95 : 110;
    setEgfrScore(egfr + " mL/min/1.73m²");
  };

  const handleCalculateCvd = () => {
    setCvdRisk("4.2 %");
  };

  const handleCalculateQrisk = () => {
    setQriskScore("2.1 %");
  };

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-sm w-full select-none">
      <div className="flex justify-between items-center border-b pb-2 select-none">
        <span className="text-[11px] font-extrabold text-[#1E293B] uppercase flex items-center gap-1.5">
          <svg className="w-4 h-4 text-red-500 fill-red-500/10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Vitals
        </span>
        <div className="flex items-center gap-2">
          <button type="button" className="px-2.5 py-0.5 bg-slate-50 border border-slate-200 text-[9.5px] font-bold rounded text-[#4A5568] hover:bg-slate-100">Add Past Vitals</button>
          <button type="button" className="px-2.5 py-0.5 bg-slate-50 border border-slate-200 text-[9.5px] font-bold rounded text-[#4A5568] hover:bg-slate-100">Configure</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Systolic BP */}
        <div className="flex items-center justify-between border border-[#E5E7EB] rounded-lg p-2.5 bg-white shadow-2xs w-full">
          <div className="flex items-center gap-2">
            <span className="text-[#94A3B8] text-xs">💧</span>
            <span className="font-semibold text-[11px] text-[#475569]">Systolic BP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={rxSystolic}
              onChange={(e) => setRxSystolic(e.target.value)}
              className="w-16 h-7 text-center font-bold text-[11px] border border-[#CBD5E0] focus:border-primary rounded focus:outline-none bg-white"
            />
            <span className="text-[10px] text-[#94A3B8] font-bold w-12 text-left">mmHg</span>
          </div>
        </div>
        
        {/* Diastolic BP */}
        <div className="flex items-center justify-between border border-[#E5E7EB] rounded-lg p-2.5 bg-white shadow-2xs w-full">
          <div className="flex items-center gap-2">
            <span className="text-[#94A3B8] text-xs">💧</span>
            <span className="font-semibold text-[11px] text-[#475569]">Diastolic BP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={rxDiastolic}
              onChange={(e) => setRxDiastolic(e.target.value)}
              className="w-16 h-7 text-center font-bold text-[11px] border border-[#CBD5E0] focus:border-primary rounded focus:outline-none bg-white"
            />
            <span className="text-[10px] text-[#94A3B8] font-bold w-12 text-left">mmHg</span>
          </div>
        </div>

        {/* Temperature */}
        <div className="flex items-center justify-between border border-[#E5E7EB] rounded-lg p-2.5 bg-white shadow-2xs w-full">
          <div className="flex items-center gap-2">
            <span className="text-[#94A3B8] text-xs">🌡️</span>
            <span className="font-semibold text-[11px] text-[#475569]">Temperature</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={rxTemp}
              onChange={(e) => setRxTemp(e.target.value)}
              className="w-16 h-7 text-center font-bold text-[11px] border border-[#CBD5E0] focus:border-primary rounded focus:outline-none bg-white"
            />
            <span className="text-[10px] text-[#94A3B8] font-bold w-12 text-left">°F</span>
          </div>
        </div>

        {/* SpO2 */}
        <div className="flex items-center justify-between border border-[#E5E7EB] rounded-lg p-2.5 bg-white shadow-2xs w-full">
          <div className="flex items-center gap-2">
            <span className="text-[#94A3B8] text-xs">🫁</span>
            <span className="font-semibold text-[11px] text-[#475569]">SpO2</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={rxSpo2}
              onChange={(e) => setRxSpo2(e.target.value)}
              className="w-16 h-7 text-center font-bold text-[11px] border border-[#CBD5E0] focus:border-primary rounded focus:outline-none bg-white"
            />
            <span className="text-[10px] text-[#94A3B8] font-bold w-12 text-left">%</span>
          </div>
        </div>

        {/* Pulse Rate */}
        <div className="flex items-center justify-between border border-[#E5E7EB] rounded-lg p-2.5 bg-white shadow-2xs w-full">
          <div className="flex items-center gap-2">
            <span className="text-[#94A3B8] text-xs">💓</span>
            <span className="font-semibold text-[11px] text-[#475569]">Pulse Rate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={rxPulse}
              onChange={(e) => setRxPulse(e.target.value)}
              className="w-16 h-7 text-center font-bold text-[11px] border border-[#CBD5E0] focus:border-primary rounded focus:outline-none bg-white"
            />
            <span className="text-[10px] text-[#94A3B8] font-bold w-12 text-left">/min</span>
          </div>
        </div>

        {/* Resp. Rate */}
        <div className="flex items-center justify-between border border-[#E5E7EB] rounded-lg p-2.5 bg-white shadow-2xs w-full">
          <div className="flex items-center gap-2">
            <span className="text-[#94A3B8] text-xs">🌬️</span>
            <span className="font-semibold text-[11px] text-[#475569]">Respiratory rate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={rxRespRate}
              onChange={(e) => setRxRespRate(e.target.value)}
              className="w-16 h-7 text-center font-bold text-[11px] border border-[#CBD5E0] focus:border-primary rounded focus:outline-none bg-white"
            />
            <span className="text-[10px] text-[#94A3B8] font-bold w-12 text-left">/min</span>
          </div>
        </div>

        {/* Height */}
        <div className="flex items-center justify-between border border-[#E5E7EB] rounded-lg p-2.5 bg-white shadow-2xs w-full">
          <div className="flex items-center gap-2">
            <span className="text-[#94A3B8] text-xs">📏</span>
            <span className="font-semibold text-[11px] text-[#475569]">Height</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={rxHeight}
              onChange={(e) => setRxHeight(e.target.value)}
              className="w-16 h-7 text-center font-bold text-[11px] border border-[#CBD5E0] focus:border-primary rounded focus:outline-none bg-white"
            />
            <span className="text-[10px] text-[#94A3B8] font-bold w-12 text-left">cm</span>
          </div>
        </div>

        {/* Weight */}
        <div className="flex items-center justify-between border border-[#E5E7EB] rounded-lg p-2.5 bg-white shadow-2xs w-full">
          <div className="flex items-center gap-2">
            <span className="text-[#94A3B8] text-xs">⚖️</span>
            <span className="font-semibold text-[11px] text-[#475569]">Weight</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={rxWeight}
              onChange={(e) => setRxWeight(e.target.value)}
              className="w-16 h-7 text-center font-bold text-[11px] border border-[#CBD5E0] focus:border-primary rounded focus:outline-none bg-white"
            />
            <span className="text-[10px] text-[#94A3B8] font-bold w-12 text-left">kg</span>
          </div>
        </div>

        {/* BMI */}
        <div className="flex items-center justify-between border border-[#E5E7EB] rounded-lg p-2.5 bg-white shadow-2xs w-full">
          <div className="flex items-center gap-2">
            <span className="text-[#94A3B8] text-xs">👤</span>
            <span className="font-semibold text-[11px] text-[#475569]">BMI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-7 flex items-center justify-center font-extrabold text-[11px] border border-[#E2E8F0] bg-slate-50 text-foreground rounded">
              {rxBmi}
            </div>
            <span className="text-[10px] text-[#94A3B8] font-bold w-12 text-left">kg/m²</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t flex flex-wrap gap-4 items-center text-[10px] select-none">
        <span className="font-extrabold text-[#718096] uppercase tracking-wide">Calculators:</span>
        
        {/* eGFR */}
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-text-secondary">eGFR</span>
          <button
            type="button"
            onClick={handleCalculateEgfr}
            className="px-2 py-0.5 border border-primary/20 hover:bg-primary/5 text-primary rounded font-bold"
          >
            Calculate
          </button>
          {egfrScore && <span className="font-bold text-foreground text-[10px]">{egfrScore}</span>}
        </div>

        {/* CVD Risk */}
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-text-secondary">CVD 10 Yr Risk</span>
          <button
            type="button"
            onClick={handleCalculateCvd}
            className="px-2 py-0.5 border border-primary/20 hover:bg-primary/5 text-primary rounded font-bold"
          >
            Calculate
          </button>
          {cvdRisk && <span className="font-bold text-foreground text-[10px]">{cvdRisk}</span>}
        </div>

        {/* CrCl */}
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-text-secondary">Creatinine Clearance (CrCl)</span>
          <button
            type="button"
            onClick={handleCalculateCrCl}
            className="px-2 py-0.5 border border-primary/20 hover:bg-primary/5 text-primary rounded font-bold"
          >
            Calculate
          </button>
          {crclScore && <span className="font-bold text-foreground text-[10px]">{crclScore}</span>}
        </div>

        {/* QRISK3 */}
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-text-secondary">QRISK3 Score</span>
          <button
            type="button"
            onClick={handleCalculateQrisk}
            className="px-2 py-0.5 border border-primary/20 hover:bg-primary/5 text-primary rounded font-bold"
          >
            Calculate
          </button>
          {qriskScore && <span className="font-bold text-foreground text-[10px]">{qriskScore}</span>}
        </div>

        {/* BSA */}
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-text-secondary">BSA Score</span>
          <button
            type="button"
            onClick={handleCalculateBsa}
            className="px-2 py-0.5 border border-primary/20 hover:bg-primary/5 text-primary rounded font-bold"
          >
            Calculate
          </button>
          {bsaScore && <span className="font-bold text-foreground text-[10px]">{bsaScore}</span>}
        </div>
      </div>
    </section>
  );
}
