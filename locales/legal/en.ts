export const legalContent = `
# Privacy Policy

**Effective date:** 10 April 2026

RentOS ("we", "us", "our") operates rentos.homes. We respect your privacy and we comply with Thailand's Personal Data Protection Act B.E. 2562 (PDPA). This policy explains what data we collect, why we collect it, and what rights you have.

---

## 1. Data We Collect

### Account data
Name, email address, phone number, and your role (landlord or tenant). We need this to create and manage your account.

### Property and lease data
Property addresses, unit details, lease start and end dates, rent amounts, deposit amounts, and any notes you add. You enter this data voluntarily.

### Uploaded contract files and AI-parsed content
PDF or image files you upload for contract parsing. We extract structured data (names, dates, amounts, clauses) using an AI model. Both the raw file and the extracted data are stored on your behalf.

### Payment tracking data
Records of expected payment dates and whether a payment was marked received or missed. We do not collect, hold, or move any actual money. See our Terms of Service for more detail.

### Maintenance records
Details of maintenance requests and notes you log inside the app.

### Device and access logs
IP address, browser type, operating system, and timestamps of requests. These logs help us diagnose errors and prevent abuse.

---

## 2. Why We Use Your Data

We use your data to:

- Create and authenticate your account
- Parse lease contracts and surface key terms
- Send payment reminders and lease-expiry notifications
- Help you prepare TM30 immigration notifications (reminder only — you remain the legal filer)
- Operate, maintain, and improve the RentOS service
- Comply with legal obligations

We do not sell your data. We do not use it for advertising.

---

## 3. How Long We Keep Your Data

| Category | Retention period |
|---|---|
| Account data | Duration of your account + 1 year after deletion |
| Contract files and parsed content | Until you delete the contract or close your account |
| Payment tracking logs | 3 years (aligned with Thai tax record norms) |
| Device and access logs | 90 days |

When a retention period ends, we delete or anonymise the data.

---

## 4. Who We Share Your Data With

We share your data only with the processors listed below. They act on our instructions.

### Supabase
Our database and file-storage provider. Data is stored in the Supabase region you are served from. Supabase does not access your data except to provide the infrastructure.

### Anthropic / Claude API
We send contract text to Anthropic's Claude API for parsing. Prompts and responses are transient — Anthropic does not retain them beyond generating the response, in accordance with their API data-use policy.

### Omise
Our planned payment processor for Pro subscription billing and slot-pack purchases. Omise is not yet active in production. When enabled, only the data necessary to process a subscription payment is shared (e.g., billing reference). We do not share lease or tenant data with Omise.

We have no other third-party processors. We do not use third-party advertising or analytics trackers.

---

## 5. Cross-Border Data Transfers

Supabase may store data outside Thailand depending on your region. Anthropic processes contract-parsing requests on servers in the United States. These transfers rely on standard contractual clauses or equivalent safeguards that provide an adequate level of data protection.

---

## 6. Cookies and Local Storage

We use first-party session cookies for authentication. We store your language preference under the key \`rentos_locale\` in your browser's localStorage. We do not use third-party tracking cookies on the free tier.

---

## 7. Your Rights Under PDPA (Sections 30–38)

You have the right to:

- **Access** — request a copy of the personal data we hold about you
- **Rectification** — ask us to correct inaccurate data
- **Erasure** — ask us to delete your data (subject to legal retention obligations)
- **Portability** — receive your data in a structured, machine-readable format
- **Restriction** — ask us to pause processing in certain circumstances
- **Objection** — object to processing based on legitimate interest
- **Withdraw consent** — where processing relies on your consent, you may withdraw it at any time without affecting past processing
- **Complain** — lodge a complaint with Thailand's Personal Data Protection Committee (PDPC) if you believe we have not handled your data lawfully

To exercise any of these rights, email us at **hello@rentos.homes** or use the privacy settings inside the app (coming soon).

---

## 8. Breach Notification

If we experience a data breach that is likely to affect your rights and freedoms, we will notify the relevant users and report to the PDPC within 72 hours of becoming aware of the breach, as required by PDPA Section 37.

---

## 9. Contact

**Email:** hello@rentos.homes

---

# Terms of Service

**Effective date:** 10 April 2026

These Terms govern your use of RentOS at rentos.homes. By creating an account you agree to them. If you do not agree, do not use the service.

---

## 1. What RentOS Is (and Is Not)

RentOS is property-management software. It helps landlords track leases, set reminders, parse contracts, and log maintenance. It is not a real-estate agent, a property broker, a law firm, or a licensed financial service. Nothing in the service constitutes legal advice.

---

## 2. Eligibility

You must be at least 18 years old. You must use the service lawfully and provide accurate information. You may not create an account on behalf of someone else without their permission.

---

## 3. Acceptable Use

You agree not to:

- List fake, fictitious, or fraudulent properties
- Harass, threaten, or impersonate any person
- Scrape, crawl, or extract data from RentOS by automated means
- Circumvent free-tier limits by creating multiple accounts
- Reverse-engineer or attempt to access parts of the service not intended for you

We reserve the right to suspend or terminate accounts that violate these rules.

---

## 4. Your Content

You own everything you upload. By uploading files or entering data, you grant RentOS a limited, non-exclusive, worldwide licence to store, process, and display that content solely to provide the service to you. We will not use your content for any other purpose.

---

## 5. AI-Parsed Content Disclaimer

RentOS uses an AI model to extract information from lease documents. The output is provided for convenience and is informational only. It may contain errors or omissions. You must verify all parsed data against the original document before relying on it. AI output is not legal advice.

---

## 6. No Rent Collection

RentOS does not collect, hold, receive, process, or transfer rent money or deposits on your behalf. The platform is strictly non-custodial. All payments — rent, deposits, and any other amounts — flow directly between landlord and tenant outside of RentOS. We have no role in any financial transaction between users.

---

## 7. TM30 Immigration Notifications

Thai law (Immigration Act Section 38) requires landlords to notify immigration authorities when foreign nationals stay at their property. RentOS may provide reminders to help you remember this obligation. These reminders are a convenience feature only. RentOS is not responsible for missed filings, late filings, or any fines or penalties imposed by immigration authorities.

---

## 8. Subscription and Pricing

### Free tier
A free account includes up to 2 property slots. Free-tier service is provided "as-is" with no uptime guarantee.

### Pro subscription
Pro costs ฿199 per month. You can cancel at any time. Cancellation takes effect at the end of the current billing period — there is no proration for partial months. Your Pro benefits continue until the period ends.

### Slot packs
Slot packs are permanent, one-time unlocks: 1 slot for ฿99, 5 slots for ฿399, 10 slots for ฿699. Slot packs are non-refundable except where required by law. They do not expire and they survive cancellation of a Pro subscription.

---

## 9. Service Availability

The free tier is provided "as-is". We do not guarantee uptime or availability on the free tier. We aim to provide a best-effort, high-availability service on Pro, but we do not offer a formal SLA.

---

## 10. Limitation of Liability

To the fullest extent permitted by Thai law:

- Our total liability to you is capped at the amount you paid us in the 12 months before the claim arose (for paid users) or ฿1,000 (for free users).
- We are not liable for indirect, incidental, consequential, or punitive damages, including lost data or lost profits.
- These limits do not affect any statutory rights you have that cannot be waived under Thai consumer-protection law.

---

## 11. Changes to These Terms

If we make material changes to these Terms, we will give you at least 30 days' notice by email and via an in-app banner. Continued use after the notice period means you accept the new terms.

---

## 12. Governing Law and Jurisdiction

These Terms are governed by the laws of Thailand. Any disputes shall be resolved in the courts of Bangkok.

---

## 13. Contact

Questions about these Terms? Email **hello@rentos.homes**.

---

*RentOS — making Thai property management less painful.*
`;
