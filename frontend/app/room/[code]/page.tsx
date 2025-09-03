'use client'
import React, { useEffect, useMemo, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { useParams, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Category, GameState, Player } from '../../../lib/types'
import { animateDiceRoll } from '../../../lib/utils'
import { AlertCircle, Play, Users, Dice2, Crown, Hash, User, Clock as ClockIcon, Bot } from 'lucide-react'
import { toast } from 'sonner'

// Importar componentes dinámicamente para evitar problemas con RSC
const Dice = dynamic(() => import('../../components/Dice'), { ssr: false })
const ScoreCard = dynamic(() => import('../../components/ScoreCard'), { ssr: false })
const Clock = dynamic(() => import('../../components/Clock'), { ssr: false })

let socket: any = null
function getSocket() {
  if (!socket) socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000', {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000
  })
  return socket
}

export default function RoomPage() {
  const params = useParams()
  const search = useSearchParams()
  const code = params.code as string
  const name = (search.get('name') || 'Jugador') as string

  const [joined, setJoined] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [log, setLog] = useState<string[]>([])
  const [dice, setDice] = useState<number[]>([1,1,1,1,1])
  const [visualDice, setVisualDice] = useState<number[]>([1,1,1,1,1])
  const [rollsLeft, setRollsLeft] = useState(3)
  const [held, setHeld] = useState<boolean[]>([false,false,false,false,false])
  const [isRolling, setIsRolling] = useState(false)
  const [gameState, setGameState] = useState<GameState>({
    dice: [1,1,1,1,1],
    rollsLeft: 3,
    currentTurn: 0,
    gameStarted: false,
    round: 1,
    maxRounds: 11
  })
  const [error, setError] = useState('')
  const [winner, setWinner] = useState<Player | null>(null)
  
  const s = useMemo(() => getSocket(), [])

  // Determinar si es mi turno
  const myPlayer = players.find(p => p.name === name)
  const currentPlayerIndex = gameState.currentTurn % players.length
  const currentPlayer = players[currentPlayerIndex] || null
  const isMyTurn = myPlayer && currentPlayer && myPlayer.id === currentPlayer.id
  
  // Añadir estado para almacenar el hostId
  const [hostId, setHostId] = useState('')
  const isHost = myPlayer && hostId && myPlayer.id === hostId

  useEffect(() => {
    s.emit('room:join', { code, playerName: name }, (res: any) => {
      if (!res?.ok) {
        setError(res?.error || 'Error al unir a la sala')
        return
      }
      setJoined(true)
      setError('')
    })

    s.on('room:update', (data: any) => {
      if (data.players) setPlayers(data.players)
      if (data.gameState) {
        setGameState(data.gameState)
        setDice(data.gameState.dice)
        setVisualDice(data.gameState.dice)
        setRollsLeft(data.gameState.rollsLeft)
      }
      if (data.hostId) setHostId(data.hostId)
    })
    
    s.on('room:log', (ev: any) => setLog(prev => [...(prev.slice(-40)), JSON.stringify(ev)]))
    
    s.on('game:rolled', async (payload: any) => {
      if (payload.dice) {
        // Reproducir el sonido de los dados aunque no sea el turno del jugador
        if (diceSound.current) {
          diceSound.current.currentTime = 0; // Reiniciar el sonido
          diceSound.current.play().catch(err => console.error('Error al reproducir sonido:', err));
        }
        
        setIsRolling(true)
        await animateDiceRoll(
          (diceValues) => setVisualDice(diceValues),
          payload.dice,
          800
        )
        setIsRolling(false)
        setDice(payload.dice)
      }
      if (payload.rollsLeft !== undefined) setRollsLeft(payload.rollsLeft)
    })
    
    s.on('game:started', () => {
      setHeld([false, false, false, false, false])
    })
    
    s.on('game:nextTurn', () => {
      setHeld([false, false, false, false, false])
    })
    
    s.on('game:ended', (data: any) => {
      if (data.winner) {
        setWinner(data.winner)
        // Reproducir sonido de victoria
        if (winnerSound.current) {
          winnerSound.current.currentTime = 0;
          winnerSound.current.play().catch(err => console.error('Error al reproducir sonido de victoria:', err));
        }
      }
    })
    
    s.on('game:scored', () => {
      // Reproducir sonido de anotación para todos los jugadores
      const sound = new Audio('/sounds/anotar.mp3');
      sound.play().catch(err => console.error('Error al reproducir sonido de anotación:', err));
    })
    
    s.on('player:joined', () => {
      // Reproducir sonido cuando un jugador se une a la sala
      const sound = new Audio('/sounds/unirse.mp3');
      sound.play().catch(err => console.error('Error al reproducir sonido de unirse:', err));
    })
    
    s.on('player:left', () => {
      // Reproducir sonido cuando un jugador sale de la sala
      const sound = new Audio('/sounds/salir.mp3');
      sound.play().catch(err => console.error('Error al reproducir sonido de salida:', err));
    })
    
    s.on('connect_error', (err: any) => {
      console.error('Connection error:', err)
      setError('Error de conexión: ' + err.message)
    })

    return () => {
      s.off('room:update')
      s.off('room:log')
      s.off('game:rolled')
      s.off('game:started')
      s.off('game:nextTurn')
      s.off('game:ended')
      s.off('game:scored')
      s.off('player:joined')
      s.off('player:left')
      s.off('connect_error')
    }
  }, [s, code, name])

  const toggleHold = (i: number) => {
    if (!isMyTurn || rollsLeft === 3 || isRolling) return
    const copy = [...held]
    copy[i] = !copy[i]
    setHeld(copy)
  }

  const diceSound = useRef<HTMLAudioElement | null>(null);
  const winnerSound = useRef<HTMLAudioElement | null>(null);

  // Inicializar los sonidos cuando el componente se monta
  useEffect(() => {
    diceSound.current = new Audio('/sounds/dice-roll.mp3');
    winnerSound.current = new Audio('/sounds/winner.mp3');
    return () => {
      if (diceSound.current) {
        diceSound.current.pause();
        diceSound.current = null;
      }
      if (winnerSound.current) {
        winnerSound.current.pause();
        winnerSound.current = null;
      }
    };
  }, []);

  const requestRoll = () => {
    if (!isMyTurn || rollsLeft <= 0 || isRolling) return
    
    // Reproducir el sonido de los dados
    if (diceSound.current) {
      diceSound.current.currentTime = 0; // Reiniciar el sonido
      diceSound.current.play().catch(err => console.error('Error al reproducir sonido:', err));
    }
    
    s.emit('game:roll', { roomCode: code, keep: held }, (res: any) => {
      if (!res.ok) {
        setError(res.error || 'Error al lanzar dados')
      }
    })
  }
  
  const startGame = () => {
    s.emit('game:start', { roomCode: code }, (res: any) => {
      if (!res.ok) {
        setError(res.error || 'Error al iniciar el juego')
      }
    })
  }
  
  const selectCategory = (category: Category) => {
    if (!isMyTurn) return
    
    s.emit('game:score', { roomCode: code, category }, (res: any) => {
      if (!res.ok) {
        setError(res.error || 'Error al anotar puntaje')
      }
    })
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-2">
      {/* Header */}
      <div className="border-1 bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-lg mb-4">
        <div className="flex flex-col gap-4">
          {/* Título centrado con corona */}
          <div className="text-center">
            <h2 className="text-2xl font-bold flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
              <Crown className="w-6 h-6" />
              Sala de {players[0]?.name || 'Jugador'}
            </h2>
          </div>

          {/* Información en dos filas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fila 1: Código y Reloj */}
            <div className="flex items-center justify-center md:justify-start gap-2 text-gray-600 dark:text-gray-300">
              <Hash className="w-5 h-5" />
              <span className="font-medium">Código de sala: {code}</span>
              <button 
                onClick={() => {
                  try {
                    // Crear un elemento de texto temporal
                    const textArea = document.createElement('textarea');
                    textArea.value = code;
                    
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                  
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                  
                    document.body.removeChild(textArea);
                    toast.success('Código copiado al portapapeles');
                  } catch (err) {
                    toast.error('No se pudo copiar el código');
                    console.error('Error al copiar:', err);
                  }
                }}
                className="ml-2 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Copiar código"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </button>
            </div>
            <div className="flex items-center justify-center md:justify-end gap-2 text-gray-600 dark:text-gray-300">
              <ClockIcon className="w-5 h-5" />
              <Clock />
            </div>

            {/* Fila 2: Jugador y Estado/Botones */}
            <div className="flex items-center justify-center md:justify-start gap-2 text-gray-600 dark:text-gray-300">
              <User className="w-5 h-5" />
              <span className="font-medium">Jugador: {name}</span>
            </div>
            <div className="flex items-center justify-center md:justify-end gap-3">
              <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                {gameState.gameStarted 
                  ? `Ronda ${gameState.round}/${gameState.maxRounds}` 
                  : 'Esperando inicio'}
              </p>
              <button
                onClick={() => {
                  // Emitir evento de salida antes de redirigir
                  s.emit('player:leave', { roomCode: code, playerName: name });
                  window.location.href = "/";
                }}
                className="px-3 py-1.5 bg-red-600 text-white font-medium rounded-lg shadow-md hover:bg-red-700 transition-all duration-200 hover:shadow-lg"
              >
                Salir
              </button>
            </div>
          </div>

          {/* Botón de inicio centrado */}
          {isHost && !gameState.gameStarted && players.length >= 2 && (
            <div className="flex justify-center mt-2">
              <button
                onClick={startGame}
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 hover:shadow-lg flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Iniciar juego
              </button>
            </div>
          )}
        </div>
            
        </div>
      
      {/* Players */}
      <div className="border-1 bg-white dark:bg-neutral-900 p-4 rounded-lg shadow mb-4">
        <h3 className="font-medium mb-3">Jugadores ({players.length}/6)</h3>
        <div className="flex flex-wrap gap-2">
          {players.map((p, idx) => (
            <div 
              key={`${p.id}-${idx}`} 
              className={`p-2 border rounded-lg ${currentPlayer && p.id === currentPlayer.id ? 'bg-blue-200 border-blue-400 dark:bg-blue-800' : 'bg-gray-200 border-gray-400 dark:bg-neutral-500'}
                ${p.disconnected ? 'opacity-50' : ''}`}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-gray-500 dark:text-neutral-300">Puntos: {p.score || 0}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Game area */}
      {gameState.gameStarted && !winner ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Dice area */}
          <div className="lg:col-span-1">
            <div className="border-1 bg-white dark:bg-neutral-900 p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Dados</h3>
                <div className="text-sm font-medium">
                  {isMyTurn ? (
                    <span className="text-green-600 font-bold text-lg">Tu turno</span>
                  ) : (
                    <span className="text-gray-500 text-lg dark:text-neutral-400">
                      Turno de {currentPlayer?.name || 'otro jugador'}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex justify-center gap-2 mb-4">
                {visualDice.map((d, i) => (
                  <Dice
                    key={i}
                    value={d}
                    held={held[i]}
                    onClick={() => toggleHold(i)}
                    disabled={!isMyTurn || rollsLeft === 3 || isRolling}
                    rolling={isRolling}
                  />
                ))}
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={requestRoll}
                  disabled={!isMyTurn || rollsLeft <= 0 || isRolling}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Dice2 className="w-5 h-5" />
                  {isRolling ? 'Lanzando...' : 'Lanzar dados'}
                </button>
                <div className="text-md font-medium">
                  Tiradas: {rollsLeft}/3
                </div>
              </div>
            </div>
          </div>
          
          {/* Score card */}
          <div className="lg:col-span-2">
            <ScoreCard
              players={players}
              currentPlayerId={currentPlayer?.id || ''}
              dice={dice}
              onSelectCategory={selectCategory}
              isMyTurn={!!(isMyTurn && rollsLeft < 3)}
            />
          </div>
        </div>
      ) : winner ? (
        <div className="bg-white text-black dark:bg-neutral-900 dark:text-white p-10 rounded-2xl shadow-lg text-center">
          <h2 className="text-4xl font-extrabold mb-6 text-gray-800 dark:text-gray-200">
            🎉 ¡Fin del juego!
          </h2>

          <div className="mb-8">
            <p className="text-2xl text-gray-700 dark:text-gray-200">
              Ganador:{" "}
              <span className="font-bold text-green-600">
                {winner.name}
              </span>
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-500">
              Puntaje:{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {winner.score} puntos
              </span>
            </p>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
              🏆 Clasificación final
            </h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider dark:bg-gray-800 dark:text-gray-200">
                    <th className="py-3 px-4 text-left">Jugador</th>
                    <th className="py-3 px-4 text-right">Puntaje</th>
                  </tr>
                </thead>
                <tbody>
                  {[...players]
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => (
                      <tr
                        key={player.id}
                        className={`${
                          player.id === winner.id
                            ? "bg-green-200 font-semibold"
                            : "hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500"
                        }`}
                      >
                        <td className="py-3 px-4 text-left flex items-center gap-2">
                          {index === 0 && <span>🥇</span>}
                          {index === 1 && <span>🥈</span>}
                          {index === 2 && <span>🥉</span>}
                          {index > 2 && <span className="text-gray-400">#{index + 1}</span>}
                          {player.name}
                        </td>
                        <td className="py-3 px-4 text-right">{player.score}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition-transform transform hover:scale-105"
          >
            🔄 Volver al inicio
          </button>
        </div>

      ) : (
        
        <div className="bg-white dark:bg-neutral-900 p-8 rounded-xl shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
            <Users className="w-6 h-6 text-blue-500" /> Esperando inicio del juego
          </h2>
          <p className="text-gray-600 dark:text-neutral-400 mb-6">
            El anfitrión debe iniciar el juego cuando todos los jugadores estén listos.
          </p>

          {isHost && players.length >= 2 ? (
            <button
              onClick={startGame}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
            >
              <Play className="w-5 h-5" /> Iniciar juego
            </button>
          ) : isHost ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-amber-600 flex items-center justify-center gap-2 font-medium">
                <AlertCircle className="w-5 h-5" /> Se necesitan al menos 2 jugadores para iniciar
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => s.emit('game:addBot', { roomCode: code, level: 1 }, (res: any) => {
                      if (!res?.ok) {
                        setError(res?.error || 'Error al añadir bot')
                      }
                    })}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                  >
                    <Bot className="w-5 h-5" /> Bot Nivel 1
                  </button>
                  <button
                    onClick={() => s.emit('game:addBot', { roomCode: code, level: 2 }, (res: any) => {
                      if (!res?.ok) {
                        setError(res?.error || 'Error al añadir bot')
                      }
                    })}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
                  >
                    <Bot className="w-5 h-5" /> Bot Nivel 2
                  </button>
                  <button
                    onClick={() => s.emit('game:addBot', { roomCode: code, level: 3 }, (res: any) => {
                      if (!res?.ok) {
                        setError(res?.error || 'Error al añadir bot')
                      }
                    })}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                  >
                    <Bot className="w-5 h-5" /> Bot Nivel 3
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Nivel 1: (Estrategía Básica) | Nivel 2: (Estrategía Media) | Nivel 3: (Estrategía Avanzada)
                </p>
              </div>
            </div>
          ) : null}
        </div>

      )}
      
      {/* Game log */}
      <div className="mt-4 bg-white dark:bg-neutral-900 p-4 rounded-lg shadow">
        <h3 className="font-medium mb-2">Registro del juego</h3>
        <div className="bg-white dark:bg-neutral-900 p-2 rounded h-32 overflow-y-auto text-xs font-mono">
          {log.length === 0 ? (
            <p className="text-gray-400 italic">No hay eventos registrados</p>
          ) : (
            [...log].reverse().map((entry, i) => (
              <div key={i} className="mb-1">{entry}</div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
