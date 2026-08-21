import { useEffect, useState, type FormEvent } from "react";
import type { Sound, SoundStatus } from "@findeat/types";
import { request, uploadImage, uploadSound } from "../lib/api";

type AdminSound = Sound & {
  licenseType: string;
  licenseSource: string;
  licenseReference: string;
  commercialUseAllowed: boolean;
};

export function SoundCatalogAdmin() {
  const [sounds, setSounds] = useState<AdminSound[]>([]);
  const [audio, setAudio] = useState<File | null>(null);
  const [artwork, setArtwork] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    request<AdminSound[]>("/sounds/admin/catalog", { cache: "reload" })
      .then(setSounds)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load Sounds"));

  useEffect(() => void load(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!audio || working) return;
    const form = new FormData(event.currentTarget);
    try {
      setWorking(true);
      setError("");
      const [audioUrl, artworkUrl] = await Promise.all([
        uploadSound(audio),
        artwork ? uploadImage(artwork, "sound") : Promise.resolve(undefined),
      ]);
      await request("/sounds/admin/catalog", {
        method: "POST",
        body: JSON.stringify({
          title: String(form.get("title") ?? "").trim(),
          artist: String(form.get("artist") ?? "").trim(),
          audioUrl,
          artworkUrl,
          durationMs: Math.round(Number(form.get("durationSeconds")) * 1000),
          provider: String(form.get("provider") ?? "FINDEAT"),
          categories: String(form.get("categories") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
          licenseType: String(form.get("licenseType") ?? "").trim(),
          licenseSource: String(form.get("licenseSource") ?? "").trim(),
          licenseReference: String(form.get("licenseReference") ?? "").trim(),
          commercialUseAllowed: form.get("commercialUseAllowed") === "on",
          territories: String(form.get("territories") ?? "").split(",").map((value) => value.trim().toUpperCase()).filter(Boolean),
          status: "INACTIVE",
        }),
      });
      event.currentTarget.reset();
      setAudio(null);
      setArtwork(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save Sound");
    } finally {
      setWorking(false);
    }
  }

  async function setStatus(sound: AdminSound, status: SoundStatus) {
    await request(`/sounds/admin/catalog/${sound.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <section>
      <div className="page-heading [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:24px] [margin-bottom:30px] [&_.eyebrow]:[margin-top:0] [&_h2]:[margin-bottom:8px] [&_h2]:[font-size:36px] [&_h2]:[letter-spacing:-0.035em] [&_p]:[margin-bottom:0] [.performance-page_&_select]:[min-width:130px] [.performance-page_&_select]:[padding:10px_12px] [.performance-page_&_select]:[border:1px_solid_var(--line)] [.performance-page_&_select]:[border-radius:11px] [.performance-page_&_select]:[background:var(--surface)] [.performance-page_&_select]:[color:var(--ink)] [.pro-page>&]:[margin-bottom:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:14px] max-[800px]:[margin-bottom:22px] max-[800px]:[&_h2]:[font-size:clamp(28px,_8vw,_34px)] max-[800px]:[&_h2]:[line-height:1.08] max-[800px]:[&_p]:[max-width:68ch] max-[800px]:[&_p]:[line-height:1.5] max-[800px]:[&>div]:[min-width:0] [.restaurant-badges-page_&]:[display:flex] [.restaurant-badges-page_&]:[align-items:flex-start] [.restaurant-badges-page_&]:[justify-content:space-between] [.restaurant-badges-page_&]:[gap:24px] [.restaurant-badges-page_&]:[margin-bottom:28px] max-[700px]:[.restaurant-badges-page_&]:[flex-direction:column]">
        <div>
          <p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">CREATOR CATALOG</p>
          <h2>Sounds</h2>
          <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">Upload only tracks whose license explicitly permits FindEat’s UGC and streaming use.</p>
        </div>
        <span className="admin-total [padding:8px_12px] [border-radius:20px] [background:#f0e9f8] [color:#68418b] [font-size:13px] [font-weight:800] [background:var(--purple-soft)] [color:var(--purple)]">{sounds.filter((sound) => sound.status === "ACTIVE").length} active</span>
      </div>
      {error && <p className="error [color:#b32727] [font-size:13px] [color:var(--danger)] banner [padding:12px_16px] [border-radius:12px] [background:#fff0f0] [.support-admin-content>&]:[flex:0_0_auto] [.support-admin-content>.admin-support-slot>&]:[flex:0_0_auto] [background:var(--danger-soft)] [color:var(--danger)]">{error}</p>}
      <form className="admin-form" onSubmit={(event) => void submit(event)}>
        <div className="form-grid">
          <label>Title<input name="title" required maxLength={120} /></label>
          <label>Artist<input name="artist" required maxLength={120} /></label>
          <label>Audio file<input type="file" accept="audio/mpeg,audio/mp4,audio/wav,.mp3,.m4a,.wav" required onChange={(event) => setAudio(event.target.files?.[0] ?? null)} /></label>
          <label>Artwork<input type="file" accept="image/*" onChange={(event) => setArtwork(event.target.files?.[0] ?? null)} /></label>
          <label>Duration (seconds)<input name="durationSeconds" required type="number" min="1" max="3600" step="0.1" /></label>
          <label>Provider<select name="provider" defaultValue="FINDEAT"><option>FINDEAT</option><option>INDEPENDENT</option><option>COMMERCIAL</option></select></label>
          <label>Categories<input name="categories" placeholder="Chill, Food" required /></label>
          <label>Territories<input name="territories" placeholder="Leave blank for worldwide" /></label>
          <label>License type<input name="licenseType" required placeholder="CC0 1.0 / direct artist license" /></label>
          <label>License source<input name="licenseSource" required placeholder="Licensor or source" /></label>
          <label className="wide">License reference<input name="licenseReference" required placeholder="Contract, invoice, permission record, or durable license URL" /></label>
          <label className="checkbox-row"><input type="checkbox" name="commercialUseAllowed" /> Commercial use is permitted</label>
        </div>
        <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">New tracks start inactive. Review the evidence, then enable them below.</p>
        <button disabled={working || !audio}>{working ? "Uploading…" : "Upload Sound"}</button>
      </form>
      <div className="admin-list [margin-top:15px] [padding:0_20px] [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] max-[600px]:[padding:0_14px]">
        {sounds.map((sound) => (
          <article key={sound.id} className="admin-list-item">
            <div><strong>{sound.title}</strong><p>{sound.artist} · {sound.licenseType}</p><small>{sound.categories.join(" · ") || "Uncategorized"}</small></div>
            <div className="row-actions">
              <span className={`status ${sound.status.toLowerCase()}`}>{sound.status}</span>
              <button className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]" onClick={() => void setStatus(sound, sound.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}>{sound.status === "ACTIVE" ? "Disable" : "Enable"}</button>
              <button className="danger [color:#b54635] [.moderation-actions_&]:[border:0] [.moderation-actions_&]:[border-radius:11px] [.moderation-actions_&]:[background:#fff0ed] [.moderation-actions_&]:[color:#b33c2b] [.moderation-actions_&]:[font-weight:800] [.icon-button&]:[color:#b32727] [color:var(--danger)] [.icon-button&]:[color:var(--danger)] [.moderation-actions_&]:[background:var(--danger-soft)] [.moderation-actions_&]:[color:var(--danger)] secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]" onClick={() => void setStatus(sound, "ARCHIVED")}>Archive</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
