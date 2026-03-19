"use client";

import { useEffect, useMemo, useState } from "react";

type PowerBIEmbedProps = {
  reportUrl: string;
  title: string;
  className?: string;
  mobileHeightClassName?: string;
  desktopHeightClassName?: string;
};

export default function PowerBIEmbed({
  reportUrl,
  title,
  className = "",
  mobileHeightClassName = "h-[420px]",
  desktopHeightClassName = "md:h-[calc(100vh-320px)]",
}: PowerBIEmbedProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const ua = navigator.userAgent || navigator.vendor || "";
      const mobile =
        /iPhone|iPad|iPod|Android|Mobile|Opera Mini|IEMobile/i.test(ua) ||
        window.innerWidth < 768;

      setIsMobile(mobile);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    window.addEventListener("orientationchange", checkDevice);

    return () => {
      window.removeEventListener("resize", checkDevice);
      window.removeEventListener("orientationchange", checkDevice);
    };
  }, []);

  const finalUrl = useMemo(() => {
    const hasQuery = reportUrl.includes("?");
    const suffix =
      "navContentPaneEnabled=false&pageNavigationPosition=none&filterPaneEnabled=false";

    return hasQuery ? `${reportUrl}&${suffix}` : `${reportUrl}?${suffix}`;
  }, [reportUrl]);

  if (isMobile && isPortrait) {
    return (
      <div
        className={[
          "rounded-xl border border-white/10 bg-black/20 p-4",
          "h-[420px]",
          className,
        ].join(" ")}
      >
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="text-lg font-semibold text-white">{title}</div>

          <div className="mt-3 max-w-md text-sm text-white/60">
            For the best Power BI experience on mobile, rotate your device to
            landscape mode.
          </div>

          <div className="mt-2 max-w-md text-xs text-white/45">
            After rotating the phone, the option to open the report will appear.
          </div>

          <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Rotate device to landscape
          </div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div
        className={[
          "rounded-xl border border-white/10 bg-black/20 p-4",
          mobileHeightClassName,
          className,
        ].join(" ")}
      >
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="text-lg font-semibold text-white">{title}</div>

          <div className="mt-2 max-w-md text-sm text-white/60">
            Secure Power BI reports open better outside the embedded frame on
            mobile devices.
          </div>

          <div className="mt-1 max-w-md text-xs text-white/45">
            After viewing the report, use the browser Back button to return to
            the application.
          </div>

          <a
            href={finalUrl}
            className="mt-5 inline-flex items-center rounded-lg border border-emerald-500/20 bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            Open in Power BI
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "overflow-hidden rounded-xl border border-white/10 bg-[#06110d]",
        "h-[700px]",
        desktopHeightClassName,
        className,
      ].join(" ")}
    >
      <iframe
        title={title}
        src={finalUrl}
        className="h-full w-full border-0"
        allowFullScreen
      />
    </div>
  );
}