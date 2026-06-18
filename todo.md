# Skywall Cabinets - Quote Management Platform

## 🚨 URGENT BUGS - FIX NOW
- [x] Restore fireplace and mirror products to dropdown (currently missing)
- [x] Fix acoustic panels - auto-calculate quantity from wall dimensions ONLY
- [x] Remove manual acoustic panel dimension entry fields
- [x] Revert unnecessary scope changes from wall-product refactor

## 🚨 CRITICAL ISSUES - FIX IMMEDIATELY
- [x] Refactor workflow: walls first, THEN products per wall (not separate tabs)
- [x] Auto-calculate cladding panel quantity based on wall dimensions
- [x] Auto-calculate acoustic panel quantity based on wall dimensions
- [x] Add floating cabinet product to product list
- [x] Floating cabinet: add width, height, depth, height-from-floor fields
- [x] Products should be added to specific walls, not globally
- [x] Integrate wall dimensions with product quantity calculations
- [x] Fix product loading to query by product type
- [x] Load wall-specific products when resuming drafts
- [x] Verify floating cabinet product exists in database

## 🚨 CRITICAL BUGS - FIX IMMEDIATELY
- [x] Acoustic panel: Add wall dimensions fields when selected
- [x] Appointment: Change to date picker + time dropdown (rename to "Appointment")
- [x] Address: Add autocomplete dropdown with suburb auto-population
- [x] Operators: Seed with Manpreet, Ginni, Roopjit, Simar
- [x] Multiple walls: Make walls visible and manageable in quote form

## Phase 1: Partial Client Save + Quote Queue
- [x] Add "Save Draft" button to client details tab
- [x] Implement partial job creation (client details only, no products required)
- [x] Create quote queue view showing all pending/draft quotes
- [x] Add ability to view and resume incomplete quotes
- [x] Display quote status (draft, in-progress, completed)
- [x] Show which operator created each draft
- [x] Add appointment date/time to take call workflow
- [x] Add suburb field with dropdown (Kalkallo, Donnybrook, Mickleham, Craigieburn, Beveridge)
- [x] Sort queue by appointment date/time
- [x] Filter queue by suburb for field operators
- [x] Appointment renamed to "Appointment Date/Time" with dropdown selector
- [x] Address autocomplete with suburb auto-population
- [x] Seed operators table: Manpreet, Ginni, Roopjit, Simar
- [x] Add edit functionality for draft quotes
- [ ] Allow custom operator name entry
- [x] Write tests for partial save workflow

## Phase 2: Acoustic Panel Dimensions + Graphical Indicators
- [x] Add length and width fields for acoustic panels
- [x] Add graphical dimension indicators (icons for width, length, height)
- [x] Show wall dimensions fields alongside acoustic length/width
- [ ] Create visual guide showing which dimension is which
- [x] Update quantity calculation for acoustic panels (length x width)
- [x] Add validation for acoustic panel dimensions
- [x] Test dimension calculations with various inputs
- [x] Write tests for acoustic panel workflows

## Phase 3: Reference Image Upload
- [x] Add image upload field to client details tab
- [x] Implement image preview in client details
- [x] Store image reference in job record
- [x] Add image size/format validation (5MB limit)
- [x] Implement tRPC backend upload with S3 storage
- [x] Display reference image in quote summary
- [x] Include reference image in PDF export
- [x] Test image upload and storage

## Phase 4: Multiple Walls Support
- [x] Refactor job structure to support multiple walls
- [x] Add walls table with wall types (regular, garage, custom)
- [x] Implement wall type selection (regular wall, garage wall, custom)
- [x] Create tRPC walls router with CRUD operations
- [x] Allow editing/deleting individual walls
- [x] Add "Add Wall" button to walls tab UI
- [x] Create wall summary showing all walls in project
- [x] Wall type selection auto-shows dimension form
- [x] Dimension input with visual indicators (width/height icons)
- [x] Persist walls to backend via tRPC mutations
- [x] Load saved walls when resuming job
- [x] Update cost calculation to sum all walls
- [x] Display cost breakdown by wall in summary
- [x] Calculate per-wall totals
- [x] Implement wall-specific product selection
- [x] Test multi-wall quote creation

## Phase 5: PDF Download Fix
- [x] Fix PDF download so files appear in Downloads folder
- [x] Ensure proper MIME type for PDF blobs
- [x] Add .pdf extension validation
- [x] Use requestAnimationFrame for reliable downloads
- [ ] Test PDF generation and download

## Phase 6: Dashboard Redesign (Monday.com Inspired)
- [x] Implement kanban-style board view with 4 columns
- [x] Add color coding for job status (quoted, booked, commenced, completed)
- [x] Create job cards with client info, suburb, appointment
- [x] Add quick actions (edit, view PDF)
- [x] Implement toggle between kanban and list views
- [x] Add operator selection with badge display
- [x] Display job count per status column
- [x] Add search/filter functionality
- [x] Add operator assignment view
- [ ] Test dashboard performance with many jobs
- [ ] Optimize for tablet viewing
- [ ] Admin panel as editable master list for product prices and material dimensions

## Phase 7: Final Testing & Delivery
- [ ] End-to-end testing of complete workflow
- [ ] Test on actual Android tablet
- [ ] Performance testing
- [ ] Cross-browser testing
- [ ] User acceptance testing
- [ ] Documentation and help section
- [ ] Final polish and bug fixes
