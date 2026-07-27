import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";

type Props = KeyboardAwareScrollViewProps;

export default function KeyboardAwareFormScrollView({
  bottomOffset = 24,
  keyboardShouldPersistTaps = "handled",
  keyboardDismissMode = "on-drag",
  ...props
}: Props) {
  return (
    <KeyboardAwareScrollView
      {...props}
      bottomOffset={bottomOffset}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
    />
  );
}
