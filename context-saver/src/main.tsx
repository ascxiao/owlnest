import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import CaptureApp from "./CaptureApp";
import RecallApp from "./RecallApp";

const mode = (window as any).__MODE__;

let RootComponent = App;
if (mode === "capture") {
  RootComponent = CaptureApp;
} else if (mode === "recall") {
  RootComponent = RecallApp;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "red", backgroundColor: "white", width: "100%", height: "100%", overflow: "auto" }}>
          <h2>Something went wrong in React.</h2>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <ErrorBoundary>
    <RootComponent />
  </ErrorBoundary>
);
