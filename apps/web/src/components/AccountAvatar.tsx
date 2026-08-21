import type { BusinessAccount } from '@findeat/types'

export function AccountAvatar({ account }: { account: BusinessAccount }) {
  return account.avatarUrl
    ? <img className="size-9.5 rounded-full bg-soft object-cover max-[340px]:hidden" src={account.avatarUrl} alt="" />
    : <div className="grid size-9 place-items-center rounded-full bg-ink font-black text-[#faf9f6] max-[340px]:hidden">{account.username.charAt(0).toUpperCase()}</div>
}
