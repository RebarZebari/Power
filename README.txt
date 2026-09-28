ENERGY & POWER SOLUTIONS — VERSION 3.1

INSTALL ON YOUR EXISTING SITE
1. Extract this ZIP into a folder.
2. Sign in to Netlify and open your existing energyandpowersolutions project.
3. Open Deploys and upload the extracted folder using the deploy dropzone.
   Upload the folder containing index.html, app.js, model.js, export.js,
   styles.css, business.json and vendor. Keep all these files together.
4. Wait until the new production deployment is published, then refresh:
   https://energyandpowersolutions.netlify.app
5. Confirm the header says “Planning workspace · v3.1”.

The new version is not published merely by downloading this package.
No build command, API key, paid calculation service or database is required.
Your hosting account's own plan and usage limits still apply.
Netlify manual deployment instructions:
https://docs.netlify.com/deploy/create-deploys/#drag-and-drop

HOW TO USE
Dispatch: choose Diesel–Solar–BESS, On-grid, Off-grid or Hybrid. Enter load,
voltage, phase and power factor, then equipment limits. Calculate. Compare
three diesel strategies and inspect each hour's power and current results.
Costs are in IQD. Default values are examples, not your site measurements.

Projects: save in your browser, reopen saved projects, or download portable
.eps.json backups. Reopen the downloaded file on another device. Browser
storage is not cloud storage and can be removed when browser data is cleared.
Saving includes inputs, generators, sizing settings and imported hourly data.

Reports: export dispatch or sizing calculations as PDF or Excel .xlsx.
Exports recalculate the current inputs. Excel is a numeric snapshot; change
inputs and calculate again in the website to produce revised results.

Hourly data: use the included hourly-profile-template.csv or download the
same template from Dispatch. Provide exactly one row for each hour 0–23.
Headers: hour,load_kw,solar_kw. Values are one-hour average kW. Solar means
available AC-equivalent power after conversion/losses, before curtailment.
Imported solar is still limited by the entered inverter ratings. The default
PV nameplate/loss inputs do not rescale imported data. For several days,
import and save each day as a separate project.

Generators: add up to eight units. Each has rated kW/kVA, operating kW cap,
derating, minimum load %, current limit, linear fuel curve and available
hours. Equal start/end means all day. End hour is exclusive. Current limit
zero means no extra generator-current restriction. “Force daytime” applies
to the daytime-minimum strategy from 06:00 to 18:00. Check the entered PF.
Minimum output is based on nameplate kW; limits can make a setting invalid.
Unabsorbed generator surplus is explicitly flagged; a real system must
absorb that energy or change commitment.

Equipment sizing: separate energy-based panel, inverter and battery module
calculator. You may copy the dispatch load profile. Enter site peak-sun-hours,
efficiencies, usable discharge, allowance and real module specifications.
Battery module count considers energy and continuous power. Modules are
assumed identical and parallel. Sizing does not overwrite dispatch equipment.

Business settings: enter your business name, email, phone, location, website,
service descriptions, and PNG/JPEG logo (up to 1 MB). Apply & save updates
this browser and its reports. Download branded website ZIP, extract it and
upload to the same Netlify project's Deploys page to publish your details
for every visitor. The branded ZIP excludes saved projects and imported data.
No personal contact information has been guessed or published. An EPS text
logo and editable generic service descriptions are included as defaults.
Business settings are local customization, not a shared administrator portal.

CALCULATION BASIS
Three-phase AC current magnitude: I = kW x 1000 / (sqrt(3) x V_LL x PF).
Single-phase AC current magnitude: I = kW x 1000 / (V_LN x PF).
Battery charge/discharge efficiencies each equal sqrt(round-trip efficiency).
Battery DC charge current = AC charge kW x efficiency x 1000 / DC voltage.
Battery DC discharge current = AC discharge kW x 1000 / efficiency / DC voltage.
Generator effective limit is the lowest of derated kW, operating cap,
kVA x PF, and current-derived kW limit.
Fuel curve = intercept L/h + slope L/kWh x output kW for each running unit.
See report Notes and sizing calculation steps for the full assumptions.

This is a one-day, one-hour planning model, not live equipment control.
Generator commitment is selected hourly with linear fuel curves; it does
not model start costs, ramps, minimum runtime or transient dynamics.
Different ending battery SOC values affect strategy comparisons. The model
does not force an identical ending SOC. Grid charging is not included.
On-grid PV stops during grid outages; hybrid backup assumes islanding hardware.
AC currents use a common assumed PF and are not a reactive-power study.
Actual panel strings, MPPT limits, surge/BMS capability, thermal derating,
cables and protection require separate equipment-specific engineering.

EDITING THE CODE
All source files are included. app.js controls screens, model.js contains
calculations, export.js builds XLSX/PDF/ZIP downloads, styles.css controls
appearance, and business.json stores published business defaults. No npm
build is needed. For local testing, serve this folder over HTTP; direct
file:// opening can block business settings and branded-package downloads.
Third-party PDF library license is included in vendor/PDF-LIB-LICENSE.txt.

VERIFICATION
1,920 dispatch cases checked across four system types and three strategies.
Verified hourly power balance, battery energy balance and current/SOC limits,
generator output limits, missing supply and CSV validation. DOM-based checks
covered tabs, input changes, browser saves, project roundtrip, CSV import,
all system modes, branding and exports. Generated XLSX files were read using
openpyxl; PDFs were parsed and representative pages rendered for inspection.

VERSION 2.2: Mobile layout fix. Input fields stack on phones, all navigation
tabs remain visible, and wide tables scroll inside their panels.

VERSION 2.2: This version redirects deployment-specific addresses ending in
--energyandpowersolutions.netlify.app to the main website address. Publish
this package as production in the existing project. Older immutable deploy
links cannot be changed by this package. The redirect needs JavaScript.

VERSION 3.0 — POWER SYSTEM STUDIES
Five sections are available under Power system studies. Each has an input
screen, calculation results, method/scope notes and its own PDF/Excel export.
All study inputs are saved with your project. Older v2 project files open
with example study defaults. Studies are independent of dispatch settings.

1. Radial load flow: one source, one common voltage level, 1–12 load buses.
Choose each bus's upstream parent. Enter local three-phase kW/kvar, incoming
branch total R/X per phase in ohms and the branch ampacity. A balanced
constant-PQ backward/forward sweep calculates bus voltages, voltage angles,
branch currents, loading, losses and source power. Voltage limits are entered
by the user. Meshed networks, taps and voltage-control buses are not included.

2. Three-phase short circuit: one utility, transformer and outgoing cable.
Enter source fault MVA, source X/R, transformer kVA and Z%, transformer X/R,
cable R/X and voltage factor. Calculates symmetrical RMS fault current at the
transformer terminals and cable end. Does not implement complete IEC 60909
corrections, earth faults, motor contribution, peak or breaking duties.

3. Generator assessment: rated/load currents, kW/kVA loading, reactive demand,
minimum-load check, required identical units and one-unit-out capacity.
Includes a separate per-unit initial terminal fault estimate from Xd double
prime. This is not sustained generator fault current. Dynamic starting and
OEM generator capability curves are not evaluated.

4. Transformer assessment: primary/secondary currents, kVA loading, estimated
losses, efficiency, approximate lagging-PF voltage regulation and an
infinite-source terminal fault estimate. Enter actual nameplate/test data.

5. Power factor correction: fundamental-frequency compensation kvar, before/
after current and kVA. Does not select detuned reactors or capacitor steps.

These are preliminary engineering tools, not an ETAP replacement or ETAP
file importer. Each module explains its limits alongside the results.
Reference fundamentals (Schneider Electric Electrical Installation Guide):
https://www.electrical-installation.org/enwiki/Calculation_of_voltage_drop_in_steady_load_conditions
https://www.electrical-installation.org/enwiki/Short-circuit_current_at_the_secondary_terminals_of_a_MV/LV_distribution_transformer

Additional verification: radial load flow checked against an independent
closed-form two-bus solution and a lossless case; source/load/loss balance
checked; transformer fault current checked against the guide's 400 kVA,
420 V, 4% example (about 13.7 kA). Tested finite source/cable effects,
generator capacity checks, power-factor correction and invalid inputs.
All five study exports and saved-study project roundtrips were exercised.

VERSION 3.1 — AUDIT AND PUBLIC ADDRESS
Read audit.html for the full code/method review, corrections, test scope,
standards reference matrix and unresolved conformance gaps. Open the audit
from the link at the top of the site; its Print button can save a PDF.
This is NOT a fully IEC- or ANSI/IEEE-compliant study package.
IEC 60909-0:2026 is the current edition identified by the official catalogue.
Full normative text conformance, complete fault methods and equipment-duty
validation remain outstanding. Do not use the fault estimate alone to
approve protective-device ratings.

Your main site returned v2.1 during the audit. Upload this complete folder to
Deploys within the EXISTING energyandpowersolutions project and publish it
as production. Open https://energyandpowersolutions.netlify.app directly and
verify v3.1. A successful preview or a newly-created Netlify project does not
update your existing production site. Old deployment permalinks are immutable.
The alias redirect now covers other Netlify subdomains. A copy button always
copies the clean main address. The app does not control Safari history or old
copies. If the main address itself changes, supply the complete resulting URL.
