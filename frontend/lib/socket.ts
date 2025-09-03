// client socket helper (not used directly in this MVP; inline usage in pages)
import { io } from 'socket.io-client'

// Configuración de socket.io con opciones para evitar errores de conexión
export const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
})
