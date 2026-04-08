

## Raw Materials Inventory and Product Recipes

This feature adds a Bill of Materials (BOM) system where each product code has a recipe of raw materials. When a production manager submits a production entry, they also record how much raw material was consumed, and stock levels are auto-deducted.

### Database Changes (4 new tables, 1 migration)

**1. `raw_materials` table** -- master list of raw materials
- id, name, unit (meters/kg), current_stock (numeric), status, created_at, updated_at
- RLS: authenticated can view; admins and workers can insert; admins can manage all

**2. `product_recipes` table** -- BOM linking product codes to raw materials
- id, product_code_id (FK), raw_material_id (FK), quantity_per_unit (numeric), created_at, updated_at
- Represents: "To make 1 unit of product X, you need Y quantity of raw material Z"
- RLS: authenticated can view; admins and workers can insert/update/delete

**3. `raw_material_usage` table** -- actual consumption log per production entry
- id, production_entry_id (FK), raw_material_id (FK), quantity_used (numeric), created_at
- RLS: authenticated can view; workers can insert own (via production_entry); admins can manage

**4. `raw_material_stock_entries` table** -- inward stock additions (purchases)
- id, raw_material_id (FK), quantity, date, notes, added_by (FK to profiles.user_id), created_at
- RLS: authenticated can view; admins and workers can insert

**Database trigger**: On insert to `raw_material_usage`, auto-deduct `quantity_used` from `raw_materials.current_stock`.
**Database trigger**: On insert to `raw_material_stock_entries`, auto-add `quantity` to `raw_materials.current_stock`.

### New Pages and UI Changes

**1. Admin page: Raw Materials Management** (`/admin/raw-materials`)
- List all raw materials with current stock, unit, status
- Add/edit/delete raw materials
- Add stock inward entries (purchases)
- Add to admin sidebar

**2. Admin page: Product Recipes** (`/admin/recipes`)
- Select a product code, define its recipe (list of raw materials + quantity per unit)
- Add/remove/edit recipe rows
- Or integrate into existing Products page as a "Recipe" tab/section per product code

**3. Update Production Entry form** (`ProductionEntry.tsx`)
- After selecting a product code, auto-load its recipe
- Show raw material rows pre-filled with expected quantities (recipe qty x manufactured qty)
- Production manager can adjust actual usage before submitting
- On submit: insert production_entry + insert raw_material_usage rows in a single transaction
- Show warnings if raw material stock would go negative

**4. Worker sidebar**: Add "Raw Materials" link to view stock levels

### File Changes Summary

| File | Change |
|------|--------|
| Migration SQL | Create 4 tables, triggers, RLS policies |
| `src/pages/admin/RawMaterials.tsx` | New page for raw material CRUD + stock inward |
| `src/pages/admin/ProductRecipes.tsx` | New page for managing BOMs per product code |
| `src/pages/worker/ProductionEntry.tsx` | Add raw material usage section to the form |
| `src/components/AdminSidebar.tsx` | Add Raw Materials and Recipes nav items |
| `src/App.tsx` | Add routes for new pages |
| Worker sidebar | Add raw materials view link |

### How It Works End-to-End

1. Admin/Manager adds raw materials (e.g., "ALUMINIUM FOIL 009MIC", unit: kg)
2. Admin/Manager adds stock purchases to build inventory
3. Admin/Manager defines recipe for a product code (e.g., "DUO ALUMINIUM POLYESTER TAPE 0.07" needs 0.58 kg ALUMINIUM FOIL + 0.38 rolls POLYESTER FILM...)
4. Production Manager creates a production entry, selects the product, the recipe auto-loads
5. Manager adjusts actual quantities used, submits
6. System records the production entry AND deducts raw materials from inventory automatically

