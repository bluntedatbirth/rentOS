# Tenant UX Issues

**Total issues:** 7

**Methodology:** Static code walk from the perspective of a 28-year-old Thai first-time renter on a
cheap Android device. Evaluating each screen for friction, missing affordances, and mobile-first
concerns. No live app run — all issues derived from reading source.

---

### UX-T-01: Pair page — no guidance on where to find the code

- **Flow:** Onboarding → `/tenant/pair`
- **Pain:** The page shows an input box asking for a 6-character code with the placeholder "ABC123" but no instruction on where to obtain it. A first-timer who arrives here directly (not via QR scan) will have no idea to ask their landlord.
- **Persona impact:** Thai renter stares at blank input, types nothing, leaves. Landlord needs to explain verbally. Increases pairing support burden.
- **Concrete fix suggestion:** Add a one-line callout below the title: "Ask your landlord for a 6-character pairing code" / "ขอรหัส 6 ตัวอักษรจากเจ้าของบ้าน". Already has space in the card.

---

### UX-T-02: Payments page — "I've paid this" label is ambiguous for Thai renters

- **Flow:** Payments → Due section → claim button
- **Pain:** The button label `payments.claim_paid` (EN: likely "I've Paid This") implies the tenant has already paid outside the app. For a user who has never used the app, it reads as a confirmation of payment — they may tap it assuming it records the payment, then be confused when the landlord still needs to confirm.
- **Persona impact:** Taps button thinking rent is recorded, then gets confused by the "pending confirmation" amber banner. Might tap again or contact landlord in a panic.
- **Concrete fix suggestion:** Relabel to "Notify landlord I paid" / "แจ้งเจ้าของบ้านว่าชำระแล้ว". Add a one-line hint below: "Your landlord will confirm receipt."

---

### UX-T-03: Contract viewer — no loading indicator during background reparse

- **Flow:** Contract view for renewals
- **Pain:** When `auto-reparse` is triggered (`fetch('/api/contracts/${c.id}/reparse', { method: 'POST' })`), the page silently fires a request in the background and then calls `window.location.reload()` on success. The tenant sees the page go blank without warning during reload.
- **Persona impact:** Cheap Android phone on 3G — the reload may take 3–5 seconds. Screen goes blank without explanation. User thinks the app crashed.
- **Concrete fix suggestion:** Show a subtle banner ("Updating contract terms…") while the reparse fires, or suppress the auto-reload and instead update state from the API response.

---

### UX-T-04: Maintenance modal — cost figures shown without context

- **Flow:** Maintenance → tap a request → detail modal
- **Pain:** `estimated_cost` and `actual_cost` are displayed as bare currency values (e.g., "฿2,000") with labels but no clarifying note about who bears the cost. Tenants may not know if this is charged to them.
- **Persona impact:** Renter sees ฿2,000 "Actual Cost" and immediately worries about a surprise charge. No context that this is landlord-borne repair cost.
- **Concrete fix suggestion:** Add a caption "Repair cost (charged to landlord)" / "(ค่าซ่อมที่เจ้าของบ้านรับผิดชอบ)" below the cost lines, or an info tooltip.

---

### UX-T-05: Co-tenants page — delete is immediate with no confirmation

- **Flow:** Co-tenants → tap "Remove" on a co-tenant entry
- **Pain:** `handleRemove` fires the DELETE API call immediately on button tap — no confirmation dialog, no undo.
- **Persona impact:** Thai renter on small-screen device accidentally taps Remove. Co-tenant is gone. No way to recover without re-adding.
- **Concrete fix suggestion:** Add a simple inline "Are you sure? [Remove] [Cancel]" confirmation that appears in place of the row before the API call fires.

---

### UX-T-06: No empty state with CTA when tenant has no contract — multiple pages show identical "no contract" message

- **Flow:** Dashboard, maintenance, payments, penalties, co-tenants — all show a plain `t('tenant.no_contract')` string when no active contract exists
- **Pain:** The message is a dead end. A brand-new tenant who just signed up but hasn't redeemed a code yet sees "No contract" on every tab with no actionable next step.
- **Persona impact:** Renter has no idea what to do. The pairing page (`/tenant/pair`) is the answer but is never surfaced from these states.
- **Concrete fix suggestion:** Replace the plain "no contract" text with a card that includes "Pair with your landlord" / "จับคู่กับเจ้าของบ้าน" and a link to `/tenant/pair`.

---

### UX-T-07: Documents "View" button opens Supabase signed URL in new tab — no in-app preview or download label

- **Flow:** Documents → tap View
- **Pain:** The "View" anchor (`<a target="_blank">`) opens a signed Supabase storage URL. On Android Chrome, PDFs open in the browser's viewer (fine). But images load in a raw browser tab with no app chrome — the user cannot easily return to the app.
- **Persona impact:** Taps View, image opens in new tab, back button takes them to browser history, not the app. Disorienting for a first-time user.
- **Concrete fix suggestion:** For `image/*` MIME types, use an in-app lightbox overlay instead of opening a new tab. For PDFs, the new-tab behaviour is acceptable.
