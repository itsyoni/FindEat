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
    <div className="notifications-popover admin-notifications-popover" ref={rootRef} role="dialog" aria-label="Admin notifications">
      <div className="notifications-popover-heading">
        <div><strong>Admin notifications</strong><small>Open items across FindEat</small></div>
        <button className="close" type="button" onClick={onClose} aria-label="Close notifications"><XIcon size={17} weight="bold" /></button>
      </div>
      {loading ? (
        <div className="notifications-popover-state">Loading notifications…</div>
      ) : items.length === 0 ? (
        <div className="notifications-popover-state"><BellSlashIcon size={30} weight="duotone" /><strong>Nothing needs attention</strong><p>New tickets, reports, claims, and appeals will appear here.</p></div>
      ) : (
        <div className="admin-notification-list">
          {items.map((item) => {
            const Icon = icons[item.type];
            return (
              <button key={item.id} type="button" onClick={() => { onNavigate(item.section); onClose(); }}>
                <span className={`admin-notification-icon ${item.type.toLowerCase()}`}><Icon size={19} weight="duotone" /></span>
                <span><strong>{item.title}</strong><small>{item.body}</small></span>
                <time>{relativeTime(item.createdAt)}</time>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
