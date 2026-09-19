import { describe, expect, it } from "vitest";
import {
  formatPhoneInput,
  isFormattedPhone,
  optionalPhoneSchema,
  PHONE_FORMAT,
  PHONE_MAX_LENGTH,
  phoneDigits,
} from "./phone";

describe("the format itself", () => {
  it("is the one the practice asked for", () => {
    expect(PHONE_FORMAT).toBe("(212)-456-7890");
    // maxLength on the inputs is derived from this, so a finished number fits
    // exactly and a second one cannot be typed after it.
    expect(PHONE_MAX_LENGTH).toBe(14);
  });
});

describe("formatPhoneInput", () => {
  it("builds the format as digits are typed", () => {
    expect(formatPhoneInput("")).toBe("");
    expect(formatPhoneInput("2")).toBe("(2");
    expect(formatPhoneInput("212")).toBe("(212");
    expect(formatPhoneInput("2124")).toBe("(212)-4");
    expect(formatPhoneInput("212456")).toBe("(212)-456");
    expect(formatPhoneInput("2124567")).toBe("(212)-456-7");
    expect(formatPhoneInput("2124567890")).toBe("(212)-456-7890");
  });

  it("produces a value that passes validation once complete", () => {
    expect(isFormattedPhone(formatPhoneInput("9055550148"))).toBe(true);
  });

  it("is idempotent, so re-formatting an already-formatted value is a no-op", () => {
    // The onChange handler runs on every keystroke, including ones that do not
    // add a digit; formatting must not drift on repeat application.
    const once = formatPhoneInput("2124567890");
    expect(formatPhoneInput(once)).toBe(once);
  });

  it("cleans up a pasted number in any of the usual shapes", () => {
    for (const pasted of [
      "212 456 7890",
      "212-456-7890",
      "212.456.7890",
      "(212) 456-7890",
      "  2124567890  ",
    ]) {
      expect(formatPhoneInput(pasted), pasted).toBe("(212)-456-7890");
    }
  });

  /**
   * Backspace has to walk back out of the number. If punctuation were inserted
   * ahead of the digit that justifies it, deleting a character would re-add it
   * and the caret would stick — the classic broken input mask.
   */
  it("lets backspace remove characters instead of fighting it", () => {
    expect(formatPhoneInput("(212)-456-789")).toBe("(212)-456-789");
    expect(formatPhoneInput("(212)-456-")).toBe("(212)-456");
    expect(formatPhoneInput("(212)-4")).toBe("(212)-4");
    expect(formatPhoneInput("(212)")).toBe("(212");
    expect(formatPhoneInput("(2")).toBe("(2");
    expect(formatPhoneInput("(")).toBe("");
  });

  it("ignores letters and stray punctuation entirely", () => {
    expect(formatPhoneInput("abc")).toBe("");
    expect(formatPhoneInput("212abc456def7890")).toBe("(212)-456-7890");
  });

  /**
   * A pasted `+1…` number keeps its first ten digits and then fails
   * validation, which is visible. Silently dropping the leading 1 would turn a
   * mistyped number into a different, valid-looking one.
   */
  it("does not invent a number from an eleven-digit paste", () => {
    const result = formatPhoneInput("+1 212 456 7890");
    expect(result).toBe("(121)-245-6789");
    expect(isFormattedPhone(result)).toBe(true);
    // It is well-formed but wrong — which is the point: the person sees it.
    expect(result).not.toBe("(212)-456-7890");
  });
});

describe("phoneDigits", () => {
  it("never returns more than ten digits", () => {
    expect(phoneDigits("12345678901234")).toHaveLength(10);
  });
});

describe("optionalPhoneSchema", () => {
  it("accepts a correctly formatted number", () => {
    expect(optionalPhoneSchema.parse("(905)-555-0148")).toBe("(905)-555-0148");
  });

  /**
   * Optional stays optional. A phone number is not required to book or to send
   * a message, and an untouched box submits "" rather than being absent.
   */
  it("treats an empty or untouched field as no phone at all", () => {
    expect(optionalPhoneSchema.parse(undefined)).toBeUndefined();
    expect(optionalPhoneSchema.parse("")).toBeUndefined();
    expect(optionalPhoneSchema.parse("   ")).toBeUndefined();
  });

  /**
   * Strict on purpose. Being lenient here while the form is strict would mean
   * the dashboard still fills with the variants the format exists to prevent —
   * they would simply arrive from somewhere other than the form.
   */
  it("rejects every near-miss, including a partial number", () => {
    for (const bad of [
      "2124567890", // no punctuation
      "(212) 456-7890", // space instead of the hyphen
      "212-456-7890", // no brackets
      "(212)-456-789", // too short
      "(212)-456-78901", // too long
      "(21)-456-7890", // short area code
      "+1 (212)-456-7890", // country code
      "(212)-456-7890 x22", // extension
      "(abc)-def-ghij",
    ]) {
      expect(optionalPhoneSchema.safeParse(bad).success, bad).toBe(false);
    }
  });

  it("explains the format rather than just failing", () => {
    const result = optionalPhoneSchema.safeParse("2124567890");
    expect(result.success).toBe(false);
    // The person has to be able to fix it without guessing.
    expect(result.success === false && result.error.issues[0].message).toContain(PHONE_FORMAT);
  });
});
