import type { Pack } from "../types";
import { validatePack } from "../../functions/src/domain.js";
export interface ManagedPack extends Pack {
  status: "published" | "archived";
  version: number;
  items: (Pack["items"][number] & { stock: number })[];
}
export function parsePack(data: unknown): ManagedPack {
  const raw = data as ManagedPack;
  const clean = validatePack(raw);
  if (
    !["published", "archived"].includes(raw.status) ||
    !Number.isSafeInteger(raw.version) ||
    raw.version < 1 ||
    raw.items.some((i) => !Number.isSafeInteger(i.stock) || i.stock < 0)
  )
    throw new Error("Invalid published pack");
  return {
    ...clean,
    status: raw.status,
    version: raw.version,
    items: clean.items.map((i: Pack["items"][number], index: number) => ({
      ...i,
      stock: raw.items[index].stock,
    })),
  } as ManagedPack;
}
export const totalWeight = (pack: Pack) =>
  pack.items.reduce((sum, item) => sum + item.odds, 0);
export const probability = (pack: Pack, weight: number) =>
  (weight / totalWeight(pack)) * 100;
export const expectedValue = (pack: Pack) =>
  pack.items.reduce((sum, item) => sum + item.value * item.odds, 0) /
  totalWeight(pack);
export const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message.replace(/^Firebase:\s*/, "")
    : "The request failed. Please try again.";
