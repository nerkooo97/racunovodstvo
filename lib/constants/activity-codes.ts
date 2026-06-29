import activityCodesData from "./activity-codes.json";

export interface ActivityCode {
  code: string;
  name: string;
}

export const activityCodes = activityCodesData as ActivityCode[];

export function searchActivityCodes(query: string): ActivityCode[] {
  if (!query) return [];
  const q = query.toLowerCase().trim();
  return activityCodes.filter(
    (item) =>
      item.code.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q)
  ).slice(0, 30); // Limiting suggestions for performance
}
