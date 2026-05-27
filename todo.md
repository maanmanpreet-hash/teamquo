# Cladding Quote App - Project TODO

## Phase 1: Project Setup & Architecture
- [ ] Review existing project scaffold (web-db-user template)
- [ ] Plan database schema (users, cladding_variants, jobs, job_items)
- [ ] Set up development environment and verify dependencies

## Phase 2: Data Models & Admin Panel
- [x] Create database schema for cladding variants (name, dimensions, price per unit, design)
- [x] Create database schema for jobs (client info, status, created_at, updated_at)
- [x] Create database schema for job items (wall dimensions, cladding selected, cabinet dimensions)
- [ ] Build admin panel to manage cladding variants (CRUD operations)
- [ ] Seed initial cladding variant data
- [x] Write vitest tests for cladding variant management

## Phase 3: Main Quoting Form
- [x] Build client details form (name, address, phone, email)
- [x] Build wall dimensions input (width, height)
- [x] Build cladding selection dropdown (populated from database)
- [x] Implement real-time area calculation (width × height)
- [x] Implement real-time cost estimation based on cladding variant pricing
- [x] Add optional floating cabinet dimensions input
- [x] Add manual price override field for quick quotes
- [x] Build form submission and job record creation
- [ ] Write vitest tests for form calculations and submission
- [ ] Fix form submission hook usage (move mutations to component scope)
- [ ] Add empty/error states for cladding selector
- [ ] Display real-time wall area calculation to user
- [ ] Validate all items before creating job record

## Phase 4: PDF Quote Generation & Job Recording
- [x] Implement PDF generation with client details and quote summary
- [ ] Include logo upload and display on PDF
- [x] Add job record saving to database
- [x] Implement PDF download functionality
- [ ] Test PDF generation with various input scenarios

## Phase 5: Job Status Dashboard
- [ ] Build dashboard to display all jobs with status at a glance
- [ ] Implement job status filters (quoted, booked, commenced)
- [ ] Add ability to update job status from dashboard
- [ ] Add quick follow-up actions (edit, view quote, delete)
- [ ] Implement search/filter by client name or date range
- [ ] Write vitest tests for dashboard functionality

## Phase 6: UI Polish & Tablet Optimization
- [ ] Optimize form layout for Android tablet (landscape and portrait)
- [ ] Implement logo upload feature with preview
- [ ] Add responsive design for all pages
- [ ] Test touch interactions and button sizing for tablet use
- [ ] Optimize form spacing and font sizes for readability on tablet
- [ ] Add loading states and error handling
- [ ] Test on actual Android tablet device

## Phase 7: Final Testing & Delivery
- [ ] End-to-end testing (create quote → generate PDF → update status)
- [ ] Performance testing on tablet
- [ ] Cross-browser testing
- [ ] Create user documentation or help section
- [ ] Prepare project for deployment
- [ ] Write comprehensive CRUD tests for cladding variant management flows (create, list, update, delete)


## Phase 5: Multi-Product Type Support with Volume Discounts
- [ ] Extend database schema to support multiple product types (acoustic panels, marble sheet, mirrors, fireplace)
- [ ] Create product variants table with dimensions, pricing, and discount tiers
- [ ] Implement volume discount calculation logic
- [ ] Fetch and integrate excelhome.com.au product catalogue
- [ ] Add product type selection to quoting form
- [ ] Implement dimension dropdown with custom dimension option
- [ ] Display applicable discounts in real-time estimates
- [ ] Write vitest tests for discount calculations

## Phase 6: Product Management Admin Panel
- [ ] Build admin dashboard for product management
- [ ] Implement CRUD operations for products and variants
- [ ] Add pricing override functionality
- [ ] Allow custom dimension addition
- [ ] Implement product availability toggle
- [ ] Add bulk import/export for products
- [ ] Build tablet-optimized admin interface
- [ ] Write vitest tests for admin operations

