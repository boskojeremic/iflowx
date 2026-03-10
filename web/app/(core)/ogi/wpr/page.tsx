export default function WellProductionPage() {
  return (
    <div className="h-full p-4 bg-[#021b16]">
      <div className="h-[calc(100vh-120px)] rounded-2xl overflow-hidden shadow-xl border border-emerald-900">
        <iframe
          title="Well Production Report"
          src="https://app.powerbi.com/reportEmbed?reportId=0f4915be-6dbf-42fc-8e67-1e27b05c78ab&autoAuth=true&ctid=a69bf50c-65ed-4660-985b-04e1ffe59fdc&navContentPaneEnabled=false&pageNavigationPosition=none&filterPaneEnabled=false"
          className="w-full h-full border-0"
          allowFullScreen
        />
      </div>
    </div>
  );
}