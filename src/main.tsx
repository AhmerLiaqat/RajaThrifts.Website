import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import '@/styles/index.css'

const container = document.getElementById('root')!

/** Hides the loading splash from index.html once React has painted the app. */
function Booted() {
  useEffect(() => {
    container.classList.remove('booting')
    try {
      sessionStorage.removeItem('rt-boot-reload')
    } catch {
      /* storage blocked: nothing to clear */
    }
  }, [])
  return null
}

createRoot(container).render(
  <StrictMode>
    <Booted />
    <App />
  </StrictMode>,
)
