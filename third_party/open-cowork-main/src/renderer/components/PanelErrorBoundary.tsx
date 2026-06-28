import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface PanelErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  name: string;
  resetKey?: string;
}

interface PanelErrorBoundaryState {
  hasError: boolean;
  prevResetKey?: string;
}

/**
 * Generic error boundary that catches render errors in a panel/section
 * and replaces it with a static fallback to prevent full-page white-screen.
 * Resets automatically when `resetKey` changes (e.g. on navigation).
 */
export class PanelErrorBoundary extends Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
  state: PanelErrorBoundaryState = { hasError: false, prevResetKey: undefined };

  static getDerivedStateFromError(): Partial<PanelErrorBoundaryState> {
    return { hasError: true };
  }

  static getDerivedStateFromProps(
    props: PanelErrorBoundaryProps,
    state: PanelErrorBoundaryState,
  ): Partial<PanelErrorBoundaryState> | null {
    if (props.resetKey !== state.prevResetKey) {
      return { hasError: false, prevResetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.name}] Render error caught by boundary:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
