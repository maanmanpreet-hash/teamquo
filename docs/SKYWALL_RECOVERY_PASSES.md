# SKYWALL TeamQuo recovery passes

Date: 2026-06-10

This file captures the recovery implementation direction after the Manus handover audit.

## Why this pass exists

The Manus handover identified repeated failures around the same areas:

- New Quote button and operator state
- Draft/resume measurement persistence
- Customer-facing PDF branding and layout
- Broken/missing PDF logo handling
- Product dropdowns being too large on tablet
- Long-press delete being unreliable
- Branch/preview confusion

The working rule going forward is:

- GitHub `main` is the source of truth.
- Manus previews/publishes only.
- Codex/Manus plans are not treated as done until the current repo confirms the code is present.

## Pass 1 — Quote start and dashboard reliability

Implemented direction:

- Dashboard New Quote now routes to `/quote`.
- Operator selection auto-falls back to the first available operator when no saved valid operator exists.
- Quote cards show `Q-YYYY-0001` style quote numbers.
- Dashboard PDF filenames use quote number.
- Dashboard PDF failures are surfaced as toasts instead of silent failure.

## Pass 2 — Jobs list recovery

Implemented direction:

- Jobs list uses `/quote?resumeJobId=...` for resume/edit.
- Jobs list shows quote numbers.
- Jobs list shows formatted money instead of raw cents math.
- Jobs list PDF filenames use quote number.
- Jobs list PDF failures are surfaced as toasts.

## Pass 3 — Customer-facing PDF rebuild

Implemented direction:

- Customer-facing quote branding uses SKYWALL, not TeamQuo.
- PDF avoids relying on a remote logo URL, preventing broken image placeholders.
- PDF uses a text SKYWALL wordmark and full company details.
- PDF uses Supply and Install wording.
- PDF shows products and quantities without per-line price breakdown.
- PDF shows a single Total Estimate.
- PDF includes standard quote terms.
- PDF includes quote number.

## Pass 4 — PDF safety guard

Implemented direction:

- Server blocks PDF generation for quotes with no saved products.
- Error message tells the user to save at least one product first.
- PDF response includes quote number.

## Pass 5 — Tablet dropdown compactness

Implemented direction:

- Select dropdown height is globally constrained.
- Select item vertical padding is reduced.
- This targets the repeated issue where product dropdowns were not compact on tablet.

## Still not done deliberately

These were not bundled into this pass because they carry higher UX/data risk and should be tested after the quote/PDF baseline is stable:

- Long-press delete and swipe delete
- Email quote integration
- Full quote lifecycle change to Draft / Sent / Accepted / Rejected
- Image compression before upload
- Database pooling/retry strategy

## Required verification

After pulling latest `main`, run:

```powershell
pnpm check
pnpm test
pnpm build
```

Then preview latest `main` in Manus and confirm Manus reports the latest commit SHA.

Manual test sequence:

1. Open Dashboard.
2. Confirm an operator is selected automatically when available.
3. Click New Quote and confirm `/quote` opens.
4. Create a quote with client details, wall, product, and cabinet dimensions if relevant.
5. Save draft.
6. Return to Jobs/Dashboard.
7. Resume quote and verify measurements/products are still present.
8. Generate PDF.
9. Confirm PDF says SKYWALL and uses Supply and Install wording.
10. Confirm PDF shows product quantities and one total estimate only.
11. Confirm an empty quote cannot generate PDF.
