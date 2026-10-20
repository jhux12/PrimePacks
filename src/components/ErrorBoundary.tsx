import { Component, type ErrorInfo, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    console.error("PrimePacks encountered a rendering error.");
  }
  render() {
    return this.state.failed ? (
      <main
        style={{
          padding: 40,
          fontFamily: "system-ui",
          background: "#080b11",
          color: "#f4f1e9",
          minHeight: "100vh",
        }}
      >
        <h1>We couldn’t load this view.</h1>
        <p>
          Your purchases are stored securely in your account. Refresh to try
          again.
        </p>
        <button onClick={() => location.reload()}>Reload PrimePacks</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
