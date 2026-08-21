import { MedalIcon } from '@phosphor-icons/react/dist/csr/Medal'
import type { ManagedRestaurant } from '@findeat/types'

export function BadgesPage({ restaurant }: { restaurant: ManagedRestaurant }) {
  const badges = restaurant.earnedBadges ?? []
  return <section className="flex h-full min-h-0 w-full flex-col overflow-hidden p-8.5 max-[700px]:px-4.5 max-[700px]:py-5.5">
    <div className="mb-7 flex items-start justify-between gap-6 max-[700px]:flex-col">
      <div>
        <p className="text-xs font-extrabold tracking-[.14em] text-[#ff7255] uppercase">Community recognition</p>
        <h1 className="my-1.5 text-4xl tracking-tight">Earned badges</h1>
        <p className="m-0 text-muted">Badges are awarded automatically when repeated public reviews show a trustworthy pattern.</p>
      </div>
      <div className="grid min-w-28 grid-cols-[auto_auto] items-center gap-x-2.25 gap-y-0.5 rounded-[18px] border border-line px-4.5 py-3.75"><MedalIcon className="row-span-2 text-[#d69418]" size={24} weight="duotone" /><strong className="text-[22px]">{badges.length}</strong><span className="text-xs text-muted">earned</span></div>
    </div>
    {badges.length === 0 ? <div className="grid min-h-0 flex-1 place-content-center rounded-3xl border border-dashed border-line p-6 text-center">
      <MedalIcon className="mx-auto block text-[#d69418]" size={42} weight="duotone" />
      <h2 className="mt-3 mb-1.25">No badges yet</h2>
      <p className="m-0 text-muted">As more guests share visit context, qualifying badges will appear here automatically.</p>
    </div> : <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-4 overflow-hidden max-[700px]:grid-cols-1 max-[700px]:overflow-y-auto">
      {badges.map((badge) => <article className="flex gap-3.75 rounded-[22px] border border-line bg-surface p-5" key={badge.key}>
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[rgba(214,148,24,.13)] text-[#d69418]"><MedalIcon size={27} weight="duotone" /></div>
        <div><h2 className="mt-0 mb-1.5 text-lg">{badge.title}</h2><p className="mt-0 mb-3 leading-normal text-muted">{badge.description}</p><small className="font-bold text-[#d69418]">Confirmed by {badge.evidenceCount} community reviews</small></div>
      </article>)}
    </div>}
    <aside className="mt-5 h-fit shrink-0 rounded-[18px] bg-[rgba(214,148,24,.09)] px-5 py-4.5"><strong>How badges stay trustworthy</strong><p className="mt-1.25 mb-0 leading-normal text-muted">A badge needs repeated feedback and a meaningful share of context-rich public reviews. A single review cannot award one, and private or archived reviews do not count.</p></aside>
  </section>
}
