# Renovation Quotation Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable team renovation quotation web app with space-based line items, editable pricing, shared storage, team-password access, autosave, and printable quotations.

**Architecture:** Create a standalone Next.js App Router application under `quotation_web`. Keep calculations in pure domain modules, all persistence behind a repository interface, and all secrets/database access on the server. Use a file-backed development repository so the complete app works before cloud accounts exist, and a Supabase repository selected by environment variables for production.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Vitest, Testing Library, Playwright, Supabase PostgreSQL, Zod, jose

---

## File map

- `quotation_web/src/domain/quotation.ts`: quotation types and money calculations.
- `quotation_web/src/domain/catalog.ts`: catalog types and default space categories.
- `quotation_web/src/server/auth.ts`: team-password verification and signed session cookies.
- `quotation_web/src/server/repositories/quotation-repository.ts`: persistence contract.
- `quotation_web/src/server/repositories/file-quotation-repository.ts`: account-free local development storage.
- `quotation_web/src/server/repositories/supabase-quotation-repository.ts`: production shared storage.
- `quotation_web/src/server/repositories/index.ts`: environment-based repository selection.
- `quotation_web/src/app/api/**/route.ts`: authenticated JSON endpoints.
- `quotation_web/src/app/(app)/quotes/page.tsx`: quotation records page.
- `quotation_web/src/app/(app)/quotes/[id]/page.tsx`: editor page.
- `quotation_web/src/components/quote-editor/*`: focused editor components.
- `quotation_web/src/app/(app)/catalog/page.tsx`: catalog management.
- `quotation_web/src/app/(app)/quotes/[id]/print/page.tsx`: print/PDF view.
- `quotation_web/supabase/schema.sql`: production schema and seed instructions.
- `quotation_web/tests/**`: unit, component, API, and browser tests.

### Task 1: Scaffold the standalone web app and test harness

**Files:**
- Create: `quotation_web/package.json`
- Create: `quotation_web/src/app/layout.tsx`
- Create: `quotation_web/src/app/globals.css`
- Create: `quotation_web/vitest.config.ts`
- Create: `quotation_web/tests/setup.ts`
- Test: `quotation_web/tests/smoke/app-shell.test.tsx`

- [ ] **Step 1: Scaffold Next.js**

Run:

```bash
pnpm create next-app@latest quotation_web --ts --tailwind --eslint --app --src-dir --import-alias '@/*' --use-pnpm --yes
cd quotation_web
pnpm add zod jose @supabase/supabase-js lucide-react
pnpm add -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
```

Expected: `quotation_web/package.json` exists and `pnpm install` completes.

- [ ] **Step 2: Write the failing shell test**

```tsx
import { render, screen } from '@testing-library/react';
import RootLayout from '@/app/layout';

it('renders the product name', () => {
  render(<RootLayout><main>内容</main></RootLayout>);
  expect(screen.getByText('知底装修报价')).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm vitest run tests/smoke/app-shell.test.tsx`

Expected: FAIL because the default scaffold does not contain `知底装修报价`.

- [ ] **Step 4: Implement the branded shell and test configuration**

Set `vitest.config.ts` to use `jsdom`, load `tests/setup.ts`, and map `@` to `src`. Change `layout.tsx` metadata title and visible header branding to `知底装修报价`. Define CSS variables `--ink: #173b35`, `--gold: #e4a853`, `--paper: #f4f2ed`, and reusable focus styles in `globals.css`.

- [ ] **Step 5: Verify and commit**

Run: `pnpm vitest run tests/smoke/app-shell.test.tsx && pnpm lint`

Expected: PASS and no lint errors.

```bash
git add quotation_web
git commit -m "feat: scaffold quotation web app"
```

### Task 2: Implement quotation domain calculations

**Files:**
- Create: `quotation_web/src/domain/quotation.ts`
- Test: `quotation_web/tests/domain/quotation.test.ts`

- [ ] **Step 1: Write failing calculation tests**

```ts
import { calculateItemTotal, calculateQuoteTotals } from '@/domain/quotation';

it('calculates combined and split price items in cents', () => {
  expect(calculateItemTotal({ quantity: 88, pricingMode: 'combined', combinedUnitPrice: 2800, laborUnitPrice: 0, materialUnitPrice: 0 })).toBe(246400);
  expect(calculateItemTotal({ quantity: 36, pricingMode: 'split', combinedUnitPrice: 0, laborUnitPrice: 4500, materialUnitPrice: 5000 })).toBe(342000);
});

it('adds charges and subtracts discounts', () => {
  const totals = calculateQuoteTotals([{ total: 1000000, labor: 400000, material: 600000 }], [{ kind: 'charge', amount: 50000 }, { kind: 'discount', amount: 20000 }]);
  expect(totals.grandTotal).toBe(1030000);
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm vitest run tests/domain/quotation.test.ts`

Expected: FAIL because the domain module is missing.

- [ ] **Step 3: Implement types and pure calculations**

Define `PricingMode`, `QuoteItem`, `QuoteSpace`, `QuoteAdjustment`, `Quote`, `QuoteTotals`, `calculateItemTotal`, `calculateItemBreakdown`, `calculateSpaceTotal`, and `calculateQuoteTotals`. Store prices as integer cents; round `quantity * unitPrice` with `Math.round`; reject negative or non-finite quantities.

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run tests/domain/quotation.test.ts`

Expected: PASS.

```bash
git add quotation_web/src/domain quotation_web/tests/domain
git commit -m "feat: add quotation calculation domain"
```

### Task 3: Add team-password authentication

**Files:**
- Create: `quotation_web/src/server/auth.ts`
- Create: `quotation_web/src/app/login/page.tsx`
- Create: `quotation_web/src/app/api/auth/login/route.ts`
- Create: `quotation_web/src/app/api/auth/logout/route.ts`
- Create: `quotation_web/src/middleware.ts`
- Test: `quotation_web/tests/server/auth.test.ts`

- [ ] **Step 1: Write failing authentication tests**

```ts
import { createSessionToken, verifySessionToken, verifyTeamPassword } from '@/server/auth';

it('rejects the wrong team password', async () => {
  expect(await verifyTeamPassword('wrong', 'correct')).toBe(false);
});

it('round-trips a signed session', async () => {
  const token = await createSessionToken('secret', 60);
  expect(await verifySessionToken(token, 'secret')).toBe(true);
  expect(await verifySessionToken(token, 'different')).toBe(false);
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm vitest run tests/server/auth.test.ts`

Expected: FAIL because `auth.ts` does not exist.

- [ ] **Step 3: Implement authentication**

Use constant-time comparison for the submitted team password and `jose` HS256 signing for a seven-day session token. The login route validates a 1–128 character password with Zod and sets `quote_session` as `HttpOnly`, `SameSite=Lax`, `Secure` in production. Middleware protects `/quotes`, `/catalog`, and their APIs, while allowing `/login` and static assets.

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run tests/server/auth.test.ts && pnpm lint`

Expected: PASS.

```bash
git add quotation_web/src/server/auth.ts quotation_web/src/app/login quotation_web/src/app/api/auth quotation_web/src/middleware.ts quotation_web/tests/server/auth.test.ts
git commit -m "feat: protect app with team password"
```

### Task 4: Build repository contract and local development persistence

**Files:**
- Create: `quotation_web/src/server/repositories/quotation-repository.ts`
- Create: `quotation_web/src/server/repositories/file-quotation-repository.ts`
- Create: `quotation_web/src/server/repositories/index.ts`
- Create: `quotation_web/data/.gitkeep`
- Modify: `quotation_web/.gitignore`
- Test: `quotation_web/tests/server/file-repository.test.ts`

- [ ] **Step 1: Write failing repository test**

```ts
it('creates, persists, updates, copies, and deletes quotations', async () => {
  const repo = new FileQuotationRepository(tempFile);
  const created = await repo.createQuote({ customerName: '王先生', projectName: '城南花园', area: 108, renovationType: '全屋装修' });
  expect((await repo.listQuotes('王先生'))[0].id).toBe(created.id);
  const updated = await repo.updateQuote(created.id, created.version, { notes: '测试' });
  await expect(repo.updateQuote(created.id, created.version, { notes: '旧版本' })).rejects.toThrow('VERSION_CONFLICT');
  expect((await repo.copyQuote(updated.id)).customerName).toContain('副本');
  await repo.deleteQuote(created.id);
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm vitest run tests/server/file-repository.test.ts`

Expected: FAIL because repository classes are missing.

- [ ] **Step 3: Implement repository boundary**

Define methods for quote list/get/create/update/copy/delete, space CRUD/reorder, item CRUD/reorder, adjustment CRUD, and catalog CRUD. Implement atomic file writes to `data/dev-db.json` through a temporary file rename. Increment quote `version` on every mutation and throw typed `VERSION_CONFLICT` and `NOT_FOUND` errors. Ignore `data/dev-db.json` in git.

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run tests/server/file-repository.test.ts`

Expected: PASS.

```bash
git add quotation_web/src/server/repositories quotation_web/tests/server/file-repository.test.ts quotation_web/data/.gitkeep quotation_web/.gitignore
git commit -m "feat: add quotation persistence boundary"
```

### Task 5: Add catalog data and authenticated APIs

**Files:**
- Create: `quotation_web/src/domain/catalog.ts`
- Create: `quotation_web/src/server/catalog-seed.ts`
- Create: `quotation_web/src/app/api/catalog/route.ts`
- Create: `quotation_web/src/app/api/catalog/[id]/route.ts`
- Create: `quotation_web/src/app/api/quotes/route.ts`
- Create: `quotation_web/src/app/api/quotes/[id]/route.ts`
- Test: `quotation_web/tests/api/catalog.test.ts`
- Test: `quotation_web/tests/api/quotes.test.ts`

- [ ] **Step 1: Write failing API tests**

Test that catalog search filters by space/name, creating a quote produces a `ZD-YYYYMMDD-NNN` number and default spaces, invalid negative area returns 400, and update with a stale version returns 409.

- [ ] **Step 2: Verify failure**

Run: `pnpm vitest run tests/api`

Expected: FAIL because routes are missing.

- [ ] **Step 3: Implement catalog and quote routes**

Seed practical items for living/dining room, bedroom, kitchen, bathroom, balcony, and whole-home categories, including demolition, masonry, waterproofing, plumbing/electrical, ceilings, painting, installation, and cleaning. Validate every request with explicit Zod schemas. Return `{ data }` for success and `{ error: { code, message } }` for failure.

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run tests/api && pnpm lint`

Expected: PASS.

```bash
git add quotation_web/src/domain/catalog.ts quotation_web/src/server/catalog-seed.ts quotation_web/src/app/api quotation_web/tests/api
git commit -m "feat: add quotation and catalog APIs"
```

### Task 6: Build quotation records and catalog management pages

**Files:**
- Create: `quotation_web/src/app/(app)/layout.tsx`
- Create: `quotation_web/src/app/(app)/quotes/page.tsx`
- Create: `quotation_web/src/components/quotes/quote-list.tsx`
- Create: `quotation_web/src/components/quotes/new-quote-dialog.tsx`
- Create: `quotation_web/src/app/(app)/catalog/page.tsx`
- Create: `quotation_web/src/components/catalog/catalog-table.tsx`
- Test: `quotation_web/tests/components/quote-list.test.tsx`
- Test: `quotation_web/tests/components/catalog-table.test.tsx`

- [ ] **Step 1: Write failing component tests**

Render sample data and assert that search narrows quote records, the delete action requires confirmation, catalog items can be filtered by space, and a disabled catalog item displays `已停用`.

- [ ] **Step 2: Verify failure**

Run: `pnpm vitest run tests/components/quote-list.test.tsx tests/components/catalog-table.test.tsx`

Expected: FAIL because components are missing.

- [ ] **Step 3: Implement pages**

Create a branded app header with links to `报价记录` and `项目库`. Use accessible dialogs and form labels. Quote cards/table rows show number, customer, project, area, total, status, and updated time. Catalog management supports create, edit, enable/disable, space filter, and keyword search.

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run tests/components/quote-list.test.tsx tests/components/catalog-table.test.tsx && pnpm lint`

Expected: PASS.

```bash
git add quotation_web/src/app/\(app\) quotation_web/src/components/quotes quotation_web/src/components/catalog quotation_web/tests/components
git commit -m "feat: add quotation records and catalog management"
```

### Task 7: Build the mixed-workspace quotation editor

**Files:**
- Create: `quotation_web/src/app/(app)/quotes/[id]/page.tsx`
- Create: `quotation_web/src/components/quote-editor/quote-editor.tsx`
- Create: `quotation_web/src/components/quote-editor/space-nav.tsx`
- Create: `quotation_web/src/components/quote-editor/item-table.tsx`
- Create: `quotation_web/src/components/quote-editor/item-card.tsx`
- Create: `quotation_web/src/components/quote-editor/catalog-picker.tsx`
- Create: `quotation_web/src/components/quote-editor/summary-panel.tsx`
- Create: `quotation_web/src/components/quote-editor/use-autosave.ts`
- Test: `quotation_web/tests/components/quote-editor.test.tsx`
- Test: `quotation_web/tests/components/autosave.test.tsx`

- [ ] **Step 1: Write failing editor tests**

Assert that selecting a space changes the visible items, catalog selection adds multiple items, changing quantity recalculates the total, switching to split pricing reveals labor/material inputs, deleting a space requires confirmation, and autosave reports saving/saved/error/conflict states.

- [ ] **Step 2: Verify failure**

Run: `pnpm vitest run tests/components/quote-editor.test.tsx tests/components/autosave.test.tsx`

Expected: FAIL because editor modules are missing.

- [ ] **Step 3: Implement the editor**

Use a reducer for draft state. Desktop (`min-width: 1100px`) renders `210px / minmax(650px, 1fr) / 280px`; smaller widths stack the panels and turn the space navigation into a horizontal scroller. Debounce autosave by 700ms, send the current version, replace it with the returned version, retain the draft on errors, and stop automatic retries after a 409 conflict until refresh.

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run tests/components/quote-editor.test.tsx tests/components/autosave.test.tsx && pnpm lint`

Expected: PASS.

```bash
git add quotation_web/src/app/\(app\)/quotes/\[id\] quotation_web/src/components/quote-editor quotation_web/tests/components/quote-editor.test.tsx quotation_web/tests/components/autosave.test.tsx
git commit -m "feat: add space-based quotation editor"
```

### Task 8: Add printable quotation view

**Files:**
- Create: `quotation_web/src/app/(app)/quotes/[id]/print/page.tsx`
- Create: `quotation_web/src/components/print/print-quotation.tsx`
- Create: `quotation_web/src/app/print.css`
- Test: `quotation_web/tests/components/print-quotation.test.tsx`

- [ ] **Step 1: Write failing print test**

Render a quotation and assert that client/project details, every space subtotal, labor/material/adjustment totals, grand total, notes, and quotation date are present, while edit/delete controls are absent.

- [ ] **Step 2: Verify failure**

Run: `pnpm vitest run tests/components/print-quotation.test.tsx`

Expected: FAIL because the print component is missing.

- [ ] **Step 3: Implement print view**

Use semantic tables per space, repeated table headers, `break-inside: avoid` for item groups, A4 margins via `@page`, and `@media print` to remove navigation and the print button. Format money through one shared `formatCents` function.

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run tests/components/print-quotation.test.tsx && pnpm lint`

Expected: PASS.

```bash
git add quotation_web/src/app/\(app\)/quotes/\[id\]/print quotation_web/src/components/print quotation_web/src/app/print.css quotation_web/tests/components/print-quotation.test.tsx
git commit -m "feat: add printable quotation view"
```

### Task 9: Implement Supabase production repository and schema

**Files:**
- Create: `quotation_web/src/server/repositories/supabase-quotation-repository.ts`
- Create: `quotation_web/supabase/schema.sql`
- Create: `quotation_web/supabase/seed.sql`
- Create: `quotation_web/.env.example`
- Test: `quotation_web/tests/server/repository-contract.test.ts`

- [ ] **Step 1: Extract shared repository contract tests**

Run the same create/list/update/conflict/copy/delete behavior against the file repository by default and against Supabase only when `TEST_SUPABASE_URL` and `TEST_SUPABASE_SERVICE_ROLE_KEY` are present.

- [ ] **Step 2: Verify Supabase test is skipped without credentials**

Run: `pnpm vitest run tests/server/repository-contract.test.ts`

Expected: file repository PASS; Supabase suite SKIP when test credentials are absent.

- [ ] **Step 3: Implement schema and repository**

Create `quotes`, `quote_spaces`, `quote_items`, `quote_adjustments`, and `catalog_items` tables with UUID primary keys, foreign keys with cascading deletes, integer-cent price constraints, timestamps, sort indexes, and quote version. Implement every repository method with server-only Supabase service-role access and transactional RPCs for multi-row quote saves and version checks.

- [ ] **Step 4: Verify and commit**

Run: `pnpm vitest run tests/server/repository-contract.test.ts && pnpm lint`

Expected: local contract PASS and no lint errors.

```bash
git add quotation_web/src/server/repositories/supabase-quotation-repository.ts quotation_web/supabase quotation_web/.env.example quotation_web/tests/server/repository-contract.test.ts
git commit -m "feat: add Supabase production persistence"
```

### Task 10: End-to-end verification and deployment guide

**Files:**
- Create: `quotation_web/playwright.config.ts`
- Create: `quotation_web/tests/e2e/quotation-flow.spec.ts`
- Create: `quotation_web/README.md`
- Modify: `quotation_web/package.json`

- [ ] **Step 1: Write the browser flow**

Automate login, new quote creation, adding catalog items to two spaces, editing combined and split prices, observing total changes, refreshing to confirm persistence, copying the quote, and opening the print view at desktop and mobile viewport sizes.

- [ ] **Step 2: Run to verify the flow exposes missing behavior**

Run: `pnpm playwright test tests/e2e/quotation-flow.spec.ts`

Expected: FAIL on any missing integration; fix only the specific integration defects found.

- [ ] **Step 3: Document local and cloud operation**

Document `pnpm dev`, default development environment variables, changing the team password, file-storage limitations, Supabase schema/seed application, required Vercel variables, deployment, backup, and how colleagues use the resulting HTTPS URL. Add scripts `test`, `test:e2e`, `typecheck`, and `verify`.

- [ ] **Step 4: Run the full verification suite**

Run:

```bash
pnpm verify
pnpm playwright test
pnpm build
```

Expected: unit/component/API tests PASS, browser tests PASS at desktop and mobile sizes, typecheck/lint PASS, and production build succeeds.

- [ ] **Step 5: Commit**

```bash
git add quotation_web
git commit -m "test: verify quotation workflow and deployment"
```

## Final acceptance

- Team password protects all business pages and write endpoints.
- Two browser sessions using Supabase can see the same quotations.
- A quotation can be built by space from a reusable project catalog.
- Combined and split pricing produce cent-accurate totals.
- Autosave preserves edits and reports conflicts without silent overwrite.
- Records and catalog management work on desktop and mobile.
- Printed/PDF quotation contains complete details and no editing controls.
- Local file mode works before cloud accounts are created.
- Production deployment steps require only Vercel/Supabase account creation and environment configuration.
