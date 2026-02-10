/**
 * Generates a code from a name by taking the first letter of each word.
 * E.g., "Maquinas Vending" -> "MV", "Juguetes Capsulas" -> "JC"
 * Max 3 characters.
 */
export function generateCode(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 3);
}

/**
 * Generates a SKU in the format: {CategoryCode}-{SubcategoryCode}-{SequentialID}
 * E.g., MV-JC-000020
 */
export function generateSku(
  categoryName: string,
  subcategoryName: string,
  sequentialNumber: number
): string {
  const catCode = generateCode(categoryName);
  const subCode = generateCode(subcategoryName);
  const paddedId = sequentialNumber.toString().padStart(6, "0");
  return `${catCode}-${subCode}-${paddedId}`;
}
