import { redirect } from "next/navigation";

export default function AdminTenantsNewRedirect() {
  redirect("/core-admin/tenants/new");
}