import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { EyeIcon } from "@phosphor-icons/react/dist/csr/Eye";
import { ImageIcon } from "@phosphor-icons/react/dist/csr/Image";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { SparkleIcon } from "@phosphor-icons/react/dist/csr/Sparkle";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import type { ProductUpdate, ProductUpdateAudienceMember } from "@findeat/types";
import { request, uploadImage } from "../lib/api";
import { confirmAction } from "../lib/appConfirm";

type UpdateDraft = {
  title: string;
  body: string;
  versionLabel: string;
  imageUrl: string;
  published: boolean;
};

const emptyDraft: UpdateDraft = {
  title: "",
  body: "",
  versionLabel: "",
  imageUrl: "",
  published: false,
};

export function ProductUpdatesAdmin() {
  const [updates, setUpdates] = useState<ProductUpdate[]>([]);
  const [draft, setDraft] = useState<UpdateDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audienceId, setAudienceId] = useState<string | null>(null);
  const [audience, setAudience] = useState<ProductUpdateAudienceMember[]>([]);
  const [audienceQuery, setAudienceQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedUpdate = updates.find((item) => item.id === audienceId) ?? null;
  const filteredAudience = useMemo(() => {
    const query = audienceQuery.trim().toLowerCase();
    if (!query) return audience;
    return audience.filter((user) =>
      [user.displayName, user.username, user.email].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [audience, audienceQuery]);
  const seenCount = audience.filter((user) => user.seen).length;

  async function loadUpdates() {
    setLoading(true);
    setError("");
    try {
      setUpdates(
        await request<ProductUpdate[]>("/admin/product-updates", {
          cache: "reload",
        }),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load updates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    request<ProductUpdate[]>("/admin/product-updates")
      .then((next) => { if (active) setUpdates(next); })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : "Could not load updates");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function resetEditor() {
    setEditingId(null);
    setDraft(emptyDraft);
    setImageFile(null);
  }

  function edit(update: ProductUpdate) {
    setEditingId(update.id);
    setDraft({
      title: update.title,
      body: update.body,
      versionLabel: update.versionLabel ?? "",
      imageUrl: update.imageUrl ?? "",
      published: Boolean(update.publishedAt),
    });
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.body.trim()) return;
    setSaving(true);
    setError("");
    try {
      const imageUrl = imageFile
        ? await uploadImage(imageFile, "product-update")
        : draft.imageUrl || null;
      const payload = {
        title: draft.title.trim(),
        body: draft.body.trim(),
        versionLabel: draft.versionLabel.trim() || null,
        imageUrl,
        published: draft.published,
      };
      if (editingId) {
        await request(`/admin/product-updates/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await request("/admin/product-updates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      resetEditor();
      await loadUpdates();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save update");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(update: ProductUpdate) {
    setError("");
    try {
      await request(`/admin/product-updates/${update.id}`, {
        method: "PATCH",
        body: JSON.stringify({ published: !update.publishedAt }),
      });
      await loadUpdates();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not change publishing status");
    }
  }

  async function remove(update: ProductUpdate) {
    if (!(await confirmAction({
      title: `Delete “${update.title}”?`,
      message: "The announcement and its complete view history will be deleted.",
      confirmLabel: "Delete update",
      tone: "destructive",
    }))) return;
    setError("");
    try {
      await request(`/admin/product-updates/${update.id}`, { method: "DELETE" });
      if (editingId === update.id) resetEditor();
      if (audienceId === update.id) setAudienceId(null);
      await loadUpdates();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete update");
    }
  }

  async function openAudience(update: ProductUpdate) {
    if (audienceId === update.id) {
      setAudienceId(null);
      return;
    }
    setAudienceId(update.id);
    setAudience([]);
    setAudienceQuery("");
    setAudienceLoading(true);
    try {
      setAudience(await request<ProductUpdateAudienceMember[]>(`/admin/product-updates/${update.id}/audience`));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load audience");
    } finally {
      setAudienceLoading(false);
    }
  }

  return (
    <>
      <div className="page-heading updates-heading">
        <div>
          <p className="eyebrow">PRODUCT COMMUNICATION</p>
          <h2>What’s new in FindEat</h2>
          <p className="muted">Create, publish, and measure in-app product announcements.</p>
        </div>
        <span className="admin-total">{updates.filter((item) => item.publishedAt).length} published</span>
      </div>
      {error && <p className="error banner">{error}</p>}

      <form className="card update-editor" onSubmit={save}>
        <div className="update-editor-heading">
          <div>
            <SparkleIcon size={24} weight="duotone" />
            <h3>{editingId ? "Edit update" : "Create an update"}</h3>
          </div>
          {editingId && <button type="button" className="secondary compact" onClick={resetEditor}>Cancel editing</button>}
        </div>
        <div className="update-editor-grid">
          <label>Title<input required maxLength={100} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="A clear, short headline" /></label>
          <label>Version (optional)<input maxLength={40} value={draft.versionLabel} onChange={(event) => setDraft((current) => ({ ...current, versionLabel: event.target.value }))} placeholder="For example, v1.8" /></label>
          <label className="full">What changed<textarea required rows={5} maxLength={3000} value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} placeholder="Explain the improvement and why it matters…" /></label>
          <label className="update-image-input">
            <span>Image (optional)</span>
            <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} />
            <span className="update-image-picker"><ImageIcon size={21} />{imageFile?.name ?? (draft.imageUrl ? "Replace current image" : "Choose an image")}</span>
          </label>
          {(imageFile || draft.imageUrl) && (
            <div className="update-image-preview">
              <img src={imageFile ? URL.createObjectURL(imageFile) : draft.imageUrl} alt="Update preview" />
              <button type="button" onClick={() => { setImageFile(null); setDraft((current) => ({ ...current, imageUrl: "" })); }}>Remove</button>
            </div>
          )}
        </div>
        <div className="update-editor-footer">
          <label className="publish-toggle"><input type="checkbox" checked={draft.published} onChange={(event) => setDraft((current) => ({ ...current, published: event.target.checked }))} /><span>Publish immediately</span></label>
          <button className="primary" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : draft.published ? "Publish update" : "Save draft"}</button>
        </div>
      </form>

      <div className="updates-list">
        {loading ? <div className="inline-empty">Loading updates…</div> : updates.length === 0 ? (
          <div className="empty"><SparkleIcon size={32} weight="duotone" /><h3>No updates yet</h3><p>Create your first announcement above.</p></div>
        ) : updates.map((update) => (
          <article className="card update-card" key={update.id}>
            {update.imageUrl ? <img className="update-card-image" src={update.imageUrl} alt="" /> : <div className="update-card-placeholder"><SparkleIcon size={34} weight="duotone" /></div>}
            <div className="update-card-copy">
              <div className="update-card-meta"><span className={update.publishedAt ? "published" : "draft"}>{update.publishedAt ? "Published" : "Draft"}</span>{update.versionLabel && <small>{update.versionLabel}</small>}</div>
              <h3>{update.title}</h3>
              <p>{update.body}</p>
              <small>{update.publishedAt ? `Published ${new Date(update.publishedAt).toLocaleString()}` : `Created ${new Date(update.createdAt).toLocaleString()}`}</small>
            </div>
            <div className="update-card-actions">
              <button className="secondary compact" onClick={() => void openAudience(update)}><EyeIcon size={17} /> {update._count?.views ?? 0} seen</button>
              <button className="secondary compact" onClick={() => void togglePublished(update)}>{update.publishedAt ? "Unpublish" : "Publish"}</button>
              <button className="icon-button" aria-label="Edit update" onClick={() => edit(update)}><PencilSimpleIcon size={18} /></button>
              <button className="icon-button danger" aria-label="Delete update" onClick={() => void remove(update)}><TrashIcon size={18} /></button>
            </div>
          </article>
        ))}
      </div>

      {selectedUpdate && (
        <section className="card update-audience">
          <div className="update-audience-heading">
            <div><h3>Audience · {selectedUpdate.title}</h3><p>{seenCount} seen · {audience.length - seenCount} not seen</p></div>
            <input type="search" value={audienceQuery} onChange={(event) => setAudienceQuery(event.target.value)} placeholder="Search audience…" />
          </div>
          {audienceLoading ? <div className="inline-empty">Loading audience…</div> : (
            <div className="update-audience-list">
              {filteredAudience.map((user) => (
                <div className="update-audience-row" key={user.id}>
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{user.username.charAt(0)}</span>}
                  <div><strong>{user.username}</strong><small>{user.email}</small></div>
                  <div className={user.seen ? "audience-seen" : "audience-unseen"}>{user.seen ? <><CheckCircleIcon size={17} weight="fill" /> Seen {user.viewedAt ? new Date(user.viewedAt).toLocaleString() : ""}</> : "Not seen"}</div>
                </div>
              ))}
              {filteredAudience.length === 0 && <div className="inline-empty">No matching users.</div>}
            </div>
          )}
        </section>
      )}
    </>
  );
}
