"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  success?: string;
};

export default function EmployeeToastListener({ success }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const lastShownRef = useRef<string>("");

  useEffect(() => {
    if (!success) {
      lastShownRef.current = "";
      return;
    }

    if (lastShownRef.current === success) return;
    lastShownRef.current = success;

    if (success === "created") {
      toast.success("Employee created successfully.");
    } else if (success === "updated") {
      toast.success("Employee updated successfully.");
    } else if (success === "inactive") {
      toast.success("Employee set to inactive.");
    } else if (success === "deleted") {
      toast.success("Employee deleted successfully.");
    }

    const timer = setTimeout(() => {
      router.replace(pathname);
    }, 1200);

    return () => clearTimeout(timer);
  }, [success, pathname, router]);

  return null;
}