# Frontend Roadmap: Location Types (Admin + dropdown from API)

**Goal:** Admin can manage location types under Administration; location create/edit form loads types from API.

## Phase 1: API integration

- [x] **1.1** Create `LocationType` model (id, code, name, sort_order, is_active, created_at, updated_at)
- [x] **1.2** Create `LocationTypesService`: getList() (active for dropdown), getListAdmin(), getById(), create(), update(), delete()
- [x] **1.3** Base URL `/location-types` (list) and `/location-types/admin` (admin list)

## Phase 2: Administration UI

- [x] **2.1** Add route `/location-types` (admin only), lazy-load management component
- [x] **2.2** Add "Location types" to sidebar under Administration (same section as Users, Roles)
- [x] **2.3** Add nav item in `NavigationService` (adminOnly, icon Layers)
- [x] **2.4** Create `location-types-management` component: layout with list (table), "Add" button, edit/delete per row
- [x] **2.5** Create `location-type-form` component: drawer (like location-form), fields: code, name, sort_order, is_active (switch)
- [x] **2.6** Translations: location_types_management, create_location_type, edit_location_type, etc. (en + es)

## Phase 3: Location form uses API types

- [x] **3.1** In `location-form.component.ts`: inject LocationTypesService, load types in ngOnInit, store in `locationTypes` (from API)
- [x] **3.2** Fallback: if API fails or empty, keep hardcoded default list so form still works
- [x] **3.3** Template: `*ngFor="let type of locationTypes"`, `type.value` = code, `type.label` = name for display

## Phase 4: Permissions and guards

- [x] **4.1** Route `/location-types` protected with AuthGuard + AdminGuard; added to ADMIN_ONLY_ROUTES
- [x] **4.2** Backend uses locations update permission for admin list and CRUD

---

## Verification (after implementation)

- [ ] Sidebar shows "Location types" under Administration for admin users
- [ ] Admin can open list, add, edit, delete location types
- [ ] Location create/edit drawer shows types from API; new types appear in dropdown after creation
