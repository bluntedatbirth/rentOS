# RentOS — Hotfix Sprint Backlog

**Sprint type:** Hotfix (pre-launch, ship ASAP)  
**Generated:** 2026-04-11  
**For:** Engineering agent team

---

## Context

RentOS is a Thai-first rental property management SaaS (React / Next.js 14 App Router + Supabase + TypeScript) in closed beta, pre-launch. This sprint is a **hotfix-only sprint**: every item below is a confirmed bug that either blocks a core user flow entirely, permanently corrupts data, or breaks the product for Thai users (who are the primary market). These must be fixed, reviewed, and deployed before any new feature work.

The app uses Next.js Route Handlers (not pages/API), Supabase (anon + service-role clients), and a custom i18n system with EN/TH/ZH-CN locale files. All file paths are relative to the repo root (`rental-manager/`). Supabase migrations live in `supabase/migrations/`.

**Execution order matters** — respect the dependency notes. Items 1 and 2 must ship together. Item 7 (RLS migration) must be deployed before the frontend appeal button changes in item 8.

---

## HF-01: Fix Payment Confirmation Calling Wrong Endpoint

**Bug:** P0-02 | **Severity:** P0 — Launch Blocker  
**Source file:** `app/landlord/payments/page.tsx:173–185`

**Problem:** `handleConfirmPayment` calls `PATCH /api/payments/{id}` with `{ status: 'paid' }`. This PATCH route has no notification call and does not write `confirmation_date` or `confirmed_by`. Tenants never receive a "Payment Confirmed" notification. The audit trail is permanently incomplete for every confirmed payment in the system.

**The correct route** for payment confirmation is `POST /api/payments/{id}/confirm` which already exists at `app/api/payments/[id]/confirm/route.ts` and handles notifications + metadata correctly.

**Fix:** In `app/landlord/payments/page.tsx` at line 173, change the fetch call from:

```ts
fetch(`/api/payments/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'paid' }) });
```

to:

```ts
fetch(`/api/payments/${id}/confirm`, { method: 'POST' });
```

Adjust the request body to match what `confirm/route.ts` expects (check its zod schema — likely just the payment ID in the URL, no body required).

**Expected behavior after fix:** When landlord clicks "Confirm Payment", the tenant receives a push/in-app notification saying their payment was confirmed, and the payment row has `confirmation_date` and `confirmed_by` populated.

**Verification:**

1. In the beta simulation panel, seed a contract with a tenant and mark a payment as `claimed`.
2. As the landlord, click "Confirm Payment".
3. Check the `payments` table row — `confirmation_date` and `confirmed_by` must be set.
4. Check the `notifications` table — a notification for the tenant must exist with type `payment_confirmed`.

**Complexity:** S | **Dependencies:** None — ship first.

---

## HF-02: Fix AI Wizard Always Creating Duplicate Property

**Bug:** P0-01 | **Severity:** P0 — Launch Blocker  
**Source file:** `app/landlord/contracts/create/page.tsx:322–356`

**Problem:** The contract create wizard can be opened with `?property_id=X` (from the onboarding flow or existing property page). At line 322, on every "Generate Contract" press, the code unconditionally POSTs `/api/properties` to create a new property row — completely ignoring the `property_id` query parameter. Every retry or use from an existing property accumulates orphan property rows. Multiple presses = multiple orphan properties in the landlord's account.

**Secondary bug (same fix):** When `output_language === 'english'`, `raw_text_th` is never set. The contract is created without Thai text and without clauses, which triggers `parse_failed` status (see HF-03 which must ship together).

**Fix:**

1. At line 322, before calling `POST /api/properties`, read the URL query param: `const prefillPropertyId = new URLSearchParams(window.location.search).get('property_id')`.
2. If `prefillPropertyId` is set, skip the `/api/properties` POST entirely and use `prefillPropertyId` as the `property_id` in the subsequent `POST /api/contracts` body.
3. If not set (new contract flow), proceed with existing property creation — no change.
4. At line 341, wrap the security deposit calculation with `Math.round()`: `security_deposit: Math.round(data.monthly_rent * data.security_deposit_months)` to prevent fractional baht.
5. In the Generate step UI (step 6), add a summary card below the button:
   - If `?property_id=` is present: "Saving contract under: [property name from prefilled fields]"
   - If new: "Creating new property: [name from step 1]"

**Expected behavior after fix:** When wizard is opened with `?property_id=X` and Generate is pressed, no new property row is created. The new contract row references the existing property. Pressing Generate multiple times does not create duplicate property rows.

**Verification:**

1. Navigate to `/landlord/contracts/create?property_id=<any-valid-property-id>`.
2. Complete all 6 steps and click Generate.
3. Check the `properties` table — no new row should be created with the same name/address as the prefilled property.
4. Check the new `contracts` row — its `property_id` must equal the prefilled ID.
5. Run Generate a second time — still no additional property row.

**Complexity:** M | **Dependencies:** HF-03 must ship in the same PR/deploy.

---

## HF-03: Fix Generated Contract Landing as parse_failed — No Structured Clauses

**Bug:** P1-01 | **Severity:** P1 (ships with P0-01 hotfix)  
**Source files:** `app/landlord/contracts/create/page.tsx:334–352`, `app/api/contracts/route.ts:47–63`

**Problem:** After the AI generate call, the wizard POSTs to `/api/contracts` with `raw_text_th` and `translated_text_en` but no `structured_clauses`. The API's `initialStatus` logic checks `hasClauses = !!structured_clauses` — with no clauses, this is false. The contract is created with `status = 'parse_failed'` instead of `pending`. No payment rows are seeded. The landlord lands on a "broken" contract from the first view.

**Fix:** After the wizard creates the contract row (the POST to `/api/contracts`), immediately trigger a reparse call to extract structured clauses from the generated text. If a `POST /api/contracts/{id}/reparse` endpoint exists (used in the OCR upload path), call it with the new contract ID after creation. If it does not exist as a standalone endpoint, inline the clause extraction: call `POST /api/contracts/{id}/reparse` — check `app/api/contracts/[id]/reparse/route.ts` for the exact endpoint path. Pass the contract ID returned from the initial POST.

The sequence should be:

1. `POST /api/contracts` → get `contractId` back
2. `POST /api/contracts/{contractId}/reparse` → triggers Claude clause extraction on the stored `raw_text_th` / `translated_text_en`
3. On reparse success, navigate to `/landlord/contracts/${contractId}`

If the reparse endpoint does not exist, create it following the same pattern as the OCR parse step — extract structured clauses from the stored contract text using a Claude call with the same clause extraction prompt.

**Expected behavior after fix:** After wizard generation completes, the contract is created with `structured_clauses` populated and status = `pending` (awaiting tenant pairing). Payment rows are seeded correctly. The landlord lands on the contract detail page at `pending` status.

**Verification:**

1. Complete the 6-step wizard and click Generate (with `?property_id=` set).
2. After navigation to the contract detail page, check that `status = 'pending'` (not `parse_failed`).
3. Check that `structured_clauses` is not null in the `contracts` table.
4. Check that payment rows were seeded for the contract.

**Complexity:** M | **Dependencies:** Ships with HF-02 in the same PR.

---

## HF-04: Fix Renew API Allowing Renewal of Any Contract Status

**Bug:** P0-03 | **Severity:** P0 — Launch Blocker  
**Source file:** `app/api/contracts/[id]/renew/route.ts:72–78`

**Problem:** `POST /api/contracts/{id}/renew` checks ownership (line 74: `original.landlord_id !== user.id`) but has no check on `original.status`. Any contract — expired, terminated, `parse_failed`, `pending` — can receive a renewal POST. A renewal with `renewed_from` pointing to an expired contract is inserted as `pending` — a zombie renewal the tenant cannot act on. This violates the contract state machine ("no active without parsed clauses + arrived lease_start").

**Fix:** In `app/api/contracts/[id]/renew/route.ts`, immediately after the ownership check at line 74 (or within the same guard block), add:

```ts
if (original.status !== 'active') {
  return NextResponse.json({ error: 'Only active contracts can be renewed' }, { status: 400 });
}
```

**Expected behavior after fix:** POST to `/api/contracts/{id}/renew` on a non-active contract returns HTTP 400 with a clear error message. Only active contracts can generate a renewal.

**Verification:**

1. Find or seed a contract with `status = 'expired'` in the beta panel.
2. POST to `/api/contracts/{contractId}/renew` with valid `lease_start` and `lease_end` dates.
3. Response must be HTTP 400 with `{ error: 'Only active contracts can be renewed' }`.
4. No new row should appear in the `contracts` table with `renewed_from = contractId`.
5. Also test with `status = 'parse_failed'` and `status = 'terminated'` — both must return 400.

**Complexity:** S | **Dependencies:** None.

---

## HF-05: Fix All PDF Generators — Sarabun Font Fetch Fails in Node.js Context

**Bug:** P0-06 | **Severity:** P0 — Launch Blocker (data integrity: Thai text broken in all PDFs)  
**Source files:**

- `lib/pdf/generatePaymentReceipt.ts:21–23`
- `lib/pdf/generateContractPdf.ts:31–32`
- `lib/pdf/generateTM30Pdf.ts:22–23`

**Problem:** All three PDF generators call `fetch('/fonts/Sarabun-Regular.ttf')` and `fetch('/fonts/Sarabun-Bold.ttf')` with relative URLs. In a Next.js Route Handler (Node.js runtime), there is no base URL — `fetch` with a relative path throws `TypeError: Failed to parse URL`. The outer `try/catch` in `loadFonts()` silently falls back to Helvetica. Every receipt download, generated contract PDF, and TM30 PDF has broken Thai text (boxes or empty glyphs instead of Thai characters). This is the primary market — every PDF is broken.

Additionally, even if the URL were absolute, this would be a loopback HTTP call on every PDF generation — a significant performance penalty.

**Fix:** In all three files, replace the `fetch('/fonts/...')` calls in the `loadFonts` (or equivalent) function with `fs.readFileSync`:

```ts
import fs from 'fs';
import path from 'path';

// Replace:
// const fontBuffer = await fetch('/fonts/Sarabun-Regular.ttf').then(r => r.arrayBuffer());

// With:
const regularFontBytes = fs.readFileSync(
  path.join(process.cwd(), 'public/fonts/Sarabun-Regular.ttf')
);
const boldFontBytes = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Sarabun-Bold.ttf'));
```

Apply this change in all three generator files. If the font bytes are loaded in a shared `loadFonts()` helper, fix it once there.

**Optional optimization (same PR):** Cache the font bytes at module level so they are read from disk once per process lifetime rather than once per PDF generation:

```ts
let _regularFont: Buffer | null = null;
let _boldFont: Buffer | null = null;

function getFontBytes() {
  if (!_regularFont) {
    _regularFont = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Sarabun-Regular.ttf'));
    _boldFont = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Sarabun-Bold.ttf'));
  }
  return { regular: _regularFont, bold: _boldFont! };
}
```

**Expected behavior after fix:** All generated PDFs contain correctly rendered Thai text. Receipt downloads show Thai property names, landlord names, and bilingual labels properly. No Helvetica fallback.

**Verification:**

1. Download a payment receipt as a tenant. Open the PDF — Thai text must render correctly (not as boxes/question marks).
2. Generate a contract PDF from the contract detail page. Thai text must render.
3. Generate a TM30 PDF. Thai text must render.
4. Check server logs — no `TypeError: Failed to parse URL` errors during PDF generation.

**Complexity:** M | **Dependencies:** None. Ship before HF-08 (receipt API optimization).

---

## HF-06: Fix Penalty Appeal Silently Failing — RLS Mismatch

**Bug:** P0-04 | **Severity:** P0 — Launch Blocker  
**Source files:**

- `supabase/migrations/20260406000001_initial_schema.sql:248–260` (RLS policy)
- `app/tenant/penalties/appeal/page.tsx:96–97` (`canAppeal` function)
- `app/api/penalties/[id]/appeal/route.ts:22–25` (API update)

**Problem:** `canAppeal()` at line 96 returns `true` when penalty status is `pending_landlord_review` — the UI shows the Appeal button. However, the Supabase RLS policy `penalties_tenant_appeal` has a `USING` clause that only allows UPDATE when `status = 'confirmed'`. When a tenant appeals a penalty at `pending_landlord_review`, the Supabase UPDATE returns 0 rows without throwing an error. The API returns the unmodified row with no HTTP error. The appeal is silently lost. The tenant has no idea the appeal failed.

**Fix (two parts — both required):**

**Part 1 — RLS Migration:**  
Create `supabase/migrations/20260412000001_fix_penalty_appeal_rls.sql` with:

```sql
-- Drop the existing policy
DROP POLICY IF EXISTS penalties_tenant_appeal ON penalties;

-- Recreate with both valid appeal states
CREATE POLICY penalties_tenant_appeal ON penalties
  FOR UPDATE
  USING (
    auth.uid() = tenant_id
    AND status IN ('confirmed', 'pending_landlord_review')
  )
  WITH CHECK (
    status = 'pending_tenant_appeal'
  );
```

Apply this migration to the Supabase project.

**Part 2 — Frontend guard:**  
In `app/tenant/penalties/appeal/page.tsx:96–97`, verify that `canAppeal()` includes `pending_landlord_review` as a valid appeal state. It should already — but confirm the set of statuses in `canAppeal()` exactly matches `('confirmed', 'pending_landlord_review')` from the updated RLS policy. No extra states, no missing states.

Also verify that `app/api/penalties/[id]/appeal/route.ts:22–25` checks the update rowcount after the Supabase UPDATE call and returns a proper 422 error if 0 rows were updated (instead of silently returning the unmodified row). Add:

```ts
if (!updatedPenalty) {
  return NextResponse.json({ error: 'Appeal could not be submitted' }, { status: 422 });
}
```

**Expected behavior after fix:** Tenant can successfully appeal a penalty at both `confirmed` and `pending_landlord_review` states. The UI shows the Appeal button at exactly those two states. If the update fails for any other reason, the tenant sees a clear error instead of silence.

**Verification:**

1. In beta panel, seed a penalty at `pending_landlord_review`.
2. As the tenant, navigate to the penalties page — Appeal button must be visible.
3. Submit the appeal with a note.
4. Check the `penalties` table row — `status` must now be `pending_tenant_appeal` and `tenant_appeal_note` must contain the submitted text.
5. Repeat for a penalty at `confirmed` — must also work.

**Complexity:** M | **Dependencies:** Ship the RLS migration (Part 1) before the frontend-only items. HF-09 (UI button state P2-09) must deploy in the same release.

---

## HF-07: Fix Contract Upload Compression + Upload Progress (3G Blocking)

**Bug:** P0-05 | **Severity:** P0 — Launch Blocker on 3G  
**Source files:**

- `app/landlord/contracts/upload/page.tsx:22, 91` (MAX_SIZE + handleUploadAndProcess)
- `components/landlord/PropertyImageGallery.tsx:48–75` (serial uploads)

**Problem (two parts):**

**Part A — No compression:** Landlords on Thai 3G upload raw phone photos (4–15MB JPEG) as contracts. No client-side compression exists. The OCR SSE stream cannot start until the upload completes. Wait time: 60–240 seconds. The progress bar shows 0% throughout (no XHR upload progress) — looks frozen.

**Part B — Serial property image uploads:** `PropertyImageGallery.tsx` iterates with `for (const file of files) { await upload(file) }` — uploads are sequential. Uploading 3 move-in photos takes 3× as long as necessary.

**Fix Part A — Contract upload compression + progress:**

1. Create a reusable helper `lib/upload/compressImage.ts`:

```ts
export async function compressImage(file: File, maxPx = 1920, quality = 0.8): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve as any, 'image/jpeg', quality));
}
```

2. In `app/landlord/contracts/upload/page.tsx` at `handleUploadAndProcess` (~line 91), before appending to FormData:

```ts
const fileToUpload = await compressImage(file); // compresses if image, passthrough otherwise
formData.append('file', fileToUpload, file.name);
```

3. Replace the `fetch()` upload call with `XMLHttpRequest` to get byte-level progress:

```ts
await new Promise<void>((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 50)); // 0–50% for upload phase
  };
  xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error('Upload failed')));
  xhr.onerror = reject;
  xhr.open('POST', '/api/contracts/upload');
  xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
  xhr.send(formData);
});
```

**Fix Part B — Parallel property image uploads:**

In `components/landlord/PropertyImageGallery.tsx:48–75`, replace the `for...of` loop with `await` inside with:

```ts
await Promise.all(
  Array.from(files).map(async (file) => {
    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append('file', compressed, file.name);
    fd.append('category', activeTab);
    const res = await fetch(`/api/properties/${propertyId}/images`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Image upload failed');
  })
);
await loadImages();
```

**Expected behavior after fix:** A 10MB phone photo contract is compressed to ~300–500KB before upload. Upload takes 5–15s on Thai 3G instead of 60–240s. Progress bar advances in real-time during the upload phase. Property image uploads for multi-file selection happen in parallel.

**Verification:**

1. Open browser DevTools → Network → throttle to "Slow 3G" (or "Fast 3G").
2. Upload a JPEG contract photo (4–8MB). Observe that the uploaded file is < 600KB in the network request payload.
3. Observe that the progress bar advances incrementally during upload.
4. In PropertyImageGallery, select 3 images. Open DevTools Network tab and confirm all 3 upload requests start simultaneously (not one-at-a-time).

**Complexity:** L | **Dependencies:** `lib/upload/compressImage.ts` is also used by HF-10 (tenant document upload — P1-13). Create it in this PR, import it in HF-10.

---

## HF-08: Fix Notification URL for lease_expiry Custom Rule (404)

**Bug:** P1-05 | **Severity:** P1 (1-line fix, ships with hotfix batch)  
**Source file:** `app/api/cron/daily/route.ts:334`

**Problem:** When a landlord creates a custom `lease_expiry` notification rule, the cron fires a notification with `url: '/tenant/contracts'`. Tenants who tap this notification are taken to a 404. The correct path is `/tenant/contract/view`.

**Fix:** In `app/api/cron/daily/route.ts` at line 334, change:

```ts
url: '/tenant/contracts';
```

to:

```ts
url: '/tenant/contract/view';
```

**Expected behavior after fix:** Tapping a `lease_expiry` notification routes the tenant to `/tenant/contract/view` which shows their active contract details.

**Verification:**

1. In the beta simulation panel, create a custom `lease_expiry` notification rule.
2. Manually trigger the cron via the beta panel's "Run Cron" button.
3. As the tenant, check the notifications inbox. Find the `lease_expiry` notification.
4. Tap the notification — must navigate to `/tenant/contract/view` (not 404).

**Complexity:** S | **Dependencies:** None.

---

## HF-09: Fix Penalty Appeal Button Visibility (Compounding P0-04)

**Bug:** P2-09 | **Severity:** P2 (must ship with HF-06 in same deploy)  
**Source file:** `app/tenant/penalties/appeal/page.tsx:152`

**Problem:** The appeal button condition is `canAppeal(p.status) && !p.tenant_appeal_note`. This shows the button when `status = 'pending_landlord_review'` AND `tenant_appeal_note` is null — which triggers the RLS silent failure fixed in HF-06. The UI and RLS policy were out of sync. With HF-06, the RLS now allows update at both `confirmed` and `pending_landlord_review` — but the UI guard must also be verified to match.

**Fix:**

1. Confirm that `canAppeal()` at line 96–97 checks exactly: `status === 'confirmed' || status === 'pending_landlord_review'`. If it already does, no change needed to `canAppeal`.
2. The existing `&& !p.tenant_appeal_note` guard is correct — hides the button if the tenant already submitted an appeal note. Keep this.
3. Verify the combined condition is correct for all penalty state transitions: button should show only when the tenant can meaningfully appeal and has not already done so.

**Expected behavior after fix:** Appeal button is visible at `confirmed` and `pending_landlord_review` when no prior appeal note exists. Clicking it successfully submits the appeal (with HF-06 RLS fix in place).

**Verification:** Covered by HF-06 verification steps 1–5.

**Complexity:** S | **Dependencies:** HF-06 must deploy in the same release.

---

## HF-10: Add Pairing Code Guidance for Tenants (UX-T-01)

**UX:** UX-T-01 | **Severity:** High-impact UX, pure copy change  
**Source file:** `app/tenant/pair/page.tsx` (or equivalent pair redemption page — search for the 6-character code input component)

**Problem:** The tenant pairing page shows an input asking for a 6-character code with placeholder "ABC123" but no instruction on how to obtain it. First-time tenants who arrive without a code see a blank input and leave. This is the highest-frequency new-user confusion point.

**Fix:** Below the page title (or input label), add a one-line callout:

- English: "Ask your landlord for a 6-character pairing code"
- Thai: "ขอรหัส 6 ตัวอักษรจากเจ้าของบ้าน"
- ZH-CN: "向您的房东索取6位配对码"

Add the string to all three locale files under a key like `tenant.pair_code_guidance`. Render it using `t('tenant.pair_code_guidance')` below the input.

**Expected behavior after fix:** Tenant pairing page clearly tells users where to get their code.

**Verification:**

1. Navigate to the tenant pair page in EN, TH, and ZH-CN locales.
2. Confirm the guidance text appears below the title in all three languages.

**Complexity:** S | **Dependencies:** None.

---

## Execution Order

Ship in this sequence to respect dependencies:

```
1. HF-01  (payment endpoint fix)          — no deps, ship first
2. HF-04  (renew status guard)            — no deps, ship first
3. HF-08  (notification URL fix)          — no deps, ship first
4. HF-10  (pairing guidance copy)         — no deps, ship first
   -- deploy above 4 together as Batch A --

5. HF-05  (Sarabun font fix)              — no deps, ship before HF-08 perf optimization
6. HF-06 + HF-09  (RLS + UI button)       — must deploy together
   -- deploy HF-05 and HF-06+09 as Batch B (can be same PR) --

7. HF-07  (upload compression + progress) — no deps; creates compressImage helper for HF-10
   -- deploy as Batch C --

8. HF-02 + HF-03  (wizard duplicate + parse_failed)  — must deploy together
   -- deploy as Batch D --
```

If CI/CD allows single-commit deploys, all 10 items can ship in one PR as long as HF-06 migration runs before any app traffic hits the appeal route.

---

## Completion Checklist

Before marking hotfix sprint done:

- [ ] HF-01: `POST /api/payments/{id}/confirm` called on confirmation. `confirmation_date` + `confirmed_by` set. Tenant notification fires.
- [ ] HF-02: No duplicate property rows created when `?property_id=` is set in wizard URL. `Math.round()` on deposit.
- [ ] HF-03: Wizard-generated contracts land as `pending` (not `parse_failed`). `structured_clauses` is not null. Payment rows seeded.
- [ ] HF-04: `POST /api/contracts/{id}/renew` returns 400 for non-active contracts. No zombie renewals.
- [ ] HF-05: All three PDF generators use `fs.readFileSync` for fonts. Thai text renders correctly in receipts, contract PDFs, and TM30s.
- [ ] HF-06: RLS migration deployed. Tenant can successfully appeal a penalty at `pending_landlord_review`. API returns 422 on 0-row update.
- [ ] HF-07: Compressed JPEG upload payload < 600KB in network tab. Progress bar advances during upload. Property image uploads fire in parallel.
- [ ] HF-08: `lease_expiry` notification taps route to `/tenant/contract/view` (not 404).
- [ ] HF-09: Appeal button state matches updated RLS policy. Ships in same deploy as HF-06.
- [ ] HF-10: Pairing guidance text appears in EN, TH, ZH-CN on the pair page.
- [ ] All locale files updated for any new `t()` keys added.
- [ ] No TypeScript errors (`tsc --noEmit` passes).
- [ ] No new ESLint errors introduced (especially no new `eslint-disable` comments).
- [ ] Supabase migration `20260412000001_fix_penalty_appeal_rls.sql` applied to production project.
