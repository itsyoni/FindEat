import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { DesktopIcon } from "@phosphor-icons/react/dist/csr/Desktop";
import { FileTextIcon } from "@phosphor-icons/react/dist/csr/FileText";
import { MoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { LEGAL_URLS } from "@findeat/legal";
import type { WebThemePreference } from "../contexts/webThemeContext";
import { useWebTheme } from "../hooks/useWebTheme";
import { WEB_VERSION } from "../lib/version";

const appearanceOptions: {
  value: WebThemePreference;
  title: string;
  description: string;
  icon: typeof SunIcon;
}[] = [
  {
    value: "system",
    title: "System",
    description: "Match this device",
    icon: DesktopIcon,
  },
  {
    value: "light",
    title: "Light",
    description: "Always use light mode",
    icon: SunIcon,
  },
  {
    value: "dark",
    title: "Dark",
    description: "Always use dark mode",
    icon: MoonIcon,
  },
];

const legalLinks = [
  {
    title: "Privacy Policy",
    description: "How FindEat collects, uses, and protects information",
    href: LEGAL_URLS.privacy,
    icon: ShieldCheckIcon,
  },
  {
    title: "Terms of Service",
    description: "The rules for using FindEat and FindEat for Business",
    href: LEGAL_URLS.terms,
    icon: FileTextIcon,
  },
  {
    title: "Account deletion",
    description: "How users can permanently delete their account and data",
    href: LEGAL_URLS.accountDeletion,
    icon: TrashIcon,
  },
];

export function SettingsPage() {
  const { preference, resolvedTheme, setPreference } = useWebTheme();

  return (
    <div className="mx-auto w-full max-w-260">
      <div className="mb-7 flex items-start justify-between gap-5">
        <div>
          <p className="mb-2 text-xs font-extrabold tracking-[.12em] text-accent">PREFERENCES</p>
          <h2 className="mb-2 text-[clamp(30px,4vw,44px)] tracking-[-.04em]">Settings</h2>
          <p className="m-0 text-muted">
            Personalize this dashboard and review FindEat’s legal information.
          </p>
        </div>
      </div>

      <section className="mb-4.5 overflow-hidden rounded-[22px] border border-line bg-surface shadow-panel">
        <div className="flex items-center justify-between gap-5 px-6.5 pt-6 pb-4.5 max-[520px]:px-4.5 max-[520px]:pt-5">
          <div>
            <h3 className="m-0 text-xl tracking-[-.02em]">Appearance</h3>
            <p className="mt-1.25 mb-0 text-xs leading-normal text-muted">
              Current appearance:{" "}
              <strong>{resolvedTheme === "dark" ? "Dark" : "Light"}</strong>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.75 px-6.5 pb-6.5 max-[760px]:grid-cols-1 max-[520px]:px-4.5 max-[520px]:pb-5" role="radiogroup" aria-label="Appearance">
          {appearanceOptions.map((option) => {
            const Icon = option.icon;
            const selected = preference === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`grid min-w-0 grid-cols-[42px_minmax(0,1fr)_20px] grid-rows-2 items-center gap-x-2.75 gap-y-0.5 rounded-2xl border p-3.75 text-left text-ink transition hover:-translate-y-px hover:bg-surface-hover ${selected ? "border-accent bg-accent-soft" : "border-line bg-surface-subtle hover:border-[#c7bdb1]"}`}
                onClick={() => setPreference(option.value)}
              >
                <span className={`row-span-2 grid size-10.5 place-items-center rounded-[13px] bg-surface ${selected ? "text-accent" : "text-ink"}`}>
                  <Icon size={22} weight={selected ? "fill" : "duotone"} />
                </span>
                <strong className="self-end truncate text-[13px]">{option.title}</strong>
                <small className="self-start truncate text-[10px] text-muted">{option.description}</small>
                <i className={`relative col-start-3 row-span-2 row-start-1 size-4.5 rounded-full border-[1.5px] ${selected ? "border-accent after:absolute after:inset-[3px] after:rounded-full after:bg-accent" : "border-[#aaa39a]"}`} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-4.5 overflow-hidden rounded-[22px] border border-line bg-surface shadow-panel">
        <div className="flex items-center justify-between gap-5 px-6.5 pt-6 pb-4.5 max-[520px]:px-4.5 max-[520px]:pt-5">
          <div>
            <h3 className="m-0 text-xl tracking-[-.02em]">Legal and privacy</h3>
            <p className="mt-1.25 mb-0 text-xs leading-normal text-muted">Public documents for users, restaurant owners, and app stores.</p>
          </div>
        </div>
        <div className="border-t border-line">
          {legalLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a className="grid min-h-19.5 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-line px-6.5 py-3.5 text-ink no-underline transition last:border-b-0 hover:bg-surface-hover max-[520px]:gap-2.5 max-[520px]:px-4.5" key={link.href} href={link.href}>
                <span className="grid size-11 place-items-center rounded-[14px] bg-soft text-ink">
                  <Icon size={22} weight="duotone" />
                </span>
                <div className="min-w-0">
                  <strong className="block text-[13px]">{link.title}</strong>
                  <small className="mt-1 block text-[11px] leading-[1.4] text-muted">{link.description}</small>
                </div>
                <ArrowSquareOutIcon className="text-muted" size={19} aria-hidden="true" />
              </a>
            );
          })}
        </div>
      </section>
      <p className="mt-1.5 mb-0 text-center text-[11px] font-bold text-muted">
        FindEat for Business · Version {WEB_VERSION}
      </p>
    </div>
  );
}
