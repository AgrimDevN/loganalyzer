import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { incidents } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(incidents)
      .orderBy(desc(incidents.createdAt))
      .limit(50);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
