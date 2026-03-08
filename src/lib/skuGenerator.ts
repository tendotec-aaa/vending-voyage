import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts initials from a name (first letter of each word), max 2 chars.
 * E.g., "Maquinas Vending" -> "MV", "Juguetes" -> "J"
 */
export function generateCode(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

/**
 * Generates a SKU code: {CategoryInitials}{SubcategoryInitials}-{6-digit-number}
 * Falls back to "XX" if names are not provided.
 */
export function generateSkuCode(
  categoryName?: string,
  subcategoryName?: string
): string {
  const catCode = categoryName ? generateCode(categoryName) : "X";
  const subCode = subcategoryName ? generateCode(subcategoryName) : "X";
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${catCode}${subCode}-${randomNum}`;
}

/**
 * Inserts a new item_detail with an auto-generated SKU.
 * Retries up to 3 times on unique constraint violation (code 23505).
 */
export async function insertItemDetailWithRetrySku(
  insertData: {
    name: string;
    type: "machine_model" | "merchandise" | "spare_part" | "supply";
    category_id?: string | null;
    subcategory_id?: string | null;
    item_type_id?: string | null;
    [key: string]: any;
  },
  categoryName?: string,
  subcategoryName?: string,
  maxRetries = 3
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const sku = generateSkuCode(categoryName, subcategoryName);
    const { data, error } = await supabase
      .from("item_details")
      .insert({ ...insertData, sku } as any)
      .select()
      .single();

    if (!error) return data;

    // PostgreSQL unique violation
    if (error.code === "23505" && attempt < maxRetries - 1) {
      continue;
    }

    throw error;
  }

  throw new Error("Failed to generate unique SKU after multiple attempts");
}
