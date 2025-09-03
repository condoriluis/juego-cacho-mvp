import './globals.css'
import React from 'react'
import { RootProvider } from '@/providers'
import { DisableInspectProvider } from "@/providers/DisableInspectProvider"
import Image from 'next/image'
import { ThemeSwitch } from '@/components/ui/theme-switch'

export const metadata = {
  title: 'Cacho MVP',
  description: 'Juego de Cacho - MVP',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="relative min-h-screen bg-gray-100 dark:bg-gray-900 ">
        
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image 
            src="/images/cacho-bg.svg"
            alt="Fondo de juego de cacho"
            fill
            priority
            style={{ objectFit: 'cover' }}
          />
        </div>

        <RootProvider>
          <DisableInspectProvider>
            <div className="relative z-10">
              {children}
            </div>

            <div className="fixed bottom-4 left-4 z-50">
              <ThemeSwitch />
            </div>
          </DisableInspectProvider>
        </RootProvider>

      </body>
    </html>
  )
}
