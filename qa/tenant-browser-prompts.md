# Tenant Flow Browser Prompts

**Total prompts:** 8

**Methodology:** These prompts cover flows where static analysis identified suspicious behaviour
but live execution is needed to confirm. Each prompt references the related static bug where
applicable. Preconditions assume the beta seed data is in place via the `auto_pair_demo_tenant`
simulation.

---

### BROWSER-T-01: Sarabun font in PDF receipt

**URL:** http://localhost:3000/tenant/payments
**Precondition:** Paired tenant with at least one payment row where `status = 'paid'` and `paid_date` is set
**Steps:**

1. Sign in as the demo tenant
2. Navigate to `/tenant/payments`
3. Expand the "Completed" section
4. Click "Download Receipt" on any paid row
5. Open the downloaded PDF
6. Inspect the bilingual header, party names, and amount box
   **Check:** Do Thai characters (ใบเสร็จรับเงิน, ผู้เช่า, ค่าเช่า) render as legible Thai script, or do they show placeholder boxes / Helvetica Latin fallback?
   **Success criteria:** All Thai strings render in Sarabun; amount box shows ฿ baht symbol correctly
   **Related bug:** BUG-T-03

---

### BROWSER-T-02: Documents page — "View" link on tenant-uploaded document

**URL:** http://localhost:3000/tenant/documents
**Precondition:** Tenant has at least one document uploaded via the "+ Upload Document" flow
**Steps:**

1. Sign in as the demo tenant
2. Navigate to `/tenant/documents`
3. Locate a tenant-uploaded document in the list
4. Click the "View" button
   **Check:** Does the link open the document, or does it navigate to a `null`/blank URL?
   **Success criteria:** Document opens in a new tab showing the actual file content
   **Related bug:** BUG-T-06

---

### BROWSER-T-03: Appeal penalty at `pending_landlord_review` status

**URL:** http://localhost:3000/tenant/penalties/appeal
**Precondition:** A penalty exists with `status = 'pending_landlord_review'` AND `tenant_appeal_note = null` (use Supabase SQL editor to set this state directly)
**Steps:**

1. Sign in as the demo tenant
2. Navigate to `/tenant/penalties/appeal`
3. Locate the penalty at `pending_landlord_review` status
4. Verify "Appeal" button is visible
5. Enter an appeal note and submit
6. Check the Supabase `penalties` table: did `tenant_appeal_note` and `status` update?
7. Observe what the UI shows after submission
   **Check:** Does the appeal succeed silently, fail silently with no error, or show an error to the user?
   **Success criteria:** (desired) Appeal updates DB and UI shows "Appeal submitted". Currently expected to fail silently per BUG-T-01
   **Related bug:** BUG-T-01

---

### BROWSER-T-04: Contract viewer with `parse_failed` contract

**URL:** http://localhost:3000/tenant/contract/view
**Precondition:** Use Supabase SQL to set the tenant's contract status to `parse_failed` (or `scheduled`), then visit the viewer
**Steps:**

1. Run: `UPDATE contracts SET status = 'parse_failed' WHERE tenant_id = '<demo-tenant-id>'`
2. Sign in as demo tenant
3. Navigate to `/tenant/contract/view`
   **Check:** Is the contract shown (even with a parse_failed badge), or does the page show "You have no active contract"?
   **Success criteria:** (desired) Page shows a meaningful message like "Contract processing failed — contact your landlord"
   **Related bug:** BUG-T-04

---

### BROWSER-T-05: Pairing a forward-dated contract

**URL:** http://localhost:3000/tenant/pair
**Precondition:** Create a contract with `lease_start` 30 days in the future; generate a pairing code for it
**Steps:**

1. Sign in as demo landlord
2. Create/update a contract with `lease_start = today + 30 days`
3. Generate pairing code
4. Sign in as demo tenant (new incognito window)
5. Navigate to `/tenant/pair`
6. Enter the pairing code and submit
   **Check:** What response does the tenant see? Is there a clear error message or a generic failure?
   **Success criteria:** (desired) Tenant sees "Contract starts on [date] — pairing will complete then" or similar; currently expected to show generic "Failed to pair" error per BUG-T-11
   **Related bug:** BUG-T-11

---

### BROWSER-T-06: Custom rule lease_expiry notification URL

**URL:** http://localhost:3000/tenant/notifications
**Precondition:** Landlord has a custom notification rule for `lease_expiry` (or manually insert a notification row with `type = 'lease_expiry'` and `url = '/tenant/contracts'`)
**Steps:**

1. Insert notification: `INSERT INTO notifications (recipient_id, type, title, body, url, sent_at) VALUES ('<tenant-id>', 'lease_expiry', 'Test', 'Test body', '/tenant/contracts', now())`
2. Sign in as demo tenant
3. Navigate to `/tenant/notifications`
4. Click the lease_expiry notification
   **Check:** Does it route to `/tenant/contract/view` or to a 404 at `/tenant/contracts`?
   **Success criteria:** Routes to `/tenant/contract/view`
   **Related bug:** BUG-T-02

---

### BROWSER-T-07: Payments page stale closure after navigation

**URL:** http://localhost:3000/tenant/payments
**Precondition:** Paired tenant with payment rows
**Steps:**

1. Sign in as demo tenant
2. Navigate to `/tenant/payments` — note the payment amounts
3. Navigate away to `/tenant/dashboard`
4. Navigate back to `/tenant/payments`
5. Open DevTools Network tab and observe what `contracts` query fires (check the `tenant_id` filter)
   **Check:** Does the second load fire a fresh query with the current user ID, or does it use cached/stale data?
   **Success criteria:** Network shows a fresh Supabase query on every visit with the correct user ID
   **Related bug:** BUG-T-05

---

### BROWSER-T-08: Middleware role enforcement — tenant URL-hacking to landlord route

**URL:** http://localhost:3000/landlord/dashboard
**Precondition:** Active tenant session
**Steps:**

1. Sign in as demo tenant
2. Manually type `http://localhost:3000/landlord/dashboard` in the address bar
3. Observe redirect behaviour
4. Also try: `/landlord/contracts`, `/landlord/properties`, `/landlord/payments`
   **Check:** Are all `/landlord/*` routes redirected to `/tenant/dashboard` for a tenant-role user?
   **Success criteria:** Every `/landlord/*` attempt redirects to `/tenant/dashboard` with no landlord data visible
   **Related bug:** none (middleware role enforcement verification)
