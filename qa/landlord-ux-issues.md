# Landlord Flow — UX Issues

**Total UX issues found:** 9

**Methodology:** Static code walk through all landlord-facing UI routes, reading component JSX and interaction logic. Persona: 45-year-old Bangkok condo owner, 3 units, Thai-primary, phone user, low tech-savvy. Issues focus on friction points that would cause this user to stop, get confused, or abandon a flow.

---

### UX-L-01: Onboarding contract step has no visual affordance for skipping — "skip" is buried below the primary CTA

- **Flow:** Onboarding → step 3 (Upload Contract)
- **Pain:** The "Upload Contract" button is prominent (full-width saffron), but "Skip this step" is a secondary border button directly below it. A first-time Thai landlord with an existing physical contract may not realize the entire step is optional. They may feel forced to upload now or abandon onboarding.
- **Persona impact:** 45yo landlord has a PDF on her desktop but not her phone. She's setting this up on her phone. She'll either try to find the PDF on her phone (friction) or tap "Upload Contract" and get confused when the uploader appears in a new page that pulls her out of the wizard entirely (no back-to-onboarding path from the upload page).
- **Concrete fix suggestion:** Move "Skip this step" above the upload CTA as the primary default, rename it to "I'll do this later — continue setup". Use a ghost-style button for Upload. Add a note: "You can upload your contract from the Properties page anytime."

---

### UX-L-02: Onboarding wizard exits to the upload page — no way back into the wizard

- **Flow:** Onboarding → step 3 → "Upload Contract" button
- **Pain:** Clicking "Upload Contract" calls `router.push('/landlord/contracts/upload')` — the landlord leaves the onboarding flow entirely. The upload page has no "back to onboarding" link. If the upload fails or the landlord changes her mind, she has no path back; pressing the browser back button returns to step 3 but the wizard state has reset (React state is gone after navigation).
- **Persona impact:** Low-tech user clicks Upload, gets confused by the drag-and-drop uploader, hits the browser Back button, and finds herself on a blank onboarding step. She has no idea if the property she just created was saved. She'll likely start over or call for help.
- **Concrete fix suggestion:** Replace the router.push with `window.open('/landlord/contracts/upload', '_blank')` so the wizard stays open, OR embed a minimal file-picker inline in the wizard step that posts to the same upload API without leaving the page.

---

### UX-L-03: Contract AI wizard has no indication that "Generate" will also create a new property — duplicate data blindspot

- **Flow:** Contract create wizard → step 6 → Generate
- **Pain:** When a landlord arrives at the wizard via `/landlord/contracts/create?property_id=X`, the property fields are prefilled from the existing property. She edits the form and hits Generate. Silently, a new duplicate property is created (BUG-L-01). The landlord now has "Condo Sukhumvit 11" listed twice in Properties — she'll never know why.
- **Persona impact:** Thai landlord sees two identical properties in her list. She won't understand which is the "real" one. She may delete the wrong one (which has the active contract). This erodes trust.
- **Concrete fix suggestion:** On the Generate step, show a confirmation card: "We'll create a new property called [name] and save your contract." If arriving with `?property_id=`, replace with "We'll save this contract under [existing property name]." Never silently create duplicate records.

---

### UX-L-04: Payment "Confirm Payment" button is labeled the same whether the tenant has claimed or not — no urgency signal for unclaimed vs. claimed

- **Flow:** Payments → Due tab → Confirm Payment button
- **Pain:** The confirm button changes color (amber for claimed, green for unclaimed) but the label is `t('payments.confirm_payment')` for both. A Thai landlord who doesn't read the amber warning carefully won't understand that "Confirm Claim" means "the tenant says they already paid — you're verifying it."
- **Persona impact:** Landlord taps the amber button thinking she's initiating a payment request, not confirming the tenant's claim. She may confirm a payment she hasn't actually received yet.
- **Concrete fix suggestion:** Use two visually distinct components: a "Verify Claimed Payment" section (amber, with the tenant's note prominently displayed) and a separate "Mark as Paid" action. Add explicit copy: "Your tenant says they paid on [date]. Tap below to confirm you received it."

---

### UX-L-05: No landlord-side "Create Maintenance Request" button — landlords can only manage, not initiate

- **Flow:** Maintenance → landlord page
- **Pain:** The maintenance page shows no way for a landlord to create a maintenance request. In practice, a landlord often discovers and manages maintenance herself (she notices a broken tap during a property visit). The only creation path is via tenant side or the beta simulation panel.
- **Persona impact:** Landlord returns from a property visit with 3 things to fix. She opens the app to log them, finds no "New Request" button, and gives up. All her property maintenance history lives outside the app.
- **Concrete fix suggestion:** Add a "+ New Request" button in the maintenance page header that opens a form collecting: contract (dropdown), title, description, photo upload. Pre-fill `raised_by` with the landlord's user ID. The existing API (`POST /api/maintenance`) already accepts landlord-created requests.

---

### UX-L-06: Renew page defaults to 1-year extension regardless of original lease duration — can surprise a landlord with short leases

- **Flow:** Contract lifecycle → renew
- **Pain:** The default `leaseEnd = addYears(prevEnd, 1)` always adds 12 months regardless of the original lease duration. If the original lease was 6 months, the default renewal is 12 months — double. The landlord has to manually correct it.
- **Persona impact:** Non-tech landlord sees default dates, doesn't question them, hits "Send to Tenant". Tenant receives a 12-month offer they didn't expect. Dispute ensues.
- **Concrete fix suggestion:** Default the renewal duration to match the original lease duration: `const originalDurationMs = originalLeaseEnd - originalLeaseStart`. Then `defaultEnd = addDuration(prevEnd, originalDurationMs)`.

---

### UX-L-07: Pairing page shows QR code and short code on the same screen with no clear hierarchy — overwhelming for a first-time user

- **Flow:** Tenant pairing → pair page after code generation
- **Pain:** After generating a code, the page shows: QR code (192px), then "Or enter code" label, then a large `text-3xl` monospace code, then an expiry time, then a 3-step instruction list. There's no clear primary action communicated. The QR code is only scannable from another device, but the instruction list is tiny and below the fold on a phone.
- **Persona impact:** Bangkok condo owner wants to send this to her tenant via LINE. She doesn't understand she needs to send the short code, not a screenshot of the QR. She sends the QR screenshot, tenant can't scan it from a chat message.
- **Concrete fix suggestion:** Primary section: a large "Share this code with your tenant: XXXXXX". Secondary section (collapsed/smaller): QR code with label "Or scan this QR". Add a prominent LINE/copy share button below the code that sends: "Join RentOS: your code is XXXXXX. Go to [url] to enter it."

---

### UX-L-08: Empty dashboard (no contracts/properties) shows no onboarding nudge — dead-end for returning users who cleared their data

- **Flow:** Dashboard → zero-data state
- **Pain:** The `contractIds.length === 0` code path at `app/landlord/dashboard/page.tsx:84–106` renders `DashboardClient` with all zeros and empty arrays. The `DashboardClient` renders four stat cards showing "0" and two empty-state messages. There is no CTA, no "Add your first property" prompt, no link to onboarding.
- **Persona impact:** A landlord who deleted a test property returns to a dashboard showing all zeros with no guidance. She doesn't know if something broke or if the app is just empty. She taps around looking for a button and eventually gives up.
- **Concrete fix suggestion:** When `totalPropertyCount === 0` (truly empty account), render a full-width empty state card with: title "Welcome back!", body "Add a property to get started", primary CTA button linking to `/landlord/onboarding` or `/landlord/properties`.

---

### UX-L-09: `?filter=expiring` query param in the renewals banner links to an unfiltered contracts list (known deferred issue)

- **Flow:** Dashboard → renewals banner → "Review" button
- **Pain:** Clicking "Review" from the dashboard renewals banner navigates to `/landlord/contracts?filter=expiring` — but this route just redirects to `/landlord/properties` with no filtering applied (contracts page is a redirect: `app/landlord/contracts/page.tsx:1–5`). The landlord lands on an unfiltered property list with no indication of which contracts are expiring.
- **Persona impact:** The banner catches her attention. She taps Review. She sees all her properties listed normally. She has no idea which ones are expiring. The entire point of the banner is lost.
- **Note:** This was acknowledged as a known deferred issue in `SPRINT_REPORT_BETA_HARDENING.md:153`. Logging here so it is tracked for the next sprint.
- **Concrete fix suggestion:** Either (a) pass `?filter=expiring` through to the properties list and filter `PropertyListRow` components to show only those with expiring active contracts, or (b) change the banner link to `/landlord/properties` with a toast "Contracts expiring soon are highlighted below" and highlight matching rows with a saffron badge.
