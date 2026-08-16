import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import FeatureFlagsProvider from './context/FeatureFlagsProvider'
import { createDefaultFeatureFlagStrategy } from './services/featureFlags'
import './styles.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <FeatureFlagsProvider strategy={createDefaultFeatureFlagStrategy()}>
      <App />
    </FeatureFlagsProvider>
  </React.StrictMode>,
)
