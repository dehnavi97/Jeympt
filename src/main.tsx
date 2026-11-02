import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'
import { SettingsProvider } from './lib/settings'
import { ConfirmProvider } from './components/common/ConfirmProvider'
import { DialogsProvider } from './components/dialogs/DialogsProvider'
import { TooltipProvider } from './components/ui/tooltip'
import { Toaster } from './components/ui/sonner'
import { requestPersistentStorage } from './lib/db'

void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SettingsProvider>
          <TooltipProvider delay={300}>
            <ConfirmProvider>
              <DialogsProvider>
                <App />
                <Toaster richColors={false} closeButton />
              </DialogsProvider>
            </ConfirmProvider>
          </TooltipProvider>
        </SettingsProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
