export const FREE_USAGE_LIMIT = 3;

export type PlanKey = "blue" | "green" | "gold";

export type SubscriptionStatus = "active" | "incomplete" | "past_due" | "canceled";

export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "active",
  "incomplete",
  "past_due",
];

export const normalizePlan = (value: unknown): PlanKey | null => {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  if (normalized === "blue" || normalized === "green" || normalized === "gold") {
    return normalized;
  }
  return null;
};

export const normalizeStatus = (value: unknown): SubscriptionStatus | null => {
  if (value === "active" || value === "incomplete" || value === "past_due" || value === "canceled") {
    return value;
  }
  return null;
};

export const hasActiveSubscription = (
  plan: PlanKey | null | undefined,
  status: SubscriptionStatus | null | undefined,
) => {
  if (!plan || !status) return false;
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(status);
};
