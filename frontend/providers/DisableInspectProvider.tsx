'use client'

import { useDisableInspect } from "@/hooks/useDisableInspect"

export function DisableInspectProvider({ children }: { children: React.ReactNode }) {
  useDisableInspect()
  return <>{children}</>
}
