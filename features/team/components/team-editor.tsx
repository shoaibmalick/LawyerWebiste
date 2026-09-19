"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { TeamMemberRecord } from "../api/list-team";
import { saveTeamAction, type TeamActionResult } from "../api/save-team";

type Draft = {
  /**
   * Stable React key. A member added in the browser has no database id yet,
   * and keying on the array index would make every input lose focus and swap
   * values the moment a row moved.
   */
  key: string;
  id?: string;
  name: string;
  role: string;
  bio: string;
  photo: string;
};

type TeamEditorProps = {
  members: TeamMemberRecord[];
  /**
   * Photo paths whose licence legally requires visible credit. Replacing one
   * of these is the single action on this page with a consequence outside the
   * website, so it gets said out loud rather than left in a config comment.
   */
  attributionRequiredSrcs: string[];
};

let draftCounter = 0;
const nextKey = () => `draft-${draftCounter++}`;

function toDraft(member: TeamMemberRecord): Draft {
  return {
    key: member.id,
    id: member.id,
    name: member.name,
    role: member.role,
    bio: member.bio,
    photo: member.photo ?? "",
  };
}

export function TeamEditor({ members, attributionRequiredSrcs }: TeamEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<TeamActionResult | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>(() => members.map(toDraft));

  const requiresAttribution = new Set(attributionRequiredSrcs);

  /** Which row is mid-upload, so only that row's button shows a spinner. */
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<{ key: string; message: string } | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  /**
   * Uploads immediately, rather than at save time.
   *
   * The roster save rewrites every member in one transaction, and posting
   * several megabytes of image bytes through a Server Action alongside it
   * would make that transaction as slow as the slowest upload. Uploading first
   * and storing the returned path keeps the save to what it was: a small,
   * quick write of text.
   *
   * The cost is that an upload nobody saves becomes an orphan row, which is
   * why teamPhotoService sweeps unreferenced photos after each save.
   */
  async function upload(key: string, file: File) {
    setUploadError(null);
    setUploading(key);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/admin/team-photo", { method: "POST", body });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setUploadError({
          key,
          message:
            typeof payload?.error === "string"
              ? payload.error
              : "That upload didn't work. Please try again.",
        });
        return;
      }

      update(key, "photo", payload.url);
    } catch {
      setUploadError({ key, message: "Network error. Please try again." });
    } finally {
      setUploading(null);
    }
  }

  function update(key: string, field: keyof Omit<Draft, "key" | "id">, value: string) {
    setDrafts((current) =>
      current.map((draft) => (draft.key === key ? { ...draft, [field]: value } : draft)),
    );
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= drafts.length) return;
    setDrafts((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(key: string) {
    setDrafts((current) => current.filter((draft) => draft.key !== key));
  }

  function add() {
    setDrafts((current) => [
      ...current,
      { key: nextKey(), name: "", role: "", bio: "", photo: "" },
    ]);
  }

  function onSave() {
    setResult(null);
    startTransition(async () => {
      const outcome = await saveTeamAction({
        members: drafts.map(({ id, name, role, bio, photo }) => ({ id, name, role, bio, photo })),
      });
      setResult(outcome);
      // Re-fetch so the ids of newly created members arrive, and so a second
      // save doesn't try to create them all over again.
      if (outcome.ok) router.refresh();
    });
  }

  return (
    <section className="border-border flex flex-col gap-5 rounded-lg border p-5">
      <div>
        <h2 className="text-foreground text-lg font-medium">Who you&apos;ll meet</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          The people shown on the homepage, in this order. Changes appear on the site as soon as you
          save.
        </p>
      </div>

      {drafts.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No team members. The homepage will not show a team section at all until you add someone.
        </p>
      )}

      <ol className="flex flex-col gap-4">
        {drafts.map((draft, index) => (
          <li key={draft.key} className="border-border flex flex-col gap-4 rounded-lg border p-4">
            <div className="flex items-start gap-4">
              {/* The real card crop. TeamGrid renders portraits at 4:5 with
                  object-cover, so a landscape photo loses its subject's head —
                  better to find that out here than on the live homepage. */}
              <div className="bg-muted relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-md">
                {draft.photo.trim() !== "" && (
                  // Deliberately not next/image: this is an admin preview of a
                  // path that may not resolve yet, and next/image throws on a
                  // bad src where a plain img just shows nothing.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.photo}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-foreground font-medium">Name</span>
                  <input
                    value={draft.name}
                    onChange={(event) => update(draft.key, "name", event.target.value)}
                    placeholder="Dr. Jane Doe"
                    className="border-border rounded-md border px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-foreground font-medium">Role</span>
                  <input
                    value={draft.role}
                    onChange={(event) => update(draft.key, "role", event.target.value)}
                    placeholder="Associate Dentist, DDS"
                    className="border-border rounded-md border px-3 py-2"
                  />
                </label>
              </div>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-foreground font-medium">Short bio</span>
              <textarea
                value={draft.bio}
                onChange={(event) => update(draft.key, "bio", event.target.value)}
                rows={3}
                placeholder="A sentence or two about their experience and how they work with customers."
                className="border-border rounded-md border px-3 py-2"
              />
            </label>

            <div className="flex flex-col gap-2 text-sm">
              <span className="text-foreground font-medium">Photo</span>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading === draft.key}
                  onClick={() => fileInputs.current[draft.key]?.click()}
                >
                  {uploading === draft.key ? "Uploading…" : "Upload a photo"}
                </Button>

                {draft.photo.trim() !== "" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => update(draft.key, "photo", "")}
                  >
                    Remove
                  </Button>
                )}
              </div>

              {/* Hidden, and driven by the button above, because the native
                  control cannot be styled to match anything else on the page.
                  `accept` is a convenience for the file picker only — the
                  server decides what is really an image, by reading the bytes. */}
              <input
                ref={(element) => {
                  fileInputs.current[draft.key] = element;
                }}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  // Cleared so choosing the same file twice in a row still
                  // fires a change event — otherwise a failed upload cannot be
                  // retried without picking something else first.
                  event.target.value = "";
                  if (file) void upload(draft.key, file);
                }}
              />

              {uploadError?.key === draft.key && (
                <p className="text-destructive">{uploadError.message}</p>
              )}

              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">
                  …or the path of a file already on the site
                </span>
                <input
                  value={draft.photo}
                  onChange={(event) => update(draft.key, "photo", event.target.value)}
                  placeholder="/images/team/jane-doe.jpg"
                  className="border-border rounded-md border px-3 py-2"
                />
              </label>
            </div>

            {requiresAttribution.has(draft.photo.trim()) && (
              <p className="text-muted-foreground text-sm">
                This photo is licensed stock and its licence requires a visible credit. Changing or
                removing it also removes its entry from the credits page, which is correct — but the
                photo file must not then be used anywhere else on the site.
              </p>
            )}

            {/* The Button primitive rather than underlined text, per
                CLAUDE.md: it already carries hover, focus-visible and disabled
                states, and it is what picks up the 44px touch target on a
                phone. As bare text these were ~20px tall with no padding, in a
                row that could not wrap. */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => move(index, -1)}
                disabled={index === 0}
              >
                Move up
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => move(index, 1)}
                disabled={index === drafts.length - 1}
              >
                Move down
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => remove(draft.key)}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" variant="outline" onClick={add}>
          Add team member
        </Button>
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? "Saving…" : "Save team"}
        </Button>
        {result && (
          <p className={result.ok ? "text-foreground text-sm" : "text-destructive text-sm"}>
            {result.ok ? result.message : result.error}
          </p>
        )}
      </div>
    </section>
  );
}
