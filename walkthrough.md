# DineIn Shop Location Map — Implementation Walkthrough

## ✅ Build Result
**Compiled successfully (exit code 0)** — `206 kB` JS, `18 kB` CSS gzipped.
All ESLint warnings are pre-existing in unrelated files; zero new warnings introduced.

---

## Files Created

### [`src/data/shopCoordinates.js`](file:///d:/Codes/PROJECTS/project1/Frontend/src/data/shopCoordinates.js)
- Static `shopName → { latitude, longitude }` lookup
- 15 FrozenFeast locations pre-loaded across Pune, Mumbai, Bangalore
- `getShopCoordinates(shopName)` helper with Pune city-center fallback
- **No backend change needed** — merges with live API data on the frontend

### [`src/Components/ShopLocationMap.jsx`](file:///d:/Codes/PROJECTS/project1/Frontend/src/Components/ShopLocationMap.jsx)
- Accepts `shop` prop (`null` → placeholder state)
- Single `<MapContainer key="frozen-feast-shop-map">` — never remounts
- Inner `<MapFlyTo lat lng>` component uses `useMap()` + `flyTo()` to smoothly recenter whenever the selected shop changes
- Purple custom marker (via `leaflet-color-markers`) matching FrozenFeast brand
- Webpack marker icon fix (`L.Icon.Default.mergeOptions`)
- **Get Directions** button → `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`
- Dark popup styles override Leaflet defaults

### [`src/Components/ShopLocationMap.css`](file:///d:/Codes/PROJECTS/project1/Frontend/src/Components/ShopLocationMap.css)
- Glassmorphism panel with purple border glow
- 400px map height (desktop), 300px (mobile)
- Dark popup overrides for Leaflet's `.leaflet-popup-content-wrapper`
- Fade-in animation on mount

---

## Files Modified

### [`ShopCard.jsx`](file:///d:/Codes/PROJECTS/project1/Frontend/src/Components/ShopCard.jsx)
```diff
- const ShopCard = ({ shopName, shopImageUrl, location, rating, onSelectShop }) =>
+ const ShopCard = ({ shopName, shopImageUrl, location, rating, onSelectShop, isSelected }) =>

- <div className="shop-container" onClick={onSelectShop} role="button" tabIndex={0}>
+ <div className={`shop-container${isSelected ? ' shop-container--selected' : ''}`}
+      onClick={onSelectShop}
+      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectShop?.()}
+      role="button" tabIndex={0} aria-pressed={isSelected}>
```

### [`ShopCard.css`](file:///d:/Codes/PROJECTS/project1/Frontend/src/Components/ShopCard.css)
```css
.shop-container--selected {
  border-color: rgba(224, 64, 251, 0.6) !important;
  box-shadow: 0 0 0 2px rgba(224, 64, 251, 0.35), 0 8px 30px rgba(224, 64, 251, 0.25) !important;
  transform: translateY(-3px);
  background: rgba(224, 64, 251, 0.06) !important;
}
```

### [`DineIn.jsx`](file:///d:/Codes/PROJECTS/project1/Frontend/src/pages/DineIn.jsx)
- Added `selectedShop` state (null by default)
- `handleSelectShop` now enriches shop with coords + calls `setSelectedShop`
- Layout changed to `dinein-content` flex wrapper (cards left, map right)
- `<ShopLocationMap shop={selectedShop} />` rendered in sticky map panel
- `isSelected` passed to each `<ShopCard>` via `_id` or `shopName` comparison
- **All existing logic preserved**: fetch, filter, loading, error states untouched

### [`DineIn.css`](file:///d:/Codes/PROJECTS/project1/Frontend/src/pages/DineIn.css)
- `.dinein-content` — flex row, 30px gap, max 1400px
- `.shops-container` — `flex: 1 1 0` (fills available space)
- `.dinein-map-panel` — 420px wide, `position: sticky; top: 80px`
- Mobile `≤768px` — stacks vertically, map goes full-width, `position: static`

---

## Map Library Used
**react-leaflet + leaflet** with **OpenStreetMap** tiles (free, no API key required)

## Coordinates
**Not in the database** — handled via frontend lookup in `shopCoordinates.js`. To add a new shop's exact coordinates, simply add an entry matching the `shopName` from the DB.

## Packages Added
```
leaflet        ^1.x
react-leaflet  ^4.x
```
(3 packages total, no breaking changes)

---

## Manual Verification Checklist

- [ ] DineIn page loads — shop cards render normally
- [ ] No shop selected → map panel shows "Select a shop card" placeholder
- [ ] Click Shop A → Shop A shown on map, card glows purple
- [ ] Click Shop B → **same map** smoothly flies to Shop B, marker updates
- [ ] Marker popup shows correct shop name + address
- [ ] "Get Directions" opens Google Maps directions to that shop's lat/lng
- [ ] Desktop: cards and map side-by-side
- [ ] Mobile (≤768px): cards on top, map below, full width
- [ ] Search/filter still works — map stays on last selected shop
