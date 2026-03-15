import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageWrapper } from '../../components/layout/PageWrapper';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQGroup {
  title: string;
  items: FAQItem[];
}

function AccordionItem({ q, a }: FAQItem) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium hover:bg-[var(--color-surface-alt)] transition-colors"
      >
        <span>{q}</span>
        <svg
          className={`w-4 h-4 flex-shrink-0 ml-4 transition-transform text-[var(--color-text-secondary)] ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 pt-1 text-sm text-[var(--color-text-secondary)] leading-relaxed border-t border-[var(--color-border)]">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const { t } = useTranslation();

  const groups: FAQGroup[] = [
    {
      title: t('faq.group_about'),
      items: [
        { q: t('faq.q_what_is'), a: t('faq.a_what_is') },
        { q: t('faq.q_why_needed'), a: t('faq.a_why_needed') },
        { q: t('faq.q_public_good'), a: t('faq.a_public_good') },
        { q: t('faq.q_who_runs'), a: t('faq.a_who_runs') },
      ],
    },
    {
      title: t('faq.group_start'),
      items: [
        { q: t('faq.q_get_started'), a: t('faq.a_get_started') },
        { q: t('faq.q_need_token'), a: t('faq.a_need_token') },
        { q: t('faq.q_need_membership'), a: t('faq.a_need_membership') },
      ],
    },
    {
      title: t('faq.group_docs'),
      items: [
        { q: t('faq.q_how_contribute'), a: t('faq.a_how_contribute') },
        { q: t('faq.q_what_is_proposal'), a: t('faq.a_what_is_proposal') },
        { q: t('faq.q_proposal_not_passed'), a: t('faq.a_proposal_not_passed') },
        { q: t('faq.q_council_vetoed'), a: t('faq.a_council_vetoed') },
      ],
    },
    {
      title: t('faq.group_governance'),
      items: [
        { q: t('faq.q_how_vote'), a: t('faq.a_how_vote') },
        { q: t('faq.q_voting_power'), a: t('faq.a_voting_power') },
        { q: t('faq.q_what_is_council'), a: t('faq.a_what_is_council') },
        { q: t('faq.q_council_corrupt'), a: t('faq.a_council_corrupt') },
        { q: t('faq.q_proposal_reward'), a: t('faq.a_proposal_reward') },
      ],
    },
    {
      title: t('faq.group_nft'),
      items: [
        { q: t('faq.q_member_nft'), a: t('faq.a_member_nft') },
        { q: t('faq.q_creator_nft'), a: t('faq.a_creator_nft') },
        { q: t('faq.q_guardian_nft'), a: t('faq.a_guardian_nft') },
      ],
    },
    {
      title: t('faq.group_tech'),
      items: [
        { q: t('faq.q_why_calldata'), a: t('faq.a_why_calldata') },
        { q: t('faq.q_ipfs_github'), a: t('faq.a_ipfs_github') },
        { q: t('faq.q_verify'), a: t('faq.a_verify') },
        { q: t('faq.q_onchain_cost'), a: t('faq.a_onchain_cost') },
        { q: t('faq.q_roadmap'), a: t('faq.a_roadmap') },
      ],
    },
  ];

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{t('faq.page_title')}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('faq.page_subtitle')}</p>
      </div>

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3 px-1">
              {group.title}
            </h2>
            <div>
              {group.items.map((item) => (
                <AccordionItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageWrapper>
  );
}