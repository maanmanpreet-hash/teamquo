# Quote Workflow and Pricing Philosophy

This document locks the Team QUO quote workflow and pricing rules for future development.

## Quote Pricing Philosophy

Material calculations are internal cost calculations only. They show the operator the material cost basis of a wall. The final customer-facing Supply & Install price is manually entered per wall after reviewing the calculated material cost. The manual wall price includes labour, margin, difficulty, site conditions, travel, risk, and operator judgement. Customer quotes must show only the final wall price and final total, not internal material costs or product-level pricing.

Core rule:

> Material cost tells me what the job costs me. Manual Supply & Install price is what I charge the customer. The difference covers labour, margin, site difficulty, risk, travel, and judgement.

## Pricing Model

1. Product and material selections calculate internal material cost.
2. Internal material cost is for operator reference only.
3. The final customer-facing price is manually entered by the operator.
4. The manual final price is wall-level.
5. The final quote total is the sum of all wall-level manual Supply & Install prices.
6. Product prices, product quantities, material costs, labour, margin, and markup must not appear on the customer-facing quote.
7. Internal material cost must never be treated as the final customer price.

## Operator Workflow

1. Create the wall.
2. Enter wall dimensions.
3. Select products, materials, and custom addons.
4. Review the calculated internal material cost.
5. Enter the manual Supply & Install price for that wall.
6. Generate the customer quote using the manual wall prices.

## Terminology Rules

Use these names for internal/operator screens:

- Internal material cost
- Calculated material cost
- Material cost estimate

Use this name only for the manual customer-facing price:

- Supply & Install price

Avoid using vague names such as `price`, `total`, or `estimate` unless the variable, label, or helper clearly states whether it is internal material cost or customer-facing manual price.

Preferred code concepts where future changes require them:

- `internalMaterialCostCents`
- `manualSupplyInstallPriceCents`
- `customerQuoteTotalCents`

## Customer-Facing Quote Rules

Do not change the customer quote to expose internal costing.

The customer-facing quote may show:

- Wall name
- Wall dimensions
- Included products as scope only
- One final wall-level Supply & Install price
- One final Supply and Install Total

The customer-facing quote must not show:

- Product-level prices
- Product quantities
- Material costs
- Labour costs
- Margin or markup
- Internal calculation notes
- Internal review warnings

## Development Guardrails

Future changes must keep internal material cost and manual customer price separate.

Before changing pricing, quote generation, product selection, material calculations, or quote rendering, confirm which value is being handled:

1. Internal material cost: what the job costs the business in materials.
2. Manual Supply & Install price: what the customer is charged.
3. Customer quote total: sum of manual wall-level Supply & Install prices.

Do not use calculated material cost as the customer quote total.
Do not redesign the customer quote unless explicitly requested.
Do not add product-level itemisation to the customer quote.
