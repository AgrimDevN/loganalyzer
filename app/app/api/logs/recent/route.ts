import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { logs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);

  const recent = await db
    .select({
      id: logs.id,
      serviceName: logs.serviceName,
      severity: logs.severity,
      message: logs.message,
      createdAt: logs.createdAt,
    })
    .from(logs)
    .where(eq(logs.userId, session.userId))
    .orderBy(desc(logs.createdAt))
    .limit(limit);

  return NextResponse.json(recent);
}
