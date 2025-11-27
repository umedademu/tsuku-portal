import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

export function createSupabaseAdminClient(): SupabaseClient {
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabaseの設定が不足しています。環境変数を確認してください。");
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
