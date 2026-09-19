import { z } from "zod";

/**
 * One phone number format, everywhere the public types one.
 *
 * `(212)-456-7890` — a North American ten-digit number, punctuation included.
 * The practice is in Toronto and Canada shares the same numbering plan, so a
 * local number fits this shape exactly as a US one does.
 *
 * ## Why a fixed format at all
 *
 * A receptionist reading a booking back over the phone should not have to
 * decode `+1 905 555 0148 ext 2`, `9055550148` and `905.555.0148` as the same
 * kind of thing. Accepting one shape means every number in the dashboard reads
 * the same way and can be dialled without interpretation.
 *
 * ## Why the client formats and the server validates
 *
 * Making someone type brackets and hyphens by hand is the fastest way to get a
 * form abandoned, so the inputs mask as you type: you type digits, the
 * punctuation appears. But a mask is a convenience, not a control — anything
 * can POST to the API directly — so the schema checks the finished shape too.
 * That is the same split the honeypot and the captcha use.
 */

/** Shown in placeholders and error messages, so both come from one place. */
export const PHONE_FORMAT = "(212)-456-7890";

/**
 * The finished shape, anchored.
 *
 * Deliberately strict: this rejects `(212) 456-7890` with a space as well as a
 * bare `2124567890`. Being lenient server-side while the form is strict would
 * mean the dashboard still fills up with the variants the format exists to
 * prevent — they would just have to arrive from somewhere other than the form.
 */
export const PHONE_PATTERN = /^\(\d{3}\)-\d{3}-\d{4}$/;

/** Exactly the length of the formatted value, for `maxLength` on an input. */
export const PHONE_MAX_LENGTH = PHONE_FORMAT.length; // 14

/** Ten digits: NANP area code + exchange + line number. */
const DIGITS = 10;

/** Everything that is not a digit, capped at the length a number can be. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, DIGITS);
}

/**
 * Formats whatever has been typed so far.
 *
 * Progressive on purpose — punctuation appears only once the digit before it
 * exists, so backspace walks back out of the number instead of fighting a
 * bracket that reinserts itself. Typing `2124567890` produces
 * `(212)-456-7890`; pasting `+1 (212) 456 7890` produces the same, because
 * everything non-numeric is discarded first.
 *
 * The leading `1` of a pasted `+1…` number is *not* stripped: doing so would
 * silently turn a mistyped number into a different valid one. An eleven-digit
 * paste keeps its first ten digits and fails validation, which is visible.
 */
export function formatPhoneInput(value: string): string {
  const digits = phoneDigits(value);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
  return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Whether a value is a complete, correctly formatted number. */
export function isFormattedPhone(value: string): boolean {
  return PHONE_PATTERN.test(value);
}

/**
 * The schema every optional phone field uses.
 *
 * Optional stays optional — a phone number is not required to book or to send
 * a message, and turning a formatting rule into a new required field would be
 * a much bigger change than the one asked for. An untouched box submits `""`,
 * which normalises to `undefined` rather than failing the pattern.
 *
 * Same transform-then-pipe idiom as the team photo path, for the same reason:
 * the form always submits the field, so the emptiness has to be dealt with
 * before the shape is checked.
 */
/**
 * The same format, required.
 *
 * A separate export rather than a flag on `optionalPhoneSchema`, because the
 * two genuinely differ in what an empty box means: there it normalises to
 * `undefined`, here it is the error. A flag would make one schema answer two
 * questions and force every caller to read which.
 *
 * Most forms should keep the optional one — a phone number is a barrier, and
 * asking for one to send a message costs more submissions than it gains. Reach
 * for this only where the business genuinely cannot act without it: the case
 * that prompted it was a restaurant taking catering enquiries for hundreds of
 * guests, which nobody confirms by email.
 */
export const requiredPhoneSchema = z
  .string({ error: "We need a number to call you on" })
  .trim()
  .min(1, "We need a number to call you on")
  .regex(PHONE_PATTERN, `Use the format ${PHONE_FORMAT}`);

export const optionalPhoneSchema = z
  .string()
  .optional()
  .transform((value) => (value === undefined || value.trim() === "" ? undefined : value.trim()))
  .pipe(z.string().regex(PHONE_PATTERN, `Use the format ${PHONE_FORMAT}`).optional());
