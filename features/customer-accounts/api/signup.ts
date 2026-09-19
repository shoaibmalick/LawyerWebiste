import bcrypt from "bcryptjs";
import { siteConfig } from "@/config/site.config";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/html";
import { BCRYPT_COST } from "@/lib/password";
import { customerService } from "@/server/services/customerService";
import type { SignupInput } from "../schema/customer.schema";

/**
 * Sign-up deliberately reports the same outcome whether or not the address was
 * already registered.
 *
 * The route used to answer 409 "An account with that email already exists.",
 * which turns the public sign-up form into a membership oracle: anyone can
 * test an address and learn, with certainty, whether that person is a patient
 * here. For a dental practice that is a health-adjacent disclosure, not merely
 * an account-enumeration nuisance.
 *
 * The person who genuinely owns the address is not left confused, because the
 * duplicate branch emails *them* — which is the only channel that reaches the
 * account's owner rather than whoever typed the form.
 */
export type SignupResult = { created: boolean };

export async function signUpCustomer(input: SignupInput): Promise<SignupResult> {
  const existing = await customerService.findByEmail(input.email);

  if (existing) {
    await sendEmail({
      to: existing.email,
      subject: `You already have an account — ${siteConfig.business.name}`,
      html: `
        <p>Hi ${escapeHtml(existing.name)},</p>
        <p>Someone just tried to create an account with this email address at
        ${escapeHtml(siteConfig.business.name)}. You already have one, so there is nothing
        to do — just sign in as usual.</p>
        <p>If that wasn't you, you can ignore this. Your account has not changed
        and no one has been given access to it.</p>
      `,
    });
    return { created: false };
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  await customerService.createCustomer({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  return { created: true };
}
