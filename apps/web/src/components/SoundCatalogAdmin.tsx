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
      <div className="page-heading">
        <div>
          <p className="eyebrow">CREATOR CATALOG</p>
          <h2>Sounds</h2>
          <p className="muted">Upload only tracks whose license explicitly permits FindEat’s UGC and streaming use.</p>
        </div>
        <span className="admin-total">{sounds.filter((sound) => sound.status === "ACTIVE").length} active</span>
      </div>
      {error && <p className="error banner">{error}</p>}
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
        <p className="muted">New tracks start inactive. Review the evidence, then enable them below.</p>
        <button disabled={working || !audio}>{working ? "Uploading…" : "Upload Sound"}</button>
      </form>
      <div className="admin-list">
        {sounds.map((sound) => (
          <article key={sound.id} className="admin-list-item">
            <div><strong>{sound.title}</strong><p>{sound.artist} · {sound.licenseType}</p><small>{sound.categories.join(" · ") || "Uncategorized"}</small></div>
            <div className="row-actions">
              <span className={`status ${sound.status.toLowerCase()}`}>{sound.status}</span>
              <button className="secondary" onClick={() => void setStatus(sound, sound.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}>{sound.status === "ACTIVE" ? "Disable" : "Enable"}</button>
              <button className="danger secondary" onClick={() => void setStatus(sound, "ARCHIVED")}>Archive</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
