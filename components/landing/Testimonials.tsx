import Image from 'next/image';
import { AnimatedSection } from './AnimatedSection';

interface TestimonialsProps {
  t: (key: string) => string;
}

const TESTIMONIAL_DATA = [
  {
    quoteKey: 'landing.testimonial_1_quote',
    nameKey: 'landing.testimonial_1_author',
    roleKey: 'landing.testimonial_1_role',
    accent: 'saffron' as const,
    avatar: '/images/marketing/avatar-1.png',
  },
  {
    quoteKey: 'landing.testimonial_2_quote',
    nameKey: 'landing.testimonial_2_author',
    roleKey: 'landing.testimonial_2_role',
    accent: 'sage' as const,
    avatar: '/images/marketing/avatar-2.png',
  },
  {
    quoteKey: 'landing.testimonial_3_quote',
    nameKey: 'landing.testimonial_3_author',
    roleKey: 'landing.testimonial_3_role',
    accent: 'saffron' as const,
    avatar: '/images/marketing/avatar-3.png',
  },
];

export function Testimonials({ t }: TestimonialsProps) {
  return (
    <section className="py-16 px-6 bg-warm-100/60">
      <div className="max-w-[960px] mx-auto">
        <AnimatedSection className="text-center mb-10">
          <p className="text-xs font-semibold tracking-[0.1em] uppercase text-saffron-500 mb-3 font-[var(--font-manrope)]">
            {t('landing.testimonials_label')}
          </p>
          <h2
            className="font-[var(--font-manrope)] text-2xl md:text-3xl font-bold text-charcoal-900"
            style={{ letterSpacing: '-0.02em' }}
          >
            {t('landing.testimonials_h2')}
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIAL_DATA.map(({ quoteKey, nameKey, roleKey, accent, avatar }, i) => (
            <AnimatedSection
              key={quoteKey}
              delay={i * 0.08}
              className="bg-white rounded-sm p-7 shadow-[0_2px_16px_rgba(44,44,44,0.05)] space-y-4"
            >
              {/* Editorial accent bar */}
              <div
                className={`w-0.5 h-8 ${accent === 'saffron' ? 'bg-saffron-500' : 'bg-sage-500'}`}
              />

              <p className="text-charcoal-800 text-[15px] leading-[1.7] italic font-serif">
                &ldquo;{t(quoteKey)}&rdquo;
              </p>

              <div className="flex items-center gap-2.5">
                <Image
                  src={avatar}
                  alt={`Portrait of ${t(nameKey)}`}
                  width={36}
                  height={36}
                  className={`rounded-full object-cover ring-2 ${
                    accent === 'saffron' ? 'ring-saffron-500/20' : 'ring-sage-500/20'
                  }`}
                />
                <div>
                  <p className="text-xs font-bold text-charcoal-800">{t(nameKey)}</p>
                  <p className="text-[11px] text-charcoal-600">{t(roleKey)}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
