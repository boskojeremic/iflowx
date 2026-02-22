import { redirect } from "next/navigation";

export default function AdminInvitesRedirect() {
  redirect("/core-admin/invites");
}