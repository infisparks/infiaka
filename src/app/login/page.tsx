"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  // If already authenticated, redirect to dashboard immediately
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/");
      } else {
        setCheckingSession(false);
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        setErrorMessage(error.message);
      } else if (data?.session) {
        router.push("/");
      }
    } catch (err: any) {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Checking session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center font-sans p-4">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-xl space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-2 select-none">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 text-2xl font-bold mb-1 shadow-sm">
            🩺
          </div>
          <h1 className="text-2xl font-extrabold text-[#111827]">Eka Care Clone</h1>
          <p className="text-[13px] font-semibold text-[#6B7280]">
            Log in to manage patient records and clinical visits
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-[12px] font-bold text-red-600 flex items-start gap-2 animate-pulse text-left">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[11.5px] font-bold text-[#6B7280] uppercase tracking-wider">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="e.g. doctor@ekacare.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full h-10 px-3.5 border border-[#E5E7EB] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-lg text-[13px] font-semibold text-[#111827] focus:bg-white focus:outline-none placeholder:text-slate-300 transition-all"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <div className="flex justify-between items-center">
              <label className="text-[11.5px] font-bold text-[#6B7280] uppercase tracking-wider">
                Password <span className="text-red-500">*</span>
              </label>
            </div>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full h-10 px-3.5 border border-[#E5E7EB] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-lg text-[13px] font-semibold text-[#111827] focus:bg-white focus:outline-none placeholder:text-slate-300 transition-all"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold rounded-lg text-[13px] shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer mt-5"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <span className="text-[11.5px] font-bold text-[#6B7280]">
            Having trouble logging in? Contact support desk.
          </span>
        </div>
      </div>
    </div>
  );
}
