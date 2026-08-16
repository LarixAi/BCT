import { Component } from "react";
import { Button } from "@/components/ui/button";

export default class DriverAppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[driver-app] render error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
          <h1 className="text-lg font-bold text-foreground">Something went wrong</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Reload the app to continue. Saved work already stored on this device will remain available.
          </p>
          <Button
            type="button"
            className="mt-6"
            onClick={() => {
              this.setState({ error: null });
              window.location.href = "/";
            }}
          >
            Reload app
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
