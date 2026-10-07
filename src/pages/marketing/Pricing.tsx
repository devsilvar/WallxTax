import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { useDocumentTitle } from '@/components/marketing/useDocumentTitle.ts';
import { ScrollReveal } from '@/components/marketing/anim.tsx';
import { SectionHeader, SectionContainer } from '@/components/marketing/Section.tsx';
import FAQSection from '@/components/marketing/FAQSection.tsx';
import FinalCta from '@/components/marketing/FinalCta.tsx';
import {
  pricingPlans,
  planComparisonMatrix,
  pricingFaqs,
} from '@/data/marketing.ts';

export default function Pricing() {
  useDocumentTitle(
    'Transparent SME Pricing Plans',
    'Simple, predictable pricing for Nigerian SMEs. Free compliance tier, Starter at ₦5,000/mo, and Business 14-day trial.',
  );

  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className='bg-white'>
      {/* ── 1. Editorial Header & Billing Toggle ── */}
      <section className='pt-12 sm:pt-16 lg:pt-20 pb-12 sm:pb-16 bg-white border-b border-gray-100'>
        <div className='mx-auto max-w-4xl px-4 sm:px-6 text-center'>
          <ScrollReveal>
            <div className='inline-flex items-center gap-2 rounded-full bg-primary-50 border border-primary-200/80 px-3.5 py-1 mb-4 sm:mb-5 shadow-2xs'>
              <Sparkles className='h-3.5 w-3.5 text-primary-600' />
              <span className='text-xs font-semibold tracking-wide text-primary-800 uppercase'>
                Simple, Predictable Plans
              </span>
            </div>

            <h1 className='text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight sm:leading-snug'>
              Transparent pricing that scales with{' '}
              <span className='text-primary-600'>your business.</span>
            </h1>

            <p className='mt-4 sm:mt-5 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed'>
              Start completely free. Always free to record sales, compute taxes,
              and stay NRS compliant. Upgrade when you need team seats, imports,
              and AI assistance.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className='mt-8 sm:mt-10 inline-flex items-center p-1 rounded-full bg-gray-100 border border-gray-200'>
              <button
                type='button'
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly billing
              </button>
              <button
                type='button'
                onClick={() => setBillingCycle('annual')}
                className={`relative px-4 py-2 text-sm font-semibold rounded-full transition-all flex items-center gap-2 ${
                  billingCycle === 'annual'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Annual billing</span>
                <span className='text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200'>
                  Save ~20%
                </span>
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── 2. Pricing Cards Grid ── */}
      <SectionContainer background='gray'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {pricingPlans.map((plan) => {
            const isFree = plan.id === 'free';
            const price =
              billingCycle === 'annual'
                ? isFree
                  ? 0
                  : Math.round(plan.annualPrice / 12)
                : plan.monthlyPrice;

            return (
              <ScrollReveal key={plan.id}>
                <div
                  className={`h-full flex flex-col justify-between rounded-2xl bg-white p-6 transition-all duration-200 ${
                    plan.popular
                      ? 'border-2 border-primary-600 shadow-lg relative'
                      : 'border border-gray-200 shadow-2xs hover:shadow-md'
                  }`}
                >
                  {plan.popular && (
                    <div className='absolute -top-3 left-1/2 -translate-x-1/2'>
                      <span className='px-3 py-1 rounded-full bg-primary-600 text-white text-xs font-bold uppercase tracking-wider shadow-2xs'>
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className='flex items-center justify-between'>
                      <h3 className='text-xl font-bold text-gray-900'>
                        {plan.name}
                      </h3>
                      {plan.trialBadge && (
                        <span className='text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200'>
                          {plan.trialBadge}
                        </span>
                      )}
                    </div>

                    <p className='mt-2 text-xs sm:text-sm text-gray-600 min-h-[40px]'>
                      {plan.tagline}
                    </p>

                    {/* Price Block */}
                    <div className='mt-5 pb-5 border-b border-gray-100'>
                      <div className='flex items-baseline gap-1'>
                        <span className='text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight'>
                          {isFree ? '₦0' : formatNaira(price)}
                        </span>
                        {!isFree && (
                          <span className='text-xs font-medium text-gray-500'>
                            /month
                          </span>
                        )}
                      </div>
                      <div className='mt-1 text-xs text-gray-500'>
                        {isFree
                          ? 'Free forever'
                          : billingCycle === 'annual'
                            ? `Billed annually at ${formatNaira(plan.annualPrice)}/yr`
                            : 'Billed monthly'}
                      </div>
                    </div>

                    {/* Features List */}
                    <ul className='mt-6 space-y-3 text-sm text-gray-600'>
                      {plan.features.map((feat) => (
                        <li key={feat} className='flex items-start gap-2.5'>
                          <Check className='h-4 w-4 text-emerald-600 shrink-0 mt-0.5' />
                          <span className='text-xs sm:text-sm'>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action CTA */}
                  <div className='mt-8 pt-4 border-t border-gray-50'>
                    <Link to={plan.ctaLink} className='block'>
                      <button
                        className={`w-full py-3 px-4 rounded-full text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                          plan.popular
                            ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-2xs hover:shadow'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200'
                        }`}
                      >
                        <span>{plan.ctaText}</span>
                        <ArrowRight className='h-4 w-4' />
                      </button>
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </SectionContainer>

      {/* ── 3. Plan Comparison Matrix (Real Table) ── */}
      <SectionContainer background='white'>
        <SectionHeader
          eyebrow='Detailed Matrix'
          title='Compare plan features side-by-side.'
          accentWord='features'
          subtitle='Transparent breakdown of caps, allowances, and plan features.'
        />

        <div className='overflow-x-auto rounded-xl border border-gray-200 shadow-2xs'>
          <table className='w-full text-left border-collapse min-w-[680px]'>
            <thead>
              <tr className='bg-gray-50 border-b border-gray-200'>
                <th className='py-4 px-5 text-sm font-bold text-gray-900 w-2/5'>
                  Plan Feature
                </th>
                <th className='py-4 px-3 text-center text-sm font-bold text-gray-900'>
                  Free
                </th>
                <th className='py-4 px-3 text-center text-sm font-bold text-gray-900'>
                  Starter
                </th>
                <th className='py-4 px-3 text-center text-sm font-bold text-primary-700 bg-primary-50/50'>
                  Business
                </th>
                <th className='py-4 px-3 text-center text-sm font-bold text-gray-900'>
                  Scale
                </th>
              </tr>
            </thead>
            <tbody>
              {planComparisonMatrix.map((section) => (
                <tr key={section.category} className='contents'>
                  <tr className='bg-gray-100/70 border-y border-gray-200'>
                    <td
                      colSpan={5}
                      className='py-2.5 px-5 text-xs font-bold uppercase tracking-wider text-gray-700'
                    >
                      {section.category}
                    </td>
                  </tr>
                  {section.rows.map((row, rIdx) => (
                    <tr
                      key={row.feature}
                      className={`border-b border-gray-100 hover:bg-gray-50/70 ${
                        rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <td className='py-3 px-5 text-sm font-medium text-gray-800'>
                        {row.feature}
                      </td>
                      <td className='py-3 px-3 text-center text-xs sm:text-sm text-gray-600'>
                        {row.free}
                      </td>
                      <td className='py-3 px-3 text-center text-xs sm:text-sm text-gray-600'>
                        {row.starter}
                      </td>
                      <td className='py-3 px-3 text-center text-xs sm:text-sm font-semibold text-primary-700 bg-primary-50/30'>
                        {row.business}
                      </td>
                      <td className='py-3 px-3 text-center text-xs sm:text-sm text-gray-600'>
                        {row.scale}
                      </td>
                    </tr>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionContainer>

      {/* ── 4. Pricing FAQs ── */}
      <FAQSection
        items={pricingFaqs}
        title='Frequently asked questions about billing'
        accentWord='billing'
        subtitle='Details regarding payments via Paystack, trial periods, and account downgrades.'
      />

      {/* ── 5. Final CTA ── */}
      <FinalCta
        title='Ready to get started? Test WallXERP with zero risk.'
        accentWord='zero'
        subtitle='Sign up in under 2 minutes. Business tier comes with a full 14-day free trial on signup.'
        buttonText='Start Free 14-Day Trial'
        buttonLink='/register?plan=business'
      />
    </div>
  );
}
