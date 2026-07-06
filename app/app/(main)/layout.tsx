import { Sidebar } from "@/components/Sidebar";
import { getSession } from "@/lib/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user] = await db.select().from(users).where(eq(users.id, session.userId));

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar user={user ? { name: user.name, email: user.email } : null} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
