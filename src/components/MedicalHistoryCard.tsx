"use client";

import { CurrentMedication } from "./CurrentMedicationsDrawer";
import { ExistingCondition } from "./ExistingConditionsDrawer";
import { SurgicalProcedure } from "./SurgicalProceduresDrawer";
import { FamilyHistoryItem } from "./FamilyHistoryDrawer";
import { DrugAllergy } from "./DrugAllergiesDrawer";

interface MedicalHistoryCardProps {
  histNoKnown: boolean;
  setHistNoKnown: (v: boolean) => void;
  histDiabetes: boolean;
  setHistDiabetes: (v: boolean) => void;
  histDiabetesSince: string;
  setHistDiabetesSince: (v: string) => void;
  histHypothyroid: boolean;
  setHistHypothyroid: (v: boolean) => void;
  histHypertension: boolean;
  setHistHypertension: (v: boolean) => void;
  histAlcohol: boolean;
  setHistAlcohol: (v: boolean) => void;
  histTobacco: boolean;
  setHistTobacco: (v: boolean) => void;
  histSmoke: boolean;
  setHistSmoke: (v: boolean) => void;
  currentMeds: CurrentMedication[];
  setCurrentMeds: React.Dispatch<React.SetStateAction<CurrentMedication[]>>;
  onOpenCurrentMeds?: () => void;
  conditions: ExistingCondition[];
  setConditions: React.Dispatch<React.SetStateAction<ExistingCondition[]>>;
  onOpenConditions?: () => void;
  procedures: SurgicalProcedure[];
  setProcedures: React.Dispatch<React.SetStateAction<SurgicalProcedure[]>>;
  onOpenProcedures?: () => void;
  familyItems: FamilyHistoryItem[];
  setFamilyItems: React.Dispatch<React.SetStateAction<FamilyHistoryItem[]>>;
  onOpenFamily?: () => void;
  allergies: DrugAllergy[];
  setAllergies: React.Dispatch<React.SetStateAction<DrugAllergy[]>>;
  onOpenAllergies?: () => void;
}

export default function MedicalHistoryCard({
  histNoKnown,
  setHistNoKnown,
  histDiabetes,
  setHistDiabetes,
  histDiabetesSince,
  setHistDiabetesSince,
  histHypothyroid,
  setHistHypothyroid,
  histHypertension,
  setHistHypertension,
  histAlcohol,
  setHistAlcohol,
  histTobacco,
  setHistTobacco,
  histSmoke,
  setHistSmoke,
  currentMeds,
  setCurrentMeds,
  onOpenCurrentMeds,
  conditions,
  setConditions,
  onOpenConditions,
  procedures,
  setProcedures,
  onOpenProcedures,
  familyItems,
  setFamilyItems,
  onOpenFamily,
  allergies,
  setAllergies,
  onOpenAllergies,
}: MedicalHistoryCardProps) {

  const toggleMedStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Yes (Active)" ? "No (Inactive)" : "Yes (Active)";
    setCurrentMeds((p) => p.map((m) => m.id === id ? { ...m, status: newStatus } : m));
  };

  const toggleConditionStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Yes (Active)" ? "No (Inactive)" : "Yes (Active)";
    setConditions((p) => p.map((c) => c.id === id ? { ...c, status: newStatus } : c));
  };

  const toggleProcedureStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Yes (Active)" ? "No (Inactive)" : "Yes (Active)";
    setProcedures((p) => p.map((pr) => pr.id === id ? { ...pr, status: newStatus } : pr));
  };

  const toggleFamilyStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Yes (Active)" ? "No (Inactive)" : "Yes (Active)";
    setFamilyItems((p) => p.map((f) => f.id === id ? { ...f, status: newStatus } : f));
  };

  const toggleAllergyStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Yes (Active)" ? "No (Inactive)" : "Yes (Active)";
    setAllergies((p) => p.map((a) => a.id === id ? { ...a, status: newStatus } : a));
  };

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4 shadow-sm w-full select-none">
      
      {/* Title block */}
      <div className="flex justify-between items-center border-b pb-2 select-none">
        <span className="text-[11px] font-extrabold text-[#1E293B] uppercase flex items-center gap-1.5">
          <svg className="w-4 h-4 text-amber-500 fill-amber-500/10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Patient Medical History
        </span>
        <div className="flex items-center gap-3 text-[10.5px] font-bold text-[#4A5568]">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={histNoKnown}
              onChange={(e) => setHistNoKnown(e.target.checked)}
              className="rounded text-primary border-gray-300 focus:ring-primary w-3.5 h-3.5"
            />
            No known medical history
          </label>
          <button type="button" className="px-2.5 py-0.5 bg-slate-50 border border-slate-200 text-[9.5px] font-bold rounded hover:bg-slate-100 flex items-center gap-1">
            <span>⚙ Configure</span>
          </button>
        </div>
      </div>

      {/* Grid of default states */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-4 pt-1">
        
        {/* Diabetes mellitus */}
        <div className="flex items-center justify-between py-1 border-b border-[#F1F5F9] w-full">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setHistDiabetes(!histDiabetes)}>
            <div className={`w-8 h-8 min-w-[32px] min-h-[32px] rounded-full flex items-center justify-center border font-bold text-[11px] select-none transition-colors ${
              histDiabetes ? "bg-[#f1f5f9] border-[#cbd5e1] text-slate-800" : "bg-[#f8fafc] border-slate-200 text-slate-400"
            }`}>
              <div className="flex items-center space-x-1">
                <span>{histDiabetes ? "Y" : "-"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="w-1.5 h-2.5 fill-slate-500">
                  <path d="M27.66 224h264.7c24.6 0 36.89-29.78 19.54-47.12l-132.3-136.8c-5.406-5.406-12.47-8.107-19.53-8.107c-7.055 0-14.09 2.701-19.45 8.107L8.119 176.9C-9.229 194.2 3.055 224 27.66 224zM292.3 288H27.66c-24.6 0-36.89 29.77-19.54 47.12l132.5 136.8C145.9 477.3 152.1 480 160 480c7.053 0 14.12-2.703 19.53-8.109l132.3-136.8C329.2 317.8 316.9 288 292.3 288z"></path>
                </svg>
              </div>
            </div>
            <span className="font-bold text-[11px] text-[#4A5568] break-all">Diabetes mellitus</span>
          </div>
          <div>
            {histDiabetes && (
              <input
                type="text"
                placeholder="Since"
                value={histDiabetesSince}
                onChange={(e) => setHistDiabetesSince(e.target.value)}
                className="w-16 h-7 border border-[#CBD5E0] focus:border-primary rounded text-center text-[10.5px] focus:outline-none bg-white font-semibold text-[#4A5568]"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>

        {/* Hypothyroidism */}
        <div className="flex items-center justify-between py-1 border-b border-[#F1F5F9] w-full">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setHistHypothyroid(!histHypothyroid)}>
            <div className={`w-8 h-8 min-w-[32px] min-h-[32px] rounded-full flex items-center justify-center border font-bold text-[11px] select-none transition-colors ${
              histHypothyroid ? "bg-[#f1f5f9] border-[#cbd5e1] text-slate-800" : "bg-[#f8fafc] border-slate-200 text-slate-400"
            }`}>
              <div className="flex items-center space-x-1">
                <span>{histHypothyroid ? "Y" : "-"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="w-1.5 h-2.5 fill-slate-500">
                  <path d="M27.66 224h264.7c24.6 0 36.89-29.78 19.54-47.12l-132.3-136.8c-5.406-5.406-12.47-8.107-19.53-8.107c-7.055 0-14.09 2.701-19.45 8.107L8.119 176.9C-9.229 194.2 3.055 224 27.66 224zM292.3 288H27.66c-24.6 0-36.89 29.77-19.54 47.12l132.5 136.8C145.9 477.3 152.1 480 160 480c7.053 0 14.12-2.703 19.53-8.109l132.3-136.8C329.2 317.8 316.9 288 292.3 288z"></path>
                </svg>
              </div>
            </div>
            <span className="font-bold text-[11px] text-[#4A5568] break-all">Hypothyroidism</span>
          </div>
          <div></div>
        </div>

        {/* Hypertension */}
        <div className="flex items-center justify-between py-1 border-b border-[#F1F5F9] w-full">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setHistHypertension(!histHypertension)}>
            <div className={`w-8 h-8 min-w-[32px] min-h-[32px] rounded-full flex items-center justify-center border font-bold text-[11px] select-none transition-colors ${
              histHypertension ? "bg-[#f1f5f9] border-[#cbd5e1] text-slate-800" : "bg-[#f8fafc] border-slate-200 text-slate-400"
            }`}>
              <div className="flex items-center space-x-1">
                <span>{histHypertension ? "Y" : "-"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="w-1.5 h-2.5 fill-slate-500">
                  <path d="M27.66 224h264.7c24.6 0 36.89-29.78 19.54-47.12l-132.3-136.8c-5.406-5.406-12.47-8.107-19.53-8.107c-7.055 0-14.09 2.701-19.45 8.107L8.119 176.9C-9.229 194.2 3.055 224 27.66 224zM292.3 288H27.66c-24.6 0-36.89 29.77-19.54 47.12l132.5 136.8C145.9 477.3 152.1 480 160 480c7.053 0 14.12-2.703 19.53-8.109l132.3-136.8C329.2 317.8 316.9 288 292.3 288z"></path>
                </svg>
              </div>
            </div>
            <span className="font-bold text-[11px] text-[#4A5568] break-all">Hypertension</span>
          </div>
          <div></div>
        </div>

        {/* Alcohol */}
        <div className="flex items-center justify-between py-1 border-b border-[#F1F5F9] w-full">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setHistAlcohol(!histAlcohol)}>
            <div className={`w-8 h-8 min-w-[32px] min-h-[32px] rounded-full flex items-center justify-center border font-bold text-[11px] select-none transition-colors ${
              histAlcohol ? "bg-[#f1f5f9] border-[#cbd5e1] text-slate-800" : "bg-[#f8fafc] border-slate-200 text-slate-400"
            }`}>
              <div className="flex items-center space-x-1">
                <span>{histAlcohol ? "Y" : "-"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="w-1.5 h-2.5 fill-slate-500">
                  <path d="M27.66 224h264.7c24.6 0 36.89-29.78 19.54-47.12l-132.3-136.8c-5.406-5.406-12.47-8.107-19.53-8.107c-7.055 0-14.09 2.701-19.45 8.107L8.119 176.9C-9.229 194.2 3.055 224 27.66 224zM292.3 288H27.66c-24.6 0-36.89 29.77-19.54 47.12l132.5 136.8C145.9 477.3 152.1 480 160 480c7.053 0 14.12-2.703 19.53-8.109l132.3-136.8C329.2 317.8 316.9 288 292.3 288z"></path>
                </svg>
              </div>
            </div>
            <span className="font-bold text-[11px] text-[#4A5568] break-all">Alcohol</span>
          </div>
          <div></div>
        </div>

        {/* Tobacco */}
        <div className="flex items-center justify-between py-1 border-b border-[#F1F5F9] w-full">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setHistTobacco(!histTobacco)}>
            <div className={`w-8 h-8 min-w-[32px] min-h-[32px] rounded-full flex items-center justify-center border font-bold text-[11px] select-none transition-colors ${
              histTobacco ? "bg-[#f1f5f9] border-[#cbd5e1] text-slate-800" : "bg-[#f8fafc] border-slate-200 text-slate-400"
            }`}>
              <div className="flex items-center space-x-1">
                <span>{histTobacco ? "Y" : "-"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="w-1.5 h-2.5 fill-slate-500">
                  <path d="M27.66 224h264.7c24.6 0 36.89-29.78 19.54-47.12l-132.3-136.8c-5.406-5.406-12.47-8.107-19.53-8.107c-7.055 0-14.09 2.701-19.45 8.107L8.119 176.9C-9.229 194.2 3.055 224 27.66 224zM292.3 288H27.66c-24.6 0-36.89 29.77-19.54 47.12l132.5 136.8C145.9 477.3 152.1 480 160 480c7.053 0 14.12-2.703 19.53-8.109l132.3-136.8C329.2 317.8 316.9 288 292.3 288z"></path>
                </svg>
              </div>
            </div>
            <span className="font-bold text-[11px] text-[#4A5568] break-all">Tobacco</span>
          </div>
          <div></div>
        </div>

        {/* Smoke */}
        <div className="flex items-center justify-between py-1 border-b border-[#F1F5F9] w-full">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setHistSmoke(!histSmoke)}>
            <div className={`w-8 h-8 min-w-[32px] min-h-[32px] rounded-full flex items-center justify-center border font-bold text-[11px] select-none transition-colors ${
              histSmoke ? "bg-[#f1f5f9] border-[#cbd5e1] text-slate-800" : "bg-[#f8fafc] border-slate-200 text-slate-400"
            }`}>
              <div className="flex items-center space-x-1">
                <span>{histSmoke ? "Y" : "-"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="w-1.5 h-2.5 fill-slate-500">
                  <path d="M27.66 224h264.7c24.6 0 36.89-29.78 19.54-47.12l-132.3-136.8c-5.406-5.406-12.47-8.107-19.53-8.107c-7.055 0-14.09 2.701-19.45 8.107L8.119 176.9C-9.229 194.2 3.055 224 27.66 224zM292.3 288H27.66c-24.6 0-36.89 29.77-19.54 47.12l132.5 136.8C145.9 477.3 152.1 480 160 480c7.053 0 14.12-2.703 19.53-8.109l132.3-136.8C329.2 317.8 316.9 288 292.3 288z"></path>
                </svg>
              </div>
            </div>
            <span className="font-bold text-[11px] text-[#4A5568] break-all">Smoke</span>
          </div>
          <div></div>
        </div>
      </div>      {/* Dynamic family history list rows */}
      {familyItems.length > 0 && (
        <div className="flex items-start gap-4 py-3 border-t border-[#F1F5F9] w-full text-left">
          <div className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-[9px] font-extrabold tracking-wide uppercase shrink-0 min-w-[140px] text-center select-none">
            FAMILY HISTORY
          </div>
          
          <div className="flex flex-wrap gap-5 flex-1 min-w-0">
            {familyItems.map((item) => {
              const details = [
                item.member ? `Family Member: ${item.member}` : ""
              ].filter(Boolean).join(" | ");

              const isActive = item.status === "Yes (Active)";
              const isNo = item.status === "No (Inactive)" || item.status.toLowerCase().startsWith("no");
              let badgeText = "-";
              let badgeClass = "bg-slate-50 border-slate-200 text-slate-400";
              if (isActive) {
                badgeText = "Y";
                badgeClass = "bg-[#E6F4EA] border-[#CEEAD6] text-[#137333]";
              } else if (isNo) {
                badgeText = "N";
                badgeClass = "bg-[#FCE8E6] border-[#FAD2CF] text-[#C5221F]";
              }

              return (
                <div key={item.id} className="flex items-center gap-2">
                  <div
                    onClick={() => toggleFamilyStatus(item.id, item.status)}
                    className={`w-7 h-7 min-w-[28px] min-h-[28px] rounded-full flex items-center justify-center border font-bold text-[10px] select-none transition-colors cursor-pointer ${badgeClass}`}
                  >
                    <div className="flex items-center gap-0.5">
                      <span>{badgeText}</span>
                      <svg className="w-1.5 h-2 fill-current" viewBox="0 0 320 512">
                        <path d="M27.66 224h264.7c24.6 0 36.89-29.78 19.54-47.12l-132.3-136.8c-5.406-5.406-12.47-8.107-19.53-8.107c-7.055 0-14.09 2.701-19.45 8.107L8.119 176.9C-9.229 194.2 3.055 224 27.66 224zM292.3 288H27.66c-24.6 0-36.89 29.77-19.54 47.12l132.5 136.8C145.9 477.3 152.1 480 160 480c7.053 0 14.12-2.703 19.53-8.109l132.3-136.8C329.2 317.8 316.9 288 292.3 288z"/>
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#1E293B] leading-tight">{item.name}</p>
                    {details && <p className="text-[9.5px] text-[#8A95A5] font-semibold mt-0.5 leading-none">{details}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          
          <button
            type="button"
            onClick={onOpenFamily}
            className="px-3.5 py-1 border border-blue-400 hover:bg-blue-50 text-[10px] font-extrabold text-blue-500 rounded-full shrink-0 transition-all select-none leading-none"
          >
            + Add
          </button>
        </div>
      )}

      {/* Dynamic existing conditions list rows */}
      {conditions.length > 0 && (
        <div className="flex items-start gap-4 py-3 border-t border-[#F1F5F9] w-full text-left">
          <div className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-[9px] font-extrabold tracking-wide uppercase shrink-0 min-w-[140px] text-center select-none">
            EXISTING CONDITIONS
          </div>
          
          <div className="flex flex-wrap gap-5 flex-1 min-w-0">
            {conditions.map((cond) => {
              const details = [
                cond.since ? `Since: ${cond.since}` : ""
              ].filter(Boolean).join(" | ");

              const isActive = cond.status === "Yes (Active)";
              const isNo = cond.status === "No (Inactive)" || cond.status.toLowerCase().startsWith("no");
              let badgeText = "-";
              let badgeClass = "bg-slate-50 border-slate-200 text-slate-400";
              if (isActive) {
                badgeText = "Y";
                badgeClass = "bg-[#E6F4EA] border-[#CEEAD6] text-[#137333]";
              } else if (isNo) {
                badgeText = "N";
                badgeClass = "bg-[#FCE8E6] border-[#FAD2CF] text-[#C5221F]";
              }

              return (
                <div key={cond.id} className="flex items-center gap-2">
                  <div
                    onClick={() => toggleConditionStatus(cond.id, cond.status)}
                    className={`w-7 h-7 min-w-[28px] min-h-[28px] rounded-full flex items-center justify-center border font-bold text-[10px] select-none transition-colors cursor-pointer ${badgeClass}`}
                  >
                    <div className="flex items-center gap-0.5">
                      <span>{badgeText}</span>
                      <svg className="w-1.5 h-2 fill-current" viewBox="0 0 320 512">
                        <path d="M27.66 224h264.7c24.6 0 36.89-29.78 19.54-47.12l-132.3-136.8c-5.406-5.406-12.47-8.107-19.53-8.107c-7.055 0-14.09 2.701-19.45 8.107L8.119 176.9C-9.229 194.2 3.055 224 27.66 224zM292.3 288H27.66c-24.6 0-36.89 29.77-19.54 47.12l132.5 136.8C145.9 477.3 152.1 480 160 480c7.053 0 14.12-2.703 19.53-8.109l132.3-136.8C329.2 317.8 316.9 288 292.3 288z"/>
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#1E293B] leading-tight">{cond.name}</p>
                    {details && <p className="text-[9.5px] text-[#8A95A5] font-semibold mt-0.5 leading-none">{details}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          
          <button
            type="button"
            onClick={onOpenConditions}
            className="px-3.5 py-1 border border-blue-400 hover:bg-blue-50 text-[10px] font-extrabold text-blue-500 rounded-full shrink-0 transition-all select-none leading-none"
          >
            + Add
          </button>
        </div>
      )}      {/* Dynamic drug allergies list rows */}
      {allergies.length > 0 && (
        <div className="flex items-start gap-4 py-3 border-t border-[#F1F5F9] w-full text-left">
          <div className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-[9px] font-extrabold tracking-wide uppercase shrink-0 min-w-[140px] text-center select-none">
            DRUG ALLERGY
          </div>
          
          <div className="flex flex-wrap gap-5 flex-1 min-w-0">
            {allergies.map((item) => {
              const details = [
                item.since ? `Since: ${item.since}` : ""
              ].filter(Boolean).join(" | ");

              const isActive = item.status === "Yes (Active)";
              const isNo = item.status === "No (Inactive)" || item.status.toLowerCase().startsWith("no");
              let badgeText = "-";
              let badgeClass = "bg-slate-50 border-slate-200 text-slate-400";
              if (isActive) {
                badgeText = "Y";
                badgeClass = "bg-[#E6F4EA] border-[#CEEAD6] text-[#137333]";
              } else if (isNo) {
                badgeText = "N";
                badgeClass = "bg-[#FCE8E6] border-[#FAD2CF] text-[#C5221F]";
              }

              return (
                <div key={item.id} className="flex items-center gap-2">
                  <div
                    onClick={() => toggleAllergyStatus(item.id, item.status)}
                    className={`w-7 h-7 min-w-[28px] min-h-[28px] rounded-full flex items-center justify-center border font-bold text-[10px] select-none transition-colors cursor-pointer ${badgeClass}`}
                  >
                    <div className="flex items-center gap-0.5">
                      <span>{badgeText}</span>
                      <svg className="w-1.5 h-2 fill-current" viewBox="0 0 320 512">
                        <path d="M27.66 224h264.7c24.6 0 36.89-29.78 19.54-47.12l-132.3-136.8c-5.406-5.406-12.47-8.107-19.53-8.107c-7.055 0-14.09 2.701-19.45 8.107L8.119 176.9C-9.229 194.2 3.055 224 27.66 224zM292.3 288H27.66c-24.6 0-36.89 29.77-19.54 47.12l132.5 136.8C145.9 477.3 152.1 480 160 480c7.053 0 14.12-2.703 19.53-8.109l132.3-136.8C329.2 317.8 316.9 288 292.3 288z"/>
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#1E293B] leading-tight">{item.name}</p>
                    {details && <p className="text-[9.5px] text-[#8A95A5] font-semibold mt-0.5 leading-none">{details}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          
          <button
            type="button"
            onClick={onOpenAllergies}
            className="px-3.5 py-1 border border-blue-400 hover:bg-blue-50 text-[10px] font-extrabold text-blue-500 rounded-full shrink-0 transition-all select-none leading-none"
          >
            + Add
          </button>
        </div>
      )}

      {/* Dynamic surgical procedures list rows */}
      {procedures.length > 0 && (
        <div className="flex items-start gap-4 py-3 border-t border-[#F1F5F9] w-full text-left">
          <div className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-[9px] font-extrabold tracking-wide uppercase shrink-0 min-w-[140px] text-center select-none">
            PAST SURGICAL PROCEDURES
          </div>
          
          <div className="flex flex-wrap gap-5 flex-1 min-w-0">
            {procedures.map((proc) => {
              const details = [
                proc.date ? `Date: ${proc.date}` : ""
              ].filter(Boolean).join(" | ");

              const isActive = proc.status === "Yes (Active)";
              const isNo = proc.status === "No (Inactive)" || proc.status.toLowerCase().startsWith("no");
              let badgeText = "-";
              let badgeClass = "bg-slate-50 border-slate-200 text-slate-400";
              if (isActive) {
                badgeText = "Y";
                badgeClass = "bg-[#E6F4EA] border-[#CEEAD6] text-[#137333]";
              } else if (isNo) {
                badgeText = "N";
                badgeClass = "bg-[#FCE8E6] border-[#FAD2CF] text-[#C5221F]";
              }

              return (
                <div key={proc.id} className="flex items-center gap-2">
                  <div
                    onClick={() => toggleProcedureStatus(proc.id, proc.status)}
                    className={`w-7 h-7 min-w-[28px] min-h-[28px] rounded-full flex items-center justify-center border font-bold text-[10px] select-none transition-colors cursor-pointer ${badgeClass}`}
                  >
                    <div className="flex items-center gap-0.5">
                      <span>{badgeText}</span>
                      <svg className="w-1.5 h-2 fill-current" viewBox="0 0 320 512">
                        <path d="M27.66 224h264.7c24.6 0 36.89-29.78 19.54-47.12l-132.3-136.8c-5.406-5.406-12.47-8.107-19.53-8.107c-7.055 0-14.09 2.701-19.45 8.107L8.119 176.9C-9.229 194.2 3.055 224 27.66 224zM292.3 288H27.66c-24.6 0-36.89 29.77-19.54 47.12l132.5 136.8C145.9 477.3 152.1 480 160 480c7.053 0 14.12-2.703 19.53-8.109l132.3-136.8C329.2 317.8 316.9 288 292.3 288z"/>
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#1E293B] leading-tight">{proc.name}</p>
                    {details && <p className="text-[9.5px] text-[#8A95A5] font-semibold mt-0.5 leading-none">{details}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          
          <button
            type="button"
            onClick={onOpenProcedures}
            className="px-3.5 py-1 border border-blue-400 hover:bg-blue-50 text-[10px] font-extrabold text-blue-500 rounded-full shrink-0 transition-all select-none leading-none"
          >
            + Add
          </button>
        </div>
      )}

      {/* Dynamic current medications list rows (matching screenshot layout) */}
      {currentMeds.length > 0 && (
        <div className="flex items-start gap-4 py-3 border-t border-[#F1F5F9] w-full text-left">
          <div className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-[9px] font-extrabold tracking-wide uppercase shrink-0 min-w-[140px] text-center select-none">
            CURRENT MEDICATIONS
          </div>
          
          <div className="flex flex-wrap gap-5 flex-1 min-w-0">
            {currentMeds.map((med) => {
              const details = [
                med.since ? `Since: ${med.since}` : "",
                med.dose ? `Dose: ${med.dose}` : "",
                med.freq ? `Freq: ${med.freq}` : "",
                med.timing ? `Timing: ${med.timing}` : ""
              ].filter(Boolean).join(" | ");

              const isActive = med.status === "Yes (Active)";
              const isNo = med.status === "No (Inactive)" || med.status.toLowerCase().startsWith("no");
              let badgeText = "-";
              let badgeClass = "bg-slate-50 border-slate-200 text-slate-400";
              if (isActive) {
                badgeText = "Y";
                badgeClass = "bg-[#E6F4EA] border-[#CEEAD6] text-[#137333]";
              } else if (isNo) {
                badgeText = "N";
                badgeClass = "bg-[#FCE8E6] border-[#FAD2CF] text-[#C5221F]";
              }

              return (
                <div key={med.id} className="flex items-center gap-2">
                  <div
                    onClick={() => toggleMedStatus(med.id, med.status)}
                    className={`w-7 h-7 min-w-[28px] min-h-[28px] rounded-full flex items-center justify-center border font-bold text-[10px] select-none transition-colors cursor-pointer ${badgeClass}`}
                  >
                    <div className="flex items-center gap-0.5">
                      <span>{badgeText}</span>
                      <svg className="w-1.5 h-2 fill-current" viewBox="0 0 320 512">
                        <path d="M27.66 224h264.7c24.6 0 36.89-29.78 19.54-47.12l-132.3-136.8c-5.406-5.406-12.47-8.107-19.53-8.107c-7.055 0-14.09 2.701-19.45 8.107L8.119 176.9C-9.229 194.2 3.055 224 27.66 224zM292.3 288H27.66c-24.6 0-36.89 29.77-19.54 47.12l132.5 136.8C145.9 477.3 152.1 480 160 480c7.053 0 14.12-2.703 19.53-8.109l132.3-136.8C329.2 317.8 316.9 288 292.3 288z"/>
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#1E293B] leading-tight">{med.name}</p>
                    {details && <p className="text-[9.5px] text-[#8A95A5] font-semibold mt-0.5 leading-none">{details}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          
          <button
            type="button"
            onClick={onOpenCurrentMeds}
            className="px-3.5 py-1 border border-blue-400 hover:bg-blue-50 text-[10px] font-extrabold text-blue-500 rounded-full shrink-0 transition-all select-none leading-none"
          >
            + Add
          </button>
        </div>
      )}

      {/* History Action pills row */}
      <div className="flex items-center gap-2 flex-wrap pt-3 border-t text-[10.5px]">
        {conditions.length === 0 && (
          <button type="button" onClick={onOpenConditions} className="px-3 py-1 border border-primary/20 hover:bg-primary/5 rounded-full font-bold text-primary">+ Existing Conditions</button>
        )}
        {currentMeds.length === 0 && (
          <button type="button" onClick={onOpenCurrentMeds} className="px-3 py-1 border border-primary/20 hover:bg-primary/5 rounded-full font-bold text-primary">+ Current Medications</button>
        )}
        {familyItems.length === 0 && (
          <button type="button" onClick={onOpenFamily} className="px-3 py-1 border border-primary/20 hover:bg-primary/5 rounded-full font-bold text-primary">+ Family History</button>
        )}
        <button type="button" className="px-3 py-1 border border-primary/20 hover:bg-primary/5 rounded-full font-bold text-primary">+ Lifestyle Habit</button>
        <button type="button" className="px-3 py-1 border border-primary/20 hover:bg-primary/5 rounded-full font-bold text-primary">+ Food/Other Allergy</button>
        {allergies.length === 0 && (
          <button type="button" onClick={onOpenAllergies} className="px-3 py-1 border border-primary/20 hover:bg-primary/5 rounded-full font-bold text-primary">+ Drug Allergy</button>
        )}
        {procedures.length === 0 && (
          <button type="button" onClick={onOpenProcedures} className="px-3 py-1 border border-primary/20 hover:bg-primary/5 rounded-full font-bold text-primary">+ Past Surgical Procedures</button>
        )}
        <button type="button" className="px-3 py-1 border border-primary/20 hover:bg-primary/5 rounded-full font-bold text-primary">+ Travel History</button>
        <button type="button" className="px-3 py-1 border border-primary/20 hover:bg-primary/5 rounded-full font-bold text-primary">+ Other medical history</button>
      </div>
    </section>
  );
}
