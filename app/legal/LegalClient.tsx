'use client';

import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import { useI18n } from '@/lib/i18n/context';
import type { Locale } from '@/lib/i18n/context';
import { legalContent as enContent } from '@/locales/legal/en';
import { legalContent as thContent } from '@/locales/legal/th';
import { legalContent as zhContent } from '@/locales/legal/zh';

const contentMap: Record<Locale, string> = {
  en: enContent,
  th: thContent,
  zh: zhContent,
};

// Delimiter that appears at the start of the Terms of Service section in every locale.
// We split on the first occurrence of a line that starts with "# " followed by any text
// after the Privacy Policy section, using a second top-level heading as the split point.
function splitSections(content: string): { privacy: string; terms: string } {
  // Find the second top-level heading (the Terms of Service heading)
  const lines = content.split('\n');
  let firstH1 = -1;
  let secondH1 = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.startsWith('# ')) {
      if (firstH1 === -1) {
        firstH1 = i;
      } else {
        secondH1 = i;
        break;
      }
    }
  }
  if (secondH1 === -1) {
    return { privacy: content, terms: '' };
  }
  const privacy = lines.slice(0, secondH1).join('\n');
  const terms = lines.slice(secondH1).join('\n');
  return { privacy, terms };
}

const proseClasses = [
  '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-charcoal-800 [&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:leading-tight',
  '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-charcoal-700 [&_h2]:mt-8 [&_h2]:mb-3',
  '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-charcoal-700 [&_h3]:mt-6 [&_h3]:mb-2',
  '[&_p]:text-charcoal-700 [&_p]:leading-relaxed [&_p]:mt-4',
  '[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mt-3 [&_ul]:space-y-1',
  '[&_li]:text-charcoal-700 [&_li]:leading-relaxed',
  '[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mt-3 [&_ol]:space-y-1',
  '[&_strong]:font-semibold [&_strong]:text-charcoal-800',
  '[&_a]:text-saffron-600 [&_a]:underline hover:[&_a]:text-saffron-700',
  '[&_hr]:border-warm-200 [&_hr]:my-8',
  '[&_code]:bg-warm-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:text-charcoal-700',
  '[&_table]:w-full [&_table]:mt-4 [&_table]:border-collapse',
  '[&_th]:text-left [&_th]:px-3 [&_th]:py-2 [&_th]:bg-warm-100 [&_th]:text-charcoal-700 [&_th]:font-semibold [&_th]:border [&_th]:border-warm-200 [&_th]:text-sm',
  '[&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-warm-200 [&_td]:text-charcoal-700 [&_td]:text-sm',
  '[&_blockquote]:border-l-4 [&_blockquote]:border-saffron-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-charcoal-600',
].join(' ');

export function LegalClient() {
  const { locale } = useI18n();
  const content = contentMap[locale];
  const { privacy, terms } = splitSections(content);

  return (
    <div className={proseClasses}>
      {/* #privacy anchor — direct URL target for /legal#privacy */}
      <section id="privacy">
        <ReactMarkdown rehypePlugins={[rehypeSlug]}>{privacy}</ReactMarkdown>
      </section>

      {/* Visual divider between the two docs */}
      <div className="my-12 border-t-2 border-saffron-200" />

      {/* #terms anchor — direct URL target for /legal#terms */}
      <section id="terms">
        <ReactMarkdown rehypePlugins={[rehypeSlug]}>{terms}</ReactMarkdown>
      </section>
    </div>
  );
}
