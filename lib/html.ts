/**
 * Escaping for the one place in this app that builds HTML by hand: email.
 *
 * React escapes everything it renders, so the website itself has never needed
 * this. Email is different — every template under `features/(*)/api` is a
 * plain template string, and the values interpolated into them are typed by
 * the public: a customer's name, a contact-form message, a review comment.
 *
 * Unescaped, a contact message of
 *   <a href="https://evil.test">Confirm your appointment</a>
 * arrives as a working link in an email sent from the practice's own domain,
 * read by staff who have every reason to trust it. Mail clients block script,
 * but they render links, images and formatting perfectly well — so this is a
 * phishing primitive, not a theoretical XSS.
 *
 * Escape at the point of interpolation, never at the point of storage: the
 * same values are also rendered by React (which escapes again) and read back
 * by staff in the dashboard, where double-escaped text would be its own bug.
 */
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Make a string safe to interpolate into HTML text or an attribute value.
 *
 * One pass over a character class rather than five chained `.replace()` calls:
 * chaining would have to replace `&` first, and getting that order wrong
 * double-escapes every entity the later replacements introduce.
 */
export function escapeHtml(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] ?? char);
}

const SPACE = 0x20;
const DELETE = 0x7f;

/**
 * Strip anything that could start a new header line from an email subject.
 *
 * Defence in depth rather than a known hole: Resend takes the subject as a
 * JSON field and does its own encoding, so a CR/LF here is very unlikely to
 * become a header. But subjects are built from user input
 * (`New website inquiry from ${name}`), header injection is the classic
 * mail-sending vulnerability, and the guard costs a few lines.
 *
 * Written as a code-point test rather than a regex character class: the range
 * is every control character, and expressing that as a class means either
 * embedding raw control bytes in the source (invisible, and a formatter can
 * mangle them) or escapes that are easy to misread as a literal range.
 */
export function sanitiseSubject(value: string): string {
  let out = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    out += code < SPACE || code === DELETE ? " " : char;
  }
  return out.replace(/\s+/g, " ").trim();
}
