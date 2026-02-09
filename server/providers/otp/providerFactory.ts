import { storage } from "../../storage";
import { otpProviders } from "../../../shared/schema";
import { asc, eq } from "drizzle-orm";
import { OTPProvider } from "./OTPProvider";
import { EmailOTPProvider } from "./EmailProvider";
import { SmsOTPProvider } from "./SmsProvider";

const db = storage.db;

export async function getActiveProviders(): Promise<Array<{ provider: string; instance: OTPProvider }>> {
  const providers = await db
    .select()
    .from(otpProviders)
    .where(eq(otpProviders.isActive, true))
    .orderBy(asc(otpProviders.sortOrder)) as Array<typeof otpProviders.$inferSelect>;

  return providers
    .map((p) => ({ provider: p.provider, instance: createProviderInstance(p.provider) }))
    .filter((p): p is { provider: string; instance: OTPProvider } => p.instance !== null);
}

export function createProviderInstance(provider: string): OTPProvider | null {
  switch (provider) {
    case "email":
      return new EmailOTPProvider();
    case "sms":
      return new SmsOTPProvider();
    default:
      return null;
  }
}

export async function getProviderOrFallback(requested?: string) {
  const providers = await getActiveProviders();
  if (requested) {
    const match = providers.find((p) => p.provider === requested);
    if (match) return match;
  }
  return providers[0] || null;
}
