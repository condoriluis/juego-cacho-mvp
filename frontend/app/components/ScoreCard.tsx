'use client'

import React from 'react'
import { Category, CategoryLabels, Player } from '../../lib/types'
import { calculateCategoryValue } from '../../lib/utils'
import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const CategoryInfo: Record<Category, string> = {
  [Category.ONES]: 'Suma de todos los dados con número 1',
  [Category.TWOS]: 'Suma de todos los dados con número 2',
  [Category.THREES]: 'Suma de todos los dados con número 3',
  [Category.FOURS]: 'Suma de todos los dados con número 4',
  [Category.FIVES]: 'Suma de todos los dados con número 5',
  [Category.SIXES]: 'Suma de todos los dados con número 6',
  [Category.ESCALERA]:
    'Secuencia 1-2-3-4-5 o 2-3-4-5-6 (ej: 1-2-3-4-5)',
  [Category.FULL]:
    'Tres dados iguales + un par (ej: 3-3-3-5-5)',
  [Category.POKER]:
    'Cuatro dados iguales (ej: 4-4-4-4-x)',
  [Category.GENERALA]:
    'Cinco dados iguales (ej: 5-5-5-5-5)',
  [Category.GENERALA_DOBLE]:
    'Generala + Generala (ej: 5-5-5-5-5 + 5-5-5-5-5)',
}

type ScoreCardProps = {
  players: Player[]
  currentPlayerId: string
  dice: number[]
  onSelectCategory: (category: Category) => void
  isMyTurn: boolean
}

export default function ScoreCard({
  players,
  currentPlayerId,
  dice,
  onSelectCategory,
  isMyTurn,
}: ScoreCardProps) {
  const currentPlayer =
    players.find((p) => p.id === currentPlayerId) || players[0]

  // No necesitamos referencias ni efectos para el sonido ya que se crea una nueva instancia cada vez

  const renderCategoryRow = (category: Category) => {
    const potentialScore = isMyTurn
      ? calculateCategoryValue(dice, category)
      : 0
    const isUsed = currentPlayer.scorecard[category] !== undefined

    // Función para manejar la selección de categoría
    const handleSelectCategory = (cat: Category) => {
      // Llamar a la función original - el sonido ahora se maneja a través de WebSockets
      onSelectCategory(cat);
    };

    return (
      <tr key={category} className={isUsed ? 'opacity-60' : ''}>
        <td className="py-3 px-4 border-b flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Info className="w-4 h-4 text-gray-500 cursor-pointer" />
            </PopoverTrigger>

            <PopoverContent className="max-w-xs text-sm flex flex-col items-center gap-2 bg-gray-800 dark:bg-neutral-600">
              <img 
                src={`/images/categories/${category}.png`} 
                alt={CategoryLabels[category]} 
                className="rounded-md shadow-sm"
              />
              <span className="text-gray-300 dark:text-gray-200">
                {CategoryInfo[category]}
              </span>
            </PopoverContent>
          </Popover>

          <span>{CategoryLabels[category]}</span>
        </td>

        {players.map((player) => (
          <td
            key={player.id}
            className={`py-2 px-4 border-b text-center ${
              player.id === currentPlayerId ? 'bg-blue-200 dark:bg-blue-500' : ''
            }`}
          >
            {player.scorecard[category] !== undefined
              ? player.scorecard[category]
              : '-'}
          </td>
        ))}

        <td className="py-2 px-4 border-b text-center">
          {isMyTurn && !isUsed ? (
            <button
              onClick={() => handleSelectCategory(category)}
              className="px-3 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {potentialScore}
            </button>
          ) : isMyTurn ? (
            '--'
          ) : (
            ''
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full dark:bg-neutral-900 whitespace-nowrap">
        <thead>
          <tr className="bg-gray-200 dark:bg-neutral-800">
            <th className="py-2 px-4 border-b text-left">Categoría</th>
            {players.map((player) => (
              <th
                key={player.id}
                className={`py-2 px-4 border-b text-center ${
                  player.disconnected ? 'text-gray-400' : ''
                }`}
              >
                {player.name}{' '}
                {player.disconnected ? '(Desconectado)' : ''}
              </th>
            ))}
            <th className="py-2 px-4 border-b text-center">Anotar</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(Category).map((category) =>
            renderCategoryRow(category)
          )}
          <tr className="bg-gray-200 font-bold dark:bg-neutral-800">
            <td className="py-2 px-4">TOTAL</td>
            {players.map((player) => (
              <td key={player.id} className="py-2 px-4 text-center">
                {player.score}
              </td>
            ))}
            <td className="py-2 px-4 rounded"></td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  )
}
