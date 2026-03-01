import LicenseStatusCard from "@/components/LicenseStatusCard";

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <LicenseStatusCard />
    </div>
  );
}