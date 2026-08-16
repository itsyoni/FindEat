import { MedalIcon } from '@phosphor-icons/react/dist/csr/Medal'
import type { ManagedRestaurant } from '@findeat/types'

export function BadgesPage({ restaurant }: { restaurant: ManagedRestaurant }) {
  const badges = restaurant.earnedBadges ?? []
  return <section className="restaurant-badges-page">
    <div className="page-heading">
      <div>
        <p className="eyebrow">Community recognition</p>
        <h1>Earned badges</h1>
        <p>Badges are awarded automatically when repeated public reviews show a trustworthy pattern.</p>
      </div>
      <div className="badge-total"><MedalIcon size={24} weight="duotone" /><strong>{badges.length}</strong><span>earned</span></div>
    </div>
    {badges.length === 0 ? <div className="badges-empty">
      <MedalIcon size={42} weight="duotone" />
      <h2>No badges yet</h2>
      <p>As more guests share visit context, qualifying badges will appear here automatically.</p>
    </div> : <div className="business-badge-grid">
      {badges.map((badge) => <article className="business-badge-card" key={badge.key}>
        <div className="business-badge-icon"><MedalIcon size={27} weight="duotone" /></div>
        <div><h2>{badge.title}</h2><p>{badge.description}</p><small>Confirmed by {badge.evidenceCount} community reviews</small></div>
      </article>)}
    </div>}
    <aside className="badge-trust-note"><strong>How badges stay trustworthy</strong><p>A badge needs repeated feedback and a meaningful share of context-rich public reviews. A single review cannot award one, and private or archived reviews do not count.</p></aside>
  </section>
}
