import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ session: null });

  const employee = await prisma.employee.findUnique({ where: { id: session.employeeId } });
  if (!employee) return NextResponse.json({ session: null });

  return NextResponse.json({
    session: {
      employeeId: employee.id,
      code: employee.code,
      name: employee.name,
      level: employee.level,
      role: employee.role,
      accessRole: employee.accessRole,
      email: employee.email,
      phone: employee.phone,
    },
  });
}
