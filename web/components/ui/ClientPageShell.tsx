"use client";

export default function ClientPageShell({
  title,
  subtitle,
  form,
  table,
}: {
  title: string;
  subtitle?: string;
  form?: React.ReactNode;
  table?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 md:h-full">
      <div className="shrink-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-white/60">{subtitle}</p>
        ) : null}
      </div>

      {form ? <div className="shrink-0">{form}</div> : null}

      {table ? (
        <div className="flex-1 md:min-h-0">
          {table}
        </div>
      ) : null}
    </div>
  );
}