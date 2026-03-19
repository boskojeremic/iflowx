export default function PdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div style={{ margin: 0, background: "#ffffff" }}>{children}</div>;
}