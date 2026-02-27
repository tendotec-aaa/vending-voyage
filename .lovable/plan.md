

## Plan: Fix Rent Calculations, Add Rent Tracking to Locations, and Redesign Spots Analytics

### Issues Identified

1. **VisitDetail.tsx (line 224)**: `monthlyRent` uses the full location rent instead of dividing by number of spots at that location. Need to fetch sibling spot count.
2. **useSpotAnalytics.tsx (line 149-150)**: `rentAmount` is the monthly rent per spot (correctly divided), but `netProfit = totalSales - rentAmount` subtracts only one month's rent regardless of how long the spot has been active. Should calculate rent from contract start to last visit date.
3. **Spots Leaderboard**: Needs more columns (Days Open, visit count) and a date range filter. Table too wide for mobile — needs responsive card layout.
4. **Locations page**: Needs per-spot rent display and accrued rent calculations.

---

### 1. Fix VisitDetail Monthly Rent (per spot)

**File**: `src/pages/VisitDetail.tsx`

- Add a query to count sibling spots for the same location: `SELECT count(*) FROM spots WHERE location_id = ?`
- Divide `monthlyRent` by spot count: `const spotMonthlyRent = monthlyRent / spotCount`
- Use `spotMonthlyRent` for the "Monthly Rent" card display
- `dailyRent = spotMonthlyRent / 30` for rent-since-last-visit (this part was already using the undivided value, so it was also wrong)
- Label the card "Monthly Rent (per spot)" for clarity

### 2. Fix Spot Analytics Rent Calculation

**File**: `src/hooks/useSpotAnalytics.tsx`

Currently: `netProfit = totalSales - rentAmount` (one month's rent per spot). Should be: rent accrued from contract start to last visit date.

- Fetch `contract_start_date` from the location join (add to the select)
- Find the last visit date for each spot: `Math.max(...spotVisits.map(v => v.visit_date))` 
- Calculate `daysOfRent = differenceInDays(lastVisitDate, contractStartDate)`
- `dailyRent = rentAmount / 30` (rentAmount is already per-spot monthly)
- `totalAccruedRent = dailyRent * daysOfRent`
- `netProfit = totalSales - totalAccruedRent`
- Update `SpotAnalytics` interface: add `lastVisitDate`, `contractStartDate`, `totalAccruedRent`
- Add date range filtering support: add `dateRange` param, filter visits within range, and prorate rent accordingly

### 3. Date Range Filter for Spots Analytics

**File**: `src/pages/Spots.tsx`

- Add a date range selector (Last 30d, Last 3m, Last 6m, Last 1y, All Time) as a filter alongside location/profitability/stock filters
- Pass the date range to `useSpotAnalytics` or filter client-side
- When a range is selected, filter visits within that range and prorate the rent calculation for only those days

**File**: `src/hooks/useSpotAnalytics.tsx`

- Accept optional `dateRange` parameter
- Filter `spotVisits` to only include visits within the range
- Calculate rent only for the days within the range (or from contract start if it falls within)

### 4. Redesign Spots Leaderboard

**File**: `src/components/spots/SpotLeaderboard.tsx`

Add columns and make mobile-responsive:
- Add **Days Open** column (from `daysActive`)
- Add **Visits** column (from `visitCount`)  
- Add **Last Visit** column (from `lastVisitDate`)
- On mobile: switch from table to stacked card layout showing key metrics in a compact grid
- Remove horizontal scroll requirement — use responsive breakpoints
- Each card shows: Rank, Name, Location, Sales, Rent, Profit, ROI, Stock bar, Trend, Days Open

### 5. Locations Page — Per-Spot Rent Display & Accrued Rent

**File**: `src/pages/Locations.tsx`

- Fetch last visit date per spot (query `spot_visits` grouped by `spot_id`, max `visit_date`)
- For each location: calculate `accrued rent = (dailyRent) * days from contract_start to lastVisitDate`
- For each spot: show `Monthly Rent / spotCount` as the spot's share
- Show per-spot accrued rent: `(spotMonthlyRent / 30) * days from contract_start to spot's lastVisitDate`
- Display in the spot accordion trigger line: `$XX.XX/mo rent` badge
- Add a summary line per location card: "Rent Paid: $X,XXX.XX (Start → Last Visit)" with tooltip or subtitle explaining the date range
- Use clear labels: "Spot Rent: $125.00/mo" and "Rent Accrued (Jan 1 – Jan 15): $62.50"

### Files to Modify

1. `src/pages/VisitDetail.tsx` — Fix monthly rent division by spot count
2. `src/hooks/useSpotAnalytics.tsx` — Fix rent to use contract start → last visit, add date range support, add new fields to interface
3. `src/pages/Spots.tsx` — Add date range filter dropdown
4. `src/components/spots/SpotLeaderboard.tsx` — Add Days Open/Visits/Last Visit columns, responsive card layout for mobile
5. `src/pages/Locations.tsx` — Add per-spot rent and accrued rent display

