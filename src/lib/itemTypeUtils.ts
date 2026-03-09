import { supabase } from "@/integrations/supabase/client";

export interface ItemTypeFlags {
  is_asset: boolean;
  is_supply: boolean;
  is_routable: boolean;
  is_sellable: boolean;
  is_component: boolean;
}

/**
 * Derives the legacy `type` enum value from item_type flags.
 * Keeps backward compatibility with existing code that uses the enum.
 */
export function deriveEnumType(flags: Partial<ItemTypeFlags>): "merchandise" | "machine_model" | "spare_part" | "supply" {
  if (flags.is_asset) return "machine_model";
  if (flags.is_supply) return "spare_part";
  return "merchandise";
}

/**
 * Fetches item_type IDs matching a given boolean flag.
 * Useful for filtering item_details by capability.
 */
export async function getItemTypeIdsByFlag(
  flag: keyof ItemTypeFlags
): Promise<string[]> {
  const { data, error } = await (supabase as any)
    .from("item_types")
    .select("id")
    .eq(flag, true);
  if (error) throw error;
  return (data || []).map((r: any) => r.id);
}

/**
 * Fetches item_type IDs where ANY of the given flags is true.
 */
export async function getItemTypeIdsByFlags(
  flags: (keyof ItemTypeFlags)[]
): Promise<string[]> {
  const { data, error } = await (supabase as any)
    .from("item_types")
    .select("id, is_routable, is_sellable, is_asset, is_supply");
  if (error) throw error;
  return (data || [])
    .filter((r: any) => flags.some((f) => r[f] === true))
    .map((r: any) => r.id);
}
