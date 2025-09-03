'use client'

import React, { useState } from 'react'
import { io } from 'socket.io-client'
import { useRouter } from 'next/navigation'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { UserRoundPen, PlusCircle, LogIn, Hash } from 'lucide-react';

let socket: any = null
function getSocket() {
  if (!socket)
    socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    })
  return socket
}

function generateRandomName() {
  const adjectives = [
    'Implacable', 'Legendario', 'Épico', 'Invencible', 'Letal', 
    'Rudo', 'Ágil', 'Audaz', 'Guerrero', 'Poderoso'
  ];
  
  // 20 luchadores populares de WWE
  const wrestlers = [
    'The Rock',
    'John Cena',
    'The Undertaker',
    'Stone Cold Steve Austin',
    'Triple H',
    'Hulk Hogan',
    'Randy Orton',
    'Edge',
    'Roman Reigns',
    'Brock Lesnar',
    'Rey Mysterio',
    'Kane',
    'Batista',
    'Shawn Michaels',
    'Seth Rollins',
    'AJ Styles',
    'CM Punk',
    'Big Show',
    'Chris Jericho',
    'Sheamus'
  ];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const wrestler = wrestlers[Math.floor(Math.random() * wrestlers.length)];
  
  return `${adj} ${wrestler}`;
}

export default function Home() {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [code, setCode] = useState('')
  const router = useRouter()

  const createRoom = () => {
    if (!name.trim()) return toast.error('Por favor ingresa tu nombre')

    setCreating(true)
    const s = getSocket()
    s.emit('room:create', { hostName: name }, (res: any) => {
      setCreating(false)
      if (res?.ok) {
        router.push('/room/' + res.roomCode + '?name=' + encodeURIComponent(name))
      } else {
        toast('Error creando sala: ' + (res?.error || 'Desconocido'))
      }
    })
  }

  const joinByCode = () => {
    if (!name.trim()) return toast.error('Por favor ingresa tu nombre')
    if (!code.trim()) return toast.error('Por favor ingresa el código de la sala')

    setJoining(true)
    router.push('/room/' + code.trim() + '?name=' + encodeURIComponent(name))
  }

  const handleRandomName = () => {
    setName(generateRandomName())
    toast.success('¡Nombre aleatorio generado!')
  }

  return (
    <div className="min-h-screen flex items-center justify-center from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white dark:bg-neutral-900 shadow-xl rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-800 dark:text-gray-200">🎲 Cacho Online</h1>
          <p className="text-gray-600 mt-2 dark:text-neutral-400">El clásico juego de dados</p>
        </div>

        <div className="space-y-6">

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-400 mb-1">Tu nombre</label>
            <div className="flex">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingresa tu nombre"
                maxLength={20}
              />
              <button
                onClick={handleRandomName}
                className="px-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 border-l-0 rounded-r-md flex items-center justify-center transition-colors"
                title="Generar nombre aleatorio"
              >
                <UserRoundPen className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          <button
            onClick={createRoom}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            {creating ? 'Creando...' : 'Crear nueva sala'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500 dark:bg-neutral-900 dark:text-neutral-400">o únete a una sala</span>
            </div>
          </div>

          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Código de sala"
                maxLength={6}
              />
            </div>
            <button
              onClick={joinByCode}
              disabled={joining}
              className="px-5 py-2 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              {joining ? '...' : 'Unirse'}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-neutral-400">
          <p>👥 Máximo 6 jugadores por sala</p>
          <p className="mt-1">Crea una sala y comparte el código con tus amigos</p>
        </div>
        <div className="mt-2 text-center text-xs text-gray-400 dark:text-neutral-500 italic">
          © {new Date().getFullYear()} Desarrollado por Luis Alberto
        </div>
      </div>
      <Toaster />
    </div>
  )
}
