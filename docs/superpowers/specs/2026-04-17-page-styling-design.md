# Page Styling Design — Greyledge App
**Date:** 2026-04-17  
**Scope:** Visual polish of all app pages to match brand guidelines

---

## Goal

Bring all app pages (Law Navigator, Compare, Browse, Corpus, Admin/Ingest Console) to the same quality standard as the brand guidelines document at `/public/brand-guidelines.html`. The brand guidelines define a precise visual identity: 95% neutral palette, Geist font throughout, semantic accent colors only, editorial typography, square buttons, no decorative color.

---

## Decisions Made

### Nav
- **White sticky bar** — `background: var(--paper)`, `border-bottom: 1px solid var(--border)`
- **Wordmark: "Greyledge"** — update from current "Letter & Spirit of the Law"
- Remove the current tagline from the nav ("Because we do what we say...")
- Active link: `background: var(--surface)`, `color: var(--ink)`
- Inactive links: `color: var(--muted)`, hover brings to ink

### Page Headers
Each page gets a consistent editorial header pattern:
- Numbered section label: `10px / 0.12em tracking / uppercase / #BBBBBB` with a trailing rule line (matching brand guidelines section labels)
- Large page title: `clamp(32px, 4vw, 48px) / weight 400`
- Tagline: `14px / var(--muted)` — one sentence describing the page's job
- Primary interaction (search input, compare inputs) sits directly below the header, before a `border-bottom` divides header from content

### Compare Page — Full-Width Layout
- Page container expands to `max-width: 1280px` on the compare page (override the default 860px `.page` constraint)
- **Inputs**: Side-by-side grid (`1fr auto 1fr`) with Law A / swap button / Law B
- **Side panels**: `display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border)` — matches the brand guidelines compare pane mockup exactly
- **Key Takeaways block**: surface background, bullet list, appears above the side panels
- **Diff table**: full-width table, alternating row backgrounds (`var(--surface)` on differ rows), monospace category labels
- **Authority overlap**: three groups (Shared, Unique to A, Unique to B) each as a labeled section with items

### Missing CSS classes to add (globals.css)
All classes used in JSX but not yet defined:

**Compare page:**
- `.compare-page` — overrides `.page` max-width to 1280px
- `.compare-form`, `.compare-inputs`, `.compare-input-group`, `.compare-input-label`
- `.swap-btn`
- `.compare-columns` — 2-col grid with 1px gap
- `.compare-side`, `.compare-side-label`, `.compare-side-title`, `.compare-side-canonical`
- `.compare-side-loading`, `.compare-side-missing`
- `.compare-missing-msg`, `.compare-missing-action`
- `.compare-attribution`, `.compare-side-stat`, `.compare-side-text`
- `.takeaways-block`, `.takeaway-item`, `.takeaway-bullet`
- `.section-subtitle`
- `.diff-table`, `.diff-row-differ`, `.diff-category`
- `.authority-overlap`, `.authority-group`, `.authority-group-label`
- `.authority-shared`, `.authority-left`, `.authority-right`
- `.authority-item`, `.authority-item-link`, `.authority-item-canonical`

**Admin page:**
- `.admin-row-meta`
- `.admin-actions-col`, `.admin-actions`
- `.admin-source-badge`, `.admin-source-live`, `.admin-source-fixture`, `.admin-source-manual`
- `.admin-status-badge`, `.admin-status-loading`, `.admin-status-loaded`, `.admin-status-failed`, `.admin-status-ignored`, `.admin-status-queued`, `.admin-status-manual`
- `.admin-action-btn`, `.admin-action-primary`, `.admin-action-muted`
- `.admin-feedback`, `.admin-feedback-error`

### Color application for admin status badges
Following the semantic palette:
- `loading` → muted border/text (in-progress, neutral)
- `loaded` → positive (green)
- `failed` → conflict (red)
- `ignored` → muted
- `queued` → navy
- `manual` → gold

### Nav brand name update
- `Nav.tsx`: Change brand text from `"Letter & Spirit of the Law"` to `"Greyledge"`
- Remove the `.nav-tagline` span (or update to the brand tagline: *"A clarity engine for law."*)

---

## Pages Inventory

| Page | Route | Key layout work |
|------|-------|-----------------|
| Law Navigator | `/law-navigator` | Header polish, numbered section label |
| Compare Laws | `/compare` | Full-width layout, all missing CSS |
| Browse Codes | `/browse` | Header polish, coming-soon refinement |
| Corpus Status | `/corpus` | Header polish |
| Ingest Console | `/admin/requests` | Admin badge CSS |

---

## What Does NOT Change
- All existing CSS variables and brand tokens — they're correct
- Existing component logic — purely visual changes
- The `.page` class for non-compare pages (860px centered)
- Font: Geist Sans + Geist Mono stay as-is
