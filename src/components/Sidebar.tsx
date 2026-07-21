"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  active: "queue" | "book" | "upcoming" | "payments" | "orders" | "more" | "deleted" | "inventory";
  onQueueClick?: (e: React.MouseEvent) => void;
  onBookClick?: (e: React.MouseEvent) => void;
}

export default function Sidebar({ active, onQueueClick, onBookClick }: SidebarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      if (typeof window !== "undefined") {
        sessionStorage.clear();
      }
      router.push("/login");
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  return (
    <aside className="w-14 bg-white border-r border-[#E5E7EB] flex flex-col items-center py-2 select-none shrink-0 h-full">
      {/* Brand logo */}
      <div className="mb-4 flex flex-col items-center">
        <Link href="/" className="w-9 h-9 rounded-full bg-[#1e293b] flex items-center justify-center border border-[#CBD5E0] shadow-xs cursor-pointer">
          <span className="text-white text-base font-bold">C</span>
        </Link>
        <span className="text-[7px] text-[#A0AEC0] font-semibold mt-1">E-HMS</span>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 w-full flex flex-col gap-1.5 px-1 items-center">
        {/* Queue Tab */}
        {onQueueClick ? (
          <button
            onClick={onQueueClick}
            className={`w-11 py-1.5 rounded-lg flex flex-col items-center justify-center transition-colors ${
              active === "queue" ? "text-primary bg-primary/10" : "text-[#718096] hover:bg-gray-100"
            }`}
            title="OPD Queue"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-sm font-semibold mt-0.5 tracking-tight">Queue</span>
          </button>
        ) : (
          <Link
            href="/"
            className={`w-11 py-1.5 rounded-lg flex flex-col items-center justify-center transition-colors ${
              active === "queue" ? "text-primary bg-primary/10" : "text-[#718096] hover:bg-gray-100"
            }`}
            title="OPD Queue"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-sm font-semibold mt-0.5 tracking-tight">Queue</span>
          </Link>
        )}

        {/* Book Appt Tab */}
        {onBookClick ? (
          <button
            onClick={onBookClick}
            className={`w-11 py-1.5 rounded-lg flex flex-col items-center justify-center transition-colors ${
              active === "book" ? "text-primary bg-primary/10" : "text-[#718096] hover:bg-gray-100"
            }`}
            title="Book Appointment"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold mt-0.5 tracking-tight leading-none text-center">
              Book Appt
            </span>
          </button>
        ) : (
          <Link
            href="/?book=true"
            className={`w-11 py-1.5 rounded-lg flex flex-col items-center justify-center transition-colors ${
              active === "book" ? "text-primary bg-primary/10" : "text-[#718096] hover:bg-gray-100"
            }`}
            title="Book Appointment"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold mt-0.5 tracking-tight leading-none text-center">
              Book Appt
            </span>
          </Link>
        )}

        {/* Upcoming Follow-up Tab */}
        <Link
          href="/upcoming"
          className={`w-11 py-1.5 rounded-lg flex flex-col items-center justify-center transition-colors ${
            active === "upcoming" ? "text-primary bg-primary/10" : "text-[#718096] hover:bg-gray-100"
          }`}
          title="Upcoming Follow-up"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[8px] font-semibold mt-0.5 tracking-tight leading-tight text-center">
            Upcoming Follow-up
          </span>
        </Link>

        {/* Payments Tab */}
        <Link
          href="/payments"
          className={`w-11 py-1.5 rounded-lg flex flex-col items-center justify-center transition-colors ${
            active === "payments" ? "text-primary bg-primary/10" : "text-[#718096] hover:bg-gray-100"
          }`}
          title="Payments"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span className="text-sm font-semibold mt-0.5 tracking-tight">Payments</span>
        </Link>

        {/* Inventory Tab */}
        <Link
          href="/inventory"
          className={`w-11 py-1.5 rounded-lg flex flex-col items-center justify-center transition-colors ${
            active === "inventory" ? "text-primary bg-primary/10" : "text-[#718096] hover:bg-gray-100"
          }`}
          title="Inventory Management"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-20L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-sm font-semibold mt-0.5 tracking-tight leading-none text-center">Inv</span>
        </Link>

        {/* More Tab */}
        <a
          href="#"
          className={`w-11 py-1.5 rounded-lg flex flex-col items-center justify-center transition-colors ${
            active === "more" ? "text-primary bg-primary/10" : "text-[#718096] hover:bg-gray-100"
          }`}
          title="More"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
          <span className="text-sm font-semibold mt-0.5 tracking-tight">More</span>
        </a>

        {/* Deleted Tab */}
        <Link
          href="/deleted"
          className={`w-11 py-1.5 rounded-lg flex flex-col items-center justify-center transition-colors ${
            active === "deleted" ? "text-primary bg-primary/10" : "text-[#718096] hover:bg-gray-100"
          }`}
          title="Deleted Appointments"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-sm font-semibold mt-0.5 tracking-tight">Deleted</span>
        </Link>
      </nav>

      {/* Bottom controls */}
      <div className="w-full flex flex-col items-center gap-3 border-t border-[#E5E7EB] pt-2">
        <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-[#718096] hover:bg-gray-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#718096] hover:bg-gray-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>

        <img
          src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150"
          alt="Doctor profile"
          className="w-7 h-7 rounded-full object-cover border border-[#CBD5E0] cursor-pointer"
        />

        <button
          onClick={handleLogout}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Sign Out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
