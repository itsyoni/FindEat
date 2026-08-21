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
      <div className="page-heading [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:24px] [margin-bottom:30px] [&_.eyebrow]:[margin-top:0] [&_h2]:[margin-bottom:8px] [&_h2]:[font-size:36px] [&_h2]:[letter-spacing:-0.035em] [&_p]:[margin-bottom:0] [.performance-page_&_select]:[min-width:130px] [.performance-page_&_select]:[padding:10px_12px] [.performance-page_&_select]:[border:1px_solid_var(--line)] [.performance-page_&_select]:[border-radius:11px] [.performance-page_&_select]:[background:var(--surface)] [.performance-page_&_select]:[color:var(--ink)] [.pro-page>&]:[margin-bottom:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:14px] max-[800px]:[margin-bottom:22px] max-[800px]:[&_h2]:[font-size:clamp(28px,_8vw,_34px)] max-[800px]:[&_h2]:[line-height:1.08] max-[800px]:[&_p]:[max-width:68ch] max-[800px]:[&_p]:[line-height:1.5] max-[800px]:[&>div]:[min-width:0] [.restaurant-badges-page_&]:[display:flex] [.restaurant-badges-page_&]:[align-items:flex-start] [.restaurant-badges-page_&]:[justify-content:space-between] [.restaurant-badges-page_&]:[gap:24px] [.restaurant-badges-page_&]:[margin-bottom:28px] max-[700px]:[.restaurant-badges-page_&]:[flex-direction:column] updates-heading">
        <div>
          <p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">PRODUCT COMMUNICATION</p>
          <h2>What’s new in FindEat</h2>
          <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">Create, publish, and measure in-app product announcements.</p>
        </div>
        <span className="admin-total [padding:8px_12px] [border-radius:20px] [background:#f0e9f8] [color:#68418b] [font-size:13px] [font-weight:800] [background:var(--purple-soft)] [color:var(--purple)]">{updates.filter((item) => item.publishedAt).length} published</span>
      </div>
      {error && <p className="error [color:#b32727] [font-size:13px] [color:var(--danger)] banner [padding:12px_16px] [border-radius:12px] [background:#fff0f0] [.support-admin-content>&]:[flex:0_0_auto] [.support-admin-content>.admin-support-slot>&]:[flex:0_0_auto] [background:var(--danger-soft)] [color:var(--danger)]">{error}</p>}

      <form className="card [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] [.performance-grid>&]:[padding:25px] [.pro-secondary-grid>&]:[padding:23px] max-[600px]:[.pro-secondary-grid>&]:[padding:18px] update-editor [margin-bottom:24px] [padding:24px] max-[800px]:[padding:19px]" onSubmit={save}>
        <div className="update-editor-heading [display:flex] [align-items:center] [&>div]:[display:flex] [&>div]:[align-items:center] [justify-content:space-between] [gap:16px] [margin-bottom:22px] [&>div]:[gap:10px] [&_h3]:[margin:0] max-[600px]:[align-items:flex-start] max-[600px]:[flex-direction:column]">
          <div>
            <SparkleIcon size={24} weight="duotone" />
            <h3>{editingId ? "Edit update" : "Create an update"}</h3>
          </div>
          {editingId && <button type="button" className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)] compact [.dish-food-tags&_.dish-food-tags-heading]:[padding:13px_14px] [.dish-food-tags&_.dish-tag-group_summary]:[padding:11px_14px] [.dish-food-tags&_.dish-tag-options]:[padding-right:14px] [.dish-food-tags&_.dish-tag-options]:[padding-left:14px] [.admin-monitor-metrics&]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [.dish-tags&]:[display:inline-flex] [.dish-tags&]:[flex-direction:row] [.dish-tags&]:[align-items:center] [.dish-tags&]:[gap:6px] [.dish-tags&]:[width:auto] [.dish-tags&]:[max-width:190px] [.dish-tags&]:[min-width:0] [.dish-tags&]:[white-space:nowrap] [.dish-tags&_span]:[display:block] [.dish-tags&_span]:[flex:0_1_auto] [.dish-tags&_span]:[max-width:112px] [.dish-tags&_span]:[overflow:hidden] [.dish-tags&_span]:[text-overflow:ellipsis] [.dish-tags&_span]:[white-space:nowrap] [.dish-tags&_small]:[white-space:nowrap]" onClick={resetEditor}>Cancel editing</button>}
        </div>
        <div className="update-editor-grid [display:grid] [grid-template-columns:minmax(0,1fr)_minmax(180px,.38fr)] [gap:17px] [&_label]:[display:grid] [&_label]:[gap:8px] [&_label]:[color:#3d3d3d] [&_label]:[font-size:13px] [&_label]:[font-weight:700] [&_.full]:[grid-column:1/-1] [&_textarea]:[min-height:130px] max-[800px]:[grid-template-columns:1fr] max-[800px]:[&_.full]:[grid-column:auto] dark:[&_label]:[color:var(--muted)]">
          <label>Title<input required maxLength={100} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="A clear, short headline" /></label>
          <label>Version (optional)<input maxLength={40} value={draft.versionLabel} onChange={(event) => setDraft((current) => ({ ...current, versionLabel: event.target.value }))} placeholder="For example, v1.8" /></label>
          <label className="full [.dish-editor-fields_&]:[grid-column:1/-1] [.profile-form_&]:[grid-column:1/-1] max-[800px]:[.profile-form_&]:[grid-column:auto] max-[650px]:[.dish-editor-fields_&]:[grid-column:auto] [.update-editor-grid_&]:[grid-column:1/-1] max-[800px]:[.update-editor-grid_&]:[grid-column:auto]">What changed<textarea required rows={5} maxLength={3000} value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} placeholder="Explain the improvement and why it matters…" /></label>
          <label className="update-image-input [&>input]:[display:none]">
            <span>Image (optional)</span>
            <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} />
            <span className="update-image-picker [display:flex] [align-items:center] [gap:9px] [min-height:48px] [padding:12px_14px] [overflow:hidden] [border:1px_dashed_#cfcac1] [border-radius:12px] [background:var(--soft)] [color:var(--muted)] [cursor:pointer] [text-overflow:ellipsis] [white-space:nowrap]"><ImageIcon size={21} />{imageFile?.name ?? (draft.imageUrl ? "Replace current image" : "Choose an image")}</span>
          </label>
          {(imageFile || draft.imageUrl) && (
            <div className="update-image-preview [position:relative] [width:170px] [height:96px] [overflow:hidden] [border-radius:13px] [background:var(--soft)] [&_img]:[width:100%] [&_img]:[height:100%] [&_img]:[object-fit:cover] [&_button]:[position:absolute] [&_button]:[right:7px] [&_button]:[bottom:7px] [&_button]:[padding:5px_8px] [&_button]:[border:0] [&_button]:[border-radius:7px] [&_button]:[background:#171717cc] [&_button]:[color:#FAF9F6] [&_button]:[font-size:10px] [&_button]:[font-weight:800]">
              <img src={imageFile ? URL.createObjectURL(imageFile) : draft.imageUrl} alt="Update preview" />
              <button type="button" onClick={() => { setImageFile(null); setDraft((current) => ({ ...current, imageUrl: "" })); }}>Remove</button>
            </div>
          )}
        </div>
        <div className="update-editor-footer [display:flex] [align-items:center] [justify-content:space-between] [gap:18px] [margin-top:22px] [padding-top:18px] [border-top:1px_solid_var(--line)] max-[600px]:[align-items:stretch] max-[600px]:[flex-direction:column] max-[600px]:[&>button]:[width:100%] max-[600px]:[gap:12px]">
          <label className="publish-toggle [display:flex]! [grid-template-columns:auto_1fr] [align-items:center] [gap:9px]! [cursor:pointer] [&_input]:[width:18px] [&_input]:[height:18px] [&_input]:[accent-color:var(--ink)] max-[600px]:[width:100%]"><input type="checkbox" checked={draft.published} onChange={(event) => setDraft((current) => ({ ...current, published: event.target.checked }))} /><span>Publish immediately</span></label>
          <button className="primary [.login-card_&]:[min-height:49px] [.login-card_&]:[margin-top:2px] [.login-card_&]:[background:var(--accent)] [.login-card_&]:[color:#faf9f6] [.login-card_&]:[box-shadow:0_10px_24px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.login-card_&]:[transition:background-color_0.16s_ease,_box-shadow_0.16s_ease,_transform_0.16s_ease] [.login-card_&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--accent)_88%,_#9c2e19)] [.login-card_&:hover:not(:disabled)]:[box-shadow:0_13px_28px_color-mix(in_srgb,_var(--accent)_31%,_transparent)] [.login-card_&:hover:not(:disabled)]:[transform:translateY(-1px)] [.login-card_&:active:not(:disabled)]:[transform:translateY(0)] [.login-card_&:disabled]:[cursor:not-allowed] [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--ink)] [color:#faf9f6] [&:hover]:[background:#333] [&:disabled]:[opacity:0.55] [.error-page-actions_&]:[background:var(--accent)] [.error-page-actions_&]:[color:#171717] [.error-page-actions_&]:[box-shadow:0_12px_30px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.error-page-actions_&:hover]:[background:color-mix(in_srgb,_var(--accent)_88%,_var(--ink))] [.error-page-actions_&:hover]:[transform:translateY(-1px)] [&.compact]:[padding:9px_13px] [&.compact]:[font-size:12px] [&.compact]:[white-space:nowrap] [.owner-support-form_&]:[width:100%] dark:[color:#171717] dark:[&:hover]:[background:color-mix(in_srgb,_var(--ink)_82%,_var(--accent))]" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : draft.published ? "Publish update" : "Save draft"}</button>
        </div>
      </form>

      <div className="updates-list [display:grid] [gap:12px]">
        {loading ? <div className="inline-empty [padding:24px_5px_6px] [color:var(--muted)] [font-size:13px] [text-align:center]">Loading updates…</div> : updates.length === 0 ? (
          <div className="empty [padding:65px_20px] [border:1px_dashed_#d8d5cf] [border-radius:20px] [text-align:center] [color:var(--muted)] [&_span]:[font-size:35px] [&_h3]:[color:var(--ink)] [&_h3]:[margin:12px_0_6px]"><SparkleIcon size={32} weight="duotone" /><h3>No updates yet</h3><p>Create your first announcement above.</p></div>
        ) : updates.map((update) => (
          <article className="card [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] [.performance-grid>&]:[padding:25px] [.pro-secondary-grid>&]:[padding:23px] max-[600px]:[.pro-secondary-grid>&]:[padding:18px] update-card [display:grid] [grid-template-columns:120px_minmax(0,1fr)_auto] [align-items:center] [gap:18px] [padding:14px] max-[800px]:[grid-template-columns:82px_minmax(0,1fr)] max-[600px]:[grid-template-columns:70px_minmax(0,1fr)]" key={update.id}>
            {update.imageUrl ? <img className="update-card-image [width:120px] [height:92px] [border-radius:14px] [object-fit:cover] max-[800px]:[width:82px] max-[800px]:[height:82px] max-[600px]:[width:70px] max-[600px]:[height:70px]" src={update.imageUrl} alt="" /> : <div className="update-card-placeholder [width:120px] [height:92px] [border-radius:14px] [display:grid] [place-items:center] [background:linear-gradient(135deg,#fff3d0,#ffe2d9)] [color:var(--accent)] max-[800px]:[width:82px] max-[800px]:[height:82px] [background:linear-gradient(135deg,var(--warning-soft),var(--accent-soft))] max-[600px]:[width:70px] max-[600px]:[height:70px]"><SparkleIcon size={34} weight="duotone" /></div>}
            <div className="update-card-copy [min-width:0] [&_h3]:[margin:7px_0_5px] [&_p]:[display:-webkit-box] [&_p]:[margin:0_0_8px] [&_p]:[overflow:hidden] [&_p]:[color:var(--muted)] [&_p]:[font-size:13px] [&_p]:[line-height:1.45] [&_p]:[-webkit-box-orient:vertical] [&_p]:[-webkit-line-clamp:2] [&>small]:[color:#999] [&>small]:[font-size:10px]">
              <div className="update-card-meta [display:flex] [align-items:center] [gap:8px] [&_span]:[padding:4px_7px] [&_span]:[border-radius:999px] [&_span]:[font-size:9px] [&_span]:[font-weight:900] [&_span]:[letter-spacing:.05em] [&_span]:[text-transform:uppercase] [&_.published]:[background:#dff5e5] [&_.published]:[color:#196537] [&_.draft]:[background:#eeeae4] [&_.draft]:[color:#68635d] [&_small]:[color:var(--muted)] [&_.published]:[background:var(--success-soft)] [&_.published]:[color:var(--success)] [&_.draft]:[background:var(--neutral-chip)] [&_.draft]:[color:var(--neutral-chip-text)]"><span className={update.publishedAt ? "published" : "draft"}>{update.publishedAt ? "Published" : "Draft"}</span>{update.versionLabel && <small>{update.versionLabel}</small>}</div>
              <h3>{update.title}</h3>
              <p>{update.body}</p>
              <small>{update.publishedAt ? `Published ${new Date(update.publishedAt).toLocaleString()}` : `Created ${new Date(update.createdAt).toLocaleString()}`}</small>
            </div>
            <div className="update-card-actions [display:flex] [align-items:center] [justify-content:flex-end] [gap:7px] [flex-wrap:wrap] [max-width:290px] [&_button]:[display:flex] [&_button]:[align-items:center] [&_button]:[gap:6px] max-[800px]:[grid-column:1/-1] max-[800px]:[justify-content:flex-start] max-[800px]:[max-width:none]">
              <button className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)] compact [.dish-food-tags&_.dish-food-tags-heading]:[padding:13px_14px] [.dish-food-tags&_.dish-tag-group_summary]:[padding:11px_14px] [.dish-food-tags&_.dish-tag-options]:[padding-right:14px] [.dish-food-tags&_.dish-tag-options]:[padding-left:14px] [.admin-monitor-metrics&]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [.dish-tags&]:[display:inline-flex] [.dish-tags&]:[flex-direction:row] [.dish-tags&]:[align-items:center] [.dish-tags&]:[gap:6px] [.dish-tags&]:[width:auto] [.dish-tags&]:[max-width:190px] [.dish-tags&]:[min-width:0] [.dish-tags&]:[white-space:nowrap] [.dish-tags&_span]:[display:block] [.dish-tags&_span]:[flex:0_1_auto] [.dish-tags&_span]:[max-width:112px] [.dish-tags&_span]:[overflow:hidden] [.dish-tags&_span]:[text-overflow:ellipsis] [.dish-tags&_span]:[white-space:nowrap] [.dish-tags&_small]:[white-space:nowrap]" onClick={() => void openAudience(update)}><EyeIcon size={17} /> {update._count?.views ?? 0} seen</button>
              <button className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)] compact [.dish-food-tags&_.dish-food-tags-heading]:[padding:13px_14px] [.dish-food-tags&_.dish-tag-group_summary]:[padding:11px_14px] [.dish-food-tags&_.dish-tag-options]:[padding-right:14px] [.dish-food-tags&_.dish-tag-options]:[padding-left:14px] [.admin-monitor-metrics&]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [.dish-tags&]:[display:inline-flex] [.dish-tags&]:[flex-direction:row] [.dish-tags&]:[align-items:center] [.dish-tags&]:[gap:6px] [.dish-tags&]:[width:auto] [.dish-tags&]:[max-width:190px] [.dish-tags&]:[min-width:0] [.dish-tags&]:[white-space:nowrap] [.dish-tags&_span]:[display:block] [.dish-tags&_span]:[flex:0_1_auto] [.dish-tags&_span]:[max-width:112px] [.dish-tags&_span]:[overflow:hidden] [.dish-tags&_span]:[text-overflow:ellipsis] [.dish-tags&_span]:[white-space:nowrap] [.dish-tags&_small]:[white-space:nowrap]" onClick={() => void togglePublished(update)}>{update.publishedAt ? "Unpublish" : "Publish"}</button>
              <button className="icon-button [border:0] [background:none] [font-size:22px] [&.edit]:[color:#555] [&.edit]:[font-size:17px] [display:grid]! [place-items:center] [width:39px] [height:39px] [padding:0] [border:1px_solid_var(--line)] [border-radius:11px] [background:var(--surface)] [color:var(--ink)] [&.danger]:[color:#b32727] [&.danger]:[color:var(--danger)] [&.edit]:[color:var(--muted)]" aria-label="Edit update" onClick={() => edit(update)}><PencilSimpleIcon size={18} /></button>
              <button className="icon-button [border:0] [background:none] [font-size:22px] [&.edit]:[color:#555] [&.edit]:[font-size:17px] [display:grid]! [place-items:center] [width:39px] [height:39px] [padding:0] [border:1px_solid_var(--line)] [border-radius:11px] [background:var(--surface)] [color:var(--ink)] [&.danger]:[color:#b32727] [&.danger]:[color:var(--danger)] [&.edit]:[color:var(--muted)] danger [color:#b54635] [.moderation-actions_&]:[border:0] [.moderation-actions_&]:[border-radius:11px] [.moderation-actions_&]:[background:#fff0ed] [.moderation-actions_&]:[color:#b33c2b] [.moderation-actions_&]:[font-weight:800] [.icon-button&]:[color:#b32727] [color:var(--danger)] [.icon-button&]:[color:var(--danger)] [.moderation-actions_&]:[background:var(--danger-soft)] [.moderation-actions_&]:[color:var(--danger)]" aria-label="Delete update" onClick={() => void remove(update)}><TrashIcon size={18} /></button>
            </div>
          </article>
        ))}
      </div>

      {selectedUpdate && (
        <section className="card [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] [.performance-grid>&]:[padding:25px] [.pro-secondary-grid>&]:[padding:23px] max-[600px]:[.pro-secondary-grid>&]:[padding:18px] update-audience [margin-top:24px] [overflow:hidden]">
          <div className="update-audience-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:20px] [padding:20px] [border-bottom:1px_solid_var(--line)] [&_h3]:[margin:0] [&_p]:[margin:0] [&_p]:[margin-top:5px] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px] [&_input]:[width:min(280px,45%)] max-[800px]:[align-items:stretch] max-[800px]:[flex-direction:column] max-[800px]:[&_input]:[width:100%]">
            <div><h3>Audience · {selectedUpdate.title}</h3><p>{seenCount} seen · {audience.length - seenCount} not seen</p></div>
            <input type="search" value={audienceQuery} onChange={(event) => setAudienceQuery(event.target.value)} placeholder="Search audience…" />
          </div>
          {audienceLoading ? <div className="inline-empty [padding:24px_5px_6px] [color:var(--muted)] [font-size:13px] [text-align:center]">Loading audience…</div> : (
            <div className="update-audience-list [max-height:480px] [overflow-y:auto]">
              {filteredAudience.map((user) => (
                <div className="update-audience-row [display:grid] [grid-template-columns:42px_minmax(0,1fr)_auto] [align-items:center] [gap:12px] [padding:13px_20px] [border-bottom:1px_solid_var(--line)] [&:last-child]:[border-bottom:0] [&>img]:[display:grid] [&>img]:[place-items:center] [&>img]:[width:42px] [&>img]:[height:42px] [&>img]:[border-radius:50%] [&>img]:[object-fit:cover] [&>img]:[background:#eee7df] [&>img]:[font-weight:900] [&>span]:[display:grid] [&>span]:[place-items:center] [&>span]:[width:42px] [&>span]:[height:42px] [&>span]:[border-radius:50%] [&>span]:[object-fit:cover] [&>span]:[background:#eee7df] [&>span]:[font-weight:900] [&_strong]:[display:block] [&_small]:[display:block] [&_small]:[margin-top:3px] [&_small]:[overflow:hidden] [&_small]:[color:var(--muted)] [&_small]:[font-size:11px] [&_small]:[text-overflow:ellipsis] [&_small]:[white-space:nowrap] max-[800px]:[grid-template-columns:42px_minmax(0,1fr)] max-[800px]:[&>div:last-child]:[grid-column:2] [&>img]:[background:var(--avatar-surface)] [&>span]:[background:var(--avatar-surface)] max-[600px]:[padding:12px_14px]" key={user.id}>
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{user.username.charAt(0)}</span>}
                  <div><strong>{user.username}</strong><small>{user.email}</small></div>
                  <div className={user.seen ? "audience-seen" : "audience-unseen"}>{user.seen ? <><CheckCircleIcon size={17} weight="fill" /> Seen {user.viewedAt ? new Date(user.viewedAt).toLocaleString() : ""}</> : "Not seen"}</div>
                </div>
              ))}
              {filteredAudience.length === 0 && <div className="inline-empty [padding:24px_5px_6px] [color:var(--muted)] [font-size:13px] [text-align:center]">No matching users.</div>}
            </div>
          )}
        </section>
      )}
    </>
  );
}
