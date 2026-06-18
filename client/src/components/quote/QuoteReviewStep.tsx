import { Loader2 } from "lucide-react";

import { MaterialSummaryCard } from "@/components/quote/MaterialSummaryCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMetres, formatMoney } from "@/lib/quote/formatters";
import { formatProductHeading } from "@/lib/quote/productTypeHelpers";
import type { WallProduct, WallWithProducts } from "@/lib/quote/types";
import {
  getWallAssociatedCost,
  hasManualWallSupplyInstallPrice,
} from "@/lib/quote/wallNotes";
import type { QuoteMaterialSummary } from "@shared/materialIntelligence";

interface QuoteReviewStepProps {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  suburb: string;
  wallsWithProducts: WallWithProducts[];
  manualReviewItems: Array<{ wall: WallWithProducts; product: WallProduct }>;
  saveInProgress: boolean;
  workflowReady: boolean;
  calculateTotal: () => number;
  materialSummary: QuoteMaterialSummary;
  onUpdateWallSupplyInstallPrice: (wallId: string, nextValue: string) => void;
  onSaveQuote: () => void;
  onSaveAndViewSetout: () => void;
}

function formatIncludedProductsSummary(products: WallProduct[]) {
  return products.map(product => formatProductHeading(product)).join(", ");
}

export function QuoteReviewStep({
  clientName,
  clientPhone,
  clientEmail,
  clientAddress,
  suburb,
  wallsWithProducts,
  manualReviewItems,
  saveInProgress,
  workflowReady,
  calculateTotal,
  materialSummary,
  onUpdateWallSupplyInstallPrice,
  onSaveQuote,
  onSaveAndViewSetout,
}: QuoteReviewStepProps) {
  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <h2 className="text-lg font-semibold">Review & Finalise Quote</h2>
        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <div>Client: <span className="font-medium">{clientName || "Not provided"}</span></div>
          <div>Phone: <span className="font-medium">{clientPhone || "Not provided"}</span></div>
          <div>Email: <span className="font-medium">{clientEmail || "Not provided"}</span></div>
          <div>Address: <span className="font-medium">{clientAddress || "Not provided"}</span></div>
          <div>Suburb: <span className="font-medium">{suburb || "Not provided"}</span></div>
        </div>

        <div className="space-y-3">
          {wallsWithProducts.map(wall => (
            <div key={wall.id} className="rounded-lg border p-3">
              <h4 className="font-semibold">{wall.wallName} ({formatMetres(wall.wallWidthMm)} x {formatMetres(wall.wallHeightMm)})</h4>
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <p className="font-medium text-slate-900">Included products</p>
                  <p className="text-slate-600">{formatIncludedProductsSummary(wall.products)}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Associated cost</p>
                  <p className="text-slate-600">{formatMoney(getWallAssociatedCost(wall))}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr,220px] md:items-end">
                <div className="text-sm text-gray-600">
                  Enter the final customer-facing Supply & Install price after reviewing the wall scope and associated cost.
                </div>
                <div>
                  <Label>Manual Supply & Install Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={wall.supplyInstallPrice ? (wall.supplyInstallPrice / 100).toFixed(2) : ""}
                    onChange={e => onUpdateWallSupplyInstallPrice(wall.id, e.target.value)}
                    placeholder={(getWallAssociatedCost(wall) / 100).toFixed(2)}
                    className="mt-1 h-10"
                  />
                </div>
              </div>
              {!hasManualWallSupplyInstallPrice(wall) ? (
                <p className="mt-3 text-sm font-medium text-amber-700">
                  Manual Supply & Install price still required before generating the customer quote.
                </p>
              ) : (
                <div className="mt-3 text-right text-sm font-semibold">
                  Final wall price: {formatMoney(wall.supplyInstallPrice)}
                </div>
              )}
            </div>
          ))}
        </div>

        {manualReviewItems.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">Manual review flags</p>
            <ul className="mt-1 list-disc pl-5">
              {manualReviewItems.map(({ wall, product }) => <li key={`${wall.id}-${product.id}`}>{wall.wallName} - {formatProductHeading(product)}</li>)}
            </ul>
          </div>
        )}

        <div className="text-right"><p className="text-2xl font-bold">Supply and Install Total Estimate: {formatMoney(calculateTotal())}</p></div>
        <Button onClick={onSaveQuote} className="h-10 w-full" disabled={saveInProgress || !workflowReady}>
          {saveInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Quote
        </Button>
        <Button
          onClick={onSaveAndViewSetout}
          variant="outline"
          className="h-10 w-full"
          disabled={saveInProgress || !workflowReady}
        >
          {saveInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save + View Setout
        </Button>
      </Card>

      <MaterialSummaryCard summary={materialSummary} />
    </div>
  );
}
