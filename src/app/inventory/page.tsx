"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

interface Vendor {
  id: number;
  name: string;
  address: string;
  phone_no: string;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  vendor_id: number | null;
  qty: number;
  selling_price: number;
  created_at: string;
  vendor?: {
    name: string;
  };
}

interface Purchase {
  id: number;
  product_id: number;
  vendor_id: number | null;
  qty: number;
  purchase_price: number;
  purchase_date: string;
  slip_url?: string;
  transaction_type?: "purchase" | "return";
  created_at: string;
  product?: {
    name: string;
  };
  vendor?: {
    name: string;
  };
}

interface HistoryItem {
  id: string | number;
  type: "purchase" | "return" | "sale";
  date: string;
  qty: number;
  price: number;
  detail: string;
  slip_url?: string;
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"products" | "vendors" | "purchases">("products");
  
  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: "", vendor_id: "", qty: 0, selling_price: 0 });

  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorForm, setVendorForm] = useState({ name: "", address: "", phone_no: "" });

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ product_id: "", vendor_id: "", qty: 1, purchase_price: 0, purchase_date: new Date().toISOString().split('T')[0], slip_url: "", transaction_type: "purchase" as "purchase" | "return" });

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load Vendors
      const { data: vData, error: vError } = await supabase
        .from("aka_inventory_vendors")
        .select("*")
        .order("name", { ascending: true });
      if (vError) throw vError;
      setVendors(vData || []);

      // 2. Load Products with Vendor details
      const { data: pData, error: pError } = await supabase
        .from("aka_inventory_products")
        .select(`
          *,
          vendor:aka_inventory_vendors(name)
        `)
        .order("name", { ascending: true });
      if (pError) throw pError;
      setProducts(pData || []);

      // 3. Load Purchases with Product & Vendor details
      const startRange = `${filterStartDate}T00:00:00+05:30`;
      const endRange = `${filterEndDate}T23:59:59+05:30`;
      const { data: purData, error: purError } = await supabase
        .from("aka_inventory_purchases")
        .select(`
          *,
          product:aka_inventory_products(name),
          vendor:aka_inventory_vendors(name)
        `)
        .gte("purchase_date", startRange)
        .lte("purchase_date", endRange)
        .order("purchase_date", { ascending: false });
      if (purError) throw purError;
      setPurchases(purData || []);

    } catch (err: any) {
      console.error("Error loading inventory data:", err);
      showToast(err.message || "Failed to load data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStartDate, filterEndDate]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Vendor Form Action Handlers
  const handleOpenVendorModal = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setVendorForm({ name: vendor.name, address: vendor.address || "", phone_no: vendor.phone_no || "" });
    } else {
      setEditingVendor(null);
      setVendorForm({ name: "", address: "", phone_no: "" });
    }
    setIsVendorModalOpen(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name.trim()) return;

    try {
      if (editingVendor) {
        // Update Vendor
        const { error } = await supabase
          .from("aka_inventory_vendors")
          .update({
            name: vendorForm.name.trim(),
            address: vendorForm.address.trim(),
            phone_no: vendorForm.phone_no.trim(),
          })
          .eq("id", editingVendor.id);
        if (error) throw error;
        showToast("Vendor updated successfully.");
      } else {
        // Insert Vendor
        const { error } = await supabase
          .from("aka_inventory_vendors")
          .insert({
            name: vendorForm.name.trim(),
            address: vendorForm.address.trim(),
            phone_no: vendorForm.phone_no.trim(),
          });
        if (error) throw error;
        showToast("Vendor added successfully.");
      }
      setIsVendorModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Error saving vendor.", "error");
    }
  };

  const handleDeleteVendor = async (id: number) => {
    const hasProducts = products.some(p => p.vendor_id === id);
    if (hasProducts) {
      showToast("Cannot delete vendor. First delete all products associated with this vendor.", "error");
      return;
    }

    const confirmText = prompt("Are you sure you want to delete this vendor? To proceed, type 'confirm':");
    if (confirmText !== "confirm") {
      showToast("Deletion cancelled: 'confirm' was not typed.", "error");
      return;
    }

    try {
      const { error } = await supabase
        .from("aka_inventory_vendors")
        .delete()
        .eq("id", id);
      if (error) throw error;
      showToast("Vendor deleted successfully.");
      loadData();
    } catch (err: any) {
      showToast(err.message || "Error deleting vendor.", "error");
    }
  };

  // Product Form Action Handlers
  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        vendor_id: product.vendor_id ? String(product.vendor_id) : "",
        qty: product.qty,
        selling_price: product.selling_price,
      });
    } else {
      setEditingProduct(null);
      setProductForm({ name: "", vendor_id: "", qty: 0, selling_price: 0 });
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.vendor_id) {
      showToast("Medicine name and Vendor selection are required.", "error");
      return;
    }

    try {
      const payload: any = {
        name: productForm.name.trim(),
        vendor_id: productForm.vendor_id ? Number(productForm.vendor_id) : null,
        selling_price: Number(productForm.selling_price),
      };

      if (editingProduct) {
        // Update Product (do not overwrite quantity)
        const { error } = await supabase
          .from("aka_inventory_products")
          .update(payload)
          .eq("id", editingProduct.id);
        if (error) throw error;
        showToast("Product updated successfully.");
      } else {
        // Insert Product (default quantity to 0)
        payload.qty = 0;
        const { error } = await supabase
          .from("aka_inventory_products")
          .insert(payload);
        if (error) throw error;
        showToast("Product added successfully.");
      }
      setIsProductModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Error saving product.", "error");
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const confirmText = prompt("Are you sure you want to delete this product? All purchase logs associated with it will be deleted. To proceed, type 'confirm':");
    if (confirmText !== "confirm") {
      showToast("Deletion cancelled: 'confirm' was not typed.", "error");
      return;
    }
    try {
      const { error } = await supabase
        .from("aka_inventory_products")
        .delete()
        .eq("id", id);
      if (error) throw error;
      showToast("Product deleted successfully.");
      loadData();
    } catch (err: any) {
      showToast(err.message || "Error deleting product.", "error");
    }
  };

  // Purchase Action Handlers
  const handleOpenPurchaseModal = () => {
    const firstProd = products.length > 0 ? products[0] : null;
    setPurchaseForm({
      product_id: firstProd ? String(firstProd.id) : "",
      vendor_id: firstProd && firstProd.vendor_id ? String(firstProd.vendor_id) : "",
      qty: 10,
      purchase_price: 0,
      purchase_date: new Date().toISOString().split('T')[0],
      slip_url: "",
      transaction_type: "purchase"
    });
    setIsPurchaseModalOpen(true);
  };

  const handleUploadSlip = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `slips/${fileName}`;

      const { error } = await supabase.storage
        .from("purchase-slips")
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("purchase-slips")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error("Error uploading file:", err);
      showToast(err.message || "Failed to upload purchase slip.", "error");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.product_id) return;

    try {
      const { error } = await supabase
        .from("aka_inventory_purchases")
        .insert({
          product_id: Number(purchaseForm.product_id),
          vendor_id: purchaseForm.vendor_id ? Number(purchaseForm.vendor_id) : null,
          qty: Number(purchaseForm.qty),
          purchase_price: Number(purchaseForm.purchase_price),
          purchase_date: new Date(purchaseForm.purchase_date).toISOString(),
          slip_url: purchaseForm.slip_url.trim() || null,
          transaction_type: purchaseForm.transaction_type
        });
      if (error) throw error;
      showToast("Purchase recorded. Product stock automatically updated!");
      setIsPurchaseModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Error saving purchase.", "error");
    }
  };

  const handleDeletePurchase = async (id: number) => {
    const confirmText = prompt("Are you sure you want to delete this purchase/return log? Stock levels will be adjusted. To proceed, type 'confirm':");
    if (confirmText !== "confirm") {
      showToast("Deletion cancelled: 'confirm' was not typed.", "error");
      return;
    }
    try {
      const { error } = await supabase
        .from("aka_inventory_purchases")
        .delete()
        .eq("id", id);
      if (error) throw error;
      showToast("Log deleted and stock adjusted.");
      loadData();
    } catch (err: any) {
      showToast(err.message || "Error deleting purchase.", "error");
    }
  };

  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<Product | null>(null);
  const [historyLogs, setHistoryLogs] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [historyEndDate, setHistoryEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const loadProductHistory = async (product: Product, start: string, end: string) => {
    setHistoryLoading(true);
    setHistoryLogs([]);
    
    try {
      const startRange = `${start}T00:00:00+05:30`;
      const endRange = `${end}T23:59:59+05:30`;

      // 1. Fetch vendor purchases/returns for this product within date range
      const { data: purchaseData, error: pError } = await supabase
        .from("aka_inventory_purchases")
        .select(`
          id,
          qty,
          purchase_price,
          purchase_date,
          slip_url,
          transaction_type,
          vendor:aka_inventory_vendors(name)
        `)
        .eq("product_id", product.id)
        .gte("purchase_date", startRange)
        .lte("purchase_date", endRange)
        .order("purchase_date", { ascending: false });

      if (pError) throw pError;

      const purchaseItems: HistoryItem[] = (purchaseData || []).map(p => ({
        id: p.id,
        type: p.transaction_type === "return" ? "return" : "purchase",
        date: p.purchase_date,
        qty: p.qty,
        price: p.purchase_price,
        detail: p.transaction_type === "return" 
          ? `Returned to Vendor: ${(p.vendor as any)?.name || "Unknown"}` 
          : `Purchased from Vendor: ${(p.vendor as any)?.name || "Unknown"}`,
        slip_url: p.slip_url
      }));

      // 2. Fetch sales from registrations within date range
      const { data: bookingData, error: bError } = await supabase
        .from("aka_opd_registration")
        .select("registration_id, appointment_date_time, services, patient_uhid")
        .gte("appointment_date_time", startRange)
        .lte("appointment_date_time", endRange)
        .or("is_deleted.is.null,is_deleted.eq.false");

      if (bError) throw bError;

      // Filter and map matching registrations
      const matchingRegs = (bookingData || []).filter(b => {
        if (!b.services || !Array.isArray(b.services)) return false;
        return b.services.some((s: any) => s.type === "product" && s.name.toLowerCase() === product.name.toLowerCase());
      });

      let saleItems: HistoryItem[] = [];
      if (matchingRegs.length > 0) {
        const matchingUhids = Array.from(new Set(matchingRegs.map(b => b.patient_uhid).filter(Boolean)));
        let patientMap: Record<string, { name: string; number: string }> = {};
        
        if (matchingUhids.length > 0) {
          const { data: patientData } = await supabase
            .from("patient_detail")
            .select("uhid, name, number")
            .in("uhid", matchingUhids);
          if (patientData) {
            patientData.forEach(p => {
              patientMap[p.uhid] = { name: p.name, number: p.number };
            });
          }
        }

        saleItems = matchingRegs.map(b => {
          const matchingService = b.services.find((s: any) => s.type === "product" && s.name.toLowerCase() === product.name.toLowerCase());
          const patientInfo = b.patient_uhid ? patientMap[b.patient_uhid] : null;
          return {
            id: `sale-${b.registration_id}`,
            type: "sale",
            date: b.appointment_date_time,
            qty: matchingService ? Number(matchingService.qty) : 1,
            price: matchingService ? Number(matchingService.fee) : 0,
            detail: `Sold to Patient: ${patientInfo ? patientInfo.name : "Unknown Patient"} (${patientInfo ? patientInfo.number : "No Phone"})`
          };
        });
      }

      // Combine and sort logs by date descending
      const combined = [...purchaseItems, ...saleItems].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setHistoryLogs(combined);
    } catch (err: any) {
      console.error("Error loading product history:", err);
      showToast(err.message || "Failed to load product history.", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistoryDrawer = (product: Product) => {
    setSelectedHistoryProduct(product);
    loadProductHistory(product, historyStartDate, historyEndDate);
  };

  // Filter lists based on Search Query
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.vendor?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.address || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.phone_no || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPurchases = purchases.filter(p =>
    (p.product?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.vendor?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#F5F6F8] text-[#111827] overflow-hidden font-sans">
      <Sidebar active="inventory" />
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-md border text-sm font-semibold animate-in fade-in slide-in-from-top-2
          ${toast.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {toast.message}
        </div>
      )}

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-[#111827]">Inventory Management</h1>
            <p className="text-[12px] text-[#6B7280]">Accurately track products, vendors, and restock records</p>
          </div>
          <div className="flex gap-2">
            {activeTab === "products" && (
              <button
                onClick={() => handleOpenProductModal()}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                + Add Product
              </button>
            )}
            {activeTab === "vendors" && (
              <button
                onClick={() => handleOpenVendorModal()}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                + Add Vendor
              </button>
            )}
            {activeTab === "purchases" && (
              <button
                onClick={handleOpenPurchaseModal}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                + Record Purchase
              </button>
            )}
          </div>
        </header>

        {/* Tab Controls & Search Bar */}
        <section className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-b border-[#E5E7EB]">
          <div className="flex bg-[#F3F4F6] p-0.5 rounded-lg w-fit">
            <button
              onClick={() => { setActiveTab("products"); setSearchQuery(""); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer
                ${activeTab === "products" ? "bg-white text-primary shadow-xs" : "text-[#6B7280] hover:text-[#111827]"}`}
            >
              Products List
            </button>
            <button
              onClick={() => { setActiveTab("vendors"); setSearchQuery(""); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer
                ${activeTab === "vendors" ? "bg-white text-primary shadow-xs" : "text-[#6B7280] hover:text-[#111827]"}`}
            >
              Vendors List
            </button>
            <button
              onClick={() => { setActiveTab("purchases"); setSearchQuery(""); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer
                ${activeTab === "purchases" ? "bg-white text-primary shadow-xs" : "text-[#6B7280] hover:text-[#111827]"}`}
            >
              Purchase Logs
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            {activeTab === "purchases" && (
              <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-lg p-1 bg-[#F9FAFB] text-xs w-full sm:w-auto">
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">From</span>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-[11px] font-semibold text-slate-700 cursor-pointer"
                  />
                </div>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">To</span>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="bg-transparent border-none focus:outline-none text-[11px] font-semibold text-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            )}

            <div className="relative w-full sm:w-60 md:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 border border-[#E5E7EB] rounded-lg text-xs bg-[#F9FAFB] focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
          </div>
        </section>

        {/* Content Panel */}
        <section className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#6B7280]">
              <svg className="animate-spin h-6 w-6 text-primary mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs font-semibold">Loading records...</span>
            </div>
          ) : (
            <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
              {activeTab === "products" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F9FAFB] text-[#6B7280] font-bold border-b border-[#E5E7EB]">
                        <th className="p-4 w-12">ID</th>
                        <th className="p-4">Medicine/Product</th>
                        <th className="p-4">Vendor</th>
                        <th className="p-4 text-center">Stock Level (Qty)</th>
                        <th className="p-4 text-right">Selling Price</th>
                        <th className="p-4 text-center w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[#6B7280] italic">No products found.</td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => (
                          <tr key={p.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                            <td className="p-4 font-mono text-[#6B7280]">{p.id}</td>
                            <td className="p-4">
                              <button
                                type="button"
                                onClick={() => handleOpenHistoryDrawer(p)}
                                className="font-semibold text-primary hover:text-primary-hover hover:underline text-left cursor-pointer flex items-center gap-1.5 bg-transparent border-none p-0 focus:outline-none"
                                title="Click to view stock history"
                              >
                                <span>{p.name}</span>
                                <svg className="w-3.5 h-3.5 text-primary opacity-60" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </td>
                            <td className="p-4 text-[#6B7280]">{p.vendor?.name || "—"}</td>
                            <td className="p-4 text-center font-bold">
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold
                                ${p.qty <= 2 ? "bg-red-50 text-red-700 border border-red-200" :
                                  p.qty <= 5 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                    "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                                {p.qty}
                              </span>
                            </td>
                            <td className="p-4 text-right font-bold text-slate-700">₹{p.selling_price.toFixed(2)}</td>
                            <td className="p-4 flex gap-1.5 justify-center">
                              <button
                                onClick={() => handleOpenHistoryDrawer(p)}
                                className="p-1.5 text-[#6B7280] hover:text-emerald-600 rounded hover:bg-emerald-50 transition-all cursor-pointer"
                                title="View Stock History"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleOpenProductModal(p)}
                                className="p-1.5 text-[#6B7280] hover:text-primary rounded hover:bg-gray-100 transition-all cursor-pointer"
                                title="Edit Product"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 text-[#6B7280] hover:text-red-600 rounded hover:bg-red-50 transition-all cursor-pointer"
                                title="Delete Product"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "vendors" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F9FAFB] text-[#6B7280] font-bold border-b border-[#E5E7EB]">
                        <th className="p-4 w-12">ID</th>
                        <th className="p-4">Vendor Name</th>
                        <th className="p-4">Address</th>
                        <th className="p-4">Phone Number</th>
                        <th className="p-4 text-center w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVendors.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-[#6B7280] italic">No vendors found.</td>
                        </tr>
                      ) : (
                        filteredVendors.map((v) => (
                          <tr key={v.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                            <td className="p-4 font-mono text-[#6B7280]">{v.id}</td>
                            <td className="p-4 font-semibold text-[#111827]">{v.name}</td>
                            <td className="p-4 text-[#6B7280] max-w-xs truncate" title={v.address}>{v.address || "—"}</td>
                            <td className="p-4 text-[#6B7280] font-mono">{v.phone_no || "—"}</td>
                            <td className="p-4 flex gap-1.5 justify-center">
                              <button
                                onClick={() => handleOpenVendorModal(v)}
                                className="p-1.5 text-[#6B7280] hover:text-primary rounded hover:bg-gray-100 transition-all cursor-pointer"
                                title="Edit Vendor"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteVendor(v.id)}
                                className="p-1.5 text-[#6B7280] hover:text-red-600 rounded hover:bg-red-50 transition-all cursor-pointer"
                                title="Delete Vendor"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "purchases" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F9FAFB] text-[#6B7280] font-bold border-b border-[#E5E7EB]">
                        <th className="p-4 w-12">ID</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Medicine/Product</th>
                        <th className="p-4">Vendor</th>
                        <th className="p-4 text-center">Qty</th>
                        <th className="p-4 text-right">Cost / Value</th>
                        <th className="p-4">Purchase Slip</th>
                        <th className="p-4">Date</th>
                        <th className="p-4 text-center w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchases.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-[#6B7280] italic">No transaction history found.</td>
                        </tr>
                      ) : (
                        filteredPurchases.map((p) => (
                          <tr key={p.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                            <td className="p-4 font-mono text-[#6B7280]">{p.id}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                                ${p.transaction_type === "return" 
                                  ? "bg-rose-50 text-rose-700 border border-rose-200" 
                                  : "bg-[#e0e7ff] text-primary border border-indigo-150"}`}>
                                {p.transaction_type === "return" ? "Return" : "Purchase"}
                              </span>
                            </td>
                            <td className="p-4 font-semibold text-[#111827]">{p.product?.name || "Deleted Product"}</td>
                            <td className="p-4 text-[#6B7280]">{p.vendor?.name || "—"}</td>
                            <td className={`p-4 text-center font-bold ${p.transaction_type === "return" ? "text-rose-600" : "text-primary"}`}>
                              {p.transaction_type === "return" ? `-${p.qty}` : `+${p.qty}`}
                            </td>
                            <td className="p-4 text-right font-bold text-slate-700">₹{p.purchase_price.toFixed(2)}</td>
                            <td className="p-4 text-[#6B7280] max-w-xs truncate" title={p.slip_url || ""}>
                              {p.slip_url ? (
                                p.slip_url.startsWith("http") ? (
                                  <a href={p.slip_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
                                    View Slip ↗
                                  </a>
                                ) : (
                                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{p.slip_url}</span>
                                )
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="p-4 text-[#6B7280]">{new Date(p.purchase_date).toLocaleDateString()}</td>
                            <td className="p-4 flex justify-center">
                              <button
                                onClick={() => handleDeletePurchase(p.id)}
                                className="p-1.5 text-[#6B7280] hover:text-red-600 rounded hover:bg-red-50 transition-all cursor-pointer"
                                title="Delete Purchase Log"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Modal - Add / Edit Product */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <form onSubmit={handleSaveProduct} className="bg-white w-full max-w-md rounded-xl shadow-lg border border-[#E5E7EB] overflow-hidden flex flex-col animate-in scale-in-95 duration-100">
            <header className="px-6 py-4 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="font-bold text-[#111827] text-sm">{editingProduct ? "Edit Product" : "Add New Product"}</h3>
              <button type="button" onClick={() => setIsProductModalOpen(false)} className="text-[#6B7280] hover:text-[#111827] text-lg font-bold">×</button>
            </header>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[12px] font-bold text-[#4A5568]">Medicine / Product Name *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Sucrafil Ano Cream"
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-bold text-[#4A5568]">Default Vendor *</label>
                <select
                  required
                  value={productForm.vendor_id}
                  onChange={(e) => setProductForm({ ...productForm, vendor_id: e.target.value })}
                  className="w-full h-9 px-2 border border-[#E5E7EB] rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Select Vendor --</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-bold text-[#4A5568]">Selling Price (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={productForm.selling_price}
                  onChange={(e) => setProductForm({ ...productForm, selling_price: Number(e.target.value) })}
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <footer className="px-6 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="px-4 py-2 border border-[#E5E7EB] hover:bg-gray-50 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                {editingProduct ? "Save Changes" : "Create Product"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Modal - Add / Edit Vendor */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <form onSubmit={handleSaveVendor} className="bg-white w-full max-w-md rounded-xl shadow-lg border border-[#E5E7EB] overflow-hidden flex flex-col animate-in scale-in-95 duration-100">
            <header className="px-6 py-4 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="font-bold text-[#111827] text-sm">{editingVendor ? "Edit Vendor" : "Add Vendor"}</h3>
              <button type="button" onClick={() => setIsVendorModalOpen(false)} className="text-[#6B7280] hover:text-[#111827] text-lg font-bold">×</button>
            </header>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[12px] font-bold text-[#4A5568]">Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={vendorForm.name}
                  onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                  placeholder="e.g. Shree Mangal Pharma"
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-bold text-[#4A5568]">Phone Number</label>
                <input
                  type="text"
                  value={vendorForm.phone_no}
                  onChange={(e) => setVendorForm({ ...vendorForm, phone_no: e.target.value })}
                  placeholder="e.g. 9137966674"
                  className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-bold text-[#4A5568]">Vendor Address</label>
                <textarea
                  value={vendorForm.address}
                  onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                  placeholder="Vendor location/office address"
                  rows={3}
                  className="w-full p-3 border border-[#E5E7EB] rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            <footer className="px-6 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsVendorModalOpen(false)}
                className="px-4 py-2 border border-[#E5E7EB] hover:bg-gray-50 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                {editingVendor ? "Save Changes" : "Create Vendor"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Drawer - Record Purchase */}
      {isPurchaseModalOpen && (
        <>
          <div 
            onClick={() => setIsPurchaseModalOpen(false)}
            className="fixed inset-0 z-45 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200" 
          />
          <div className="fixed right-0 top-0 h-full z-50 w-full sm:w-[450px] bg-white shadow-xl border-l border-[#E5E7EB] flex flex-col animate-in slide-in-from-right duration-200">
            <form onSubmit={handleSavePurchase} className="flex flex-col h-full">
              <header className="px-6 py-4 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-bold text-[#111827] text-sm">
                    {purchaseForm.transaction_type === "return" ? "Record Return to Vendor" : "Record Purchase (Restock)"}
                  </h3>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">
                    {purchaseForm.transaction_type === "return" 
                      ? "Return inventory items and record refund details" 
                      : "Increment inventory levels and record transaction"}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsPurchaseModalOpen(false)} 
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg text-lg font-bold w-8 h-8 flex items-center justify-center transition-all cursor-pointer"
                >
                  ×
                </button>
              </header>
              
              <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-[#4A5568]">Transaction Type *</label>
                  <select
                    value={purchaseForm.transaction_type}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, transaction_type: e.target.value as "purchase" | "return" })}
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="purchase">Restock (Purchase from Vendor)</option>
                    <option value="return">Return to Vendor</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-[#4A5568]">Select Medicine / Product *</label>
                  <select
                    required
                    value={purchaseForm.product_id}
                    onChange={(e) => {
                      const prodId = e.target.value;
                      const matchedProd = products.find(p => String(p.id) === prodId);
                      setPurchaseForm({
                        ...purchaseForm,
                        product_id: prodId,
                        vendor_id: matchedProd && matchedProd.vendor_id ? String(matchedProd.vendor_id) : ""
                      });
                    }}
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (Current: {p.qty} units)</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-[#6B7280]">Vendor (Auto-selected from product) *</label>
                  <select
                    disabled
                    value={purchaseForm.vendor_id}
                    className="w-full h-9 px-2.5 border border-[#E5E7EB] rounded-lg text-xs bg-gray-50 text-gray-500 cursor-not-allowed focus:outline-none"
                  >
                    <option value="">No vendor assigned</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[12px] font-bold text-[#4A5568]">
                      {purchaseForm.transaction_type === "return" ? "Returned Qty *" : "Purchased Qty *"}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={purchaseForm.qty}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, qty: Number(e.target.value) })}
                      className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-bold text-[#4A5568]">
                      {purchaseForm.transaction_type === "return" ? "Refund / Credit Value (₹) *" : "Total Purchase Price (₹) *"}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={purchaseForm.purchase_price}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_price: Number(e.target.value) })}
                      className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-[#4A5568]">
                    {purchaseForm.transaction_type === "return" ? "Return Date *" : "Purchase Date *"}
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseForm.purchase_date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
                    className="w-full h-9 px-3 border border-[#E5E7EB] rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1 pt-2 border-t border-[#F3F4F6]">
                  <label className="text-[12px] font-bold text-[#4A5568]">
                    {purchaseForm.transaction_type === "return" ? "Return Slip / Credit Note Image" : "Purchase Slip Image"}
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await handleUploadSlip(file);
                          if (url) {
                            setPurchaseForm({ ...purchaseForm, slip_url: url });
                            showToast("Purchase slip uploaded successfully.");
                          }
                        }
                      }}
                      className="hidden"
                      id="slip-upload-input"
                    />
                    <label
                      htmlFor="slip-upload-input"
                      className="px-4 py-2 border border-[#E5E7EB] hover:bg-gray-50 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      {uploading ? "Uploading..." : purchaseForm.slip_url ? "Change Slip Image" : "Upload Slip Image"}
                    </label>
                    {purchaseForm.slip_url && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Uploaded
                      </span>
                    )}
                  </div>
                  {purchaseForm.slip_url && (
                    <div className="mt-2 border border-gray-200 rounded-lg p-1 max-w-[150px] bg-slate-50 relative group">
                      <img
                        src={purchaseForm.slip_url}
                        alt="Purchase Slip Preview"
                        className="w-full h-auto rounded object-contain max-h-24"
                      />
                      <button
                        type="button"
                        onClick={() => setPurchaseForm({ ...purchaseForm, slip_url: "" })}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs hover:bg-red-600 transition-all cursor-pointer border-none"
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <footer className="px-6 py-4.5 bg-[#F9FAFB] border-t border-[#E5E7EB] flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 border border-[#E5E7EB] hover:bg-gray-50 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Record Purchase
                </button>
              </footer>
            </form>
          </div>
        </>
      )}
      {/* Drawer - Product Stock History & Tracking */}
      {selectedHistoryProduct && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in-20"
            onClick={() => setSelectedHistoryProduct(null)}
          />
          
          {/* Drawer Body */}
          <div className="fixed right-0 top-0 h-full z-50 w-full sm:w-[500px] bg-white shadow-xl border-l border-[#E5E7EB] flex flex-col animate-in slide-in-from-right duration-200">
            <header className="px-6 py-4 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-[#111827] text-sm">Stock History & Tracking</h3>
                <p className="text-[10px] text-[#6B7280] mt-0.5">Full audit trail of purchases, returns, and sales</p>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedHistoryProduct(null)} 
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg text-lg font-bold w-8 h-8 flex items-center justify-center transition-all cursor-pointer border-none"
              >
                ×
              </button>
            </header>

            {/* Product Meta Card */}
            <div className="p-4 bg-slate-50 border-b border-[#E5E7EB] shrink-0 grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-lg border border-gray-150">
                <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Product Name</span>
                <span className="block text-xs font-extrabold text-[#111827] mt-0.5 truncate" title={selectedHistoryProduct.name}>
                  {selectedHistoryProduct.name}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-150">
                <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Current Stock</span>
                <span className={`block text-xs font-extrabold mt-0.5
                  ${selectedHistoryProduct.qty <= 2 ? 'text-red-600' :
                    selectedHistoryProduct.qty <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {selectedHistoryProduct.qty} units
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-150">
                <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Selling Price</span>
                <span className="block text-xs font-extrabold text-[#111827] mt-0.5">
                  ₹{selectedHistoryProduct.selling_price.toFixed(2)}
                </span>
              </div>
            </div>
            {/* History Date Filter Toolbar */}
            <div className="px-4 py-2.5 bg-white border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
              <span className="text-[11px] font-bold text-slate-700">Filter History:</span>
              <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-lg p-1 bg-[#F9FAFB] text-xs">
                <div className="flex items-center gap-1 px-1">
                  <span className="text-[9px] text-gray-500 font-bold uppercase">From</span>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setHistoryStartDate(newStart);
                      if (selectedHistoryProduct) {
                        loadProductHistory(selectedHistoryProduct, newStart, historyEndDate);
                      }
                    }}
                    className="bg-transparent border-none focus:outline-none text-[11px] font-semibold text-slate-700 cursor-pointer"
                  />
                </div>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-1 px-1">
                  <span className="text-[9px] text-gray-500 font-bold uppercase">To</span>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      setHistoryEndDate(newEnd);
                      if (selectedHistoryProduct) {
                        loadProductHistory(selectedHistoryProduct, historyStartDate, newEnd);
                      }
                    }}
                    className="bg-transparent border-none focus:outline-none text-[11px] font-semibold text-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* History Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#6B7280]">
                  <svg className="animate-spin h-6 w-6 text-primary mb-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-xs font-semibold">Loading stock history...</span>
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="text-center py-16 text-[#6B7280] italic text-xs">
                  No stock tracking history recorded for this medicine yet.
                </div>
              ) : (
                <div className="relative border-l border-gray-200 pl-5 ml-2.5 space-y-6">
                  {historyLogs.map((item) => {
                    let badgeClass = "";
                    let qtyPrefix = "";
                    let qtyClass = "";
                    let iconBg = "";

                    if (item.type === "purchase") {
                      badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                      qtyPrefix = "+";
                      qtyClass = "text-emerald-600";
                      iconBg = "bg-emerald-500";
                    } else if (item.type === "return") {
                      badgeClass = "bg-amber-50 text-amber-700 border border-amber-200";
                      qtyPrefix = "-";
                      qtyClass = "text-amber-600";
                      iconBg = "bg-amber-500";
                    } else { // sale
                      badgeClass = "bg-blue-50 text-blue-700 border border-blue-200";
                      qtyPrefix = "-";
                      qtyClass = "text-blue-600";
                      iconBg = "bg-blue-500";
                    }

                    return (
                      <div key={item.id} className="relative">
                        {/* Timeline Bullet */}
                        <span className={`absolute -left-[27px] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-white ${iconBg}`}>
                          <span className="h-1 w-1 rounded-full bg-white" />
                        </span>

                        <div className="bg-white p-3 rounded-lg border border-[#E5E7EB] hover:shadow-xs transition-shadow">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
                              {item.type === "purchase" ? "Purchase" : item.type === "return" ? "Return" : "OPD Sale"}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="mt-2 text-xs font-semibold text-[#111827]">
                            {item.detail}
                          </p>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-gray-500">
                              Qty Change: <strong className={`font-extrabold ${qtyClass}`}>{qtyPrefix}{item.qty}</strong>
                            </span>
                            <span className="text-gray-500">
                              Price/Value: <strong className="text-slate-800">₹{item.price.toFixed(2)}</strong>
                            </span>
                          </div>

                          {item.slip_url && (
                            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
                              <a 
                                href={item.slip_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5"
                              >
                                View Attachment Slip ↗
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <footer className="px-6 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedHistoryProduct(null)}
                className="px-4 py-2 border border-[#E5E7EB] hover:bg-gray-50 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close History
              </button>
            </footer>
          </div>
        </>
      )}
    </div>
  );
}
