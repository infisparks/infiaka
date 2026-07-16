"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
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
  opdRegistration?: {
    registration_id: string;
    treating_doctor?: string;
  };
}

interface DocumentRecord {
  id: string;
  patient_id: string;
  document_name: string;
  file_url: string;
  file_path: string;
  created_at: string;
}

function DocumentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rxPatientId = searchParams.get("rx") || "";

  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRxPatient, setCurrentRxPatient] = useState<Patient | null>(null);

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docName, setDocName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<DocumentRecord | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // View modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

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

  // Load Patient Detail
  useEffect(() => {
    if (!sessionLoaded || !rxPatientId) return;

    const loadPatient = async () => {
      setLoading(true);
      try {
        let uhid = "";
        let treatingDoctor = "";

        // Try checking if it's registration ID
        if (rxPatientId.match(/^\d+$/)) {
          const { data: regData, error: rError } = await supabase
            .from("aka_opd_registration")
            .select("patient_uhid, treating_doctor")
            .eq("registration_id", Number(rxPatientId))
            .maybeSingle();

          if (rError) throw rError;
          if (regData) {
            uhid = regData.patient_uhid;
            treatingDoctor = regData.treating_doctor || "";
          }
        }

        // If not found or not registration ID, treat it as direct patient UHID
        if (!uhid) {
          uhid = rxPatientId;
        }

        const { data: pData, error: pError } = await supabase
          .from("patient_detail")
          .select("*")
          .eq("uhid", uhid)
          .maybeSingle();

        if (pError) throw pError;
        if (!pData) {
          showToast("Patient record not found", "error");
          setLoading(false);
          return;
        }

        const mappedPatient: Patient = {
          patient_id: pData.patient_id,
          id: pData.uhid,
          queueNo: "01",
          title: pData.title || "Mr",
          name: pData.name,
          phone: String(pData.number || ""),
          gender: pData.gender || "Male",
          age: pData.age || 25,
          ageUnit: pData.age_unit || "Year",
          dob: pData.dob || "",
          permanentAddress: pData.address || "",
          localAddress: pData.local_address || "",
          statusTags: ["Ongoing"],
          billAmount: 0,
          paymentMethod: "Cash",
          isAbhaCreated: false,
          customTags: [],
          isCompleted: false,
          isOngoing: true,
          arrivalTime: "",
          arrivalMinutesAgo: 0,
          opdRegistration: {
            registration_id: rxPatientId.match(/^\d+$/) ? rxPatientId : "",
            treating_doctor: treatingDoctor
          }
        };

        setCurrentRxPatient(mappedPatient);
      } catch (err) {
        console.error("Error loading patient details:", err);
        showToast("Error loading patient details.", "error");
      } finally {
        setLoading(false);
      }
    };

    loadPatient();
  }, [sessionLoaded, rxPatientId]);

  // Load patient documents
  const fetchDocuments = async (uhid: string) => {
    setDocsLoading(true);
    try {
      const { data, error } = await supabase
        .from("aka_patient_documents")
        .select("*")
        .eq("patient_id", uhid)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error("Error fetching documents:", err);
      showToast("Failed to load documents list", "error");
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    if (currentRxPatient?.id) {
      fetchDocuments(currentRxPatient.id);
    }
  }, [currentRxPatient]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRxPatient) return;
    if (!docName.trim()) {
      showToast("Please enter a document name", "error");
      return;
    }
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      showToast("Please select a file to upload", "error");
      return;
    }

    setUploading(true);
    try {
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${currentRxPatient.id}/${Date.now()}_${cleanFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("patient-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("patient-documents")
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from("aka_patient_documents")
        .insert({
          patient_id: currentRxPatient.id,
          document_name: docName.trim(),
          file_url: fileUrl,
          file_path: filePath,
        });

      if (dbError) throw dbError;

      showToast("Document uploaded successfully!", "success");
      setDocName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchDocuments(currentRxPatient.id);
    } catch (err: any) {
      console.error("Error uploading document:", err);
      showToast(err.message || "Failed to upload document", "error");
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingDoc || !currentRxPatient) return;
    if (deleteConfirmText.toLowerCase() !== "confirm") {
      showToast("Please type 'confirm' to delete", "error");
      return;
    }

    try {
      const { error: dbError } = await supabase
        .from("aka_patient_documents")
        .delete()
        .eq("id", deletingDoc.id);

      if (dbError) throw dbError;

      const { error: storageError } = await supabase.storage
        .from("patient-documents")
        .remove([deletingDoc.file_path]);

      if (storageError) {
        console.warn("Storage deletion warning:", storageError);
      }

      showToast("Document deleted successfully!", "success");
      setIsDeleteModalOpen(false);
      setDeletingDoc(null);
      setDeleteConfirmText("");
      fetchDocuments(currentRxPatient.id);
    } catch (err) {
      console.error("Error deleting document:", err);
      showToast("Failed to delete document", "error");
    }
  };

  const openDeleteModal = (doc: DocumentRecord) => {
    setDeletingDoc(doc);
    setDeleteConfirmText("");
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingDoc(null);
    setDeleteConfirmText("");
  };

  const openViewModal = (doc: DocumentRecord) => {
    setViewingDoc(doc);
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
    setIsViewModalOpen(true);
  };

  const handleZoomIn = () => setZoomScale(s => Math.min(s + 0.25, 4));
  const handleZoomOut = () => setZoomScale(s => Math.max(s - 0.25, 0.25));
  const handleZoomReset = () => {
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPanPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const isImage = (url: string) => {
    const lowercase = url.toLowerCase();
    return lowercase.includes(".png") || 
           lowercase.includes(".jpg") || 
           lowercase.includes(".jpeg") || 
           lowercase.includes(".webp") || 
           lowercase.includes(".gif");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-[12px] font-bold text-slate-500">Loading patient documents...</div>
      </div>
    );
  }

  if (!currentRxPatient) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-bold text-slate-700">No Patient Loaded</p>
          <button onClick={() => router.push("/")} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F6F8] font-sans text-left">
      
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2 rounded-lg shadow-md text-xs font-semibold text-white transition-all duration-300 ${
          toast.type === "success" ? "bg-emerald-500" : toast.type === "error" ? "bg-rose-500" : "bg-blue-500"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="h-[48px] bg-white border-b border-[#E2E8F0] px-4 flex items-center justify-between shrink-0 select-none">
        
        {/* Left Info */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/")}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
            title="Back to Dashboard"
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

        {/* Tab Navigation */}
        <div className="flex items-center h-full">
          <button 
            onClick={() => router.push(`/rx/overview?rx=${rxPatientId}`)}
            className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground transition-all"
          >
            Overview
          </button>
          {userRole !== "staff" && (
            <>
              <button
                onClick={() => router.push(`/rx?rx=${rxPatientId}`)}
                className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground transition-all"
              >
                Pad
              </button>
              <button 
                onClick={() => router.push(`/rx/certificate?rx=${rxPatientId}`)}
                className="h-full px-3 text-[11px] font-bold text-[#718096] hover:text-foreground transition-all"
              >
                Medical Certificate
              </button>
            </>
          )}
          <button className="h-full px-3 text-[11px] font-bold text-primary border-b-2 border-primary">
            Documents
          </button>
        </div>

        {/* Right Session State */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-emerald-600 bg-emerald-50 text-[10px] font-extrabold rounded-md flex items-center gap-1 border border-emerald-100">
            🟢 Active Session
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-y-auto max-w-4xl w-full mx-auto flex flex-col space-y-6">
        
        {/* Document Upload Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm text-left">
          <h2 className="text-[12px] font-extrabold text-[#1E293B] uppercase tracking-wider mb-3">Upload Patient Document</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#718096] uppercase mb-1.5">Document Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Lab Report, X-Ray Summary, ECG Chart"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg text-[11px] bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 placeholder:text-slate-350 font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#718096] uppercase mb-1.5">Select File (PDF or Image) *</label>
                <div className="flex items-center h-9 px-3 border border-[#E2E8F0] rounded-lg bg-white">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,application/pdf"
                    className="w-full text-[11px] text-slate-500 file:mr-3 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-extrabold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={uploading}
                className="h-9 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-[11px] font-extrabold tracking-wide transition-colors flex items-center gap-2 shadow-sm"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    <span>Upload Document</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Uploaded Documents List Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex-1 flex flex-col min-h-[300px] text-left">
          <h2 className="text-[12px] font-extrabold text-[#1E293B] uppercase tracking-wider mb-4">Patient Document History</h2>
          
          {docsLoading ? (
            <div className="flex-1 flex items-center justify-center text-[12px] font-bold text-slate-400">
              Loading document list...
            </div>
          ) : documents.length === 0 ? (
            <div className="flex-1 border-2 border-dashed border-[#E2E8F0] rounded-xl flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <span className="text-3xl mb-2.5">📂</span>
              <span className="text-[12px] font-bold text-slate-500">No documents found.</span>
              <span className="text-[10px] text-slate-350 mt-1 max-w-[280px]">Upload reports, prescriptions, or summary files for this patient using the form above.</span>
            </div>
          ) : (
            <div className="border border-[#E2E8F0] rounded-xl divide-y divide-[#E2E8F0] overflow-hidden bg-white">
              {documents.map((doc) => {
                const uploadDate = new Date(doc.created_at).toLocaleDateString([], {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });
                const isImg = isImage(doc.file_url);

                return (
                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-[#FAFBFC] transition-colors gap-4">
                    
                    {/* Small print preview */}
                    <div className="flex items-center gap-4 flex-1">
                      {isImg ? (
                        <div onClick={() => openViewModal(doc)} className="shrink-0 group relative cursor-zoom-in" title="Click to view document">
                          <img
                            src={doc.file_url}
                            alt={doc.document_name}
                            className="w-16 h-16 rounded-lg object-cover border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-sm transition-all"
                          />
                          <div className="absolute inset-0 bg-black/40 text-white text-[9px] font-bold flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            View 🔍
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => openViewModal(doc)} className="w-16 h-16 rounded-lg bg-rose-50 text-rose-600 flex flex-col items-center justify-center border border-rose-100 text-[9px] font-extrabold select-none leading-tight shrink-0 cursor-zoom-in" title="Click to view PDF">
                          <span className="text-xl">📄</span>
                          <span>PDF</span>
                        </div>
                      )}
                      <div>
                        <p className="text-[12px] font-bold text-[#1E293B]">{doc.document_name}</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">Uploaded: {uploadDate}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openViewModal(doc)}
                        className="h-8 px-3.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] rounded-lg text-[10.5px] font-extrabold tracking-wide transition-colors flex items-center gap-1.5"
                      >
                        <span>👁️</span>
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(doc)}
                        className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                        title="Delete Document"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Popup Modal */}
      {isDeleteModalOpen && deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 text-left space-y-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Confirm Deletion</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Are you sure you want to delete document <strong className="text-slate-700">"{deletingDoc.document_name}"</strong>?
              </p>
            </div>
            
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">
                Type <strong className="text-indigo-600 font-extrabold">confirm</strong> to delete:
              </label>
              <input
                type="text"
                placeholder="Type 'confirm'"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full h-8 px-2.5 border border-slate-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-100 rounded-md text-[11px] bg-white focus:outline-none placeholder:text-slate-350 font-bold"
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={closeDeleteModal}
                className="h-8 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10.5px] font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirmText.toLowerCase() !== "confirm"}
                className="h-8 px-3.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-lg text-[10.5px] font-extrabold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal with Zoom In/Out */}
      {isViewModalOpen && viewingDoc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 text-left select-none">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between p-3.5 bg-slate-900 border-b border-slate-800 text-white select-none shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xl">📄</span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide">{viewingDoc.document_name}</h3>
                <p className="text-[10px] text-slate-400">Patient Document Preview</p>
              </div>
            </div>

            {/* Zoom Controls (only for images) */}
            {isImage(viewingDoc.file_url) && (
              <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-2.5 py-1">
                <button 
                  type="button"
                  onClick={handleZoomOut}
                  className="text-slate-400 hover:text-white font-extrabold text-sm px-1.5 transition-colors"
                  title="Zoom Out"
                >
                  ➖
                </button>
                <span className="text-[11px] font-bold text-slate-300 w-12 text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button 
                  type="button"
                  onClick={handleZoomIn}
                  className="text-slate-400 hover:text-white font-extrabold text-sm px-1.5 transition-colors"
                  title="Zoom In"
                >
                  ➕
                </button>
                <button 
                  type="button"
                  onClick={handleZoomReset}
                  className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-0.5 rounded font-bold transition-all ml-1.5"
                >
                  Reset
                </button>
              </div>
            )}

            <button 
              type="button"
              onClick={() => { setIsViewModalOpen(false); setViewingDoc(null); }}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all text-xs font-extrabold"
            >
              ✕
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 bg-slate-950 overflow-hidden flex items-center justify-center p-2 relative">
            {isImage(viewingDoc.file_url) ? (
              <div 
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`w-full h-full flex items-center justify-center overflow-hidden relative select-none ${
                  isDragging ? "cursor-grabbing" : "cursor-grab"
                }`}
                title="Click and drag to pan"
              >
                <img 
                  src={viewingDoc.file_url} 
                  alt={viewingDoc.document_name}
                  draggable={false}
                  style={{ 
                    transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomScale})`, 
                    transformOrigin: "center center" 
                  }}
                  className="max-w-full max-h-full object-contain transition-transform duration-75 ease-out select-none"
                />
              </div>
            ) : (
              <iframe 
                src={`${viewingDoc.file_url}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-full bg-white border-0"
                title="PDF Document Viewer"
              />
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-[12px] font-bold text-slate-500">Loading documents component...</div>
      </div>
    }>
      <DocumentsPageContent />
    </Suspense>
  );
}
