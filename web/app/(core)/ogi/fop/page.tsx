export default function FieldOperationsPage() {
  return (
    <div className="h-full p-4 bg-[#021b16] overflow-y-auto">
      <div className="h-[calc(100vh-120px)] rounded-2xl overflow-hidden shadow-xl border border-emerald-900">
        <iframe
          title="Field Operations Report"
          src="https://app.powerbi.com/reportEmbed?reportId=e3f62d62-d315-4728-8199-d215cc3689c3&autoAuth=true&ctid=a69bf50c-65ed-4660-985b-04e1ffe59fdc&navContentPaneEnabled=false&pageNavigationPosition=none&filterPaneEnabled=false"
          className="w-full h-full border-0"
          allowFullScreen
        />
      </div>
    </div>
  );
}