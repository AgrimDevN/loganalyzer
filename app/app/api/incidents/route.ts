import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { incidents } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await db
      .select()
      .from(incidents)
      .where(eq(incidents.userId, session.userId))
      .orderBy(desc(incidents.createdAt))
      .limit(50);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
