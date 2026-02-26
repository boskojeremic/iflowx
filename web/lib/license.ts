// lib/license.ts
import { db } from "@/lib/db";

export async function checkUserLicense(email: string) {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true },
  });
  if (!user) return { ok: false, active: false, reason: "USER_NOT_FOUND" };

  const now = new Date();

  // user -> memberships -> tenant -> tenantModules
  const memberships = await db.membership.findMany({
    where: {
      userId: user.id,
      status: { in: ["ACTIVE", "INVITED"] }, // kako ti koristiš
    },
    select: {
      tenantId: true,
      tenant: {
        select: {
          id: true,
          name: true,
          code: true,
          tenantModules: {
            where: { status: "ACTIVE" },
            select: { startsAt: true, endsAt: true, seatLimit: true, moduleId: true },
          },
        },
      },
    },
  });

  // validno ako postoji bar jedan ACTIVE module gde je "now" u opsegu
  const valid = memberships.some((m) =>
    (m.tenant?.tenantModules ?? []).some((tm) => {
      const s = tm.startsAt ?? new Date(0);
      const e = tm.endsAt ?? new Date("2999-12-31");
      return now >= s && now <= e;
    })
  );

  return { ok: true, active: valid };
}