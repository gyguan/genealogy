import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class RuntimeErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || '页面渲染异常' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Runtime render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="runtime-status-panel">
        <h3>当前页面加载失败</h3>
        <p>{this.state.message || '页面渲染异常，请刷新或切换菜单后重试。'}</p>
        <button onClick={() => this.setState({ hasError: false, message: '' })}>重新加载当前页面</button>
      </div>
    );
  }
}
