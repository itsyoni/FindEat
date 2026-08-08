import { TextInput } from "@/components/common";
import Text from "@/components/common/AppText";
import { View } from "react-native";

type Props = {
  label: string;
  value?: number;
  onChange: (value?: number) => void;
  error?: string;
};

export default function PriceInput({ label, value, onChange, error }: Props) {
  return (
    <View>
      <Text className="mb-3 font-bold text-black dark:text-white">{label}</Text>

      <TextInput
        className={`rounded-2xl border bg-white px-4 py-4 text-base text-black dark:bg-black dark:text-white ${
          error
            ? "border-red-500 dark:border-red-500"
            : "border-gray-200 dark:border-gray-700"
        }`}
        placeholder="₪0"
        keyboardType="decimal-pad"
        value={value != null ? String(value) : ""}
        onChangeText={(text) => {
          const clean = text.replace(/[^\d.]/g, "");

          if (!clean) {
            onChange(undefined);
            return;
          }

          const number = Number(clean);

          if (!Number.isNaN(number)) {
            onChange(number);
          }
        }}
      />
      {error ? <Text className="mt-2 text-sm text-red-500">{error}</Text> : null}
    </View>
  );
}
