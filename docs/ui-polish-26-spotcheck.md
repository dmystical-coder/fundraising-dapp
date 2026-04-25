# UI polish spot-check (issue #26)

Use this list when reviewing PRs for the [final polish pass](https://github.com/dmystical-coder/fundraising-dapp/issues/26). Pair with the design review notes in the repo and design tokens (issue #12).

## Routes and viewports

| Route | 320px | Tablet (~768px) | Wide (≥1280px) |
|-------|-------|-----------------|------------------|
| `/` | | | |
| `/campaigns` | | | |
| `/campaigns/[id]` | | | |
| `/dashboard` | | | |
| `/campaigns/new` | | | |

## Keyboard-only (primary flows)

- [ ] Tab from page load: **Skip to main content** link appears first (focus), then nav, then page.
- [ ] **Home →** scroll or navigate to campaign list; open a campaign.
- [ ] **Donate:** open modal, move through payment method, presets, custom amount, donate/close; focus ring visible throughout.
- [ ] **Wallet:** connect / account menu / disconnect (mainnet path).

## Reduced motion

- [ ] OS/browser: turn on “reduce motion”.
- [ ] **Donation modal:** no scale-in animation; overlay without blur (or minimal motion).
- [ ] **Campaign cards:** no lift/transform on hover; page still usable.
- [ ] **Scroll:** anchor jumps are not smooth-scrolled (instant).

## Regression quick checks

- [ ] No critical layout shift on home stats (skeleton vs loaded height).
- [ ] Light mode default; semantic text colors readable (no stray `gray.500` on surfaces).

**Reviewer:** _______________ **Date:** _______________
