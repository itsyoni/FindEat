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
      className={`dish-tag-group ${tone}`}
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
      <div className="dish-tag-options">
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
    <section className={`dish-food-tags ${compact ? "compact" : ""}`}>
      <div className="dish-food-tags-heading">
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
      <p className="dish-food-disclaimer">
        This information helps guests, but it does not replace direct allergen
        confirmation with your staff.
      </p>
    </section>
  );
}
