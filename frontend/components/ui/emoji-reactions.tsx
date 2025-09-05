'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Reaction = {
  id: string
  emoji: string
  name?: string
  playerId: string
  playerName: string
  timestamp: number
}

type EmojiReactionsProps = {
  reactions: Reaction[]
}

export function EmojiReactions({ reactions }: EmojiReactionsProps) {

  const [visibleReactions, setVisibleReactions] = useState<Reaction[]>([])
  
  useEffect(() => {
    const now = Date.now()
    const recent = reactions.filter(r => now - r.timestamp < 5000)
    setVisibleReactions(recent)
    
    if (reactions.length > 0) {
      const latestReaction = reactions[reactions.length - 1]
      const lastReactionIdStored = localStorage.getItem('lastReactionId')
      
      if (latestReaction.id !== lastReactionIdStored) {
        localStorage.setItem('lastReactionId', latestReaction.id)
        
        try {
          const soundPath = latestReaction.name 
            ? `/sounds/emoji/${latestReaction.name}.mp3`
            : `/sounds/emoji/${latestReaction.emoji}.mp3`
          
          const sound = new Audio(soundPath)
          sound.play().catch(err => {
            console.error(`Error al reproducir sonido para emoji ${latestReaction.name || latestReaction.emoji}:`, err)
          })
        } catch (err) {
          console.error('Error al crear objeto de audio:', err)
        }
      }
    }
    
    const interval = setInterval(() => {
      const now = Date.now()
      setVisibleReactions(prev => prev.filter(r => now - r.timestamp < 5000))
    }, 1000)
    
    return () => clearInterval(interval)
  }, [reactions])
  
  return (
    <>
      
      <div className="fixed bottom-4 right-14 z-50 flex items-center space-y-2 space-x-2">
        <AnimatePresence>
          {visibleReactions.map((reaction) => (
            <motion.div
              key={reaction.id}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md px-3 py-2 flex items-center space-x-2"
            >
              <span className="text-2xl">{reaction.emoji}</span>
              <span className="text-sm text-gray-600 dark:text-gray-300">{reaction.playerName} </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">ahora</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}