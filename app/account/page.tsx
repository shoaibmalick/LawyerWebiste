import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listMyBookings } from "@/features/customer-accounts";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (session?.user?.role !== "customer" || !session.user.email) {
    redirect("/account/login");
  }

  // No argument: listMyBookings re-derives the customer from the session
  // itself, so this page cannot ask for anyone else's history even by mistake.
  const bookings = await listMyBookings();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">My bookings</h1>
      <div className="flex flex-col gap-3">
        {bookings.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No bookings yet under {session.user.email}.
          </p>
        )}
        {bookings.map((booking) => (
          <div key={booking.id} className="border-border rounded-lg border p-4 text-sm">
            <p className="text-foreground font-medium">{booking.serviceSlug}</p>
            <p className="text-muted-foreground">{formatDateTime(booking.slot.startsAt)}</p>
            <p className="text-muted-foreground">Status: {booking.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
