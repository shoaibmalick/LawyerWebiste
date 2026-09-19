import { z } from "zod";
import { TEAM_PHOTO_URL_PATTERN } from "@/lib/team-photo-url";

/** Guessed conservatively — anything next/image can actually render. */
const IMAGE_EXTENSION = /\.(jpe?g|png|webp|avif|gif|svg)$/i;

/**
 * A photo path under /public.
 *
 * This is stricter than it looks like it needs to be, because the failure it
 * prevents is not a broken image. next.config.ts sets no `images` key, so
 * next/image accepts local paths only — a pasted `https://…` URL throws at
 * render time, and since TeamGrid renders on the homepage that takes the whole
 * page down. A staff member copying an image address out of a browser is a
 * completely reasonable thing to do, so it has to fail here, legibly, instead.
 */
const photoPath = z
  .string()
  .trim()
  .max(200)
  .refine((value) => value.startsWith("/"), {
    message: "Use a path under /public, like /images/team/jane-doe.jpg — not a web address.",
  })
  // "//example.com/x.jpg" is protocol-relative: it starts with "/" but is
  // still remote.
  .refine((value) => !value.startsWith("//"), {
    message: "Use a path under /public, like /images/team/jane-doe.jpg — not a web address.",
  })
  .refine((value) => !value.includes(".."), {
    message: "That path isn't valid.",
  })
  // An uploaded photo is served from a route and therefore has no file
  // extension, so it is accepted by shape instead. The pattern is anchored and
  // its id class is narrow, which is what keeps this from being a hole in the
  // extension check above — `/api/team-photo/` cannot be followed by a path.
  .refine((value) => TEAM_PHOTO_URL_PATTERN.test(value) || IMAGE_EXTENSION.test(value), {
    message: "That doesn't look like an image file (.jpg, .png, .webp, .avif, .gif or .svg).",
  });

const teamMemberInputSchema = z
  .object({
    // Absent for someone being added. Never trusted as proof the row exists —
    // teamService treats an unknown id as a new member.
    id: z.string().min(1).optional(),
    name: z.string().trim().min(1, "Every team member needs a name.").max(120),
    role: z.string().trim().min(1, "Every team member needs a role.").max(120),
    bio: z.string().trim().min(1, "Every team member needs a short bio.").max(600),
    // The form always submits this field, so an untouched one arrives as "".
    // Normalising it to undefined here means the component doesn't have to care,
    // and TeamGrid's existing `member.photo &&` check keeps working.
    photo: z
      .string()
      .optional()
      .transform((value) => (value === undefined || value.trim() === "" ? undefined : value.trim()))
      .pipe(photoPath.optional()),
  })
  .strict();

export const saveTeamSchema = z
  .object({
    // Capped because saveTeam rewrites the whole roster in one transaction. A
    // business with more than fifty people on its About page has a different
    // problem, and the cap keeps a paste accident from becoming a long lock.
    members: z.array(teamMemberInputSchema).max(50, "That's more people than this page supports."),
  })
  .strict();

export type SaveTeamInput = z.infer<typeof saveTeamSchema>;
export type TeamMemberInput = z.infer<typeof teamMemberInputSchema>;
