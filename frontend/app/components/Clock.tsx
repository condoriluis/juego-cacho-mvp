'use client'

import { useEffect, useState } from 'react'

export default function Clock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="font-medium tracking-wide text-gray-700 dark:text-gray-300">
      {time.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })}
    </div>
  )
}