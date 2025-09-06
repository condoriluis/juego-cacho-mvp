'use client'

import React, { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Smile } from 'lucide-react'

// Lista de emojis disponibles para reacciones
const EMOJIS = [ 
  { icon: '😂', name: 'risa' },
  { icon: '🤔', name: 'pensando' },
  { icon: '😮', name: 'sorpresa' },
  { icon: '😔', name: 'tristeza' }, 
  { icon: '😭', name: 'llanto' },
  { icon: '😡', name: 'enojo' }, 
  { icon: '👍', name: 'like' },  
  { icon: '👏', name: 'aplausos' }, 
  { icon: '🙌', name: 'bendicion' },
  { icon: '🤬', name: 'enojado' },
  { icon: '🎉', name: 'celebrar' }, 
  { icon: '🎲', name: 'dados' },
]

type EmojiPickerProps = {
  onEmojiSelect: (emoji: string, name: string) => void
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  
  const handleEmojiClick = (emoji: { icon: string, name: string }) => {
    onEmojiSelect(emoji.icon, emoji.name)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className="p-2 rounded-full dark:hover:bg-gray-700 transition-colors"
          aria-label="Enviar reacción"
        >
          <Smile className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 dark:bg-neutral-900">
        <div className="grid grid-cols-6 gap-2">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji.icon}
              onClick={() => handleEmojiClick(emoji)}
              className="text-2xl p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label={`Emoji ${emoji.name}`}
            >
              {emoji.icon}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}