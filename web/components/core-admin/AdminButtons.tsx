// components/core-admin/AdminButtons.tsx
import * as React from "react";

type Variant = "green" | "blue" | "red" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  green: "bg-green-600 hover:bg-green-700",
  blue: "bg-blue-600 hover:bg-blue-700",
  red: "bg-red-600 hover:bg-red-700",
  ghost: "bg-white/10 hover:bg-white/15 border border-white/15 text-white",
};

export function AdminPrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
  }
) {
  const { className = "", variant = "green", disabled, ...rest } = props;

  return (
    <button
      {...rest}
      disabled={disabled}
      className={[
        // FIXED SIZE (Add/Save/Cancel)
        "w-[110px] h-[40px] inline-flex items-center justify-center rounded-md text-white",
        VARIANT_CLASS[variant],
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        className,
      ].join(" ")}
    />
  );
}

export function AdminRowButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
  }
) {
  const { className = "", variant = "blue", disabled, ...rest } = props;

  return (
    <button
      {...rest}
      disabled={disabled}
      className={[
        // FIXED SIZE (Edit/Delete)
        "w-[72px] h-[30px] inline-flex items-center justify-center rounded text-white text-sm",
        VARIANT_CLASS[variant],
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        className,
      ].join(" ")}
    />
  );
}