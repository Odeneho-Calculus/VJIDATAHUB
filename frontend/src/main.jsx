import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '14px 16px',
          fontWeight: '700',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.18)',
        },
        success: {
          style: {
            background: '#166534',
            color: '#ffffff',
          },
        },
        error: {
          style: {
            background: '#b91c1c',
            color: '#ffffff',
          },
        },
      }}
    />
  </>
)
