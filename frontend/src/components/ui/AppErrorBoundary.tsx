import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application rendering failed:', error, info.componentStack);
  }
  private recover = () => { window.location.reload(); };
  render() {
    if (this.state.hasError) return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-4">
        <section role="alert" className="card max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold text-ink-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-500">The page could not be displayed. Reload to try again.</p>
          <button type="button" className="btn btn-primary mt-5" onClick={this.recover}>Reload page</button>
        </section>
      </main>
    );
    return this.props.children;
  }
}
