import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-600 text-center bg-white bg-opacity-30 backdrop-blur-lg rounded-xl shadow-lg">
          Something went wrong: {this.state.error?.message || 'Unknown error'}. Please try again.
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;