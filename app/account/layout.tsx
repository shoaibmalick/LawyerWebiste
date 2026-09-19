import { auth, signOut } from "@/auth";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-border flex items-center justify-between border-b px-6 py-4">
        <span className="text-foreground text-sm font-medium">My Account</span>
        {session?.user?.role === "customer" && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="text-foreground underline">
                Sign out
              </button>
            </form>
          </div>
        )}
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
