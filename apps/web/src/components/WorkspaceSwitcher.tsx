import { ShieldCheckIcon } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { StorefrontIcon } from "@phosphor-icons/react/dist/csr/Storefront";

type Workspace = "business" | "admin";

export function WorkspaceSwitcher({
  active,
  adminCount,
  collapsed = false,
  onBusiness,
  onAdmin,
}: {
  active: Workspace;
  adminCount?: number;
  collapsed?: boolean;
  onBusiness: () => void;
  onAdmin: () => void;
}) {
  const tabClass =
    "flex min-w-0 items-center justify-center gap-1.5 rounded-lg border-0 px-2 py-2 text-xs font-bold text-[#faf9f6b8] transition hover:text-[#faf9f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  const activeClass = "bg-[#ffffff20] font-black text-[#faf9f6] shadow-sm";

  return (
    <div
      className={`workspace-switcher mx-1 grid grid-cols-2 gap-1 rounded-xl border border-[#ffffff14] bg-[#ffffff0a] p-1 ${collapsed ? "min-[801px]:hidden" : ""}`}
      aria-label="Workspace"
    >
      <button
        type="button"
        className={`${tabClass} ${active === "business" ? activeClass : "bg-transparent"}`}
        aria-pressed={active === "business"}
        onClick={onBusiness}
      >
        <StorefrontIcon className="shrink-0" size={16} weight="duotone" />
        <span className="truncate">Business</span>
      </button>
      <button
        type="button"
        className={`${tabClass} ${active === "admin" ? activeClass : "bg-transparent"}`}
        aria-pressed={active === "admin"}
        onClick={onAdmin}
      >
        <ShieldCheckIcon className="shrink-0" size={16} weight="duotone" />
        <span className="truncate">Admin</span>
        {!!adminCount && (
          <span className="min-w-4 shrink-0 rounded-full bg-accent px-1 text-center text-[9px] font-black leading-4 text-white">
            {adminCount > 99 ? "99+" : adminCount}
          </span>
        )}
      </button>
    </div>
  );
}
