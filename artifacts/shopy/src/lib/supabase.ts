import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Shop = {
  id: string;
  shop_name: string;
  subdomain: string;
  insta_handle: string;
  whatsapp: string;
  bio: string | null;
  upi_qr_url: string | null;
  upi_id: string | null;
  email: string;
  category: string | null;
  delivery_info: string | null;
  status: "pending" | "active" | "suspended";
  plan: string;
  created_at: string;
};

export type Product = {
  id: string;
  shop_id: string;
  name: string;
  price: number;
  description: string | null;
  sizes: string[] | null;
  images: string[] | null;
  delivery_info: string | null;
  in_stock: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  shop_id: string;
  product_id: string;
  buyer_name: string;
  buyer_phone: string;
  utr: string;
  amount: number;
  status: "pending" | "confirmed" | "declined";
  created_at: string;
  products?: Product;
};

export type Review = {
  id: string;
  shop_id: string;
  order_id: string;
  rating: number;
  review_text: string | null;
  buyer_name: string | null;
  verified: boolean;
  created_at: string;
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function checkSubdomainAvailability(subdomain: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("shops")
    .select("id")
    .eq("subdomain", subdomain)
    .maybeSingle();
  if (error) return false;
  return data === null;
}

export function getStorageUrl(bucket: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export async function uploadImage(
  bucket: string,
  file: File,
  path: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });
  if (error || !data) return null;
  return getStorageUrl(bucket, data.path);
}

export function getSubdomainFromHost(): string | null {
  // Only activate subdomain routing on the real production domain
  const hostname = window.location.hostname;
  const PRODUCTION_ROOT = "shopsite.in";

  if (hostname.endsWith(`.${PRODUCTION_ROOT}`)) {
    const subdomain = hostname.slice(0, hostname.length - PRODUCTION_ROOT.length - 1);
    if (subdomain && subdomain !== "www" && subdomain !== "app") {
      return subdomain;
    }
  }

  // Fallback for local dev testing: ?shop=slug
  const params = new URLSearchParams(window.location.search);
  return params.get("shop");
}
