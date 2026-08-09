import { useEffect, useRef, useState } from 'react'
import type { AppNotification, BusinessDashboardSection, ManagedRestaurant } from '@findeat/types'
import { BellSlashIcon } from '@phosphor-icons/react/dist/csr/BellSlash'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'

function notificationCopy(notification: AppNotification) {
  const actor = notification.actor?.username || 'Someone'
  switch (notification.type) {
    case 'RESTAURANT_FOLLOW': return `${actor} followed your restaurant`
    case 'RESTAURANT_REVIEW': return `${actor} published a new review`
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

  return <div className="notifications-popover" ref={popoverRef} role="dialog" aria-label="Restaurant notifications">
    <div className="notifications-popover-heading"><div><strong>Notifications</strong><small>{restaurant.name}</small></div><div className="notifications-popover-actions">{notifications.length > 0 && <button className={confirmClear ? 'confirm' : ''} type="button" disabled={clearing} onClick={() => void clearNotifications()}>{clearing ? 'Clearing…' : confirmClear ? 'Confirm clear' : 'Clear all'}</button>}{confirmClear && !clearing && <button className="cancel" type="button" onClick={() => setConfirmClear(false)}>Cancel</button>}<button className="close" type="button" onClick={onClose} aria-label="Close notifications"><XIcon size={17} weight="bold" /></button></div></div>
    {clearError && <p className="notifications-clear-error">{clearError}</p>}
    {loading ? <div className="notifications-popover-state">Loading notifications…</div> : notifications.length === 0 ? <div className="notifications-popover-state"><BellSlashIcon size={30} weight="duotone" aria-hidden="true" /><strong>No updates yet</strong><p>Followers, reviews, post activity, and messages will appear here.</p></div> : <div className="restaurant-notification-list">
      {notifications.map((notification) => {
        const canOpen = notification.type === 'MESSAGE' || notification.type === 'MESSAGE_MENTION' || notification.type === 'RESTAURANT_REVIEW'
        return <button className={`restaurant-notification-row ${notification.readAt ? '' : 'unread'}`} key={notification.id} type="button" disabled={!canOpen} onClick={() => openNotification(notification)}>
          <div className="notification-avatar">{notification.actor?.avatarUrl ? <img src={notification.actor.avatarUrl} alt="" /> : <span>{(notification.actor?.username || restaurant.name).charAt(0).toUpperCase()}</span>}</div>
          <div className="notification-copy"><strong>{notificationCopy(notification)}</strong>{notification.body && <p>{notification.body}</p>}<small>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notification.createdAt))}</small></div>
          {notification.postPreview?.imageUrl ? <img className="notification-post-preview" src={notification.postPreview.imageUrl} alt="" /> : canOpen ? <span className="notification-open">Open</span> : null}
          {!notification.readAt && <i aria-label="Unread" />}
        </button>
      })}
    </div>}
  </div>
}
