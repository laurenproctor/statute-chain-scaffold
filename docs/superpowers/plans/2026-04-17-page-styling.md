# Page Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish all app pages (Law Navigator, Compare, Browse, Corpus, Admin) to match the brand guidelines visual identity.

**Architecture:** Pure CSS + minimal JSX changes. No logic changes. All work lands in `globals.css` (new classes) and three JSX files (Nav wordmark, page eyebrow labels, compare layout). Each task is independently verifiable by loading the page in the browser at `http://localhost:3000`.

**Tech Stack:** Next.js 14, Tailwind v4, CSS custom properties (brand tokens), Geist font

---

## File Map

| File | What changes |
|------|-------------|
| `apps/web/components/ui/Nav.tsx` | Update wordmark to "Greyledge", remove tagline span |
| `apps/web/app/globals.css` | Add page eyebrow, compare, admin, and section-subtitle CSS classes |
| `apps/web/app/law-navigator/page.tsx` | Add `<p className="page-eyebrow">` to site-header |
| `apps/web/app/compare/CompareClient.tsx` | Add `<p className="page-eyebrow">` to site-header |
| `apps/web/app/browse/page.tsx` | Add `<p className="page-eyebrow">` to site-header |
| `apps/web/app/corpus/page.tsx` | Add `<p className="page-eyebrow">` to site-header |
| `apps/web/app/admin/requests/page.tsx` | Add `<p className="page-eyebrow">` to site-header |

---

### Task 1: Update Nav wordmark

**Files:**
- Modify: `apps/web/components/ui/Nav.tsx`

- [ ] **Step 1: Open the file and replace the brand block**

Replace the entire `nav-brand-block` div:

```tsx
// BEFORE
<div className="nav-brand-block">
  <Link href="/" className="nav-brand">Letter &amp; Spirit of the Law</Link>
  <span className="nav-tagline">Because we do what we say and say what we'll do.</span>
</div>

// AFTER
<Link href="/" className="nav-brand">Greyledge</Link>
```

The full updated `Nav` return:
```tsx
return (
  <nav className="site-nav">
    <Link href="/" className="nav-brand">Greyledge</Link>
    <div className="nav-links">
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`nav-link${isActive(href) ? ' nav-link-active' : ''}`}
        >
          {label}
        </Link>
      ))}
    </div>
  </nav>
)
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:3000/law-navigator`. The nav should show "Greyledge" on the left, nav links on the right, no second line of text.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/ui/Nav.tsx
git commit -m "style: update nav wordmark to Greyledge"
```

---

### Task 2: Add page eyebrow CSS class

**Files:**
- Modify: `apps/web/app/globals.css`

The brand guidelines use a small uppercase label with a trailing rule line above every section heading (e.g. "01 · Brand Positioning ───"). We need `.page-eyebrow` for page headers.

- [ ] **Step 1: Add the class to globals.css**

Find the `/* ── Page Shell ───` block in globals.css. After the `.site-header` rule, add:

```css
  .page-eyebrow {
    font-size: 10px;
    font-weight: 400;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #BBBBBB;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .page-eyebrow::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }
```

- [ ] **Step 2: Verify the CSS compiles**

```bash
curl -s "http://localhost:3000/law-navigator" | grep -o '_next/static/css/[^"\\]*' | head -1 | xargs -I{} curl -s "http://localhost:3000/{}" | grep "page-eyebrow"
```

Expected: `.page-eyebrow {` appears in output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "style: add page-eyebrow CSS class"
```

---

### Task 3: Add page eyebrow to all page headers

**Files:**
- Modify: `apps/web/app/law-navigator/page.tsx`
- Modify: `apps/web/app/compare/CompareClient.tsx`
- Modify: `apps/web/app/browse/page.tsx`
- Modify: `apps/web/app/corpus/page.tsx`
- Modify: `apps/web/app/admin/requests/page.tsx`

Each page header needs a `<p className="page-eyebrow">` inserted as the first child of `<header className="site-header">`.

- [ ] **Step 1: Update law-navigator/page.tsx**

Find:
```tsx
<header className="site-header">
  <h1>Law Navigator</h1>
```
Replace with:
```tsx
<header className="site-header">
  <p className="page-eyebrow">Law Navigator</p>
  <h1>Resolve any statute or citation.</h1>
```

Also update the tagline to match brand voice:
```tsx
<p className="tagline">Enter a section reference to trace its full chain of linked authorities.</p>
```

- [ ] **Step 2: Update compare/CompareClient.tsx**

Find:
```tsx
<header className="site-header">
  <h1>Compare Laws</h1>
  <p className="tagline">Compare multiple laws side by side.</p>
```
Replace with:
```tsx
<header className="site-header">
  <p className="page-eyebrow">Compare Laws</p>
  <h1>Find where statutes align and diverge.</h1>
  <p className="tagline">Enter two references to compare their scope, status, and linked authorities.</p>
```

- [ ] **Step 3: Update browse/page.tsx**

Find:
```tsx
<header className="site-header">
  <h1>Browse Codes</h1>
  <p className="tagline">Browse statutes by jurisdiction and code.</p>
```
Replace with:
```tsx
<header className="site-header">
  <p className="page-eyebrow">Browse Codes</p>
  <h1>Browse statutes by jurisdiction.</h1>
  <p className="tagline">Navigate loaded provisions by code, article, and section.</p>
```

- [ ] **Step 4: Update corpus/page.tsx**

Find:
```tsx
<header className="site-header">
  <h1>Corpus Status</h1>
  <p className="tagline">Ingested provisions and reference graph.</p>
```
Replace with:
```tsx
<header className="site-header">
  <p className="page-eyebrow">Corpus Status</p>
  <h1>Ingested provisions and reference graph.</h1>
  <p className="tagline">All statutes loaded in the system, with source and coverage metadata.</p>
```

- [ ] **Step 5: Update admin/requests/page.tsx**

Find:
```tsx
<header className="site-header">
  <h1>Ingest Console</h1>
  <p className="tagline">{rows.length} load request{rows.length !== 1 ? 's' : ''} in queue.</p>
```
Replace with:
```tsx
<header className="site-header">
  <p className="page-eyebrow">Ingest Console</p>
  <h1>Load request queue.</h1>
  <p className="tagline">{rows.length} pending request{rows.length !== 1 ? 's' : ''}. Ingest or ignore each below.</p>
```

- [ ] **Step 6: Verify in browser**

Load each of these URLs and confirm the eyebrow label (small uppercase text with trailing line) appears above the h1:
- `http://localhost:3000/law-navigator`
- `http://localhost:3000/compare`
- `http://localhost:3000/browse`
- `http://localhost:3000/corpus`
- `http://localhost:3000/admin/requests`

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/law-navigator/page.tsx apps/web/app/compare/CompareClient.tsx apps/web/app/browse/page.tsx apps/web/app/corpus/page.tsx apps/web/app/admin/requests/page.tsx
git commit -m "style: add page-eyebrow labels to all page headers"
```

---

### Task 4: Add Compare page CSS

**Files:**
- Modify: `apps/web/app/globals.css`

The Compare page uses ~20 CSS classes that aren't yet defined. Add them all in one block inside `@layer components`.

- [ ] **Step 1: Add Compare CSS to globals.css**

At the end of the `@layer components { ... }` block (before the closing `}`), add:

```css
  /* ── Compare Page ────────────────────────────────────────────── */
  .compare-page {
    max-width: 1280px;
  }

  .compare-form { display: flex; flex-direction: column; gap: 8px; }

  .compare-inputs {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 10px;
    align-items: end;
  }
  @media (max-width: 640px) {
    .compare-inputs { grid-template-columns: 1fr; }
  }

  .compare-input-group { display: flex; flex-direction: column; gap: 4px; }

  .compare-input-label {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .swap-btn {
    padding: 11px 10px;
    background: var(--paper);
    border: 1px solid var(--border);
    color: var(--muted);
    cursor: pointer;
    font-size: 15px;
    transition: color 120ms;
    align-self: end;
  }
  .swap-btn:hover { color: var(--ink); }

  .compare-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    margin-top: 20px;
  }
  @media (max-width: 768px) {
    .compare-columns { grid-template-columns: 1fr; }
  }

  .compare-side {
    background: var(--paper);
    padding: 24px 28px;
  }
  .compare-side-loading { background: var(--surface); }
  .compare-side-missing { background: var(--surface); }

  .compare-side-label {
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 12px;
  }

  .compare-side-title {
    font-size: 18px;
    font-weight: 500;
    color: var(--ink);
    margin-bottom: 4px;
    line-height: 1.2;
  }

  .compare-side-canonical {
    font-family: var(--font-geist-mono), monospace;
    font-size: 11px;
    color: var(--muted);
    margin-bottom: 10px;
    display: block;
  }

  .compare-missing-msg {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.6;
    margin-top: 8px;
  }
  .compare-missing-action { color: var(--navy); }
  .compare-missing-action:hover { opacity: 0.7; }

  .compare-attribution {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    font-size: 12px;
  }

  .compare-side-stat {
    margin-top: 10px;
    font-size: 12px;
    color: var(--muted);
  }

  .compare-side-text {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.7;
    margin-top: 10px;
  }

  .takeaways-block {
    padding: 16px 20px;
    background: var(--surface);
    border: 1px solid var(--border);
  }

  .takeaway-item {
    display: flex;
    gap: 10px;
    font-size: 13px;
    color: var(--ink);
    padding: 5px 0;
    border-bottom: 1px solid var(--border);
  }
  .takeaway-item:last-child { border-bottom: none; }

  .takeaway-bullet { color: var(--muted); flex-shrink: 0; }

  .section-subtitle {
    font-size: 13px;
    color: var(--muted);
    margin-bottom: 12px;
    margin-top: -4px;
  }

  /* ── Diff Table ──────────────────────────────────────────────── */
  .diff-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--border);
    font-size: 13px;
  }
  .diff-table th {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 10px 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    text-align: left;
    font-weight: 400;
  }
  .diff-table td {
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    color: var(--ink);
  }
  .diff-table tr:last-child td { border-bottom: none; }
  .diff-row-differ td { background: rgba(141, 46, 53, 0.025); }
  .diff-category {
    color: var(--muted);
    font-size: 12px;
    width: 160px;
  }

  /* ── Authority Overlap ───────────────────────────────────────── */
  .authority-overlap {
    border: 1px solid var(--border);
  }

  .authority-group {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }
  .authority-group:last-child { border-bottom: none; }

  .authority-group-label {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 500;
    margin-bottom: 10px;
  }
  .authority-shared { color: var(--muted); }
  .authority-left   { color: var(--navy); }
  .authority-right  { color: var(--positive); }

  .authority-item {
    padding: 7px 0;
    border-bottom: 1px solid var(--border);
  }
  .authority-item:last-child { border-bottom: none; }

  .authority-item-link {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
  }
  .authority-item-link:hover { opacity: 0.7; }

  .authority-item-canonical {
    display: block;
    font-family: var(--font-geist-mono), monospace;
    font-size: 11px;
    color: var(--muted);
    margin-top: 2px;
  }
```

- [ ] **Step 2: Verify in browser**

Load `http://localhost:3000/compare`. The layout should show:
- Two inputs side by side (Law A / ⇄ / Law B) at full width
- "Compare →" button below
- After comparing, side panels should be two equal columns with a 1px dividing line
- Diff table with alternating backgrounds on differing rows
- Authority overlap in three labeled groups

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "style: add Compare page CSS — inputs, panels, diff table, authority overlap"
```

---

### Task 5: Add Admin page CSS

**Files:**
- Modify: `apps/web/app/globals.css`

The Admin/Ingest Console page uses status badges and action buttons with specific colors.

- [ ] **Step 1: Add Admin CSS to globals.css**

At the end of the `@layer components { ... }` block, add:

```css
  /* ── Admin / Ingest Console ──────────────────────────────────── */
  .admin-row-meta {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: var(--muted);
    margin-top: 6px;
    flex-wrap: wrap;
  }

  .admin-actions-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;
  }

  .admin-source-badge {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 2px;
    border: 1px solid transparent;
  }
  .admin-source-live    { border-color: var(--positive); color: var(--positive); }
  .admin-source-fixture { border-color: var(--navy);     color: var(--navy); }
  .admin-source-manual  { border-color: var(--gold);     color: var(--gold); }

  .admin-actions {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .admin-status-badge {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 2px;
    border: 1px solid transparent;
  }
  .admin-status-loading  { border-color: var(--muted);    color: var(--muted); }
  .admin-status-loaded   { border-color: var(--positive); color: var(--positive); }
  .admin-status-failed   { border-color: var(--conflict); color: var(--conflict); }
  .admin-status-ignored  { border-color: var(--border);   color: var(--muted); }
  .admin-status-queued   { border-color: var(--navy);     color: var(--navy); }
  .admin-status-manual   { border-color: var(--gold);     color: var(--gold); }

  .admin-action-btn {
    font-size: 12px;
    padding: 5px 12px;
    border: 1px solid var(--border);
    background: var(--paper);
    color: var(--ink);
    cursor: pointer;
    border-radius: 2px;
    transition: background 120ms;
  }
  .admin-action-btn:hover    { background: var(--surface); }
  .admin-action-btn:disabled { opacity: 0.4; cursor: default; }

  .admin-action-primary {
    background: var(--ink);
    color: var(--paper);
    border-color: var(--ink);
  }
  .admin-action-primary:hover { opacity: 0.85; background: var(--ink); }

  .admin-action-muted { color: var(--muted); }

  .admin-feedback       { font-size: 12px; color: var(--positive); margin-top: 4px; }
  .admin-feedback-error { font-size: 12px; color: var(--conflict); margin-top: 4px; }
```

- [ ] **Step 2: Verify in browser**

Load `http://localhost:3000/admin/requests`. Each request row should show:
- A source badge on the right (green "Live API", navy "Fixture", or gold "Manual")
- Colored status badges (green = loaded, red = failed, navy = queued)
- Action buttons ("Ingest Now", "Ignore") with correct styling

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "style: add Admin page CSS — source badges, status badges, action buttons"
```

---

### Task 6: Final visual pass

- [ ] **Step 1: Check every page**

Open each URL and confirm it matches the brand guidelines aesthetic:

| URL | What to check |
|-----|---------------|
| `http://localhost:3000/law-navigator` | Eyebrow label, editorial h1, search input, node rows, badges |
| `http://localhost:3000/compare` | Full-width inputs, 2-col panels, diff table, authority overlap |
| `http://localhost:3000/browse` | Eyebrow label, coming-soon block |
| `http://localhost:3000/corpus` | Eyebrow label, provision list |
| `http://localhost:3000/admin/requests` | Status badges in correct colors |

- [ ] **Step 2: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "style: complete brand-guidelines page styling for all app pages"
```
