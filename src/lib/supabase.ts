import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getUserRole(email: string): Promise<string | null> {
  if (!email) return null;
  
  if (typeof window !== "undefined") {
    const cached = sessionStorage.getItem(`user_role_${email}`);
    if (cached) return cached;
  }

  try {
    const { data, error } = await supabase
      .from("user")
      .select("role")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user role:", error);
      return null;
    }

    const role = data?.role || null;
    if (typeof window !== "undefined" && role) {
      sessionStorage.setItem(`user_role_${email}`, role);
    }
    return role;
  } catch (err) {
    console.error("Failed to query user role:", err);
    return null;
  }
}

