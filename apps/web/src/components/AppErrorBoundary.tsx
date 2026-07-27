import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorPage } from "./ErrorPage";
import { navigateTo } from "../lib/navigation";

type AppErrorBoundaryState = {
  failed: boolean;
};

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("FindEat web app crashed", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <ErrorPage
          status={500}
          primaryAction={{
            label: "Reload page",
            onClick: () => window.location.reload(),
          }}
          secondaryAction={{
            label: "Go home",
            onClick: () => {
              this.setState({ failed: false });
              navigateTo("/home");
            },
          }}
        />
      );
    }

    return this.props.children;
  }
}
