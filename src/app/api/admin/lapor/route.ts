import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { timeLabel, dLabel } from "@/lib/format";

export async function GET(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    if (employeeId) {
      const [employee, messages] = await Promise.all([
        prisma.employee.findUniqueOrThrow({ where: { id: employeeId } }),
        prisma.chatMessage.findMany({ where: { employeeId }, orderBy: { createdAt: "asc" } }),
      ]);
      return NextResponse.json({
        employee: { id: employee.id, name: employee.name, code: employee.code, place: employee.homePlace },
        messages: messages.map((m) => ({
          id: m.id,
          fromSupervisor: m.fromSupervisor,
          text: m.text,
          time: `${dLabel(m.createdAt)} ${timeLabel(m.createdAt)}`,
        })),
      });
    }

    const employees = await prisma.employee.findMany({
      where: { accessRole: "KARYAWAN", chatsAsEmployee: { some: {} } },
      include: { chatsAsEmployee: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    const threads = employees
      .map((e) => {
        const last = e.chatsAsEmployee[0];
        return {
          id: e.id,
          name: e.name,
          code: e.code,
          place: e.homePlace,
          lastText: last?.text ?? "",
          lastAt: last?.createdAt ?? new Date(0),
        };
      })
      .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
      .map(({ lastAt, ...t }) => ({ ...t, lastTime: timeLabel(lastAt) }));

    return NextResponse.json({ threads });
  } catch (e) {
    return apiError(e);
  }
}
