import { Card } from "@/components/ui/card";
import type { QuoteMaterialSummary } from "@shared/materialIntelligence";

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function MaterialSummaryCard({ summary }: { summary: QuoteMaterialSummary }) {
  return (
    <Card className="space-y-3 border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">Internal Material Summary</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600">Reference Material Cost</p>
          <p className="text-lg font-bold text-gray-900">{formatMoney(summary.referenceCostCents)}</p>
        </div>
      </div>

      {summary.consolidatedLines.length > 0 ? (
        <div className="rounded-lg border bg-white p-3">
          <h4 className="mb-2 text-sm font-semibold text-gray-900">Consolidated totals</h4>
          <div className="space-y-1 text-sm">
            {summary.consolidatedLines.map(line => (
              <div key={`${line.key}-${line.unitCostCents ?? "none"}`} className="grid grid-cols-[1fr_auto_auto] gap-3">
                <span className="text-gray-700">{line.name}</span>
                <span className="font-medium text-gray-900">{line.quantity}</span>
                <span className="text-right font-medium text-gray-900">{formatMoney(line.referenceCostCents)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-lg border bg-white p-3 text-sm text-gray-600">No automatic material lines yet.</p>
      )}

      {summary.notes.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">Material notes</p>
          <ul className="mt-1 list-disc pl-4">
            {summary.notes.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}
          </ul>
        </div>
      )}
    </Card>
  );
}
