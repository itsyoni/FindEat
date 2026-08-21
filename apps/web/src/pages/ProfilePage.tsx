import { useState } from "react";
import type { FormEvent } from "react";
import {
  RESTAURANT_CATEGORY_OPTIONS,
  type ManagedRestaurant,
  type Menu,
  type RestaurantOpeningHours,
  type RestaurantFoodCertificationDetails,
} from "@findeat/types";
import { request, uploadImage } from "../lib/api";
import { OpeningHoursEditor } from "../components/OpeningHoursEditor";
import { normalizeOpeningHours } from "../components/openingHours";
import { ImageCropDialog } from "../components/ImageCropDialog";
import { CustomDropdown } from "../components/CustomDropdown";

export function ProfilePage({
  restaurant,
  menus,
  onSaved,
}: {
  restaurant: ManagedRestaurant;
  menus: Menu[];
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: restaurant.name,
    phone: restaurant.phone || "",
    website: restaurant.website || "",
    instagram: restaurant.instagram || "",
    ontopoUrl: restaurant.ontopoUrl || "",
    tabitUrl: restaurant.tabitUrl || "",
    bio: restaurant.bio || "",
  });
  const [categoryNames, setCategoryNames] = useState(restaurant.categories || []);
  const legacyCertificationDetails: RestaurantFoodCertificationDetails = {
    kosher: {
      status: restaurant.foodCertifications?.includes("KOSHER") ? "CERTIFIED" : "NOT_KOSHER",
      standard: "REGULAR",
    },
    halal: {
      status: restaurant.foodCertifications?.includes("HALAL") ? "CERTIFIED" : "NOT_HALAL",
    },
  };
  const [foodCertificationDetails, setFoodCertificationDetails] =
    useState<RestaurantFoodCertificationDetails>(
      restaurant.foodCertificationDetails ?? legacyCertificationDetails,
    );
  const [openingHours, setOpeningHours] = useState<RestaurantOpeningHours | null>(() =>
    restaurant.openingHours
      ? normalizeOpeningHours(restaurant.openingHours)
      : null,
  );
  const [status, setStatus] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(restaurant.logoUrl || "");
  const [coverPreview, setCoverPreview] = useState(restaurant.coverUrl || "");
  const [cropRequest, setCropRequest] = useState<{
    file: File;
    type: "logo" | "cover";
  } | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [proposedAddress, setProposedAddress] = useState("");
  const [addressReason, setAddressReason] = useState("");
  const [requestingAddress, setRequestingAddress] = useState(false);
  function selectImage(file: File | undefined, type: "logo" | "cover") {
    if (!file) return;
    setCropRequest({ file, type });
  }

  function useCroppedImage(file: File, previewUrl: string) {
    if (!cropRequest) return;
    if (cropRequest.type === "logo") {
      setLogoFile(file);
      setLogoPreview(previewUrl);
    } else {
      setCoverFile(file);
      setCoverPreview(previewUrl);
    }
    setCropRequest(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus(logoFile || coverFile ? "Uploading photos…" : "Saving…");
    try {
      const [logoUrl, coverUrl] = await Promise.all([
        logoFile ? uploadImage(logoFile, 'restaurant') : Promise.resolve(undefined),
        coverFile ? uploadImage(coverFile, 'restaurant') : Promise.resolve(undefined),
      ]);
      const originalForm = {
        name: restaurant.name,
        phone: restaurant.phone || "",
        website: restaurant.website || "",
        instagram: restaurant.instagram || "",
        ontopoUrl: restaurant.ontopoUrl || "",
        tabitUrl: restaurant.tabitUrl || "",
        bio: restaurant.bio || "",
      };
      const changedFields = Object.fromEntries(
        Object.entries(form).filter(
          ([field, value]) =>
            value !== originalForm[field as keyof typeof originalForm],
        ),
      );
      const categoriesChanged =
        JSON.stringify(categoryNames) !== JSON.stringify(restaurant.categories || []);
      const foodCertificationDetailsChanged =
        JSON.stringify(foodCertificationDetails) !==
        JSON.stringify(restaurant.foodCertificationDetails ?? legacyCertificationDetails);
      const originalOpeningHours = restaurant.openingHours
        ? normalizeOpeningHours(restaurant.openingHours)
        : null;
      const openingHoursChanged =
        JSON.stringify(openingHours) !== JSON.stringify(originalOpeningHours);
      const body = {
        ...changedFields,
        ...(categoriesChanged ? { categoryNames } : {}),
        ...(foodCertificationDetailsChanged ? { foodCertificationDetails } : {}),
        ...(openingHoursChanged ? { openingHours } : {}),
        ...(logoUrl ? { logoUrl } : {}),
        ...(coverUrl ? { coverUrl } : {}),
      };

      if (Object.keys(body).length === 0) {
        setStatus("No changes to save");
        return;
      }

      await request(`/restaurants/me/${restaurant.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setLogoFile(null);
      setCoverFile(null);
      await onSaved();
      setStatus("Saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save");
    }
  }

  async function requestAddressChange() {
    if (!proposedAddress.trim() || requestingAddress) return;
    setRequestingAddress(true);
    setStatus("Verifying address…");
    try {
      await request(`/restaurants/me/${restaurant.id}/address-change-requests`, {
        method: "POST",
        body: JSON.stringify({
          address: proposedAddress.trim(),
          reason: addressReason.trim() || undefined,
        }),
      });
      setRequestOpen(false);
      setProposedAddress("");
      setAddressReason("");
      await onSaved();
      setStatus("Address change request sent");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not send request",
      );
    } finally {
      setRequestingAddress(false);
    }
  }

  return (
    <div className="page-stack [width:min(1120px,100%)] [margin:auto] [padding:46px_42px_70px] [.restaurant-setup-shell>&]:[width:min(960px,100%)] [.restaurant-setup-shell>&]:[margin:auto] max-[800px]:[padding:30px_18px] max-[800px]:[width:100%] max-[800px]:[padding:26px_clamp(14px,4vw,22px)_calc(42px_+_env(safe-area-inset-bottom))] max-[380px]:[padding-inline:12px]">
      <div className="page-heading [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:24px] [margin-bottom:30px] [&_.eyebrow]:[margin-top:0] [&_h2]:[margin-bottom:8px] [&_h2]:[font-size:36px] [&_h2]:[letter-spacing:-0.035em] [&_p]:[margin-bottom:0] [.performance-page_&_select]:[min-width:130px] [.performance-page_&_select]:[padding:10px_12px] [.performance-page_&_select]:[border:1px_solid_var(--line)] [.performance-page_&_select]:[border-radius:11px] [.performance-page_&_select]:[background:var(--surface)] [.performance-page_&_select]:[color:var(--ink)] [.pro-page>&]:[margin-bottom:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:14px] max-[800px]:[margin-bottom:22px] max-[800px]:[&_h2]:[font-size:clamp(28px,_8vw,_34px)] max-[800px]:[&_h2]:[line-height:1.08] max-[800px]:[&_p]:[max-width:68ch] max-[800px]:[&_p]:[line-height:1.5] max-[800px]:[&>div]:[min-width:0] [.restaurant-badges-page_&]:[display:flex] [.restaurant-badges-page_&]:[align-items:flex-start] [.restaurant-badges-page_&]:[justify-content:space-between] [.restaurant-badges-page_&]:[gap:24px] [.restaurant-badges-page_&]:[margin-bottom:28px] max-[700px]:[.restaurant-badges-page_&]:[flex-direction:column]">
        <div>
          <p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">
            PUBLIC INFORMATION
          </p>
          <h2>Restaurant profile</h2>
          <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">
            Add or update only the information you want customers to see.
          </p>
        </div>
      </div>
      <form className="profile-form [display:grid] [grid-template-columns:1fr_1fr] [gap:20px] [padding:28px] [&_.full]:[grid-column:1/-1] [&_.form-footer]:[grid-column:1/-1] [&_textarea]:[min-height:110px] [&_textarea]:[resize:vertical] [&_input[readonly]]:[border-color:#ddd8d0] [&_input[readonly]]:[background:#f5f3ef] [&_input[readonly]]:[color:#6f6962] [&_input[readonly]]:[cursor:not-allowed] max-[800px]:[grid-template-columns:1fr] max-[800px]:[&_.full]:[grid-column:auto] max-[800px]:[&_.form-footer]:[grid-column:auto] [&_input[readonly]]:[border-color:var(--line)] [&_input[readonly]]:[background:var(--soft)] [&_input[readonly]]:[color:var(--muted)] max-[800px]:[gap:16px] max-[800px]:[padding:20px] card [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] [.performance-grid>&]:[padding:25px] [.pro-secondary-grid>&]:[padding:23px] max-[600px]:[.pro-secondary-grid>&]:[padding:18px]" onSubmit={save}>
        <div className="restaurant-media-editor [position:relative] [margin:-28px_-28px_10px] max-[800px]:[margin:-20px_-20px_8px] full [.dish-editor-fields_&]:[grid-column:1/-1] [.profile-form_&]:[grid-column:1/-1] max-[800px]:[.profile-form_&]:[grid-column:auto] max-[650px]:[.dish-editor-fields_&]:[grid-column:auto] [.update-editor-grid_&]:[grid-column:1/-1] max-[800px]:[.update-editor-grid_&]:[grid-column:auto]">
          <div className="cover-editor [position:relative] [width:100%] [height:auto] [aspect-ratio:16/9] [overflow:hidden] [border-radius:18px_18px_0_0] [background:#e8e4de] [&>img]:[width:100%] [&>img]:[height:100%] [&>img]:[object-fit:cover] [background:var(--neutral-chip)] [color:var(--muted)] max-[800px]:[border-radius:17px_17px_0_0] max-[600px]:[aspect-ratio:3/2]">
            {coverPreview ? (
              <img src={coverPreview} alt="Restaurant cover preview" />
            ) : (
              <div className="media-placeholder [display:grid] [place-items:center] [width:100%] [height:100%] [color:var(--muted)] [font-size:13px] [font-weight:800] [background:linear-gradient(135deg,#eee9e3,#ded8cf)] [background:linear-gradient(145deg,var(--surface-subtle),var(--neutral-chip))]">Add a cover photo</div>
            )}
            <label className="media-change-button [position:absolute] [right:18px] [bottom:18px] [display:inline-flex] [align-items:center] [justify-content:center] [padding:9px_12px] [border:1px_solid_#ffffff70] [border-radius:10px] [background:#171717c9] [color:#FAF9F6] [cursor:pointer] [font-size:12px] [font-weight:800] [backdrop-filter:blur(8px)] [&_input]:[display:none] max-[600px]:[right:12px] max-[600px]:[bottom:12px]">
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  {
                    selectImage(event.target.files?.[0], "cover");
                    event.target.value = "";
                  }
                }
              />
              <span>{coverFile ? "Cover selected" : "Change cover"}</span>
            </label>
          </div>
          <div className="logo-editor [display:flex] [align-items:flex-end] [gap:15px] [min-height:62px] [padding:0_24px] [&>div:last-child]:[display:flex] [&>div:last-child]:[align-items:center] [&>div:last-child]:[gap:12px] [&>div:last-child]:[padding:12px_0] [&_.media-change-button]:[position:static] [&_.media-change-button]:[border-color:var(--line)] [&_.media-change-button]:[background:var(--soft)] [&_.media-change-button]:[color:var(--ink)] [&_.media-change-button]:[backdrop-filter:none] [&_small]:[color:var(--muted)] max-[600px]:[align-items:flex-start] max-[600px]:[&>div:last-child]:[align-items:flex-start] max-[600px]:[&>div:last-child]:[flex-direction:column] max-[600px]:[&>div:last-child]:[gap:5px] max-[600px]:[&_small]:[font-size:10px] max-[600px]:[padding:0_16px]">
            <div className="logo-preview [display:grid] [place-items:center] [width:104px] [height:104px] [margin-top:-50px] [overflow:hidden] [border:6px_solid_#FAF9F6] [border-radius:50%] [background:var(--ink)] [color:#FAF9F6] [font-size:28px] [font-weight:900] [z-index:1] [&_img]:[width:100%] [&_img]:[height:100%] [&_img]:[object-fit:cover] max-[600px]:[width:88px] max-[600px]:[height:88px] max-[600px]:[margin-top:-42px] max-[600px]:[border-width:5px] [border-color:var(--surface)]">
              {logoPreview ? (
                <img src={logoPreview} alt="Restaurant logo preview" />
              ) : (
                <span>{restaurant.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <label className="media-change-button [position:absolute] [right:18px] [bottom:18px] [display:inline-flex] [align-items:center] [justify-content:center] [padding:9px_12px] [border:1px_solid_#ffffff70] [border-radius:10px] [background:#171717c9] [color:#FAF9F6] [cursor:pointer] [font-size:12px] [font-weight:800] [backdrop-filter:blur(8px)] [&_input]:[display:none] max-[600px]:[right:12px] max-[600px]:[bottom:12px] dark">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    {
                      selectImage(event.target.files?.[0], "logo");
                      event.target.value = "";
                    }
                  }
                />
                <span>{logoFile ? "Logo selected" : "Change logo"}</span>
              </label>
              <small>Use a square image for the best result.</small>
            </div>
          </div>
        </div>
        <label className="full [.dish-editor-fields_&]:[grid-column:1/-1] [.profile-form_&]:[grid-column:1/-1] max-[800px]:[.profile-form_&]:[grid-column:auto] max-[650px]:[.dish-editor-fields_&]:[grid-column:auto] [.update-editor-grid_&]:[grid-column:1/-1] max-[800px]:[.update-editor-grid_&]:[grid-column:auto]">
          Restaurant name
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label className="full [.dish-editor-fields_&]:[grid-column:1/-1] [.profile-form_&]:[grid-column:1/-1] max-[800px]:[.profile-form_&]:[grid-column:auto] max-[650px]:[.dish-editor-fields_&]:[grid-column:auto] [.update-editor-grid_&]:[grid-column:1/-1] max-[800px]:[.update-editor-grid_&]:[grid-column:auto]">
          Restaurant description
          <textarea
            value={form.bio}
            onChange={(event) => setForm({ ...form, bio: event.target.value })}
            placeholder="Tell customers what makes this place special"
            rows={4}
          />
        </label>
        <fieldset className="restaurant-categories [min-width:0] [margin:0] [padding:18px] [border:1px_solid_var(--line)] [border-radius:16px] [&_legend]:[padding:0_6px] [&_legend]:[font-size:13px] [&_legend]:[font-weight:900] [&_p]:[margin:0_0_13px] [&_p]:[font-size:11px] max-[800px]:[padding:15px] full [.dish-editor-fields_&]:[grid-column:1/-1] [.profile-form_&]:[grid-column:1/-1] max-[800px]:[.profile-form_&]:[grid-column:auto] max-[650px]:[.dish-editor-fields_&]:[grid-column:auto] [.update-editor-grid_&]:[grid-column:1/-1] max-[800px]:[.update-editor-grid_&]:[grid-column:auto]">
          <legend>Restaurant categories</legend>
          <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">Choose any categories you want to show.</p>
          <div className="restaurant-category-options [display:flex] [flex-wrap:wrap] [gap:8px] [&_button]:[padding:8px_11px] [&_button]:[border:1px_solid_var(--line)] [&_button]:[border-radius:999px] [&_button]:[background:var(--surface)] [&_button]:[color:var(--muted)] [&_button]:[font-size:11px] [&_button]:[font-weight:800] [&_button.selected]:[border-color:#f3bf45] [&_button.selected]:[background:#fff2c7] [&_button.selected]:[color:#6f4d00] dark:[&_button]:[color:var(--muted)] [&_button.selected]:[background:var(--warning-soft)] [&_button.selected]:[color:var(--warning)] [&_button.selected]:[border-color:var(--warning-border)]">
            {RESTAURANT_CATEGORY_OPTIONS.map((category) => {
              const selected = categoryNames.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  className={selected ? "selected" : ""}
                  aria-pressed={selected}
                  onClick={() =>
                    setCategoryNames((current) =>
                      selected
                        ? current.filter((item) => item !== category)
                        : [...current, category],
                    )
                  }
                >
                  {category}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="restaurant-certifications [min-width:0] [margin:0] [padding:18px] [border:1px_solid_var(--line)] [border-radius:16px] [&_legend]:[padding:0_6px] [&_legend]:[font-size:13px] [&_legend]:[font-weight:900] [&_p]:[margin:0_0_13px] [&_p]:[font-size:11px] max-[800px]:[padding:15px] full [.dish-editor-fields_&]:[grid-column:1/-1] [.profile-form_&]:[grid-column:1/-1] max-[800px]:[.profile-form_&]:[grid-column:auto] max-[650px]:[.dish-editor-fields_&]:[grid-column:auto] [.update-editor-grid_&]:[grid-column:1/-1] max-[800px]:[.update-editor-grid_&]:[grid-column:auto]">
          <legend>Restaurant-wide certification</legend>
          <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">
            Select only certifications that apply to the entire restaurant.
            Vegan, vegetarian, and allergen information stays on individual dishes.
          </p>
          <div className="restaurant-certification-fields max-[700px]:[grid-template-columns:1fr] [display:grid] [grid-template-columns:repeat(2,minmax(0,1fr))] [align-items:start] [gap:14px] [&_section]:[display:grid] [&_section]:[height:fit-content] [&_section]:[gap:10px] [&_section]:[padding:14px] [&_section]:[border:1px_solid_var(--line)] [&_section]:[border-radius:14px] [&_section]:[background:var(--surface)] [&_label]:[display:grid] [&_label]:[gap:6px] [&_label]:[font-size:11px] [&_label]:[font-weight:800] [&_label]:[color:var(--muted)] [&_.certification-check]:[display:flex] [&_.certification-check]:[align-items:center] [&_.certification-check]:[gap:8px] [&_.certification-check_input]:[width:18px] [&_.certification-check_input]:[height:18px]">
            <section>
              <label>
                <span>Kosher status</span>
                <CustomDropdown
                  ariaLabel="Kosher status"
                  value={foodCertificationDetails.kosher.status}
                  options={[
                    { value: "NOT_KOSHER", label: "Not certified kosher" },
                    { value: "CERTIFIED", label: "Kosher certified" },
                  ]}
                  onChange={(status) =>
                    setFoodCertificationDetails((current) => ({
                      ...current,
                      kosher: {
                        ...current.kosher,
                        status: status as "NOT_KOSHER" | "CERTIFIED",
                      },
                    }))
                  }
                />
              </label>
              {foodCertificationDetails.kosher.status === "CERTIFIED" && <>
                <label>
                  <span>Standard</span>
                  <CustomDropdown
                    ariaLabel="Kosher certification standard"
                    value={foodCertificationDetails.kosher.standard ?? "REGULAR"}
                    options={[
                      { value: "REGULAR", label: "Regular" },
                      { value: "MEHADRIN", label: "Mehadrin" },
                      { value: "OTHER", label: "Other" },
                    ]}
                    onChange={(standard) =>
                      setFoodCertificationDetails((current) => ({
                        ...current,
                        kosher: {
                          ...current.kosher,
                          standard: standard as "REGULAR" | "MEHADRIN" | "OTHER",
                        },
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Restaurant type</span>
                  <CustomDropdown
                    ariaLabel="Kosher restaurant type"
                    value={foodCertificationDetails.kosher.restaurantType ?? ""}
                    options={[
                      { value: "", label: "Not specified" },
                      { value: "MEAT", label: "Meat" },
                      { value: "DAIRY", label: "Dairy" },
                      { value: "PAREVE", label: "Pareve" },
                    ]}
                    onChange={(restaurantType) =>
                      setFoodCertificationDetails((current) => ({
                        ...current,
                        kosher: {
                          ...current.kosher,
                          restaurantType: (restaurantType || null) as
                            | "MEAT"
                            | "DAIRY"
                            | "PAREVE"
                            | null,
                        },
                      }))
                    }
                  />
                </label>
                <label>Certification authority<input value={foodCertificationDetails.kosher.authority ?? ""} onChange={(event) => setFoodCertificationDetails((current) => ({ ...current, kosher: { ...current.kosher, authority: event.target.value } }))} placeholder="Authority name" /></label>
                <label>Certificate URL<input type="url" value={foodCertificationDetails.kosher.certificateUrl ?? ""} onChange={(event) => setFoodCertificationDetails((current) => ({ ...current, kosher: { ...current.kosher, certificateUrl: event.target.value } }))} placeholder="https://…" /></label>
                <label>Certificate expires<input type="date" value={foodCertificationDetails.kosher.expiresAt?.slice(0, 10) ?? ""} onChange={(event) => setFoodCertificationDetails((current) => ({ ...current, kosher: { ...current.kosher, expiresAt: event.target.value || null } }))} /></label>
                <label className="certification-check"><input type="checkbox" checked={Boolean(foodCertificationDetails.kosher.glattMeat)} onChange={(event) => setFoodCertificationDetails((current) => ({ ...current, kosher: { ...current.kosher, glattMeat: event.target.checked } }))} /><span>Glatt meat</span></label>
              </>}
            </section>
            <section>
              <label>
                <span>Halal status</span>
                <CustomDropdown
                  ariaLabel="Halal status"
                  value={foodCertificationDetails.halal.status}
                  options={[
                    { value: "NOT_HALAL", label: "Not declared halal" },
                    { value: "OPTIONS", label: "Halal options available" },
                    { value: "HALAL_MEAT", label: "Halal meat used" },
                    { value: "CERTIFIED", label: "Halal certified" },
                  ]}
                  onChange={(status) =>
                    setFoodCertificationDetails((current) => ({
                      ...current,
                      halal: {
                        ...current.halal,
                        status: status as RestaurantFoodCertificationDetails["halal"]["status"],
                      },
                    }))
                  }
                />
              </label>
              {foodCertificationDetails.halal.status !== "NOT_HALAL" && <>
                <label>Certification authority<input value={foodCertificationDetails.halal.authority ?? ""} onChange={(event) => setFoodCertificationDetails((current) => ({ ...current, halal: { ...current.halal, authority: event.target.value } }))} placeholder="Authority name" /></label>
                <label>Certificate URL<input type="url" value={foodCertificationDetails.halal.certificateUrl ?? ""} onChange={(event) => setFoodCertificationDetails((current) => ({ ...current, halal: { ...current.halal, certificateUrl: event.target.value } }))} placeholder="https://…" /></label>
                <label>Certificate expires<input type="date" value={foodCertificationDetails.halal.expiresAt?.slice(0, 10) ?? ""} onChange={(event) => setFoodCertificationDetails((current) => ({ ...current, halal: { ...current.halal, expiresAt: event.target.value || null } }))} /></label>
              </>}
            </section>
          </div>
        </fieldset>
        <OpeningHoursEditor
          value={openingHours}
          menus={menus}
          onChange={setOpeningHours}
        />
        <label className="full [.dish-editor-fields_&]:[grid-column:1/-1] [.profile-form_&]:[grid-column:1/-1] max-[800px]:[.profile-form_&]:[grid-column:auto] max-[650px]:[.dish-editor-fields_&]:[grid-column:auto] [.update-editor-grid_&]:[grid-column:1/-1] max-[800px]:[.update-editor-grid_&]:[grid-column:auto]">
          Restaurant address
          <input
            value={restaurant.address || "No verified address"}
            readOnly
            aria-readonly="true"
          />
          <small>
            The address is locked after ownership is approved. City and map
            location are managed from this verified address.
          </small>
        </label>
        <section className="address-change-box [padding:0] [border:1px_solid_var(--line)] [border-radius:16px] [overflow:hidden] [background:var(--surface-subtle)] full [.dish-editor-fields_&]:[grid-column:1/-1] [.profile-form_&]:[grid-column:1/-1] max-[800px]:[.profile-form_&]:[grid-column:auto] max-[650px]:[.dish-editor-fields_&]:[grid-column:auto] [.update-editor-grid_&]:[grid-column:1/-1] max-[800px]:[.update-editor-grid_&]:[grid-column:auto]">
          {restaurant.pendingAddressChangeRequest ? (
            <div className="address-request-pending [display:flex] [align-items:center] [justify-content:space-between] [gap:18px] [padding:18px] [&_strong]:[margin:0] [&_p]:[margin:0] [&_p]:[margin-top:4px] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px] [border-color:#f3bf45] [background:#fff8df] [&>span]:[padding:6px_10px] [&>span]:[border-radius:999px] [&>span]:[background:#ffe79b] [&>span]:[color:#735100] [&>span]:[font-size:11px] [&>span]:[font-weight:900] [border-color:var(--warning-border)] [background:color-mix(in_srgb,var(--warning-soft)_72%,var(--surface))] [&>span]:[background:var(--warning-soft)] [&>span]:[color:var(--warning)] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column]">
              <div>
                <strong>Address change pending review</strong>
                <p>{restaurant.pendingAddressChangeRequest.proposedAddress}</p>
              </div>
              <span>Pending</span>
            </div>
          ) : requestOpen ? (
            <div className="address-request-form [display:grid] [gap:16px] [padding:20px] [&>div:first-child_strong]:[margin:0] [&>div:first-child_p]:[margin:0] [&>div:first-child_p]:[margin-top:4px] [&>div:first-child_p]:[color:var(--muted)] [&>div:first-child_p]:[font-size:12px] [&_label]:[display:grid] [&_label]:[gap:7px]">
              <div>
                <strong>Request an address change</strong>
                <p>An admin will verify the new location before it goes live.</p>
              </div>
              <label>
                Proposed address
                <input
                  value={proposedAddress}
                  onChange={(event) => setProposedAddress(event.target.value)}
                  placeholder="Enter the complete street address"
                />
              </label>
              <label>
                Reason for the change <span className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">(optional)</span>
                <textarea
                  value={addressReason}
                  onChange={(event) => setAddressReason(event.target.value)}
                  placeholder="For example: we moved to a new location"
                  rows={3}
                />
              </label>
              <div className="address-request-actions [display:flex] [justify-content:flex-end] [gap:9px] max-[600px]:[align-items:stretch] max-[600px]:[flex-direction:column] max-[600px]:[&_button]:[width:100%]">
                <button
                  type="button"
                  className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]"
                  onClick={() => setRequestOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary [.login-card_&]:[min-height:49px] [.login-card_&]:[margin-top:2px] [.login-card_&]:[background:var(--accent)] [.login-card_&]:[color:#faf9f6] [.login-card_&]:[box-shadow:0_10px_24px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.login-card_&]:[transition:background-color_0.16s_ease,_box-shadow_0.16s_ease,_transform_0.16s_ease] [.login-card_&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--accent)_88%,_#9c2e19)] [.login-card_&:hover:not(:disabled)]:[box-shadow:0_13px_28px_color-mix(in_srgb,_var(--accent)_31%,_transparent)] [.login-card_&:hover:not(:disabled)]:[transform:translateY(-1px)] [.login-card_&:active:not(:disabled)]:[transform:translateY(0)] [.login-card_&:disabled]:[cursor:not-allowed] [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--ink)] [color:#faf9f6] [&:hover]:[background:#333] [&:disabled]:[opacity:0.55] [.error-page-actions_&]:[background:var(--accent)] [.error-page-actions_&]:[color:#171717] [.error-page-actions_&]:[box-shadow:0_12px_30px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.error-page-actions_&:hover]:[background:color-mix(in_srgb,_var(--accent)_88%,_var(--ink))] [.error-page-actions_&:hover]:[transform:translateY(-1px)] [&.compact]:[padding:9px_13px] [&.compact]:[font-size:12px] [&.compact]:[white-space:nowrap] [.owner-support-form_&]:[width:100%] dark:[color:#171717] dark:[&:hover]:[background:color-mix(in_srgb,_var(--ink)_82%,_var(--accent))]"
                  disabled={!proposedAddress.trim() || requestingAddress}
                  onClick={() => void requestAddressChange()}
                >
                  {requestingAddress ? "Verifying…" : "Send request"}
                </button>
              </div>
            </div>
          ) : (
            <div className="address-change-locked [display:flex] [align-items:center] [justify-content:space-between] [gap:18px] [padding:18px] [&_strong]:[margin:0] [&_p]:[margin:0] [&_p]:[margin-top:4px] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column]">
              <div>
                <strong>Need to correct or change the address?</strong>
                <p>Send a verified change request to FindEat administration.</p>
              </div>
              <button
                type="button"
                className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]"
                onClick={() => setRequestOpen(true)}
              >
                Request change
              </button>
            </div>
          )}
        </section>
        <div className="restaurant-contact-fields [display:grid] [grid-template-columns:repeat(3,minmax(0,1fr))] [gap:20px] [&_input]:[min-height:48px] max-[700px]:[grid-template-columns:1fr] full [.dish-editor-fields_&]:[grid-column:1/-1] [.profile-form_&]:[grid-column:1/-1] max-[800px]:[.profile-form_&]:[grid-column:auto] max-[650px]:[.dish-editor-fields_&]:[grid-column:auto] [.update-editor-grid_&]:[grid-column:1/-1] max-[800px]:[.update-editor-grid_&]:[grid-column:auto]">
          <label>
            Phone <span className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">(optional)</span>
            <input
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
            />
          </label>
          <label>
            Website <span className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">(optional)</span>
            <input
              value={form.website}
              onChange={(event) =>
                setForm({ ...form, website: event.target.value })
              }
            />
          </label>
          <label>
            Instagram <span className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">(optional)</span>
            <input
              value={form.instagram}
              onChange={(event) =>
                setForm({ ...form, instagram: event.target.value })
              }
            />
          </label>
          <label>
            Ontopo reservation link <span className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">(optional)</span>
            <input
              type="url"
              inputMode="url"
              placeholder="https://ontopo.com/..."
              value={form.ontopoUrl}
              onChange={(event) =>
                setForm({ ...form, ontopoUrl: event.target.value })
              }
            />
          </label>
          <label>
            Tabit reservation link <span className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">(optional)</span>
            <input
              type="url"
              inputMode="url"
              placeholder="https://tabitisrael.co.il/..."
              value={form.tabitUrl}
              onChange={(event) =>
                setForm({ ...form, tabitUrl: event.target.value })
              }
            />
          </label>
        </div>
        <div className="form-footer [display:flex] [align-items:center] [justify-content:space-between] [margin-top:16px] max-[800px]:[gap:10px] max-[800px]:[flex-wrap:wrap] max-[600px]:[align-items:stretch] max-[600px]:[flex-direction:column] max-[600px]:[&_button]:[width:100%]">
          <span className={status === "Saved" ? "success" : "muted"}>
            {status}
          </span>
          <button className="primary [.login-card_&]:[min-height:49px] [.login-card_&]:[margin-top:2px] [.login-card_&]:[background:var(--accent)] [.login-card_&]:[color:#faf9f6] [.login-card_&]:[box-shadow:0_10px_24px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.login-card_&]:[transition:background-color_0.16s_ease,_box-shadow_0.16s_ease,_transform_0.16s_ease] [.login-card_&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--accent)_88%,_#9c2e19)] [.login-card_&:hover:not(:disabled)]:[box-shadow:0_13px_28px_color-mix(in_srgb,_var(--accent)_31%,_transparent)] [.login-card_&:hover:not(:disabled)]:[transform:translateY(-1px)] [.login-card_&:active:not(:disabled)]:[transform:translateY(0)] [.login-card_&:disabled]:[cursor:not-allowed] [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--ink)] [color:#faf9f6] [&:hover]:[background:#333] [&:disabled]:[opacity:0.55] [.error-page-actions_&]:[background:var(--accent)] [.error-page-actions_&]:[color:#171717] [.error-page-actions_&]:[box-shadow:0_12px_30px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.error-page-actions_&:hover]:[background:color-mix(in_srgb,_var(--accent)_88%,_var(--ink))] [.error-page-actions_&:hover]:[transform:translateY(-1px)] [&.compact]:[padding:9px_13px] [&.compact]:[font-size:12px] [&.compact]:[white-space:nowrap] [.owner-support-form_&]:[width:100%] dark:[color:#171717] dark:[&:hover]:[background:color-mix(in_srgb,_var(--ink)_82%,_var(--accent))]">
            Save changes
          </button>
        </div>
      </form>
      {cropRequest && (
        <ImageCropDialog
          file={cropRequest.file}
          kind={cropRequest.type}
          onCancel={() => setCropRequest(null)}
          onComplete={useCroppedImage}
        />
      )}
    </div>
  );
}
