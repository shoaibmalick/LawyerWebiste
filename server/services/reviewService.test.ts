import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ReviewNotFoundError, reviewService } from "./reviewService";

const review = (over: Partial<{ authorName: string; rating: number; comment: string }> = {}) =>
  reviewService.createReview({
    authorName: "Sam",
    rating: 5,
    comment: "Great!",
    ...over,
  });

describe("reviewService", () => {
  beforeEach(async () => {
    await prisma.review.deleteMany();
  });

  afterAll(async () => {
    await prisma.review.deleteMany();
    await prisma.$disconnect();
  });

  it("creates a review with PENDING status by default", async () => {
    expect((await review()).status).toBe("PENDING");
  });

  it("does not show a pending review as approved", async () => {
    await review();

    expect(await reviewService.listApproved()).toHaveLength(0);
  });

  it("shows an approved review once approved", async () => {
    const created = await review();
    await reviewService.approveReview(created.id);

    const approved = await reviewService.listApproved();
    expect(approved).toHaveLength(1);
    expect(approved[0].id).toBe(created.id);

    const { reviews: pending, matching } = await reviewService.listForModeration({
      status: "PENDING",
    });
    expect(pending).toHaveLength(0);
    expect(matching).toBe(0);
  });

  describe("hiding", () => {
    /**
     * The regression this whole feature exists to prevent.
     *
     * Hiding is the client saying "take this off my website". If a hidden
     * review can still reach the public page, the feature is worse than not
     * having shipped it — they would believe it was gone.
     */
    it("takes a hidden review off the public list", async () => {
      const created = await review();
      await reviewService.approveReview(created.id);
      expect(await reviewService.listApproved()).toHaveLength(1);

      await reviewService.hideReview(created.id);

      expect(await reviewService.listApproved()).toHaveLength(0);
    });

    it("puts a hidden review back on the public list when approved again", async () => {
      const created = await review();
      await reviewService.approveReview(created.id);
      await reviewService.hideReview(created.id);

      await reviewService.approveReview(created.id);

      expect(await reviewService.listApproved()).toHaveLength(1);
    });

    it("hides without deleting, so the row can be recovered", async () => {
      // The behaviour that replaced delete-on-reject. The old implementation
      // destroyed the row, so an accidental click was unrecoverable.
      const created = await review();
      await reviewService.hideReview(created.id);

      const found = await prisma.review.findUnique({ where: { id: created.id } });
      expect(found).not.toBeNull();
      expect(found?.status).toBe("HIDDEN");
    });

    it("can hide a review that was never approved", async () => {
      const created = await review();

      await reviewService.hideReview(created.id);

      expect((await prisma.review.findUnique({ where: { id: created.id } }))?.status).toBe(
        "HIDDEN",
      );
    });
  });

  describe("deleting", () => {
    it("removes the row only when asked explicitly", async () => {
      const created = await review({ authorName: "Spam", comment: "buy cheap" });

      await reviewService.deleteReview(created.id);

      expect(await prisma.review.findUnique({ where: { id: created.id } })).toBeNull();
    });
  });

  describe("listForModeration", () => {
    async function oneOfEach() {
      const pending = await review({ authorName: "Pending person" });
      const approved = await review({ authorName: "Approved person" });
      const hidden = await review({ authorName: "Hidden person" });
      await reviewService.approveReview(approved.id);
      await reviewService.hideReview(hidden.id);
      return { pending, approved, hidden };
    }

    it("returns only the requested status", async () => {
      const { pending, approved, hidden } = await oneOfEach();

      for (const [status, expected] of [
        ["PENDING", pending.id],
        ["APPROVED", approved.id],
        ["HIDDEN", hidden.id],
      ] as const) {
        const result = await reviewService.listForModeration({ status });
        expect(
          result.reviews.map((r) => r.id),
          status,
        ).toEqual([expected]);
        expect(result.matching, status).toBe(1);
      }
    });

    it("returns every status when none is given", async () => {
      await oneOfEach();

      const { reviews, matching } = await reviewService.listForModeration();

      expect(reviews).toHaveLength(3);
      expect(matching).toBe(3);
    });

    it("counts every status regardless of which one is being viewed", async () => {
      // The counts drive the tab labels, so they must describe the whole table
      // rather than the current filter — otherwise every tab would read (n) of
      // itself and switching views would look like data disappearing.
      await oneOfEach();

      const { counts } = await reviewService.listForModeration({ status: "PENDING" });

      expect(counts).toEqual({ PENDING: 1, APPROVED: 1, HIDDEN: 1, all: 3 });
    });

    it("reports zero for a status with no reviews", async () => {
      await review();

      const { counts } = await reviewService.listForModeration();

      expect(counts).toEqual({ PENDING: 1, APPROVED: 0, HIDDEN: 0, all: 1 });
    });

    it("orders the pending queue oldest first and the archive newest first", async () => {
      // The 5ms gaps are not superstition: createdAt is timestamp(3), and rows
      // written inside the same millisecond tie — a race that failed roughly
      // one run in eight before leadService's tests started spacing inserts.
      const first = await review({ authorName: "First" });
      await new Promise((resolve) => setTimeout(resolve, 5));
      const second = await review({ authorName: "Second" });

      const queue = await reviewService.listForModeration({ status: "PENDING" });
      expect(queue.reviews.map((r) => r.id)).toEqual([first.id, second.id]);

      await reviewService.approveReview(first.id);
      await reviewService.approveReview(second.id);

      const archive = await reviewService.listForModeration({ status: "APPROVED" });
      expect(archive.reviews.map((r) => r.id)).toEqual([second.id, first.id]);
    });
  });

  describe("when the review is already gone", () => {
    // The two-tabs case: the dashboard list is a snapshot, so acting on a row
    // someone else just deleted has to be a friendly message rather than an
    // error page.
    it.each([
      ["approveReview", (id: string) => reviewService.approveReview(id)],
      ["hideReview", (id: string) => reviewService.hideReview(id)],
      ["deleteReview", (id: string) => reviewService.deleteReview(id)],
    ])("%s throws ReviewNotFoundError", async (_name, act) => {
      await expect(act("does-not-exist")).rejects.toBeInstanceOf(ReviewNotFoundError);
    });
  });
});
