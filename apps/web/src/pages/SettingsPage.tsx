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
    <div className="page-stack web-settings-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PREFERENCES</p>
          <h2>Settings</h2>
          <p className="muted">
            Personalize this dashboard and review FindEat’s legal information.
          </p>
        </div>
      </div>

      <section className="settings-panel">
        <div className="settings-panel-heading">
          <div>
            <h3>Appearance</h3>
            <p>
              Current appearance:{" "}
              <strong>{resolvedTheme === "dark" ? "Dark" : "Light"}</strong>
            </p>
          </div>
        </div>
        <div className="theme-options" role="radiogroup" aria-label="Appearance">
          {appearanceOptions.map((option) => {
            const Icon = option.icon;
            const selected = preference === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={selected ? "selected" : ""}
                onClick={() => setPreference(option.value)}
              >
                <span>
                  <Icon size={22} weight={selected ? "fill" : "duotone"} />
                </span>
                <strong>{option.title}</strong>
                <small>{option.description}</small>
                <i aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>

      <section className="settings-panel">
        <div className="settings-panel-heading">
          <div>
            <h3>Legal and privacy</h3>
            <p>Public documents for users, restaurant owners, and app stores.</p>
          </div>
        </div>
        <div className="settings-link-list">
          {legalLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a key={link.href} href={link.href}>
                <span>
                  <Icon size={22} weight="duotone" />
                </span>
                <div>
                  <strong>{link.title}</strong>
                  <small>{link.description}</small>
                </div>
                <ArrowSquareOutIcon size={19} aria-hidden="true" />
              </a>
            );
          })}
        </div>
      </section>
      <p className="web-settings-version">
        FindEat for Business · Version {WEB_VERSION}
      </p>
    </div>
  );
}
