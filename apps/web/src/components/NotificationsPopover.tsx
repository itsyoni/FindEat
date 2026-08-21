import { useEffect, useRef, useState } from 'react'
import type { AppNotification, BusinessDashboardSection, ManagedRestaurant } from '@findeat/types'
import { BellSlashIcon } from '@phosphor-icons/react/dist/csr/BellSlash'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'

function notificationCopy(notification: AppNotification) {
  const actor = notification.actor?.username || 'Someone'
  switch (notification.type) {
    case 'RESTAURANT_FOLLOW': return `${actor} followed your restaurant`
    case 'RESTAURANT_REVIEW': return `${actor} published a new review`
    case 'RESTAURANT_BADGE_EARNED': return notification.title || 'Your restaurant earned a new badge'
    case 'POST_LIKE': return (notification.aggregationCount ?? 1) > 1
      ? `${actor} and ${(notification.aggregationCount ?? 1) - 1} more liked an official post`
      : `${actor} liked an official post`
    case 'POST_COMMENT': return `${actor} commented on an official post`
    case 'MESSAGE': return `${actor} started a new conversation`
    case 'MESSAGE_MENTION': return `${actor} mentioned you in a message`
    default: return notification.title || 'Restaurant update'
  }
}

type NotificationsPopoverProps = {
  restaurant: ManagedRestaurant
  notifications: AppNotification[]
  loading: boolean
  onNavigate: (section: BusinessDashboardSection) => void
  onClose: () => void
  onClear: () => Promise<void>
}

export function NotificationsPopover({ restaurant, notifications, loading, onNavigate, onClose, onClear }: NotificationsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearError, setClearError] = useState('')

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!popoverRef.current?.contains(event.target as Node)) onClose()
    }
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  function openNotification(notification: AppNotification) {
    if (notification.type === 'MESSAGE' || notification.type === 'MESSAGE_MENTION') onNavigate('messages')
    if (notification.type === 'RESTAURANT_REVIEW') onNavigate('reviews')
    if (notification.type === 'RESTAURANT_BADGE_EARNED') onNavigate('badges')
    onClose()
  }

  async function clearNotifications() {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }

    setClearing(true)
    setClearError('')
    try {
      await onClear()
      setConfirmClear(false)
    } catch (error) {
      setClearError(error instanceof Error ? error.message : 'Could not clear notifications')
    } finally {
      setClearing(false)
    }
  }

  return <div className="notifications-popover [position:absolute] [z-index:50] [right:0] [top:calc(100%_+_12px)] [width:min(420px,calc(100vw_-_32px))] [max-height:min(620px,calc(100vh_-_104px))] [overflow:hidden] [border:1px_solid_var(--line)] [border-radius:20px] [background:var(--surface)] [box-shadow:0_24px_70px_#2f211429] [&_.restaurant-notification-list]:[max-height:calc(min(620px,100vh_-_104px)_-_70px)] [&_.restaurant-notification-list]:[overflow-y:auto] [&_.restaurant-notification-list]:[border:0] [&_.restaurant-notification-list]:[border-radius:0] [&_.restaurant-notification-list]:[box-shadow:none] [&_.restaurant-notification-row]:[min-height:76px] [&_.restaurant-notification-row]:[padding:12px_16px] [&_.notification-avatar]:[width:42px] [&_.notification-avatar]:[height:42px] max-[800px]:[position:fixed] max-[800px]:[top:72px] max-[800px]:[right:12px] max-[800px]:[left:12px] max-[800px]:[width:auto] max-[800px]:[max-height:calc(100vh_-_84px)] max-[800px]:[top:64px] max-[800px]:[bottom:12px] max-[800px]:[max-height:none] max-[600px]:[right:8px] max-[600px]:[bottom:8px] max-[600px]:[left:8px] max-[600px]:[border-radius:17px]" ref={popoverRef} role="dialog" aria-label="Restaurant notifications">
    <div className="notifications-popover-heading [display:flex] [align-items:center] [justify-content:space-between] [min-height:70px] [padding:14px_16px_13px_20px] [border-bottom:1px_solid_var(--line)] [&_strong]:[display:block] [&_small]:[display:block] [&_strong]:[font-size:17px] [&_small]:[max-width:280px] [&_small]:[margin-top:3px] [&_small]:[overflow:hidden] [&_small]:[color:var(--muted)] [&_small]:[font-size:10px] [&_small]:[text-overflow:ellipsis] [&_small]:[white-space:nowrap]"><div><strong>Notifications</strong><small>{restaurant.name}</small></div><div className="notifications-popover-actions [display:flex] [align-items:center] [gap:6px] [&_button]:[padding:7px_9px] [&_button]:[border:0] [&_button]:[border-radius:9px] [&_button]:[background:transparent] [&_button]:[color:var(--muted)] [&_button]:[font-size:10px] [&_button]:[font-weight:800] [&_button:hover]:[background:var(--soft)] [&_button:hover]:[color:var(--ink)] [&_button.confirm]:[background:#fff0ed] [&_button.confirm]:[color:#b54635] [&_button.cancel]:[padding-inline:6px] [&_button.close]:[display:grid] [&_button.close]:[place-items:center] [&_button.close]:[width:32px] [&_button.close]:[height:32px] [&_button.close]:[padding:0] [&_button.close]:[border-radius:50%] [&_button.close]:[background:#f4f0eb] [&_button.close]:[color:var(--ink)] [&_button.close]:[font-size:20px] [&_button.close]:[line-height:1] [&_button.confirm]:[background:var(--danger-soft)] [&_button.confirm]:[color:var(--danger)] [&_button.close]:[background:var(--neutral-chip)] [&_button.close]:[color:var(--neutral-chip-text)]">{notifications.length > 0 && <button className={confirmClear ? 'confirm' : ''} type="button" disabled={clearing} onClick={() => void clearNotifications()}>{clearing ? 'Clearing…' : confirmClear ? 'Confirm clear' : 'Clear all'}</button>}{confirmClear && !clearing && <button className="cancel" type="button" onClick={() => setConfirmClear(false)}>Cancel</button>}<button className="close [.notifications-popover-actions_button&]:[display:grid] [.notifications-popover-actions_button&]:[place-items:center] [.notifications-popover-actions_button&]:[width:32px] [.notifications-popover-actions_button&]:[height:32px] [.notifications-popover-actions_button&]:[padding:0] [.notifications-popover-actions_button&]:[border-radius:50%] [.notifications-popover-actions_button&]:[background:#f4f0eb] [.notifications-popover-actions_button&]:[color:var(--ink)] [.notifications-popover-actions_button&]:[font-size:20px] [.notifications-popover-actions_button&]:[line-height:1] [.notifications-popover-actions_button&]:[background:var(--neutral-chip)] [.notifications-popover-actions_button&]:[color:var(--neutral-chip-text)]" type="button" onClick={onClose} aria-label="Close notifications"><XIcon size={17} weight="bold" /></button></div></div>
    {clearError && <p className="notifications-clear-error [margin:0] [padding:9px_16px] [border-bottom:1px_solid_#f1cdcd] [background:#fff4f4] [color:#a72e2e] [font-size:11px] [border-color:var(--danger-border)] [background:var(--danger-soft)] [color:var(--danger)]">{clearError}</p>}
    {loading ? <div className="notifications-popover-state [display:grid] [place-items:center] [min-height:220px] [padding:30px] [color:var(--muted)] [text-align:center] [&>span]:[color:var(--accent)] [&>svg]:[color:var(--accent)] [&_strong]:[margin-top:8px] [&_strong]:[color:var(--ink)] [&_p]:[max-width:260px] [&_p]:[margin:5px_0_0] [&_p]:[font-size:12px] [&_p]:[line-height:1.5]">Loading notifications…</div> : notifications.length === 0 ? <div className="notifications-popover-state [display:grid] [place-items:center] [min-height:220px] [padding:30px] [color:var(--muted)] [text-align:center] [&>span]:[color:var(--accent)] [&>svg]:[color:var(--accent)] [&_strong]:[margin-top:8px] [&_strong]:[color:var(--ink)] [&_p]:[max-width:260px] [&_p]:[margin:5px_0_0] [&_p]:[font-size:12px] [&_p]:[line-height:1.5]"><BellSlashIcon size={30} weight="duotone" aria-hidden="true" /><strong>No updates yet</strong><p>Followers, reviews, post activity, and messages will appear here.</p></div> : <div className="restaurant-notification-list [overflow:hidden] [border:1px_solid_var(--line)] [border-radius:20px] [background:var(--surface)] [box-shadow:0_12px_36px_#2f211407]">
      {notifications.map((notification) => {
        const canOpen = notification.type === 'MESSAGE' || notification.type === 'MESSAGE_MENTION' || notification.type === 'RESTAURANT_REVIEW' || notification.type === 'RESTAURANT_BADGE_EARNED'
        return <button className={`restaurant-notification-row [position:relative] [display:grid] [grid-template-columns:48px_minmax(0,1fr)_auto] [align-items:center] [gap:14px] [width:100%] [min-height:88px] [padding:15px_18px] [border:0] [border-bottom:1px_solid_var(--line)] [background:var(--surface)] [color:var(--ink)] [text-align:left] [&:last-child]:[border-bottom:0] [&:not(:disabled):hover]:[background:#faf8f5] [&:disabled]:[cursor:default] [&:disabled]:[opacity:1] [&.unread]:[background:#fff8f4] [&>i]:[position:absolute] [&>i]:[right:8px] [&>i]:[top:8px] [&>i]:[width:7px] [&>i]:[height:7px] [&>i]:[border-radius:50%] [&>i]:[background:var(--accent)] dark:[&:not(:disabled):hover]:[background:var(--surface-hover)] dark:[&.unread]:[background:#2c211e] [&:not(:disabled):hover]:[border-color:var(--line)] [&:not(:disabled):hover]:[background:var(--surface-hover)] [&.unread]:[border-color:var(--line)] [&.unread]:[background:color-mix(in_srgb,var(--accent-soft)_54%,var(--surface))] max-[600px]:[grid-template-columns:42px_minmax(0,1fr)_auto] max-[600px]:[padding:12px] max-[600px]:[gap:10px] ${notification.readAt ? '' : 'unread'}`} key={notification.id} type="button" disabled={!canOpen} onClick={() => openNotification(notification)}>
          <div className="notification-avatar [display:grid] [place-items:center] [width:48px] [height:48px] [border-radius:50%] [object-fit:cover] [background:#eee7df] [font-weight:900] [&_img]:[display:grid] [&_img]:[place-items:center] [&_img]:[width:48px] [&_img]:[height:48px] [&_img]:[border-radius:50%] [&_img]:[object-fit:cover] [&_img]:[background:#eee7df] [&_img]:[font-weight:900] [background:var(--avatar-surface)] [&_img]:[background:var(--avatar-surface)] max-[600px]:[width:42px] max-[600px]:[height:42px] max-[600px]:[&_img]:[width:42px] max-[600px]:[&_img]:[height:42px] [.notifications-popover_&]:[width:42px] [.notifications-popover_&]:[height:42px] [display:grid] [place-items:center] [width:48px] [height:48px] [border-radius:50%] [object-fit:cover] [background:#eee7df] [font-weight:900] [&_img]:[display:grid] [&_img]:[place-items:center] [&_img]:[width:48px] [&_img]:[height:48px] [&_img]:[border-radius:50%] [&_img]:[object-fit:cover] [&_img]:[background:#eee7df] [&_img]:[font-weight:900] [background:var(--avatar-surface)] [&_img]:[background:var(--avatar-surface)] max-[600px]:[width:42px] max-[600px]:[height:42px] max-[600px]:[&_img]:[width:42px] max-[600px]:[&_img]:[height:42px]">{notification.actor?.avatarUrl ? <img src={notification.actor.avatarUrl} alt="" /> : <span>{(notification.actor?.username || restaurant.name).charAt(0).toUpperCase()}</span>}</div>
          <div className="notification-copy [min-width:0] [&_strong]:[display:block] [&_p]:[display:block] [&_small]:[display:block] [&_strong]:[font-size:13px] [&_p]:[margin:5px_0_0] [&_p]:[overflow:hidden] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px] [&_p]:[text-overflow:ellipsis] [&_p]:[white-space:nowrap] [&_small]:[margin-top:7px] [&_small]:[color:#999] [&_small]:[font-size:10px]"><strong>{notificationCopy(notification)}</strong>{notification.body && <p>{notification.body}</p>}<small>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notification.createdAt))}</small></div>
          {notification.postPreview?.imageUrl ? <img className="notification-post-preview [width:48px] [height:58px] [border-radius:9px] [object-fit:cover]" src={notification.postPreview.imageUrl} alt="" /> : canOpen ? <span className="notification-open [padding:7px_10px] [border-radius:9px] [background:var(--soft)] [color:#555] [font-size:11px] [font-weight:800] [color:var(--muted)]">Open</span> : null}
          {!notification.readAt && <i aria-label="Unread" />}
        </button>
      })}
    </div>}
  </div>
}
