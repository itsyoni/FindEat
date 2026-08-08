import Text from "@/components/common/AppText";
import { TouchableOpacity, View } from "react-native";

type Props = {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  error?: string;
};

const ratings = Array.from({ length: 10 }, (_, i) => i + 1);

export default function RatingPicker({ label, value, onChange, error }: Props) {
  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-bold text-black dark:text-white">{label}</Text>

        <Text className="font-bold text-black dark:text-white">
          {value ? `${value}/10` : "—"}
        </Text>
      </View>

      <View className="flex-row justify-between">
        {ratings.map((rating) => {
          const isActive = value != null && rating <= value;

          return (
            <TouchableOpacity
              key={rating}
              accessibilityRole="button"
              accessibilityState={{ selected: value === rating }}
              style={{ width: "9.2%" }}
              className={`h-10 items-center justify-center rounded-lg ${
                isActive ? "bg-black dark:bg-white" : "bg-gray-100 dark:bg-gray-800"
              }`}
              onPress={() => onChange(value === rating ? undefined : rating)}
            >
              <Text
                className={`text-xs font-bold ${
                  isActive ? "text-white dark:text-black" : "text-black dark:text-white"
                }`}
              >
                {rating}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text className="mt-2 text-sm text-red-500">{error}</Text> : null}
    </View>
  );
}
