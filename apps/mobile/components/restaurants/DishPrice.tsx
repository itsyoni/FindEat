import type { Dish } from "@findeat/types";
import { CheersIcon } from "phosphor-react-native";
import { View } from "react-native";
import Text from "../common/AppText";

function formatPrice(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export default function DishPrice({
  dish,
  large = false,
}: {
  dish: Pick<
    Dish,
    "price" | "discountedPrice" | "activeDiscountPercent"
  >;
  large?: boolean;
}) {
  if (dish.price == null) return null;
  const discounted =
    dish.discountedPrice != null && dish.discountedPrice < dish.price;

  if (!discounted) {
    return (
      <View className={`rounded-full bg-brand-soft dark:bg-orange-950/50 ${large ? "px-4 py-2" : "px-2.5 py-1"}`}>
        <Text className={`font-bold text-brand dark:text-orange-300 ${large ? "text-xl" : ""}`}>
          ₪{formatPrice(dish.price)}
        </Text>
      </View>
    );
  }

  return (
    <View className={`items-end rounded-xl bg-[#FFF2C7] dark:bg-[#3B2C0A] ${large ? "px-4 py-2" : "px-2.5 py-1"}`}>
      <View className="flex-row items-center gap-1">
        <CheersIcon size={large ? 15 : 12} color="#C18400" weight="fill" />
        <Text className={`font-extrabold text-[#8B5E00] dark:text-[#FFD56A] ${large ? "text-xl" : ""}`}>
          ₪{formatPrice(dish.discountedPrice!)}
        </Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        <Text
          className="text-[10px] text-[#8A7652] dark:text-[#CDBB8C]"
          style={{ textDecorationLine: "line-through" }}
        >
          ₪{formatPrice(dish.price)}
        </Text>
        {dish.activeDiscountPercent ? (
          <Text className="text-[10px] font-bold text-[#A66B00] dark:text-[#FFD56A]">
            -{dish.activeDiscountPercent}%
          </Text>
        ) : null}
      </View>
    </View>
  );
}
