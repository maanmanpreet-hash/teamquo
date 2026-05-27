# TeamQuo - Collaborative Quote Management Platform

## 🚨 CRITICAL BUGS - FIX IMMEDIATELY
- [x] Acoustic panel: Add wall dimensions fields when selected
- [x] Appointment: Change to date picker + time dropdown (rename to "Appointment")
- [x] Address: Add autocomplete dropdown with suburb auto-population
- [x] Operators: Seed with Manpreet, Ginni, Roopjit, Simar
- [ ] Multiple walls: Make walls visible and manageable in quote form

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
- [ ] Add edit functionality for draft quotes
- [ ] Seed operators table: Manpreet, Ginni, Roopjit, Simar
- [ ] Allow custom operator name entry
- [ ] Write tests for partial save workflow

## Phase 2: Acoustic Panel Dimensions + Graphical Indicators
- [x] Add length and width fields for acoustic panels
- [x] Add graphical dimension indicators (icons for width, length, height)
- [ ] Create visual guide showing which dimension is which
- [ ] Update quantity calculation for acoustic panels (length x width)
- [ ] Add validation for acoustic panel dimensions
- [ ] Test dimension calculations with various inputs
- [ ] Write tests for acoustic panel workflows

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
- [ ] Add "Add Wall" button to products tab UI
- [ ] Create wall summary showing all walls in project
- [ ] Update cost calculation to sum all walls
- [ ] Implement wall-specific product selection
- [ ] Test multi-wall quote creation

## Phase 5: PDF Download Fix + Job Pack with Drawings
- [ ] Fix PDF download so files appear in Downloads folder
- [ ] Implement job pack generation with wall drawings
- [ ] Add wall measurements to drawings
- [ ] Include product specifications in job pack
- [ ] Add operator reference guide to job pack
- [ ] Test PDF generation and download
- [ ] Verify drawings render correctly

## Phase 6: Dashboard Redesign (Monday.com Inspired)
- [ ] Implement collapsed 1-line view for jobs
- [ ] Add color coding for job status (quoted, booked, commenced, completed)
- [ ] Create kanban-style board view
- [ ] Add quick actions (edit, view PDF, change status)
- [ ] Implement search/filter functionality
- [ ] Add operator assignment view
- [ ] Test dashboard performance with many jobs
- [ ] Optimize for tablet viewing

## Phase 7: Final Testing & Delivery
- [ ] End-to-end testing of complete workflow
- [ ] Test on actual Android tablet
- [ ] Performance testing
- [ ] Cross-browser testing
- [ ] User acceptance testing
- [ ] Documentation and help section
- [ ] Final polish and bug fixes
