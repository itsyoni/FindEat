import type { BusinessAccount } from '@findeat/types'

export function AccountAvatar({ account }: { account: BusinessAccount }) {
  return account.avatarUrl
    ? <img className="account-avatar" src={account.avatarUrl} alt="" />
    : <div className="avatar">{account.username.charAt(0).toUpperCase()}</div>
}
