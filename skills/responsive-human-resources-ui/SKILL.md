---
name: responsive-human-resources-ui
description: Comprehensive standards, breakpoint specifications, and responsive design guidelines for the Human Resources web application.
---

# Responsive Human Resources UI Guidelines

This skill provides the single source of truth for responsive, mobile-first design and layout patterns across the Human Resources web application (HR Portal, Vendor Portal, Interviewer Portal, and Auth flows).

---

## 1. Breakpoints & Viewport Scale

The application uses Tailwind CSS breakpoints tailored to standard devices:

| Breakpoint | Pixel Range | Device Class | Primary Layout Behavior |
|---|---|---|---|
| **Mobile (Base)** | `320px – 767px` (`< md`) | Phones (iPhone SE, iPhone 13/14/15/16, Android) | Single-column layouts, mobile card representations for tables, full-width drawers, stacked form fields, minimum 44px touch targets |
| **Tablet** | `768px – 1023px` (`md` to `< lg`) | iPads, Android tablets (portrait/landscape) | 2–3 column grids, scrollable table containers, compact toolbars, collapsible drawers |
| **Desktop** | `1024px – 1439px` (`lg` to `< 2xl`) | Laptops, desktop monitors | Persistent sidebar, full multi-column grids, data tables with complete columns |
| **Large Desktop** | `1440px+` (`2xl+`) | Wide monitors, high-res screens | Max-width constraints (`max-w-7xl` or container padding) to prevent stretched content |

---

## 2. Core Layout Architecture

### 2.1 Viewport Safety & Scroll Prevention
* **No Unintended Horizontal Scrolling**:
  * Body and root must prevent horizontal overflow: `overflow-x-hidden`.
  * The main scroll container must use `flex-1 min-w-0 overflow-y-auto overflow-x-hidden`.
  * Every flex or grid child that displays text or charts must declare `min-w-0` to avoid flex-item minimum size blowing out the viewport.

### 2.2 Content Padding Scale
* Small screens (`< sm`): `p-3` or `p-4`
* Medium screens (`sm` to `md`): `p-4` or `p-5`
* Large screens (`>= lg`): `p-6`

### 2.3 Navigation & Drawer Standards
* **Mobile Sidebar (< 1024px)**:
  * Fixed backdrop overlay with `bg-black/60 backdrop-blur-sm z-40 lg:hidden`.
  * Slide-out drawer with width `w-[280px] max-w-[85vw]`.
  * Prominent close button (`X`) and full nav item titles with minimum 44px tap targets.
  * Internal vertical scrolling (`overflow-y-auto custom-scrollbar`).
* **Desktop Sidebar (>= 1024px)**:
  * Persistent relative positioning (`lg:relative lg:translate-x-0`).
  * Toggle between expanded (`w-60`) and icon-collapsed (`w-18` / `72px`).
* **Top Navigation Bar**:
  * Hamburger menu visible on `< lg`.
  * Truncated breadcrumbs on mobile to prevent overflow.
  * Floating popovers (Notifications, Profile) must be constrained:
    `w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-w-sm right-0`.

---

## 3. Data Tables & Card Representations

Dense data tables must never break mobile screens or force full-page horizontal scrolling.

### 3.1 Dual Representation (Card on Mobile, Table on Desktop)
* Use `block md:hidden` for mobile card layout.
* Use `hidden md:block` for tabular data.
* **Mobile Card Anatomy**:
  * Top: Entity Name + Primary Status Badge + Quick Action (e.g. menu or edit/delete).
  * Middle: 2-column key-value grid for primary metrics (Client, Date, Experience, Openings).
  * Bottom: Secondary chips (Skills, Source) and tap targets.
  * Whole card is clickable for navigation with `active:scale-[0.98]`.

### 3.2 Controlled Horizontal Scroll (When Table Must Be Kept)
* Wrap table inside:
  ```html
  <div className="overflow-x-auto custom-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0">
    <table className="w-full min-w-[650px] border-collapse text-left">
      ...
    </table>
  </div>
  ```
* Include `min-w-[...]` so columns maintain readable width when scrolled.

---

## 4. Forms & Input Fields

* **Desktop vs Mobile Grids**:
  * Do NOT use hardcoded `grid-cols-2` or `grid-cols-4` in forms or modals.
  * Use fluid responsive grids: `grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4`.
  * For multi-button choice selectors (e.g. candidate sources), use:
    `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2`.
* **Touch-Friendly Inputs**:
  * Inputs and selects must have minimum height of 40px–44px (`py-2.5` to `py-3`).
  * Font size on inputs must be >= 14px (`text-sm`) on mobile to prevent iOS Safari auto-zoom.
* **Validation & Errors**:
  * Keep error text wrapping within field width (`text-xs text-destructive break-words`).

---

## 5. Modals & Dialogs

* Outer container: `fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4`.
* Inner modal card:
  * `w-full max-w-lg md:max-w-2xl max-h-[92dvh] flex flex-col`.
  * Header: `p-4 sm:p-6 pb-3 sm:pb-4 border-b`.
  * Body: `p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1`.
  * Footer: `p-4 sm:p-6 pt-3 sm:pt-4 border-t flex flex-col-reverse sm:flex-row justify-end gap-2`.

---

## 6. Search, Filter & Action Bars

* Toolbars must wrap cleanly:
  ```html
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div className="flex flex-wrap items-center gap-2.5 flex-1">
      <!-- Search input takes w-full on mobile, auto on desktop -->
      <div className="relative w-full sm:w-64 md:w-80">...</div>
      <!-- Filter selects -->
      <select className="w-full sm:w-auto">...</select>
    </div>
    <!-- Action buttons -->
    <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">...</div>
  </div>
  ```
* Tab lists:
  ```html
  <div className="flex items-center gap-4 border-b border-border overflow-x-auto no-scrollbar pb-px">
    <!-- Tab buttons with whitespace-nowrap -->
  </div>
  ```

---

## 7. Charts & Visualizations (Recharts)

* Recharts `<ResponsiveContainer width="100%" height="100%">` requires the immediate parent to have:
  * Explicit height (e.g., `h-[260px] sm:h-[320px]`).
  * `min-w-0` on any enclosing flex or grid item to prevent SVG from forcing container expansion.
