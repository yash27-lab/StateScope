# StateScope
Single-screen ops engine that forecasts 90-day staffing coverage gaps and credential risk by state.

## What It Does
StateScope turns a staff roster + demand forecast into decision-ready outputs:
- Coverage gaps by state for the next 90 days.
- License, DEA, NPI, and certification expiry risk.
- An issue list with operational reasons and next steps.
- A recommended action engine with evidence and exports.

## Quick Start
No build step is required. Open the app directly:

```bash
open index.html
```

Optional: serve locally (any static server works):

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## CSV Inputs
You upload two CSVs: **Roster** and **Demand**.

### Roster CSV (staff licensing + credentials)
Each row is a provider.

Required (any of these header variants are accepted):
- `provider name`
- `role`
- `states licensed` (pipe/comma/semicolon separated)
- `license expiry date`
- `DEA expiry date`
- `NPI`
- `specialty`
- `certifications`
- `availability` (0.0–1.5 or 0–100%)

Example headers:
```
provider name,role,states licensed,license expiry date,DEA expiry date,NPI,specialty,certifications,availability
```

### Demand CSV (forecasted demand per state + date)
Each row is a forecast entry.

Required:
- `state` or `state code`
- `date` or `week_start`
- `demand` or `visits`

Example headers:
```
state,date,demand
```

## Key Terms
- **Coverage gap**: demand exceeds licensed supply.
- **Gap weeks**: number of weeks with any gap in the 90‑day horizon.
- **Peak gap**: largest gap in a given state.
- **Time to impact**: exact date plus days until a gap or expiry.
- **Verification**: live NPI Registry lookup on demand.

## How It Works
- Parses roster + demand CSVs (handles quoted values, commas, and flexible headers).
- Aggregates demand by state + date.
- Calculates licensed supply based on state eligibility and license validity.
- Generates coverage cards, risk radar, issue list, and evidence drawer.
- Exports coverage and risk reports (CSV) and a 1‑page PDF brief.

## Sample Data
Use the built‑in buttons or local files:
- `data/sample_roster.csv`
- `data/sample_demand.csv`
- `data/complex_roster.csv`
- `data/complex_demand.csv`

## Exports
- **Coverage gaps CSV**: state, next gap, max gap, peak demand/supply.
- **Risk report CSV**: provider, issue, severity, verification state.
- **Risk brief PDF**: top 5 gaps and top 5 expiries with a footer timestamp.

## Keyboard Shortcuts
- `↑ / ↓` navigate Issue List
- `Enter` open Evidence
- `Space` open Evidence
- `?` open shortcuts modal
- `Esc` close Evidence or modal

## Screenshots
Stored in `docs/screenshots` in timestamp order.

## License
MIT
