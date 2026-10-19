import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

class ErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  override state = { message: null as string | null }

  static getDerivedStateFromError(error: Error): { message: string } {
    return { message: error.message }
  }

  override render(): ReactNode {
    if (this.state.message) {
      return (
        <div className="shell">
          <div className="panel">
            <div className="boot">
              <p>The overlay hit an error: {this.state.message}</p>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}
