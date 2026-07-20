"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, getUserRole } from "@/lib/supabase";

interface Patient {
  patient_id?: number;
  id: string;
  name: string;
  phone: string;
  gender: string;
  age: number;
  opdRegistration?: {
    registration_id: string;
    appointment_date_time?: string;
    clinic_name?: string;
    treating_doctor?: string;
  };
}

interface Point {
  x: number;
  y: number;
}

interface DrawingLine {
  id: string;
  points: Point[];
  color: string;
  width: number;
  isErased: boolean;
}

const COLOR_PRESETS = [
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#DC2626" },
  { name: "Blue", value: "#2563EB" },
  { name: "Green", value: "#16A34A" },
  { name: "Orange", value: "#EA580C" },
  { name: "Purple", value: "#9333EA" },
  { name: "Brown", value: "#78350F" },
];

const STROKE_WIDTHS = [2, 4, 6, 8, 12, 16];

export default function CanvasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-[#F5F6F8] font-sans select-none">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Canvas Workspace...</p>
          </div>
        </div>
      }
    >
      <CanvasPageContent />
    </Suspense>
  );
}

function CanvasPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rxPatientId = searchParams.get("rx") || "";

  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRxPatient, setCurrentRxPatient] = useState<Patient | null>(null);
  const [pastVisitsCount, setPastVisitsCount] = useState<number>(0);
  const [legacyVisitsCount, setLegacyVisitsCount] = useState<number>(0);

  // Drawing States
  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [currentColor, setCurrentColor] = useState<string>("#000000");
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentLine, setCurrentLine] = useState<DrawingLine | null>(null);
  const [templateImageUrl, setTemplateImageUrl] = useState<string>("/letterhead.jpg");

  // Viewport Transform States (Pan & Pinch Zoom)
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);

  // Full Screen & Header Visibility & iPad modal
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
  const [showIpadTip, setShowIpadTip] = useState<boolean>(false);

  // Modals & Notifications
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  // Touch gesture refs
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1.0);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
  }, [router]);

  // Suppress iPad Safari text selection globally on selectionchange
  useEffect(() => {
    const preventSelection = () => {
      if (typeof window !== "undefined" && window.getSelection) {
        const sel = window.getSelection();
        if (sel) sel.removeAllRanges();
      }
    };

    document.addEventListener("selectionchange", preventSelection);
    return () => document.removeEventListener("selectionchange", preventSelection);
  }, []);

  // Attach non-passive touch listeners to canvas to prevent iOS Safari drag-select
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventTouchSelect = (e: TouchEvent | PointerEvent) => {
      if (typeof window !== "undefined" && window.getSelection) {
        const sel = window.getSelection();
        if (sel) sel.removeAllRanges();
      }
    };

    canvas.addEventListener("touchstart", preventTouchSelect, { passive: false });
    canvas.addEventListener("touchmove", preventTouchSelect, { passive: false });
    canvas.addEventListener("pointerdown", preventTouchSelect, { passive: false });
    canvas.addEventListener("pointermove", preventTouchSelect, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", preventTouchSelect);
      canvas.removeEventListener("touchmove", preventTouchSelect);
      canvas.removeEventListener("pointerdown", preventTouchSelect);
      canvas.removeEventListener("pointermove", preventTouchSelect);
    };
  }, []);

  // Listen for native fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      } else {
        setIsFullscreen(true);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Fetch header counts
  const fetchHeaderCounts = async (patientUhid: string, currentRegId: string | number, name: string, phone: any) => {
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

      if (name || phone) {
        const cleanPhone = String(phone || "").replace(/\D/g, "");
        let query = supabase.from("legacy_patients").select("*", { count: "exact", head: true });
        
        let orClause = "";
        if (name) orClause += `name.ilike.*${name.trim()}*`;
        if (cleanPhone) {
          if (orClause) orClause += ",";
          orClause += `phone.ilike.*${cleanPhone}*`;
        }
        
        if (orClause) {
          query = query.or(orClause);
        }
        
        const { count: legacyCount, error: legacyErr } = await query;
        if (!legacyErr && legacyCount !== null) {
          setLegacyVisitsCount(legacyCount);
        }
      }
    } catch (e) {
      console.error("Error fetching header counts:", e);
    }
  };

  // Load patient context and saved canvas data
  useEffect(() => {
    if (!sessionLoaded || !rxPatientId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const { data: regData, error: rError } = await supabase
          .from("aka_opd_registration")
          .select("*")
          .eq("registration_id", rxPatientId)
          .maybeSingle();

        if (rError) throw rError;
        if (!regData) {
          setCurrentRxPatient(null);
          setLoading(false);
          return;
        }

        const patientUhid = regData.patient_uhid;
        const { data: pData, error: pError } = await supabase
          .from("patient_detail")
          .select("*")
          .eq("uhid", patientUhid)
          .maybeSingle();

        if (pError) throw pError;

        const mappedPatient: Patient = {
          patient_id: pData?.patient_id,
          id: pData?.uhid || patientUhid,
          name: pData?.name || "Patient",
          phone: String(pData?.number || ""),
          gender: pData?.gender || "Male",
          age: pData?.age || 0,
          opdRegistration: {
            registration_id: regData.registration_id,
            appointment_date_time: regData.appointment_date_time,
            clinic_name: regData.clinic_name,
            treating_doctor: regData.treating_doctor,
          },
        };

        setCurrentRxPatient(mappedPatient);
        fetchHeaderCounts(patientUhid, rxPatientId, pData?.name || "", pData?.number || "");

        // Load Canvas Data from Supabase
        if (regData.canvas_data) {
          try {
            const parsed = typeof regData.canvas_data === "string" ? JSON.parse(regData.canvas_data) : regData.canvas_data;
            if (Array.isArray(parsed)) {
              setLines(parsed);
            } else if (parsed.lines && Array.isArray(parsed.lines)) {
              setLines(parsed.lines);
              if (parsed.templateUrl) setTemplateImageUrl(parsed.templateUrl);
            }
          } catch (e) {
            console.error("Error parsing canvas data from DB:", e);
          }
        } else {
          // Fallback to local storage
          const savedLocal = localStorage.getItem(`saved_canvas_${rxPatientId}`);
          if (savedLocal) {
            try {
              const parsed = JSON.parse(savedLocal);
              if (Array.isArray(parsed)) setLines(parsed);
            } catch (e) {
              console.error("Error reading local canvas:", e);
            }
          }
        }
      } catch (err) {
        console.error("Error loading patient data for canvas:", err);
        showToast("Failed to load patient information", "error");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sessionLoaded, rxPatientId]);

  // Redraw Canvas whenever lines or currentLine changes
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allLines = currentLine ? [...lines, currentLine] : lines;

    allLines.forEach((line) => {
      if (!line.points || line.points.length < 1) return;

      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = line.width || 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 1.0;

      if (line.isErased) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        const strokeColor = line.color && line.color !== "" ? line.color : "#000000";
        ctx.strokeStyle = strokeColor;
      }

      ctx.moveTo(line.points[0].x, line.points[0].y);

      if (line.points.length === 1) {
        ctx.lineTo(line.points[0].x + 0.1, line.points[0].y + 0.1);
      } else {
        for (let i = 1; i < line.points.length; i++) {
          ctx.lineTo(line.points[i].x, line.points[i].y);
        }
      }

      ctx.stroke();
      ctx.restore();
    });
  };

  useEffect(() => {
    renderCanvas();
  }, [lines, currentLine]);

  // Clear accidental browser text highlights (Palm Rejection)
  const suppressTextSelection = () => {
    if (typeof window !== "undefined" && window.getSelection) {
      const sel = window.getSelection();
      if (sel) sel.removeAllRanges();
    }
  };

  // Transform Screen Point to Fixed Canvas Resolution (1000 x 1414)
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement> | any): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("clientX" in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return null;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Check if pointer input is S-Pen / Stylus or Desktop Mouse (Finger touches return false)
  const isPenOrStylusInput = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "pen") return true;
    if (e.pointerType === "mouse") return true; // Allows mouse drawing on desktop
    return false;
  };

  // Pointer Down (Drawing Handler - Only S-Pen / Pen / Mouse)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    suppressTextSelection();
    // If it's a finger touch, DO NOT WRITE/DRAW! Hand touches handle Pan & Zoom.
    if (!isPenOrStylusInput(e)) return;

    e.preventDefault();
    const pt = getCanvasPoint(e);
    if (!pt) return;

    setIsDrawing(true);
    const newLine: DrawingLine = {
      id: String(Date.now()),
      points: [pt],
      color: currentColor,
      width: isErasing ? strokeWidth * 6 : strokeWidth,
      isErased: isErasing,
    };
    setCurrentLine(newLine);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentLine) return;
    if (!isPenOrStylusInput(e)) return;

    suppressTextSelection();
    e.preventDefault();
    const pt = getCanvasPoint(e);
    if (!pt) return;

    setCurrentLine((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, pt],
      };
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    suppressTextSelection();
    e.preventDefault();
    setIsDrawing(false);
    if (currentLine && currentLine.points.length > 0) {
      const updated = [...lines, currentLine];
      setLines(updated);
      localStorage.setItem(`saved_canvas_${rxPatientId}`, JSON.stringify(updated));
    }
    setCurrentLine(null);
  };

  // ─── Touch Gestures: 1 Finger Pan & 2 Finger Pinch Zoom ───
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    suppressTextSelection();
    // If drawing with S-Pen, don't pan
    if (isDrawing) return;

    if (e.touches.length === 1) {
      // 1 Finger: Move / Pan Page
      setIsPanning(true);
      panStartRef.current = {
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y,
      };
    } else if (e.touches.length === 2) {
      // 2 Fingers: Pinch Zoom In/Out
      setIsPanning(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = zoomScale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    suppressTextSelection();
    if (isDrawing) return;

    if (e.touches.length === 1 && isPanning) {
      // Pan Offset Update
      setPanOffset({
        x: e.touches[0].clientX - panStartRef.current.x,
        y: e.touches[0].clientY - panStartRef.current.y,
      });
    } else if (e.touches.length === 2 && pinchStartDistRef.current) {
      // Pinch Zoom Scale Update
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(
        Math.max(pinchStartScaleRef.current * (dist / pinchStartDistRef.current), 0.3),
        3.5
      );
      setZoomScale(newScale);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    suppressTextSelection();
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsPanning(false);
    }
  };

  // Mouse Wheel / Trackpad Pinch Zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.buttons === 0) {
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoomScale((prev) => Math.min(Math.max(prev + delta, 0.3), 3.5));
    }
  };

  // Reset View / Auto Fit Function
  const handleResetView = () => {
    setZoomScale(1.0);
    setPanOffset({ x: 0, y: 0 });
    showToast("Paper view reset to 100%", "info");
  };

  // Toggle Fullscreen & Collapsible Header Mode
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => {
          setIsFullscreen(true);
          setIsHeaderVisible(false); // Hide header to maximize drawing area
          showToast("Full Screen Mode Enabled (Header Collapsed)", "info");
        }).catch(() => {
          setIsHeaderVisible(!isHeaderVisible);
          setShowIpadTip(true);
        });
      } else {
        // iPad Safari unsupported requestFullscreen fallback
        setIsHeaderVisible(!isHeaderVisible);
        setShowIpadTip(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
      setIsHeaderVisible(true);
    }
  };

  // Actions
  const handleUndo = () => {
    if (lines.length === 0) return;
    const updated = lines.slice(0, lines.length - 1);
    setLines(updated);
    localStorage.setItem(`saved_canvas_${rxPatientId}`, JSON.stringify(updated));
  };

  const handleClearAll = () => {
    setLines([]);
    localStorage.removeItem(`saved_canvas_${rxPatientId}`);
    setIsClearModalOpen(false);
    showToast("Canvas cleared", "info");
  };

  const handleSaveData = async () => {
    if (!rxPatientId) return;
    setSaving(true);
    try {
      const payload = {
        lines,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("aka_opd_registration")
        .update({ canvas_data: payload })
        .eq("registration_id", rxPatientId);

      if (error) throw error;

      localStorage.setItem(`saved_canvas_${rxPatientId}`, JSON.stringify(lines));
      showToast("Canvas Drawing Saved Successfully!");
    } catch (err: any) {
      console.error("Error saving canvas data:", err);
      showToast(err.message || "Failed to save canvas drawing", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePrintPdf = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Pop-up blocked. Please allow pop-ups to print.", "error");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Canvas Drawing - ${currentRxPatient?.name || "Patient"}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; width: 210mm; height: 297mm; position: relative; background: white; }
            .bg-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; z-index: 1; }
            .drawing-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; z-index: 2; }
          </style>
        </head>
        <body>
          <img src="/letterhead.jpg" class="bg-img" />
          <img src="${dataUrl}" class="drawing-img" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F6F8] font-sans select-none">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Patient Canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden font-sans select-none canvas-no-select"
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-xl text-xs font-bold flex items-center gap-2 transition-all ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : toast.type === "error"
              ? "bg-rose-600 text-white"
              : "bg-slate-800 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Floating Restore Header Button (When Header is Collapsed) */}
      {!isHeaderVisible && (
        <button
          onClick={() => setIsHeaderVisible(true)}
          className="fixed top-3 right-4 z-40 px-3 py-1.5 bg-slate-900/85 hover:bg-slate-900 text-white rounded-full text-xs font-bold shadow-xl backdrop-blur-md flex items-center gap-1.5 transition-all select-none"
          title="Show Navigation Header"
        >
          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          Show Header
        </button>
      )}

      {/* HEADER BAR (Collapsible for Max Drawing Space) */}
      {isHeaderVisible && (
        <header className="h-12 bg-white border-b border-[#E2E8F0] px-4 flex items-center justify-between shrink-0 z-20 transition-all select-none canvas-no-select">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              title="Back to Patients List"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            {currentRxPatient ? (
              <div className="text-left leading-tight">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-slate-900 select-none">{currentRxPatient.name}</span>
                  <span className="text-[11px] font-medium text-[#718096] select-none">
                    {currentRxPatient.age}y | {currentRxPatient.gender}
                  </span>
                </div>
                <span className="text-[9px] text-[#A0AEC0] font-semibold tracking-tight select-none">
                  {currentRxPatient.phone}
                </span>
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-700 select-none">Patient Canvas</span>
            )}
          </div>

          {/* Navigation tab bar in the center */}
          <div className="flex items-center h-full select-none">
            <button
              onClick={() => router.push(`/rx/overview?rx=${rxPatientId}`)}
              className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground transition-all select-none"
            >
              Overview {pastVisitsCount > 0 ? `(${pastVisitsCount})` : `(0)`}
            </button>
            {userRole !== "staff" && (
              <button
                onClick={() => router.push(`/rx?rx=${rxPatientId}`)}
                className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground transition-all select-none"
              >
                Pad
              </button>
            )}
            <button className="h-full px-3 text-[11px] font-bold text-indigo-600 border-b-2 border-indigo-600 select-none">
              Canvas
            </button>
            <button
              onClick={() => router.push(`/rx/ekacare?rx=${rxPatientId}`)}
              className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground transition-all select-none"
            >
              EkaCare Old Data{legacyVisitsCount > 0 ? ` (${legacyVisitsCount} found)` : ""}
            </button>
            <button
              onClick={() => router.push(`/rx/certificate?rx=${rxPatientId}`)}
              className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground transition-all select-none"
            >
              Medical Certificate
            </button>
            <button
              onClick={() => router.push(`/rx/documents?rx=${rxPatientId}`)}
              className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground transition-all select-none"
            >
              Documents
            </button>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 select-none">
            <span className="px-2.5 py-1 text-emerald-600 bg-emerald-50 text-[10px] font-extrabold rounded-md flex items-center gap-1 border border-emerald-100 select-none">
              🟢 Active Session
            </span>
          </div>
        </header>
      )}

      {/* CANVAS TOOLBAR */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm z-10 select-none canvas-no-select">
        {/* Colors & Pen/Eraser Tools */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Color:</span>
          {COLOR_PRESETS.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                setCurrentColor(c.value);
                setIsErasing(false);
              }}
              style={{ backgroundColor: c.value }}
              className={`w-6 h-6 rounded-full transition-transform border border-black/10 ${
                currentColor === c.value && !isErasing
                  ? "ring-2 ring-offset-2 ring-indigo-600 scale-110"
                  : "hover:scale-105 opacity-90"
              }`}
              title={c.name}
            />
          ))}

          <div className="h-5 w-px bg-slate-200 mx-2" />

          {/* Tool Mode: Pen / Eraser */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsErasing(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                !isErasing
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              title="S-Pen / Pen tool"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              S-Pen Mode
            </button>

            <button
              onClick={() => setIsErasing(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                isErasing
                  ? "bg-rose-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              title="Eraser tool"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eraser
            </button>
          </div>
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Size:</span>
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setStrokeWidth(w)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                strokeWidth === w
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        {/* Controls: Full Screen, Auto Fit, Undo, Clear, Save, Print */}
        <div className="flex items-center gap-2">
          {/* FULL SCREEN & MAX SCREEN TOGGLE */}
          <button
            onClick={toggleFullScreen}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
              isFullscreen || !isHeaderVisible
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
            title="Toggle Full Screen (Hides Browser Bar & Header for Maximum Screen Space)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isFullscreen || !isHeaderVisible ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 0m-5 0l0 5m11 0l5-5m0 0l-5 0m5 0l0 5M9 15l-5 5m0 0l5 0m-5 0l0-5m11 0l5 5m0 0l-5 0m5 0l0-5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
            {isFullscreen || !isHeaderVisible ? "Exit Fullscreen" : "Full Screen"}
          </button>

          {/* AUTO FIT / RESET VIEWPORT BUTTON */}
          <button
            onClick={handleResetView}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            title="Auto adjust full paper to screen size (Reset Zoom & Pan)"
          >
            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Auto Fit
          </button>

          <button
            onClick={handleUndo}
            disabled={lines.length === 0}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
            title="Undo last stroke"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Undo
          </button>

          <button
            onClick={() => setIsClearModalOpen(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-transparent hover:border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
            title="Clear canvas"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear All
          </button>

          <button
            onClick={handleSaveData}
            disabled={saving}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )}
            Save
          </button>

          <button
            onClick={handlePrintPdf}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / PDF
          </button>
        </div>
      </div>

      {/* CANVAS WORKSPACE AREA (Interactive Pan & Pinch-Zoom Container) */}
      <main
        ref={workspaceRef}
        onContextMenu={(e) => e.preventDefault()}
        className="flex-1 overflow-hidden p-4 flex justify-center items-center bg-[#E2E8F0] relative select-none touch-none canvas-no-select"
        style={{
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={containerRef}
          className="relative bg-white shadow-2xl rounded-md border border-slate-300 overflow-hidden origin-center transition-transform duration-75 select-none canvas-no-select"
          style={{
            width: "800px",
            height: "1131px",
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          {/* Letterhead Background Template */}
          <img
            src="/letterhead.jpg"
            alt="Letterhead Template"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none opacity-95 canvas-no-select"
            draggable={false}
          />

          {/* HTML5 Canvas (Resolution 1000 x 1414) */}
          <canvas
            ref={canvasRef}
            width={1000}
            height={1414}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="w-full h-full cursor-crosshair touch-none relative z-10 select-none canvas-no-select"
            style={{
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
            }}
          />
        </div>
      </main>

      {/* IPAD FULLSCREEN & PWA INSTRUCTIONS MODAL */}
      {showIpadTip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="text-base">📱</span> iPad Full Screen Setup
              </h3>
              <button
                onClick={() => setShowIpadTip(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-md"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p className="font-semibold text-slate-800">
                To hide Safari's top URL & address bar completely on iPad:
              </p>
              <ol className="list-decimal pl-4 space-y-2 font-medium text-slate-700">
                <li>Tap Safari's <span className="font-bold text-indigo-600">Share Icon</span> (top right of Safari).</li>
                <li>Scroll down and tap <span className="font-bold text-indigo-600">'Add to Home Screen'</span>.</li>
                <li>Launch <strong>Infi Canvas</strong> directly from your iPad Home Screen!</li>
              </ol>
              <div className="text-[11px] text-slate-600 bg-indigo-50/80 p-3 rounded-lg border border-indigo-100 mt-2">
                ✨ Opening from your iPad Home Screen runs Canvas in <strong>100% Fullscreen native app mode</strong> with zero Safari browser bars!
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowIpadTip(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR CANVAS CONFIRMATION MODAL */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Clear Canvas</h3>
                <p className="text-xs text-slate-500">Are you sure you want to delete everything?</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                No, Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
