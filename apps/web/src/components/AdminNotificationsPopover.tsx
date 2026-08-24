import { useEffect, useRef } from "react";
import { BellSlashIcon } from "@phosphor-icons/react/dist/csr/BellSlash";
import { BugIcon } from "@phosphor-icons/react/dist/csr/Bug";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import { HeadsetIcon } from "@phosphor-icons/react/dist/csr/Headset";
import { LightbulbIcon } from "@phosphor-icons/react/dist/csr/Lightbulb";
import { MapPinLineIcon } from "@phosphor-icons/react/dist/csr/MapPinLine";
import { SealCheckIcon } from "@phosphor-icons/react/dist/csr/SealCheck";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import type { AdminActivityItem, AdminDashboardSection } from "@findeat/types";

const icons = {
  SUPPORT: HeadsetIcon,
  BUG: BugIcon,
  FEATURE: LightbulbIcon,
  CLAIM: SealCheckIcon,
  ADDRESS: MapPinLineIcon,
  REPORT: FlagIcon,
  APPEAL: FlagIcon,
};

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function AdminNotificationsPopover({
  items,
  loading,
  onNavigate,
  onClose,
}: {
  items: AdminActivityItem[];
  loading: boolean;
  onNavigate: (section: AdminDashboardSection) => void;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    }
    const timer = window.setTimeout(() => document.addEventListener("mousedown", close), 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", close);
    };
  }, [onClose]);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-40 hidden bg-[#171717]/45 backdrop-blur-lg max-[800px]:block max-[800px]:pointer-events-auto" aria-hidden="true" />
      <div className="notifications-popover [position:absolute] [z-index:50] [right:0] [top:calc(100%_+_12px)] [width:min(420px,calc(100vw_-_32px))] [max-height:min(620px,calc(100vh_-_104px))] [overflow:hidden] [border:1px_solid_var(--line)] [border-radius:20px] [background:var(--surface)] [box-shadow:0_24px_70px_#2f211429] [&_.restaurant-notification-list]:[max-height:calc(min(620px,100vh_-_104px)_-_70px)] [&_.restaurant-notification-list]:[overflow-y:auto] [&_.restaurant-notification-list]:[border:0] [&_.restaurant-notification-list]:[border-radius:0] [&_.restaurant-notification-list]:[box-shadow:none] [&_.restaurant-notification-row]:[min-height:76px] [&_.restaurant-notification-row]:[padding:12px_16px] [&_.notification-avatar]:[width:42px] [&_.notification-avatar]:[height:42px] max-[800px]:[position:fixed] max-[800px]:[top:72px] max-[800px]:[right:12px] max-[800px]:[left:12px] max-[800px]:[width:auto] max-[800px]:[max-height:calc(100vh_-_84px)] max-[800px]:[top:64px] max-[800px]:[bottom:12px] max-[800px]:[max-height:none] max-[600px]:[right:8px] max-[600px]:[bottom:8px] max-[600px]:[left:8px] max-[600px]:[border-radius:17px] admin-notifications-popover [width:min(430px,calc(100vw_-_32px))]" ref={rootRef} role="dialog" aria-modal="true" aria-label="Admin notifications">
      <div className="notifications-popover-heading [display:flex] [align-items:center] [justify-content:space-between] [min-height:70px] [padding:14px_16px_13px_20px] [border-bottom:1px_solid_var(--line)] [&_strong]:[display:block] [&_small]:[display:block] [&_strong]:[font-size:17px] [&_small]:[max-width:280px] [&_small]:[margin-top:3px] [&_small]:[overflow:hidden] [&_small]:[color:var(--muted)] [&_small]:[font-size:10px] [&_small]:[text-overflow:ellipsis] [&_small]:[white-space:nowrap]">
        <div><strong>Admin notifications</strong><small>Open items across FindEat</small></div>
        <button className="close [.notifications-popover-actions_button&]:[display:grid] [.notifications-popover-actions_button&]:[place-items:center] [.notifications-popover-actions_button&]:[width:32px] [.notifications-popover-actions_button&]:[height:32px] [.notifications-popover-actions_button&]:[padding:0] [.notifications-popover-actions_button&]:[border-radius:50%] [.notifications-popover-actions_button&]:[background:#f4f0eb] [.notifications-popover-actions_button&]:[color:var(--ink)] [.notifications-popover-actions_button&]:[font-size:20px] [.notifications-popover-actions_button&]:[line-height:1] [.notifications-popover-actions_button&]:[background:var(--neutral-chip)] [.notifications-popover-actions_button&]:[color:var(--neutral-chip-text)]" type="button" onClick={onClose} aria-label="Close notifications"><XIcon size={17} weight="bold" /></button>
      </div>
      {loading ? (
        <div className="notifications-popover-state [display:grid] [place-items:center] [min-height:220px] [padding:30px] [color:var(--muted)] [text-align:center] [&>span]:[color:var(--accent)] [&>svg]:[color:var(--accent)] [&_strong]:[margin-top:8px] [&_strong]:[color:var(--ink)] [&_p]:[max-width:260px] [&_p]:[margin:5px_0_0] [&_p]:[font-size:12px] [&_p]:[line-height:1.5]">Loading notifications…</div>
      ) : items.length === 0 ? (
        <div className="notifications-popover-state [display:grid] [place-items:center] [min-height:220px] [padding:30px] [color:var(--muted)] [text-align:center] [&>span]:[color:var(--accent)] [&>svg]:[color:var(--accent)] [&_strong]:[margin-top:8px] [&_strong]:[color:var(--ink)] [&_p]:[max-width:260px] [&_p]:[margin:5px_0_0] [&_p]:[font-size:12px] [&_p]:[line-height:1.5]"><BellSlashIcon size={30} weight="duotone" /><strong>Nothing needs attention</strong><p>New tickets, reports, claims, and appeals will appear here.</p></div>
      ) : (
        <div className="admin-notification-list [max-height:min(560px,calc(100vh_-_180px))] [overflow-y:auto] [&>button]:[display:grid] [&>button]:[grid-template-columns:40px_minmax(0,1fr)_auto] [&>button]:[align-items:center] [&>button]:[gap:11px] [&>button]:[width:100%] [&>button]:[min-width:0] [&>button]:[padding:12px_15px] [&>button]:[border:0] [&>button]:[border-bottom:1px_solid_var(--line)] [&>button]:[background:transparent] [&>button]:[color:var(--ink)] [&>button]:[text-align:left] [&>button:last-child]:[border-bottom:0] [&>button:hover]:[background:var(--surface-hover)] [&>button>span:nth-child(2)]:[min-width:0] [&_strong]:[display:block] [&_strong]:[overflow:hidden] [&_strong]:[text-overflow:ellipsis] [&_strong]:[white-space:nowrap] [&_small]:[display:block] [&_small]:[overflow:hidden] [&_small]:[text-overflow:ellipsis] [&_small]:[white-space:nowrap] [&_strong]:[font-size:11px] [&_small]:[margin-top:4px] [&_small]:[color:var(--muted)] [&_small]:[font-size:9px] [&_time]:[align-self:start] [&_time]:[color:var(--muted)] [&_time]:[font-size:9px]">
          {items.map((item) => {
            const Icon = icons[item.type];
            return (
              <button key={item.id} type="button" onClick={() => { onNavigate(item.section); onClose(); }}>
                <span className={`admin-notification-icon [display:grid] [place-items:center] [width:40px] [height:40px] [border-radius:12px] [background:var(--soft)] [color:var(--muted)] [&.bug]:[background:var(--danger-soft)] [&.bug]:[color:var(--danger)] [&.report]:[background:var(--danger-soft)] [&.report]:[color:var(--danger)] [&.appeal]:[background:var(--danger-soft)] [&.appeal]:[color:var(--danger)] [&.feature]:[background:var(--warning-soft)] [&.feature]:[color:var(--warning)] [&.support]:[background:var(--info-soft)] [&.support]:[color:var(--info)] [&.claim]:[background:var(--success-soft)] [&.claim]:[color:var(--success)] [&.address]:[background:var(--success-soft)] [&.address]:[color:var(--success)] ${item.type.toLowerCase()}`}><Icon size={19} weight="duotone" /></span>
                <span><strong>{item.title}</strong><small>{item.body}</small></span>
                <time>{relativeTime(item.createdAt)}</time>
              </button>
            );
          })}
        </div>
      )}
      </div>
    </>
  );
}
