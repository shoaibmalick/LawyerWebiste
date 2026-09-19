import type { UseFormRegisterReturn } from "react-hook-form";
import { HONEYPOT_FIELD } from "@/lib/honeypot";

/**
 * The visually-hidden spam trap. See lib/honeypot.ts for why it exists.
 *
 * Hidden with a clip/absolute-position technique rather than `display: none`
 * or `type="hidden"`, because the crudest bots skip both of those — the whole
 * point is that the field looks ordinary to a script reading the DOM.
 *
 * Three things keep it away from real people:
 *  - `aria-hidden` so screen readers never announce it;
 *  - `tabIndex={-1}` so it is unreachable by keyboard, which is how a
 *    sighted keyboard user would otherwise land in an invisible box;
 *  - `autoComplete="off"` so a password manager does not helpfully fill it
 *    and get a genuine patient silently dropped.
 *
 * That last one is the failure mode worth caring about: a false positive here
 * is a lost enquiry that nobody ever finds out about.
 */
export function HoneypotInput({ registration }: { registration: UseFormRegisterReturn }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        clipPath: "inset(50%)",
        whiteSpace: "nowrap",
      }}
    >
      <label htmlFor={HONEYPOT_FIELD}>Website (leave this blank)</label>
      <input id={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" {...registration} />
    </div>
  );
}
