# Cladding Quote App - 4-Stage Operational Platform Refactor

## Previous Phases (Completed)
- [x] Phase 1-9: Initial MVP with quoting form, product management, job tracking, PDF generation

## NEW: Phase 1 - Database Schema Refactor for 4-Stage Workflow
- [x] Add `operator_name` field to jobs table
- [x] Create operators table (id, name, created_at, updated_at)
- [x] Add `stage` field to jobs table (enum: 'quoting', 'procurement', 'installation', 'invoicing')
- [x] Add `stage_status` field to jobs table to track progress within each stage
- [x] Create stage_transitions table to log stage changes with timestamps
- [x] Generate and execute Drizzle migration
- [x] Write vitest tests for operator queries

## NEW: Phase 2 - Professional Home Screen & Operator Management
- [x] Create professional home screen with company logo placeholder
- [x] Build operator selection dropdown (populated from operators table)
- [ ] Add operator management CRUD in admin panel
- [ ] Implement operator add/remove functionality
- [ ] Add form validation for operator names
- [x] Style home screen for tablet/PC with fixed viewport
- [ ] Write vitest tests for operator selection logic

## NEW: Phase 3 - Stage 1: Quoting Workspace (Self-Contained)
- [ ] Refactor QuoteForm to be Stage 1 specific
- [ ] Remove procurement/installation fields from Stage 1
- [ ] Add operator name display in Stage 1 header
- [ ] Implement real-time cost estimation with volume discounts
- [ ] Add "Save Quote" and "Generate PDF" buttons
- [ ] Implement quote status transition to "Booked"
- [ ] Optimize form layout for tablet (no scrolling)
- [ ] Write vitest tests for Stage 1 workflow

## NEW: Phase 4 - Stage 2: Procurement & Materials
- [ ] Create Bill of Materials (BOM) generator
- [ ] Auto-calculate required materials from Stage 1 dimensions
- [ ] Generate printable material checklist
- [ ] Create Stage 2 UI with BOM display
- [ ] Add print functionality for material list
- [ ] Implement stage transition from "Booked" to "Procurement"
- [ ] Write vitest tests for BOM calculation

## NEW: Phase 5 - Stage 3: Installation & Operations
- [ ] Create Stage 3 UI with job details display
- [ ] Add installation notes field
- [ ] Implement completion checklist
- [ ] Add photo/documentation upload capability
- [ ] Display original dimensions from Stage 1
- [ ] Implement stage transition to "Installation"
- [ ] Write vitest tests for Stage 3 workflow

## NEW: Phase 6 - Stage 4: Invoicing & Closeout
- [ ] Create financial summary display
- [ ] Show price override history
- [ ] Calculate final balance due
- [ ] Add manual price adjustment capability
- [ ] Implement job completion marking
- [ ] Generate final invoice/receipt
- [ ] Implement stage transition to "Completed"
- [ ] Write vitest tests for invoicing logic

## NEW: Phase 7 - Operator Management & Stage Gating
- [ ] Implement operator selection persistence (session/local storage)
- [ ] Add stage-gated access control (users can only see their current stage)
- [ ] Create operator profile/context provider
- [ ] Add operator name to all stage headers
- [ ] Implement stage navigation (forward only, no backtracking)
- [ ] Add stage progress indicator
- [ ] Write vitest tests for stage gating

## NEW: Phase 8 - UI/UX Optimization for Tablet/PC
- [ ] Implement fixed viewport layout (no scrolling)
- [ ] Create responsive grid system for tablet/PC
- [ ] Add touch-friendly button sizing (min 48px)
- [ ] Implement tabbed navigation for stages
- [ ] Remove pinch-zoom capability
- [ ] Optimize font sizes for readability on tablet
- [ ] Test on actual Android tablet and iPad
- [ ] Test on desktop PC browser

## NEW: Phase 9 - Final Testing & Delivery
- [ ] End-to-end testing of all 4 stages
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Performance testing on tablet
- [ ] Accessibility testing
- [ ] Create user documentation
- [ ] Prepare for deployment
- [ ] Final checkpoint and delivery
