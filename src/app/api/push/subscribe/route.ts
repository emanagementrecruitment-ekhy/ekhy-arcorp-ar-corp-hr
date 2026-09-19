import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => null);
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : "";
    const auth = typeof body?.keys?.auth === "string" ? body.keys.auth : "";
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Data langganan push tidak lengkap." }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { endpoint, p256dh, auth, employeeId: session.employeeId },
      // Re-subscribing (e.g. a different employee logs in on the same
      // browser profile) must repoint the row at the new employee rather
      // than error on the unique endpoint — the old owner no longer wants
      // pushes delivered to a device they're not logged into anymore.
      update: { p256dh, auth, employeeId: session.employeeId },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireSession();
    const body = await req.json().catch(() => null);
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    if (!endpoint) return NextResponse.json({ error: "Endpoint wajib diisi." }, { status: 400 });
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
