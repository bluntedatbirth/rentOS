'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { useToast } from '@/components/ui/ToastProvider';
import { formatDisplayDate } from '@/lib/format/date';

interface TM30FormData {
  // Owner
  owner_name: string;
  owner_nationality: string;
  owner_id_number: string;
  owner_address: string;
  owner_phone: string;
  owner_relationship: string;
  // Accommodation
  place_name: string;
  place_address: string;
  place_type: string;
  place_phone: string;
  // Foreigner
  foreigner_name: string;
  foreigner_nationality: string;
  foreigner_passport_number: string;
  foreigner_arrival_date: string;
  foreigner_arrival_from: string;
  foreigner_stay_date: string;
  foreigner_visa_type: string;
  foreigner_visa_expiry: string;
}

const labelClass = 'mb-1 block text-xs font-medium text-charcoal-600 dark:text-white/60';
const inputClass =
  'w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500 dark:border-white/10 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-white/40';

export default function TM30GeneratorPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<TM30FormData>({
    owner_name: profile?.full_name ?? '',
    owner_nationality: 'Thai',
    owner_id_number: '',
    owner_address: '',
    owner_phone: profile?.phone ?? '',
    owner_relationship: 'owner',
    place_name: '',
    place_address: '',
    place_type: 'condo',
    place_phone: '',
    foreigner_name: '',
    foreigner_nationality: '',
    foreigner_passport_number: '',
    foreigner_arrival_date: '',
    foreigner_arrival_from: '',
    foreigner_stay_date: new Date().toISOString().split('T')[0]!,
    foreigner_visa_type: '',
    foreigner_visa_expiry: '',
  });

  const [showPreview, setShowPreview] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const update = (key: keyof TM30FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => window.print(), 300);
  };

  const handleDownloadPdf = async () => {
    if (!form.owner_name || !form.foreigner_name) return;
    setDownloadingPdf(true);
    try {
      const { generateTM30Pdf } = await import('@/lib/pdf/generateTM30Pdf');
      const { downloadPdf } = await import('@/lib/pdf/generateContractPdf');
      const pdfBytes = await generateTM30Pdf(form);
      const filename = `TM30_${form.foreigner_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      downloadPdf(pdfBytes, filename);
      toast.success(t('tm30.pdf_downloaded'));
    } catch (err) {
      console.error('TM.30 PDF error:', err);
      toast.error(t('tm30.pdf_error'));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const today = formatDisplayDate(new Date());

  return (
    <div className="mx-auto max-w-3xl">
      {/* Back link */}
      <Link
        href="/landlord/documents"
        className="mb-4 inline-flex items-center gap-1 text-sm text-charcoal-500 hover:text-charcoal-700 dark:text-white/50 dark:hover:text-white/70"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-3.5 w-3.5"
        >
          <path
            fillRule="evenodd"
            d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.22 8.53a.75.75 0 010-1.06l3.5-3.5a.75.75 0 011.06 0z"
            clipRule="evenodd"
          />
        </svg>
        {t('documents.title')}
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-charcoal-900 dark:text-white">{t('tm30.title')}</h2>
        <p className="mt-1 text-sm text-charcoal-500 dark:text-white/50">{t('tm30.subtitle')}</p>
      </div>

      {/* Info banner */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-saffron-200 bg-saffron-50 px-4 py-3 dark:border-saffron-500/20 dark:bg-saffron-500/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="mt-0.5 h-5 w-5 shrink-0 text-saffron-500"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <p className="text-sm font-medium text-saffron-800 dark:text-saffron-300">
            {t('tm30.info_title')}
          </p>
          <p className="mt-0.5 text-xs text-saffron-700 dark:text-saffron-400">
            {t('tm30.info_description')}
          </p>
          <a
            href="https://tm30.immigration.go.th"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs font-medium text-saffron-600 underline dark:text-saffron-400"
          >
            tm30.immigration.go.th &rarr;
          </a>
        </div>
      </div>

      {/* Legal notice warning banner */}
      <div className="mb-6 rounded-lg border border-warning-100 bg-warning-50 p-4 text-warning-700">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-lg leading-none" aria-hidden="true">
            ⚠
          </span>
          <div>
            <p className="text-sm font-bold">{t('tm30.legal_notice_title')}</p>
            <p className="mt-1 text-sm">{t('tm30.legal_notice_body')}</p>
          </div>
        </div>
      </div>

      {/* Form — hidden when printing */}
      <div className="space-y-6 print:hidden">
        {/* Section 1: Owner */}
        <div className="rounded-lg bg-white p-5 shadow-sm dark:bg-charcoal-800 dark:shadow-black/20">
          <h3 className="mb-4 text-sm font-semibold text-charcoal-900 dark:text-white">
            {t('tm30.section1')}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('tm30.owner_name')}</label>
              <input
                type="text"
                value={form.owner_name}
                onChange={(e) => update('owner_name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('tm30.owner_nationality')}</label>
              <input
                type="text"
                value={form.owner_nationality}
                onChange={(e) => update('owner_nationality', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('tm30.owner_id')}</label>
              <input
                type="text"
                value={form.owner_id_number}
                onChange={(e) => update('owner_id_number', e.target.value)}
                className={inputClass}
                placeholder="X-XXXX-XXXXX-XX-X"
              />
            </div>
            <div>
              <label className={labelClass}>{t('tm30.owner_phone')}</label>
              <input
                type="text"
                value={form.owner_phone}
                onChange={(e) => update('owner_phone', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>{t('tm30.owner_address')}</label>
              <input
                type="text"
                value={form.owner_address}
                onChange={(e) => update('owner_address', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('tm30.relationship')}</label>
              <select
                value={form.owner_relationship}
                onChange={(e) => update('owner_relationship', e.target.value)}
                className={inputClass}
              >
                <option value="owner">{t('tm30.rel_owner')}</option>
                <option value="lessee">{t('tm30.rel_lessee')}</option>
                <option value="manager">{t('tm30.rel_manager')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Accommodation */}
        <div className="rounded-lg bg-white p-5 shadow-sm dark:bg-charcoal-800 dark:shadow-black/20">
          <h3 className="mb-4 text-sm font-semibold text-charcoal-900 dark:text-white">
            {t('tm30.section2')}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('tm30.place_name')}</label>
              <input
                type="text"
                value={form.place_name}
                onChange={(e) => update('place_name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('tm30.place_type')}</label>
              <select
                value={form.place_type}
                onChange={(e) => update('place_type', e.target.value)}
                className={inputClass}
              >
                <option value="condo">{t('create_contract.property_type_condo')}</option>
                <option value="apartment">{t('create_contract.property_type_apartment')}</option>
                <option value="house">{t('create_contract.property_type_house')}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>{t('tm30.place_address')}</label>
              <input
                type="text"
                value={form.place_address}
                onChange={(e) => update('place_address', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('tm30.place_phone')}</label>
              <input
                type="text"
                value={form.place_phone}
                onChange={(e) => update('place_phone', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Foreigner */}
        <div className="rounded-lg bg-white p-5 shadow-sm dark:bg-charcoal-800 dark:shadow-black/20">
          <h3 className="mb-4 text-sm font-semibold text-charcoal-900 dark:text-white">
            {t('tm30.section3')}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('tm30.foreigner_name')}</label>
              <input
                type="text"
                value={form.foreigner_name}
                onChange={(e) => update('foreigner_name', e.target.value)}
                className={inputClass}
                placeholder="As in passport"
              />
            </div>
            <div>
              <label className={labelClass}>{t('tm30.foreigner_nationality')}</label>
              <input
                type="text"
                value={form.foreigner_nationality}
                onChange={(e) => update('foreigner_nationality', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('tm30.passport_number')}</label>
              <input
                type="text"
                value={form.foreigner_passport_number}
                onChange={(e) => update('foreigner_passport_number', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('tm30.arrival_date')}</label>
              <input
                type="date"
                value={form.foreigner_arrival_date}
                onChange={(e) => update('foreigner_arrival_date', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('tm30.arrival_from')}</label>
              <input
                type="text"
                value={form.foreigner_arrival_from}
                onChange={(e) => update('foreigner_arrival_from', e.target.value)}
                className={inputClass}
                placeholder="Country"
              />
            </div>
            <div>
              <label className={labelClass}>{t('tm30.stay_date')}</label>
              <input
                type="date"
                value={form.foreigner_stay_date}
                onChange={(e) => update('foreigner_stay_date', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('tm30.visa_type')}</label>
              <input
                type="text"
                value={form.foreigner_visa_type}
                onChange={(e) => update('foreigner_visa_type', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('tm30.visa_expiry')}</label>
              <input
                type="date"
                value={form.foreigner_visa_expiry}
                onChange={(e) => update('foreigner_visa_expiry', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || !form.owner_name || !form.foreigner_name}
            className="min-h-[44px] rounded-lg bg-saffron-500 px-5 py-2 text-sm font-medium text-white hover:bg-saffron-600 disabled:opacity-50"
          >
            {downloadingPdf ? t('common.loading') : t('tm30.download_pdf')}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!form.owner_name || !form.foreigner_name}
            className="min-h-[44px] rounded-lg border border-warm-200 px-5 py-2 text-sm font-medium text-charcoal-700 hover:bg-warm-50 disabled:opacity-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
          >
            {t('tm30.print')}
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="min-h-[44px] rounded-lg border border-warm-200 px-5 py-2 text-sm font-medium text-charcoal-700 hover:bg-warm-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
          >
            {showPreview ? t('tm30.hide_preview') : t('tm30.show_preview')}
          </button>
        </div>
      </div>

      {/* Print preview — always rendered for print, visually toggled */}
      <div ref={printRef} className={`mt-6 ${showPreview ? '' : 'hidden'} print:block`}>
        <div className="rounded-lg border border-warm-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none dark:border-white/10 dark:bg-charcoal-800 dark:shadow-black/20">
          {/* Form header */}
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-charcoal-900 dark:text-white">แบบ ตม.30</h1>
            <h2 className="text-lg font-semibold text-charcoal-900 dark:text-white">
              TM.30 — Notification of Residence for Foreigners
            </h2>
            <p className="mt-1 text-sm text-charcoal-700 dark:text-white/70">
              แบบแจ้งที่พักอาศัยของคนต่างด้าว
            </p>
            <p className="text-xs text-charcoal-600 dark:text-white/60">
              Immigration Act B.E. 2522 (1979), Section 38
            </p>
            <p className="mt-2 text-sm text-charcoal-900 dark:text-white">Date / วันที่: {today}</p>
          </div>

          {/* Section 1: Owner */}
          <div className="mb-6">
            <h3 className="mb-3 border-b border-charcoal-300 pb-1 text-sm font-bold dark:border-white/20">
              Section 1: Notifier / House Owner (ผู้แจ้ง / เจ้าของบ้าน)
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-charcoal-600 dark:text-white/60">Name (ชื่อ-นามสกุล):</span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.owner_name || '____________________'}
                </strong>
              </div>
              <div>
                <span className="text-charcoal-600 dark:text-white/60">Nationality (สัญชาติ):</span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.owner_nationality || '____________________'}
                </strong>
              </div>
              <div>
                <span className="text-charcoal-600 dark:text-white/60">
                  ID Card No. (เลขประจำตัว):
                </span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.owner_id_number || '____________________'}
                </strong>
              </div>
              <div>
                <span className="text-charcoal-600 dark:text-white/60">Phone (โทรศัพท์):</span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.owner_phone || '____________________'}
                </strong>
              </div>
              <div className="col-span-2">
                <span className="text-charcoal-600 dark:text-white/60">Address (ที่อยู่):</span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.owner_address || '____________________'}
                </strong>
              </div>
              <div>
                <span className="text-charcoal-600 dark:text-white/60">
                  Relationship (ความสัมพันธ์):
                </span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.owner_relationship === 'owner'
                    ? 'Owner (เจ้าของ)'
                    : form.owner_relationship === 'lessee'
                      ? 'Lessee (ผู้เช่า)'
                      : 'Manager (ผู้จัดการ)'}
                </strong>
              </div>
            </div>
          </div>

          {/* Section 2: Accommodation */}
          <div className="mb-6">
            <h3 className="mb-3 border-b border-charcoal-300 pb-1 text-sm font-bold dark:border-white/20">
              Section 2: Accommodation (สถานที่พัก)
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-charcoal-600 dark:text-white/60">Name (ชื่อสถานที่):</span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.place_name || '____________________'}
                </strong>
              </div>
              <div>
                <span className="text-charcoal-600 dark:text-white/60">Type (ประเภท):</span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.place_type || '____________________'}
                </strong>
              </div>
              <div className="col-span-2">
                <span className="text-charcoal-600 dark:text-white/60">Address (ที่อยู่):</span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.place_address || '____________________'}
                </strong>
              </div>
              <div>
                <span className="text-charcoal-600 dark:text-white/60">Phone (โทรศัพท์):</span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.place_phone || '____________________'}
                </strong>
              </div>
            </div>
          </div>

          {/* Section 3: Foreigner */}
          <div className="mb-6">
            <h3 className="mb-3 border-b border-charcoal-300 pb-1 text-sm font-bold dark:border-white/20">
              Section 3: Foreigner Details (รายละเอียดคนต่างด้าว)
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-charcoal-600 dark:text-white/60">Name (ชื่อ-นามสกุล):</span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.foreigner_name || '____________________'}
                </strong>
              </div>
              <div>
                <span className="text-charcoal-600 dark:text-white/60">Nationality (สัญชาติ):</span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.foreigner_nationality || '____________________'}
                </strong>
              </div>
              <div>
                <span className="text-charcoal-600 dark:text-white/60">
                  Passport No. (หนังสือเดินทาง):
                </span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.foreigner_passport_number || '____________________'}
                </strong>
              </div>
              <div>
                <span className="text-charcoal-600 dark:text-white/60">
                  Arrival Date (วันที่เดินทางถึง):
                </span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.foreigner_arrival_date || '____________________'}
                </strong>
              </div>
              <div>
                <span className="text-charcoal-600 dark:text-white/60">From (เดินทางมาจาก):</span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.foreigner_arrival_from || '____________________'}
                </strong>
              </div>
              <div>
                <span className="text-charcoal-600 dark:text-white/60">
                  Stay From (พักตั้งแต่):
                </span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.foreigner_stay_date || '____________________'}
                </strong>
              </div>
              <div>
                <span className="text-charcoal-600 dark:text-white/60">
                  Visa Type (ประเภทวีซ่า):
                </span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.foreigner_visa_type || '____________________'}
                </strong>
              </div>
              <div>
                <span className="text-charcoal-600 dark:text-white/60">
                  Visa Expiry (วีซ่าหมดอายุ):
                </span>{' '}
                <strong className="text-charcoal-900 dark:text-white">
                  {form.foreigner_visa_expiry || '____________________'}
                </strong>
              </div>
            </div>
          </div>

          {/* Signature block */}
          <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
            <div className="text-center">
              <div className="mx-auto mb-2 h-16 w-48 border-b border-charcoal-400 dark:border-white/40" />
              <p className="text-charcoal-900 dark:text-white">Signature of Notifier</p>
              <p className="text-charcoal-600 dark:text-white/60">(ลงชื่อผู้แจ้ง)</p>
              <p className="mt-1 text-xs text-charcoal-500 dark:text-white/50">Date: {today}</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-2 h-16 w-48 border-b border-charcoal-400 dark:border-white/40" />
              <p className="text-charcoal-900 dark:text-white">Receiving Officer</p>
              <p className="text-charcoal-600 dark:text-white/60">(เจ้าหน้าที่ผู้รับแจ้ง)</p>
              <p className="mt-1 text-xs text-charcoal-500 dark:text-white/50">
                Date: ____/____/________
              </p>
            </div>
          </div>

          {/* Footer notes */}
          <div className="mt-8 rounded border border-warm-200 bg-warm-50 p-3 text-xs text-charcoal-700 print:bg-white dark:border-white/10 dark:bg-charcoal-900 dark:text-white/70">
            <p className="font-semibold text-charcoal-900 dark:text-white">Important Notes:</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li>File within 24 hours of foreigner moving in (ยื่นภายใน 24 ชม. หลังเข้าพัก)</li>
              <li>Re-file after each re-entry to Thailand (ยื่นใหม่ทุกครั้งที่กลับเข้าประเทศ)</li>
              <li>Failure to file: fine up to 10,000 THB (ไม่ยื่น: ปรับสูงสุด 10,000 บาท)</li>
              <li>File online: tm30.immigration.go.th</li>
              <li>Provide a copy to the tenant for visa extensions and 90-day reporting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
