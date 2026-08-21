import {
  ALLERGEN_OPTIONS,
  CUISINE_OPTIONS,
  DISH_DIETARY_OPTIONS,
  DISH_TAG_OPTIONS,
  DISH_INGREDIENT_FLAG_OPTIONS,
} from "@findeat/types";
import { foodTagLabel } from "../lib/foodTags";
import { useState } from "react";

type Props = {
  allergens: string[];
  dietaryTags: string[];
  cuisineTags: string[];
  dishTags: string[];
  ingredientFlags: string[];
  onAllergensChange: (tags: string[]) => void;
  onDietaryTagsChange: (tags: string[]) => void;
  onCuisineTagsChange: (tags: string[]) => void;
  onDishTagsChange: (tags: string[]) => void;
  onIngredientFlagsChange: (tags: string[]) => void;
  compact?: boolean;
};

function toggle(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function TagGroup({
  title,
  hint,
  values,
  options,
  tone,
  onChange,
}: {
  title: string;
  hint: string;
  values: string[];
  options: readonly string[];
  tone: "warning" | "positive" | "cuisine";
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(tone === "warning");

  return (
    <details
      className={`dish-tag-group [border-top:1px_solid_var(--line)] [&_summary]:[display:flex] [&_summary]:[align-items:center] [&_summary]:[justify-content:space-between] [&_summary]:[gap:14px] [&_summary]:[padding:13px_16px] [&_summary]:[cursor:pointer] [&_summary]:[list-style:none] [&_summary::-webkit-details-marker]:[display:none] [&_summary_span]:[min-width:0] [&_summary_strong]:[display:block] [&_summary_small]:[display:block] [&_summary_strong]:[font-size:12px] [&_summary_small]:[margin-top:3px] [&_summary_small]:[color:var(--muted)] [&_summary_small]:[font-size:10px] [&_summary_small]:[font-weight:500] [&_summary_b]:[min-width:34px] [&_summary_b]:[padding:4px_7px] [&_summary_b]:[border-radius:999px] [&_summary_b]:[background:#eeeae4] [&_summary_b]:[color:#6b625a] [&_summary_b]:[font-size:9px] [&_summary_b]:[text-align:center] [&.warning_.dish-tag-options_button.selected]:[border-color:#fecaca] [&.warning_.dish-tag-options_button.selected]:[background:#fee2e2] [&.warning_.dish-tag-options_button.selected]:[color:#991b1b] [&.positive_.dish-tag-options_button.selected]:[border-color:#bbf7d0] [&.positive_.dish-tag-options_button.selected]:[background:#dcfce7] [&.positive_.dish-tag-options_button.selected]:[color:#166534] [&.cuisine_.dish-tag-options_button.selected]:[border-color:#fde68a] [&.cuisine_.dish-tag-options_button.selected]:[background:#fef3c7] [&.cuisine_.dish-tag-options_button.selected]:[color:#92400e] [&_summary_b]:[background:var(--neutral-chip)] [&_summary_b]:[color:var(--neutral-chip-text)] dark:[&.warning_.dish-tag-options_button.selected]:[border-color:#683a36] dark:[&.warning_.dish-tag-options_button.selected]:[background:#482723] dark:[&.warning_.dish-tag-options_button.selected]:[color:#ffaaa0] dark:[&.positive_.dish-tag-options_button.selected]:[border-color:#285d43] dark:[&.positive_.dish-tag-options_button.selected]:[background:#193b2b] dark:[&.positive_.dish-tag-options_button.selected]:[color:#82dda9] dark:[&.cuisine_.dish-tag-options_button.selected]:[border-color:#625026] dark:[&.cuisine_.dish-tag-options_button.selected]:[background:#3d321b] dark:[&.cuisine_.dish-tag-options_button.selected]:[color:#f2cc76] ${tone}`}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{hint}</small>
        </span>
        <b>{values.length || "None"}</b>
      </summary>
      <div className="dish-tag-options [display:flex] [flex-wrap:wrap] [gap:7px] [padding:0_16px_15px] [&_button]:[padding:7px_10px] [&_button]:[border:1px_solid_var(--line)] [&_button]:[border-radius:999px] [&_button]:[background:var(--surface)] [&_button]:[color:#645e58] [&_button]:[font-size:10px] [&_button]:[font-weight:800] dark:[&_button]:[color:var(--muted)]">
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              className={selected ? "selected" : ""}
              aria-pressed={selected}
              onClick={() => onChange(toggle(values, option))}
            >
              {foodTagLabel(option)}
            </button>
          );
        })}
      </div>
    </details>
  );
}

export function DishFoodTags({
  allergens,
  dietaryTags,
  cuisineTags,
  dishTags,
  ingredientFlags,
  onAllergensChange,
  onDietaryTagsChange,
  onCuisineTagsChange,
  onDishTagsChange,
  onIngredientFlagsChange,
  compact = false,
}: Props) {
  return (
    <section className={`dish-food-tags [overflow:hidden] [border:1px_solid_var(--line)] [border-radius:16px] [background:var(--surface-subtle)] [&.compact_.dish-food-tags-heading]:[padding:13px_14px] [&.compact_.dish-tag-group_summary]:[padding:11px_14px] [&.compact_.dish-tag-options]:[padding-right:14px] [&.compact_.dish-tag-options]:[padding-left:14px] ${compact ? "compact" : ""}`}>
      <div className="dish-food-tags-heading [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:16px] [padding:15px_16px] [&_strong]:[display:block] [&_small]:[display:block] [&_small]:[margin-top:4px] [&_small]:[color:var(--muted)] [&_small]:[font-size:11px] [&_small]:[font-weight:500] [&>span]:[flex:0_0_auto] [&>span]:[padding:5px_8px] [&>span]:[border-radius:999px] [&>span]:[background:#fff2c7] [&>span]:[color:#815c00] [&>span]:[font-size:9px] [&>span]:[font-weight:900] [&>span]:[text-transform:uppercase] [&>span]:[background:var(--warning-soft)] [&>span]:[color:var(--warning)]">
        <div>
          <strong>Food information</strong>
          <small>Used to give diners personalized menu guidance.</small>
        </div>
        <span>Be precise</span>
      </div>
      <TagGroup
        title="Contains allergens"
        hint="Select ingredients present in this dish."
        values={allergens}
        options={ALLERGEN_OPTIONS}
        tone="warning"
        onChange={onAllergensChange}
      />
      <TagGroup
        title="Ingredient declarations"
        hint="Select everything this dish contains. These enforce diner exclusions and protect restaurant certifications."
        values={ingredientFlags}
        options={DISH_INGREDIENT_FLAG_OPTIONS}
        tone="warning"
        onChange={onIngredientFlagsChange}
      />
      <TagGroup
        title="Dietary options"
        hint="Only select claims this dish genuinely meets."
        values={dietaryTags}
        options={DISH_DIETARY_OPTIONS}
        tone="positive"
        onChange={onDietaryTagsChange}
      />
      <TagGroup
        title="Dish style"
        hint="These power dish discovery and reviewer profile collections."
        values={dishTags}
        options={DISH_TAG_OPTIONS}
        tone="cuisine"
        onChange={onDishTagsChange}
      />
      <TagGroup
        title="Cuisine"
        hint="Choose the cuisines that best describe this dish."
        values={cuisineTags}
        options={CUISINE_OPTIONS}
        tone="cuisine"
        onChange={onCuisineTagsChange}
      />
      <p className="dish-food-disclaimer [margin:0] [padding:12px_16px] [border-top:1px_solid_var(--line)] [color:var(--muted)] [font-size:9px] [line-height:1.45]">
        This information helps guests, but it does not replace direct allergen
        confirmation with your staff.
      </p>
    </section>
  );
}
