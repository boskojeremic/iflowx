// app/(core)/core-admin/layout.tsx
import { requireSuperAdmin } from "@/lib/authz";

export default async function CoreAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin();
  return <div className="w-full">{children}</div>;
}