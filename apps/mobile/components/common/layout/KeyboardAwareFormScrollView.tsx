import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
  type KeyboardAwareScrollViewRef,
} from "react-native-keyboard-controller";
import { forwardRef } from "react";

type Props = KeyboardAwareScrollViewProps;

const KeyboardAwareFormScrollView = forwardRef<
  KeyboardAwareScrollViewRef,
  Props
>(function KeyboardAwareFormScrollView(
  {
    bottomOffset = 24,
    keyboardShouldPersistTaps = "handled",
    keyboardDismissMode = "on-drag",
    ...props
  },
  ref,
) {
  return (
    <KeyboardAwareScrollView
      {...props}
      ref={ref}
      bottomOffset={bottomOffset}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
    />
  );
});

export default KeyboardAwareFormScrollView;
