import { useState } from "react";
import type { FormEvent } from "react";
import {
  RESTAURANT_CATEGORY_OPTIONS,
  type ManagedRestaurant,
  type RestaurantOpeningHours,
} from "@findeat/types";
import { request, uploadImage } from "../lib/api";
import {
  OpeningHoursEditor,
  normalizeOpeningHours,
} from "../components/OpeningHoursEditor";
import { ImageCropDialog } from "../components/ImageCropDialog";

export function ProfilePage({
  restaurant,
  onSaved,
  setupMode = false,
}: {
  restaurant: ManagedRestaurant;
  onSaved: () => Promise<void>;
  setupMode?: boolean;
}) {
  const [form, setForm] = useState({
    name: restaurant.name,
    phone: restaurant.phone || "",
    website: restaurant.website || "",
    instagram: restaurant.instagram || "",
    bio: restaurant.bio || "",
  });
  const [categoryNames, setCategoryNames] = useState(restaurant.categories || []);
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
  const requiredSetupFields = restaurant.missingSetupFields.filter(
    (field) => field !== "city" && field !== "phone",
  );

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
    if (!logoPreview || !coverPreview || categoryNames.length === 0) {
      setStatus("Add a logo, cover photo, and at least one category.");
      return;
    }
    setStatus(logoFile || coverFile ? "Uploading photos…" : "Saving…");
    try {
      const [logoUrl, coverUrl] = await Promise.all([
        logoFile ? uploadImage(logoFile, 'restaurant') : Promise.resolve(undefined),
        coverFile ? uploadImage(coverFile, 'restaurant') : Promise.resolve(undefined),
      ]);
      await request(`/restaurants/me/${restaurant.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          categoryNames,
          openingHours,
          ...(logoUrl ? { logoUrl } : {}),
          ...(coverUrl ? { coverUrl } : {}),
        }),
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
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {setupMode ? "REQUIRED AFTER APPROVAL" : "PUBLIC INFORMATION"}
          </p>
          <h2>
            {setupMode ? `Finish setting up ${restaurant.name}` : "Restaurant profile"}
          </h2>
          <p className="muted">
            {setupMode
              ? "Your claim was approved. Complete the restaurant information before opening the management dashboard."
              : "Keep the information customers use to find and contact you accurate."}
          </p>
          {setupMode && requiredSetupFields.length > 0 && (
            <p className="setup-missing">
              Still needed: {requiredSetupFields.join(", ")}.
            </p>
          )}
        </div>
      </div>
      <form className="profile-form card" onSubmit={save}>
        <div className="restaurant-media-editor full">
          <div className="cover-editor">
            {coverPreview ? (
              <img src={coverPreview} alt="Restaurant cover preview" />
            ) : (
              <div className="media-placeholder">Add a cover photo</div>
            )}
            <label className="media-change-button">
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
          <div className="logo-editor">
            <div className="logo-preview">
              {logoPreview ? (
                <img src={logoPreview} alt="Restaurant logo preview" />
              ) : (
                <span>{restaurant.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <label className="media-change-button dark">
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
        <label className="full">
          Restaurant name
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
        </label>
        <label className="full">
          Restaurant description
          <textarea
            value={form.bio}
            onChange={(event) => setForm({ ...form, bio: event.target.value })}
            placeholder="Tell customers what makes this place special"
            rows={4}
            required
          />
        </label>
        <fieldset className="restaurant-categories full">
          <legend>Restaurant categories</legend>
          <p className="muted">Choose every category that describes this place.</p>
          <div className="restaurant-category-options">
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
        <OpeningHoursEditor value={openingHours} onChange={setOpeningHours} />
        <label className="full">
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
        <section className="address-change-box full">
          {restaurant.pendingAddressChangeRequest ? (
            <div className="address-request-pending">
              <div>
                <strong>Address change pending review</strong>
                <p>{restaurant.pendingAddressChangeRequest.proposedAddress}</p>
              </div>
              <span>Pending</span>
            </div>
          ) : requestOpen ? (
            <div className="address-request-form">
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
                Reason for the change <span className="muted">(optional)</span>
                <textarea
                  value={addressReason}
                  onChange={(event) => setAddressReason(event.target.value)}
                  placeholder="For example: we moved to a new location"
                  rows={3}
                />
              </label>
              <div className="address-request-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setRequestOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={!proposedAddress.trim() || requestingAddress}
                  onClick={() => void requestAddressChange()}
                >
                  {requestingAddress ? "Verifying…" : "Send request"}
                </button>
              </div>
            </div>
          ) : (
            <div className="address-change-locked">
              <div>
                <strong>Need to correct or change the address?</strong>
                <p>Send a verified change request to FindEat administration.</p>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => setRequestOpen(true)}
              >
                Request change
              </button>
            </div>
          )}
        </section>
        <label>
          Phone <span className="muted">(optional)</span>
          <input
            value={form.phone}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
          />
        </label>
        <label>
          Website
          <input
            value={form.website}
            onChange={(event) =>
              setForm({ ...form, website: event.target.value })
            }
          />
        </label>
        <label>
          Instagram
          <input
            value={form.instagram}
            onChange={(event) =>
              setForm({ ...form, instagram: event.target.value })
            }
          />
        </label>
        <div className="form-footer">
          <span className={status === "Saved" ? "success" : "muted"}>
            {status}
          </span>
          <button className="primary">
            {setupMode ? "Complete setup" : "Save changes"}
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
