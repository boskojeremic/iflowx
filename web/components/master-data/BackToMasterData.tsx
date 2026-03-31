"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function BackToMasterData() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/master-data")}
      className="
        group inline-flex items-center
        rounded-full
        border border-white/10
        bg-white/[0.03]
        px-3 py-1.5
        text-sm text-white/75
        backdrop-blur-md
        transition-all duration-200
        hover:bg-white/[0.06]
        hover:border-white/15
        hover:text-white
        active:scale-[0.98]
      "
    >
      <span className="flex items-center overflow-hidden">
        <ChevronLeft
          className="
            h-4 w-4 shrink-0
            -mr-0.5
            transition-all duration-200
            group-hover:-translate-x-0.5
          "
        />
        <span
          className="
            ml-1
            transition-all duration-200
            group-hover:translate-x-0.5
          "
        >
          Back
        </span>
      </span>
    </button>
  );
}