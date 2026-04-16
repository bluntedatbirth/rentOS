'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Lang = 'en' | 'th';

// ─────────────────────────────────────────────────────────────────────────────
// Mock copy (hardcoded — no locale file edits)
// ─────────────────────────────────────────────────────────────────────────────

const copy = {
  en: {
    pageTitle: 'Sprint 6 Design Preview — Pick your favorites',
    pageNote: 'This page will be deleted after your selection. Public — no login needed.',
    toggleLabel: 'TH',
    section1Title: 'Section 1 — Empty State Variants',
    section2Title: 'Section 2 — Error Screen Variants',
    footer:
      "When you've picked: tell Claude 'Empty state: A, Errors: B' (or whichever you prefer).",
    landlordLabel: 'Landlord — Payments tab (empty)',
    tenantLabel: 'Tenant — Payments screen (empty)',
    variantA: 'Variant A — Illustrated',
    variantB: 'Variant B — Minimal',
    variantC: 'Variant C — Contextual / Actionable',
    variantDesc_A:
      'Warm illustrated icon, headline, and a single helper line. Friendly and inviting.',
    variantDesc_B: 'Small neutral icon, short heading only. Clean and restrained.',
    variantDesc_C: 'Medium icon, headline, context sentence, and plain-text next-step guidance.',
    // Variant A empty state copy
    a_landlord_heading: 'No payments recorded yet',
    a_landlord_sub: 'Rent records for this property will show up right here.',
    a_tenant_heading: "You're all clear",
    a_tenant_sub: "No rent records yet — you'll see them the moment your landlord adds one.",
    // Variant B empty state copy
    b_landlord_heading: 'No payments yet',
    b_tenant_heading: 'No records yet',
    // Variant C empty state copy
    c_landlord_heading: 'No payments recorded yet',
    c_landlord_context: 'Rent records will appear here once your first contract goes active.',
    c_landlord_next: 'Activate a contract in the Contracts tab to get started.',
    c_tenant_heading: 'No rent records yet',
    c_tenant_context:
      "Your landlord will add your first rent record here. You'll see it when they do.",
    c_tenant_next: 'Nothing to do on your end — just sit tight.',
    // Error section
    errorVariantA: 'Variant A — Apologetic',
    errorVariantB: 'Variant B — Practical',
    errorVariantC: 'Variant C — Friendly / Thai-warm',
    errorVariantA_desc: 'Soft, "sorry this happened" framing. Neutral icon.',
    errorVariantB_desc: 'Direct and action-first. No fluff.',
    errorVariantC_desc: 'Conversational, warm, Thai particles where natural. Saffron icon.',
    retryLabel: 'Try again',
    // Error state labels
    network: 'Network error',
    timeout: 'Timeout',
    server: 'Server error',
    // Variant A error copy
    a_network_title: "We couldn't load this",
    a_network_body: "It looks like your connection dropped. We're sorry for the interruption.",
    a_timeout_title: 'This is taking too long',
    a_timeout_body: "We're sorry — the request timed out. Please try again in a moment.",
    a_server_title: 'Something went wrong on our end',
    a_server_body: "We're sorry about that. Our team has been notified. Please try again shortly.",
    // Variant B error copy
    b_network_title: "Can't load this",
    b_network_body: 'Check your connection, then try again.',
    b_timeout_title: 'Request timed out',
    b_timeout_body: 'The server took too long. Try again.',
    b_server_title: 'Server error',
    b_server_body: 'Something failed on our end. Try again or come back later.',
    // Variant C error copy (Thai-warm, bilingual)
    c_network_title: 'โหลดไม่ได้นะ',
    c_network_body: 'เหมือนอินเตอร์เน็ตหลุดไปค่ะ ลองเช็คสัญญาณแล้วลองใหม่นะคะ',
    c_timeout_title: 'รอนานไปหน่อย',
    c_timeout_body: 'เซิร์ฟเวอร์ตอบช้ากว่าปกติค่ะ รอแป๊บนึงแล้วลองใหม่นะ',
    c_server_title: 'ขอโทษนะคะ มีปัญหาเกิดขึ้น',
    c_server_body: 'ระบบมีปัญหาชั่วคราวค่ะ ทีมงานรับทราบแล้ว ลองใหม่อีกทีได้เลยนะ',
  },
  th: {
    pageTitle: 'ตัวอย่างดีไซน์ Sprint 6 — เลือกแบบที่ชอบ',
    pageNote: 'หน้านี้จะถูกลบหลังจากเลือกแล้ว เข้าถึงได้โดยไม่ต้องล็อกอิน',
    toggleLabel: 'EN',
    section1Title: 'ส่วนที่ 1 — แบบหน้าว่าง (Empty State)',
    section2Title: 'ส่วนที่ 2 — หน้าแสดงข้อผิดพลาด (Error Screen)',
    footer: 'เมื่อเลือกได้แล้ว บอก Claude ว่า "Empty state: A, Errors: B" (หรือแบบที่ชอบ)',
    landlordLabel: 'เจ้าของ — แท็บการชำระเงิน (ว่างเปล่า)',
    tenantLabel: 'ผู้เช่า — หน้าการชำระเงิน (ว่างเปล่า)',
    variantA: 'แบบ A — มีภาพประกอบ',
    variantB: 'แบบ B — เรียบง่าย',
    variantC: 'แบบ C — มีบริบทและคำแนะนำ',
    variantDesc_A: 'ไอคอนโทนสีอบอุ่น หัวข้อ และข้อความช่วยเหลือสั้น ๆ ดูเป็นมิตร',
    variantDesc_B: 'ไอคอนเล็กสีเทา หัวข้อสั้น ๆ เท่านั้น ดูสะอาดตา',
    variantDesc_C: 'ไอคอนขนาดกลาง หัวข้อ บริบท และคำแนะนำขั้นตอนถัดไป',
    a_landlord_heading: 'ยังไม่มีรายการชำระเงิน',
    a_landlord_sub: 'รายการค่าเช่าของทรัพย์สินนี้จะปรากฏที่นี่',
    a_tenant_heading: 'ยังไม่มีรายการ',
    a_tenant_sub: 'ยังไม่มีรายการค่าเช่า — จะเห็นทันทีที่เจ้าของเพิ่มรายการ',
    b_landlord_heading: 'ยังไม่มีรายการชำระเงิน',
    b_tenant_heading: 'ยังไม่มีรายการ',
    c_landlord_heading: 'ยังไม่มีรายการชำระเงิน',
    c_landlord_context: 'รายการจะปรากฏเมื่อสัญญาแรกของคุณเริ่มใช้งาน',
    c_landlord_next: 'ไปที่แท็บ "สัญญา" เพื่อเปิดใช้งานสัญญาก่อนนะ',
    c_tenant_heading: 'ยังไม่มีรายการค่าเช่า',
    c_tenant_context: 'เจ้าของจะเพิ่มรายการค่าเช่าที่นี่ คุณจะเห็นเมื่อพวกเขาเพิ่มแล้ว',
    c_tenant_next: 'ยังไม่มีอะไรต้องทำในตอนนี้',
    errorVariantA: 'แบบ A — ขอโทษ/อ่อนโยน',
    errorVariantB: 'แบบ B — ตรงไปตรงมา',
    errorVariantC: 'แบบ C — เป็นกันเอง / อบอุ่นแบบไทย',
    errorVariantA_desc: 'น้ำเสียงนุ่มนวล ขอโทษ ไอคอนเป็นกลาง',
    errorVariantB_desc: 'ตรงไปตรงมา เน้นการกระทำ ไม่มีคำฟุ่มเฟือย',
    errorVariantC_desc: 'คุยเหมือนคน อบอุ่น ใช้คำไทยตามธรรมชาติ ไอคอนสีทอง',
    retryLabel: 'ลองใหม่',
    network: 'ไม่มีอินเตอร์เน็ต',
    timeout: 'หมดเวลา',
    server: 'เซิร์ฟเวอร์ขัดข้อง',
    a_network_title: 'โหลดข้อมูลไม่ได้',
    a_network_body: 'ดูเหมือนการเชื่อมต่อขัดข้อง ขอโทษสำหรับความไม่สะดวก',
    a_timeout_title: 'ใช้เวลานานเกินไป',
    a_timeout_body: 'คำขอหมดเวลา กรุณาลองอีกครั้งในอีกสักครู่',
    a_server_title: 'เกิดข้อผิดพลาดจากระบบ',
    a_server_body: 'ทีมงานรับทราบแล้ว กรุณาลองใหม่อีกครั้ง',
    b_network_title: 'โหลดไม่ได้',
    b_network_body: 'ตรวจสอบการเชื่อมต่อแล้วลองใหม่',
    b_timeout_title: 'หมดเวลาการร้องขอ',
    b_timeout_body: 'เซิร์ฟเวอร์ตอบช้าเกินไป ลองอีกครั้ง',
    b_server_title: 'เซิร์ฟเวอร์ขัดข้อง',
    b_server_body: 'เกิดข้อผิดพลาดจากฝั่งเรา ลองใหม่หรือกลับมาทีหลัง',
    c_network_title: 'โหลดไม่ได้นะ',
    c_network_body: 'เหมือนอินเตอร์เน็ตหลุดไปค่ะ ลองเช็คสัญญาณแล้วลองใหม่นะคะ',
    c_timeout_title: 'รอนานไปหน่อย',
    c_timeout_body: 'เซิร์ฟเวอร์ตอบช้ากว่าปกติค่ะ รอแป๊บนึงแล้วลองใหม่นะ',
    c_server_title: 'ขอโทษนะคะ มีปัญหาเกิดขึ้น',
    c_server_body: 'ระบบมีปัญหาชั่วคราวค่ะ ทีมงานรับทราบแล้ว ลองใหม่อีกทีได้เลยนะ',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Inline SVG Icons
// ─────────────────────────────────────────────────────────────────────────────

/** Receipt with coin — landlord payments empty state */
function IconReceipt({ size = 80 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Receipt body */}
      <rect
        x="16"
        y="10"
        width="40"
        height="52"
        rx="4"
        fill="#fff3c4"
        stroke="#f0a500"
        strokeWidth="2"
      />
      {/* Zigzag bottom */}
      <polyline
        points="16,62 21,68 26,62 31,68 36,62 41,68 46,62 51,68 56,62"
        fill="none"
        stroke="#f0a500"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Lines on receipt */}
      <line
        x1="24"
        y1="26"
        x2="48"
        y2="26"
        stroke="#d48800"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="24"
        y1="34"
        x2="44"
        y2="34"
        stroke="#d48800"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <line
        x1="24"
        y1="41"
        x2="40"
        y2="41"
        stroke="#d48800"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* Coin circle */}
      <circle cx="56" cy="56" r="14" fill="#fdf7ec" stroke="#f0a500" strokeWidth="2" />
      <circle cx="56" cy="56" r="9" fill="#ffe480" />
      <text x="56" y="61" textAnchor="middle" fontSize="10" fontWeight="700" fill="#a96700">
        ฿
      </text>
    </svg>
  );
}

/** House with checkmark — tenant empty state */
function IconHouseCheck({ size = 80 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* House outline */}
      <path
        d="M40 14 L68 36 L62 36 L62 64 L18 64 L18 36 L12 36 Z"
        fill="#f2f7f2"
        stroke="#5a7a5a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Door */}
      <rect
        x="33"
        y="48"
        width="14"
        height="16"
        rx="2"
        fill="#bfdbbf"
        stroke="#5a7a5a"
        strokeWidth="1.5"
      />
      {/* Window */}
      <rect
        x="23"
        y="40"
        width="10"
        height="10"
        rx="1.5"
        fill="#bfdbbf"
        stroke="#5a7a5a"
        strokeWidth="1.5"
      />
      {/* Checkmark badge */}
      <circle cx="58" cy="22" r="10" fill="#fff3c4" stroke="#f0a500" strokeWidth="2" />
      <path
        d="M53 22 L57 26 L63 18"
        stroke="#d48800"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Small neutral list icon — Variant B */
function IconListSmall({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="4"
        y="7"
        width="20"
        height="14"
        rx="3"
        fill="#e8e8e8"
        stroke="#b4b4b4"
        strokeWidth="1.5"
      />
      <line
        x1="9"
        y1="12"
        x2="19"
        y2="12"
        stroke="#8f8f8f"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="9"
        y1="16"
        x2="15"
        y2="16"
        stroke="#8f8f8f"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Medium receipt icon — Variant C landlord */
function IconReceiptMid({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="8"
        y="6"
        width="28"
        height="36"
        rx="3"
        fill="#fdf7ec"
        stroke="#d48800"
        strokeWidth="1.5"
      />
      <polyline
        points="8,42 11.5,46 15,42 18.5,46 22,42 25.5,46 29,42 32.5,46 36,42"
        fill="none"
        stroke="#d48800"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="14"
        y1="18"
        x2="30"
        y2="18"
        stroke="#d48800"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="24"
        x2="26"
        y2="24"
        stroke="#d48800"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

/** Medium house icon — Variant C tenant */
function IconHouseMid({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M24 8 L42 22 L38 22 L38 40 L10 40 L10 22 L6 22 Z"
        fill="#f2f7f2"
        stroke="#5a7a5a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect
        x="20"
        y="30"
        width="8"
        height="10"
        rx="1.5"
        fill="#bfdbbf"
        stroke="#5a7a5a"
        strokeWidth="1.2"
      />
      <rect
        x="13"
        y="25"
        width="7"
        height="7"
        rx="1"
        fill="#bfdbbf"
        stroke="#5a7a5a"
        strokeWidth="1.2"
      />
    </svg>
  );
}

// ── Error Icons ───────────────────────────────────────────────────────────────

/** WiFi off icon — network error */
function IconWifiOff({ size = 40, color = '#6b6b6b' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Diagonal strike */}
      <line
        x1="8"
        y1="8"
        x2="32"
        y2="32"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* Arcs, partially clipped by strike */}
      <path
        d="M5 17 Q20 8 35 17"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M10 23 Q20 16 30 23"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M15 29 Q20 25 25 29"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="20" cy="34" r="2.5" fill={color} />
    </svg>
  );
}

/** Clock icon — timeout */
function IconClock({ size = 40, color = '#6b6b6b' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="20" cy="20" r="15" stroke={color} strokeWidth="2" />
      <line
        x1="20"
        y1="10"
        x2="20"
        y2="20"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="20"
        x2="28"
        y2="25"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="2" fill={color} />
    </svg>
  );
}

/** Server icon — server error */
function IconServer({ size = 40, color = '#6b6b6b' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="6" y="10" width="28" height="9" rx="2.5" stroke={color} strokeWidth="2" />
      <rect x="6" y="21" width="28" height="9" rx="2.5" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="14.5" r="2" fill={color} />
      <circle cx="12" cy="25.5" r="2" fill={color} />
      <line
        x1="19"
        y1="14.5"
        x2="27"
        y2="14.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="19"
        y1="25.5"
        x2="27"
        y2="25.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Error dot */}
      <circle cx="32" cy="32" r="5" fill="#dc2626" />
      <line
        x1="32"
        y1="29.5"
        x2="32"
        y2="32.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="34.5" r="0.75" fill="white" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-charcoal-900 mb-1">{children}</h2>;
}

function VariantLabel({ letter, title, desc }: { letter: string; title: string; desc: string }) {
  return (
    <div className="mb-4">
      <div className="inline-flex items-center gap-2 mb-1">
        <span className="text-2xl font-black text-saffron-600 leading-none">{letter}</span>
        <span className="text-base font-semibold text-charcoal-700">{title}</span>
      </div>
      <p className="text-sm text-charcoal-500">{desc}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Empty State Variants
// ─────────────────────────────────────────────────────────────────────────────

function EmptyStateCardA({
  role,
  heading,
  sub,
  label,
}: {
  role: 'landlord' | 'tenant';
  heading: string;
  sub: string;
  label: string;
}) {
  const Icon = role === 'landlord' ? IconReceipt : IconHouseCheck;
  return (
    <Card className="flex flex-col items-center text-center py-10 px-6 gap-4">
      <div className="rounded-2xl bg-saffron-50 p-4">
        <Icon size={80} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-saffron-600 mb-2">
          {label}
        </p>
        <h3 className="text-lg font-bold text-charcoal-900 mb-1">{heading}</h3>
        <p className="text-sm text-charcoal-500 max-w-[240px] mx-auto">{sub}</p>
      </div>
    </Card>
  );
}

function EmptyStateCardB({ heading, label }: { heading: string; label: string }) {
  return (
    <Card className="flex flex-col items-center text-center py-10 px-6 gap-3">
      <IconListSmall size={28} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-400 mb-2">
          {label}
        </p>
        <h3 className="text-base font-semibold text-charcoal-600">{heading}</h3>
      </div>
    </Card>
  );
}

function EmptyStateCardC({
  role,
  heading,
  context,
  next,
  label,
}: {
  role: 'landlord' | 'tenant';
  heading: string;
  context: string;
  next: string;
  label: string;
}) {
  const Icon = role === 'landlord' ? IconReceiptMid : IconHouseMid;
  return (
    <Card className="flex flex-col items-start py-8 px-6 gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-400">{label}</p>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-xl bg-warm-100 p-2">
          <Icon size={48} />
        </div>
        <div>
          <h3 className="text-base font-bold text-charcoal-900 mb-1">{heading}</h3>
          <p className="text-sm text-charcoal-600 mb-2">{context}</p>
          <p className="text-sm text-charcoal-400 italic">{next}</p>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Error Screen Variants
// ─────────────────────────────────────────────────────────────────────────────

type ErrorType = 'network' | 'timeout' | 'server';
type ErrorTone = 'A' | 'B' | 'C';

interface ErrorCardProps {
  tone: ErrorTone;
  type: ErrorType;
  lang: Lang;
}

function ErrorCard({ tone, type, lang }: ErrorCardProps) {
  const c = copy[lang];

  // Select icon based on type and tone
  const iconColor = tone === 'C' ? '#f0a500' : tone === 'A' ? '#8f8f8f' : '#4e4e4e';
  const IconComponent =
    type === 'network' ? IconWifiOff : type === 'timeout' ? IconClock : IconServer;

  const titleKey = `${tone.toLowerCase()}_${type}_title` as keyof typeof c;
  const bodyKey = `${tone.toLowerCase()}_${type}_body` as keyof typeof c;

  const typeLabel = c[type as keyof typeof c] as string;

  const bgClass =
    tone === 'A'
      ? 'bg-warm-50 border-warm-200'
      : tone === 'B'
        ? 'bg-white border-charcoal-100'
        : 'bg-saffron-50 border-saffron-100';

  const retryClass =
    tone === 'A'
      ? 'border border-charcoal-300 text-charcoal-700 hover:bg-warm-100'
      : tone === 'B'
        ? 'bg-charcoal-900 text-white hover:bg-charcoal-700'
        : 'bg-saffron-500 text-white hover:bg-saffron-600';

  return (
    <div
      className={`rounded-xl border p-5 flex flex-col items-center text-center gap-3 ${bgClass}`}
    >
      {/* Type label */}
      <span className="text-xs font-semibold uppercase tracking-widest text-charcoal-400">
        {typeLabel}
      </span>

      {/* Icon */}
      <div className="mt-1">
        <IconComponent size={40} color={iconColor} />
      </div>

      {/* Title */}
      <h4 className="text-base font-bold text-charcoal-900 leading-snug">{c[titleKey] ?? '—'}</h4>

      {/* Body */}
      <p className="text-sm text-charcoal-600 leading-relaxed max-w-[220px]">{c[bodyKey] ?? '—'}</p>

      {/* Retry button (visual only) */}
      <button
        type="button"
        aria-label={c.retryLabel}
        className={`mt-1 rounded-lg px-5 py-2 text-sm font-semibold transition-colors cursor-default ${retryClass}`}
        tabIndex={-1}
      >
        {c.retryLabel}
      </button>
    </div>
  );
}

function ErrorVariantSection({
  tone,
  title,
  desc,
  lang,
}: {
  tone: ErrorTone;
  title: string;
  desc: string;
  lang: Lang;
}) {
  const letter = tone;
  return (
    <section className="mb-10">
      <VariantLabel letter={`VARIANT ${letter}`} title={title} desc={desc} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['network', 'timeout', 'server'] as ErrorType[]).map((type) => (
          <div key={type}>
            <p className="text-xs font-semibold text-charcoal-400 mb-2 text-center uppercase tracking-wide">
              Variant {tone} — {type.charAt(0).toUpperCase() + type.slice(1)}
            </p>
            <ErrorCard tone={tone} type={type} lang={lang} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lang toggle
// ─────────────────────────────────────────────────────────────────────────────

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'en' ? 'th' : 'en')}
      className="inline-flex items-center gap-1.5 rounded-full border border-warm-200 bg-white px-3 py-1.5 text-sm font-semibold text-charcoal-700 hover:bg-warm-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-400 transition-colors"
      aria-label={lang === 'en' ? 'Switch to Thai' : 'Switch to English'}
    >
      <span className="text-base leading-none">{lang === 'en' ? '🇹🇭' : '🇬🇧'}</span>
      <span>{lang === 'en' ? 'TH' : 'EN'}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Sprint6Preview() {
  const [lang, setLang] = useState<Lang>('en');
  const c = copy[lang];

  return (
    <div className="min-h-screen bg-warm-50 font-[var(--font-dm-sans)]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-warm-50/90 backdrop-blur-sm border-b border-warm-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-charcoal-900 leading-tight">{c.pageTitle}</h1>
            <p className="text-xs text-charcoal-400 mt-0.5">{c.pageNote}</p>
          </div>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-16">
        {/* ── Section 1: Empty States ── */}
        <section>
          <SectionHeading>{c.section1Title}</SectionHeading>
          <p className="text-sm text-charcoal-500 mb-8">
            Each variant shows two cards: the landlord Payments tab and the tenant Payments screen.
          </p>

          {/* Variant A */}
          <div className="mb-10">
            <VariantLabel letter="VARIANT A" title={c.variantA} desc={c.variantDesc_A} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EmptyStateCardA
                role="landlord"
                heading={c.a_landlord_heading}
                sub={c.a_landlord_sub}
                label={c.landlordLabel}
              />
              <EmptyStateCardA
                role="tenant"
                heading={c.a_tenant_heading}
                sub={c.a_tenant_sub}
                label={c.tenantLabel}
              />
            </div>
          </div>

          {/* Variant B */}
          <div className="mb-10">
            <VariantLabel letter="VARIANT B" title={c.variantB} desc={c.variantDesc_B} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EmptyStateCardB heading={c.b_landlord_heading} label={c.landlordLabel} />
              <EmptyStateCardB heading={c.b_tenant_heading} label={c.tenantLabel} />
            </div>
          </div>

          {/* Variant C */}
          <div className="mb-10">
            <VariantLabel letter="VARIANT C" title={c.variantC} desc={c.variantDesc_C} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EmptyStateCardC
                role="landlord"
                heading={c.c_landlord_heading}
                context={c.c_landlord_context}
                next={c.c_landlord_next}
                label={c.landlordLabel}
              />
              <EmptyStateCardC
                role="tenant"
                heading={c.c_tenant_heading}
                context={c.c_tenant_context}
                next={c.c_tenant_next}
                label={c.tenantLabel}
              />
            </div>
          </div>
        </section>

        {/* Divider */}
        <hr className="border-warm-200" />

        {/* ── Section 2: Error Screens ── */}
        <section>
          <SectionHeading>{c.section2Title}</SectionHeading>
          <p className="text-sm text-charcoal-500 mb-8">
            Each variant covers three error types: network error, timeout, and server error (5xx).
            Retry buttons are visual only.
          </p>

          <ErrorVariantSection
            tone="A"
            title={c.errorVariantA}
            desc={c.errorVariantA_desc}
            lang={lang}
          />
          <ErrorVariantSection
            tone="B"
            title={c.errorVariantB}
            desc={c.errorVariantB_desc}
            lang={lang}
          />
          <ErrorVariantSection
            tone="C"
            title={c.errorVariantC}
            desc={c.errorVariantC_desc}
            lang={lang}
          />
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-warm-200 pt-6 pb-12">
          <div className="rounded-xl bg-saffron-50 border border-saffron-100 px-5 py-4 text-sm text-charcoal-700">
            <span className="font-semibold text-saffron-700">When you&apos;ve decided:</span>{' '}
            {c.footer}
          </div>
        </footer>
      </main>
    </div>
  );
}
