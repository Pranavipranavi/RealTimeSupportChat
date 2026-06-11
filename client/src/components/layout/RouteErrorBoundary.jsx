import { Component } from "react";
import { Button } from "../ui/Button.jsx";

export class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[route-error-boundary] Route failed to render", {
      resetKey: this.props.resetKey,
      error,
      componentStack: info.componentStack
    });
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-[calc(100vh-6.5rem)] place-items-center rounded-lg border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-500/20 dark:bg-rose-500/10">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-rose-600 dark:text-rose-300">Page failed to render</p>
          <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">This page hit a recoverable UI error.</h2>
          <p className="mt-2 max-w-lg text-sm text-slate-600 dark:text-slate-300">{this.state.error.message}</p>
          <Button className="mt-4" variant="secondary" onClick={() => window.location.reload()}>Reload page</Button>
        </div>
      </div>
    );
  }
}
