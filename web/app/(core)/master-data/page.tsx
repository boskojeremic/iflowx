"use client";

import Link from "next/link";

export default function MasterDataPage() {
  const cards = [
    {
    title: "Sites",
    description: "Manage Tenant Sites, Fields, Plants, And Operating Areas",
    href: "/master-data/sites",
  },
  {
    title: "Facilities",
    description: "Manage Facilities Within Selected Tenant Sites",
    href: "/master-data/facilities",
  },
    {
      title: "Asset Types",
      description: "Define Standard Asset Type Catalog For Tenant Setup",
      href: "/master-data/asset-types",
    },
    {
      title: "Assets",
      description: "Manage Assets, Hierarchy, Roles, And Reporting Sources",
      href: "/master-data/assets",
    },
    {
      title: "Parameters",
      description: "Define Reporting Parameters, Units, And Source Configuration",
      href: "/master-data/parameters",
    },
    {
      title: "Measurement Points",
      description: "Set Up Data Capture Points, Tags, And Measurement Sources",
      href: "/master-data/measurement-points",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Master Data Admin</h1>
        <p className="mt-1 text-sm text-white/60">
          Tenant-Level Technical Setup For Sites, Facilities, Assets, Parameters, And Measurement Sources
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 text-xs uppercase tracking-wider text-white/40">
          Master Data Areas
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/[0.06]"
            >
              <div className="font-semibold">{card.title}</div>
              <div className="mt-2 text-sm text-white/65">{card.description}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="text-sm font-semibold">Current Scope</div>
        <div className="mt-2 text-sm text-white/65">
          This Area Is Reserved For Master Table Administration By Authorized Tenant Users.
          Tenant Admin Assigns Privileges, While Master Data Admin Maintains Operational Structure.
        </div>
      </div>
    </div>
  );
}