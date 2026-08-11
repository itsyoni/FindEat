import Text from "@/components/common/AppText";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { TouchableOpacity, View } from "react-native";

type Props = { children: ReactNode };
type State = { failed: boolean };

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Recovered from a screen rendering failure", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View className="flex-1 items-center justify-center bg-[#FBFAF8] px-8 dark:bg-[#0B0B0A]">
        <Text className="text-center text-2xl font-bold text-[#171716] dark:text-[#F7F6F2]">
          FindEat needs to reload this screen
        </Text>
        <TouchableOpacity
          className="mt-5 rounded-2xl bg-brand px-6 py-3.5"
          onPress={() => this.setState({ failed: false })}
        >
          <Text className="font-bold text-[#F7F6F2]">Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
