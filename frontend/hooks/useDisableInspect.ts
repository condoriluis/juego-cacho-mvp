import { useEffect } from "react"

export function useDisableInspect() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.ctrlKey &&
        (e.key === "u" || e.key === "U" || // Ctrl+U
         e.key === "s" || e.key === "S")   // Ctrl+S
      ) {
        e.preventDefault()
      }
      if (
        e.ctrlKey && e.shiftKey &&
        (e.key === "i" || e.key === "I" || // Ctrl+Shift+I
         e.key === "c" || e.key === "C" || // Ctrl+Shift+C
         e.key === "j" || e.key === "J")   // Ctrl+Shift+J
      ) {
        e.preventDefault()
      }
      if (e.key === "F12") {
        e.preventDefault()
      }
    }

    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])
}
