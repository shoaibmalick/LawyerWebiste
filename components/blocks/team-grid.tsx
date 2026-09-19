import Image from "next/image";

/**
 * Structural rather than the config `TeamMember` type: the roster is database-
 * backed now, and a Prisma row's `photo` is `string | null` where config's is
 * `string | undefined`. Accepting both keeps this block usable from either
 * source, which matters for a client repo that hasn't adopted the settings
 * panel.
 */
type TeamGridMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo?: string | null;
};

type TeamGridProps = {
  team: TeamGridMember[];
};

export function TeamGrid({ team }: TeamGridProps) {
  // A client can remove everyone from /dashboard/settings. Rendering the
  // heading above an empty grid would look like a loading failure, so the
  // section goes away entirely.
  if (team.length === 0) return null;

  return (
    <section id="team" className="border-border bg-secondary/30 border-t">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-foreground text-3xl font-semibold tracking-tight">Meet the team</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {team.map((member) => (
            <div key={member.id}>
              {/* Without a photo this stays the plain muted square it has always been. */}
              <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-xl">
                {member.photo && (
                  <Image
                    src={member.photo}
                    alt={`${member.name}, ${member.role}`}
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="object-cover"
                  />
                )}
              </div>
              <h3 className="text-foreground mt-4 text-base font-medium">{member.name}</h3>
              <p className="text-primary text-sm">{member.role}</p>
              <p className="text-muted-foreground mt-2 text-sm">{member.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
