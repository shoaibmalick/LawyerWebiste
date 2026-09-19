import { notFound } from "next/navigation";
import {
  listReviewsForModeration,
  parseReviewStatusParam,
  ReviewModerationList,
  ReviewStatusTabs,
  type ReviewRow,
} from "@/features/reviews";
import { isFeatureEnabled } from "@/lib/features";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

const HEADINGS: Record<string, string> = {
  PENDING: "Reviews awaiting approval",
  APPROVED: "Published reviews",
  HIDDEN: "Hidden reviews",
  ALL: "All reviews",
};

export default async function ReviewsModerationPage({
  searchParams,
}: {
  // Next 16 made searchParams a Promise. Annotated explicitly rather than via
  // the generated PageProps<'/…'> helper: nothing else in this repo uses that
  // helper and .next/types does not exist on a clean checkout, so it would
  // break `npm run typecheck` before the first build.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Middleware is a redirect convenience, not the gate. proxy.ts matches
  // /dashboard/:path* and redirects, but Next.js has a documented
  // middleware-authorisation-bypass class (CVE-2025-29927) and a matcher is a
  // routing rule rather than a property of this page. requireAdmin asserts
  // role === "admin", so a signed-in *customer* — a valid session on the same
  // Auth.js instance — fails it here even if it reached this far.
  await requireAdmin();

  // Gate before touching the database — a disabled feature should not reach it
  // at all.
  if (!isFeatureEnabled("reviews")) {
    notFound();
  }

  const params = await searchParams;
  const view = parseReviewStatusParam(params.status);

  const { reviews, matching, counts } = await listReviewsForModeration({
    status: view === "ALL" ? undefined : view,
  });

  // Formatted here, not in the client component: lib/format reads the business
  // timezone from config, which has no business in the browser bundle, and
  // preformatting rules out a server/client date mismatch.
  const rows: ReviewRow[] = reviews.map((review) => ({
    id: review.id,
    authorName: review.authorName,
    rating: review.rating,
    comment: review.comment,
    status: review.status,
    submittedLabel: formatDate(review.createdAt),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          {HEADINGS[view] ?? "Reviews"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Published reviews appear on the website. Hiding one takes it down without deleting it, so
          you can put it back later.
        </p>
      </div>

      <ReviewStatusTabs active={view} counts={counts} />

      {matching > rows.length && (
        // Capped so a spam flood can't make the page unloadable. Say what is
        // being withheld rather than truncating silently.
        <p className="text-muted-foreground text-sm">
          Showing {rows.length} of {matching} in this view.
        </p>
      )}

      <ReviewModerationList reviews={rows} />
    </div>
  );
}
