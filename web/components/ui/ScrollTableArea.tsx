"use client";

export default function ScrollTableArea({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-h-[50vh] overflow-auto overscroll-contain [webkit-overflow-scrolling:touch] md:h-full md:max-h-[62vh]">
      {children}
    </div>
  );
}