const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const crypto = require('crypto')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: true } })

const PORT = process.env.PORT || 4000

// Categorías de puntaje en Cacho
const CATEGORIES = {
  ONES: 'ones',
  TWOS: 'twos',
  THREES: 'threes',
  FOURS: 'fours',
  FIVES: 'fives',
  SIXES: 'sixes',
  ESCALERA: 'escalera',
  FULL: 'full',
  POKER: 'poker',
  GENERALA: 'generala',
  GENERALA_DOBLE: 'generalaDoble'
}

// Valores de puntaje para categorías especiales
const SCORES = {
  ESCALERA: 20,
  FULL: 30,
  POKER: 40,
  GENERALA: 50,
  GENERALA_DOBLE: 100
}

// In-memory stores (MVP). For production use a DB + Redis adapter.
const rooms = {} // code -> { code, hostId, players: [{id,name,score}], gameState }

function makeCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase()
}

// Función para manejar el turno de un bot
function playBotTurn(roomCode, botPlayer) {
  const room = rooms[roomCode]
  if (!room) return
  
  const game = room.gameState
  const botLevel = botPlayer.level || 1 // Nivel 1 por defecto si no está definido
  
  // Lógica de tirada según nivel
  let newDice = []
  let keepDice = [false, false, false, false, false]
  
  if (botLevel === 1) {
    // Nivel 1: El bot tira los dados una sola vez (sin mantener ninguno)
    newDice = Array(5).fill(0).map(() => crypto.randomInt(1, 7))
    game.rollsLeft = 0
  } else if (botLevel >= 2) {
    // Nivel 2+: El bot puede hacer hasta 3 tiradas, manteniendo dados estratégicamente
    // Primera tirada
    newDice = Array(5).fill(0).map(() => crypto.randomInt(1, 7))
    game.rollsLeft = 2
    
    // Emitir evento de primera tirada
    io.to(roomCode).emit('game:rolled', { 
      dice: newDice, 
      rollsLeft: game.rollsLeft,
      playerId: botPlayer.id
    })
    
    // Estrategia para mantener dados (nivel 2+)
    // Buscar pares, tríos, etc.
    const diceCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0}
    newDice.forEach(die => diceCounts[die]++)
    
    // Mantener dados que aparecen más de una vez
    for (let i = 0; i < 5; i++) {
      if (diceCounts[newDice[i]] > 1) {
        keepDice[i] = true
      }
    }
    
    // Segunda tirada (si es nivel 2+)
    for (let i = 0; i < 5; i++) {
      if (!keepDice[i]) {
        newDice[i] = crypto.randomInt(1, 7)
      }
    }
    game.rollsLeft = 1
    
    // Emitir evento de segunda tirada
    io.to(roomCode).emit('game:rolled', { 
      dice: newDice, 
      rollsLeft: game.rollsLeft,
      playerId: botPlayer.id
    })
    
    // Nivel 3: Hacer una tercera tirada si es necesario
    if (botLevel >= 3) {
      // Actualizar estrategia después de la segunda tirada
      const diceCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0}
      newDice.forEach(die => diceCounts[die]++)
      
      // Mantener los dados más frecuentes
      for (let i = 0; i < 5; i++) {
        if (diceCounts[newDice[i]] > 1) {
          keepDice[i] = true
        }
      }
      
      // Tercera tirada
      for (let i = 0; i < 5; i++) {
        if (!keepDice[i]) {
          newDice[i] = crypto.randomInt(1, 7)
        }
      }
    }
    
    game.rollsLeft = 0
  }
  
  game.dice = newDice
  
  // Emitir evento de tirada final
  io.to(roomCode).emit('game:rolled', { 
    dice: newDice, 
    rollsLeft: game.rollsLeft,
    playerId: botPlayer.id
  })
  
  // Esperar un momento antes de elegir categoría
  setTimeout(() => {
    // Elegir la mejor categoría disponible
    let bestCategory = null
    let bestScore = -1
    
    for (const cat of Object.values(CATEGORIES)) {
      if (botPlayer.scorecard[cat] === undefined) {
        const score = validateCategory(game.dice, cat)
        if (score > bestScore) {
          bestScore = score
          bestCategory = cat
        }
      }
    }
    
    // Actualizar scorecard del bot
    botPlayer.scorecard[bestCategory] = bestScore
    botPlayer.score = calculateTotalScore(botPlayer.scorecard)
    
    // Emitir evento de puntuación
    io.to(roomCode).emit('game:scored', { 
      playerId: botPlayer.id,
      playerName: botPlayer.name,
      category: bestCategory,
      score: bestScore
    })
    
    // Pasar al siguiente turno
    game.currentTurn = (game.currentTurn + 1) % room.players.length
    
    // Si completamos una vuelta, incrementar ronda
    if (game.currentTurn === 0) {
      game.round++
    }
    
    // Reiniciar dados y tiradas para el siguiente jugador
    game.dice = [1,1,1,1,1]
    game.rollsLeft = 3
    
    // Verificar si el siguiente jugador es un bot y hacer que juegue automáticamente
    const nextPlayer = room.players[game.currentTurn]
    if (nextPlayer && nextPlayer.isBot) {
      setTimeout(() => {
        playBotTurn(roomCode, nextPlayer)
      }, 1500) // Esperar 1.5 segundos antes de que el bot juegue
    }
    
    // Verificar fin del juego
    const allCategoriesFilled = room.players.every(player => 
      Object.keys(player.scorecard).length >= Object.keys(CATEGORIES).length
    )
    
    if (allCategoriesFilled || game.round > game.maxRounds) {
      // Fin del juego
      game.gameStarted = false
      
      // Determinar ganador
      const winner = [...room.players].sort((a, b) => b.score - a.score)[0]
      
      io.to(roomCode).emit('game:ended', { 
        winner: winner,
        finalScores: room.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
      })
    } else {
      // Continuar juego - siguiente turno
      io.to(roomCode).emit('game:nextTurn', { 
        currentTurn: game.currentTurn,
        currentPlayer: room.players[game.currentTurn].id,
        round: game.round
      })
      
      // Si el siguiente jugador es un bot, jugar automáticamente
      const nextPlayer = room.players[game.currentTurn]
      if (nextPlayer && nextPlayer.isBot) {
        setTimeout(() => {
          playBotTurn(roomCode, nextPlayer)
        }, 1500)
      }
    }
    
    io.to(roomCode).emit('room:update', { 
      players: room.players,
      gameState: game
    })
  }, 1000)
}

// Validar categorías según reglas de Cacho
function validateCategory(dice, category) {
  // Contar ocurrencias de cada número
  const counts = {1:0, 2:0, 3:0, 4:0, 5:0, 6:0}
  dice.forEach(d => counts[d]++)
  
  switch(category) {
    case CATEGORIES.ONES:
    case CATEGORIES.TWOS:
    case CATEGORIES.THREES:
    case CATEGORIES.FOURS:
    case CATEGORIES.FIVES:
    case CATEGORIES.SIXES:
      const num = {[CATEGORIES.ONES]:1, [CATEGORIES.TWOS]:2, [CATEGORIES.THREES]:3, 
                  [CATEGORIES.FOURS]:4, [CATEGORIES.FIVES]:5, [CATEGORIES.SIXES]:6}[category]
      return counts[num] * num
      
    case CATEGORIES.ESCALERA:
      // Verificar si hay secuencia de 5 números consecutivos
      const sorted = [...dice].sort((a,b) => a-b)
      const isEscalera = sorted.every((num, i) => i === 0 || num === sorted[i-1] + 1)
      return isEscalera ? SCORES.ESCALERA : 0
      
    case CATEGORIES.FULL:
      // Verificar si hay 3 de un número y 2 de otro
      const values = Object.values(counts)
      const hasFull = values.includes(3) && values.includes(2)
      return hasFull ? SCORES.FULL : 0
      
    case CATEGORIES.POKER:
      // Verificar si hay 4 o más iguales
      const hasPoker = Object.values(counts).some(count => count >= 4)
      return hasPoker ? SCORES.POKER : 0
      
    case CATEGORIES.GENERALA:
      // Verificar si hay 5 iguales
      const hasGenerala = Object.values(counts).some(count => count === 5)
      return hasGenerala ? SCORES.GENERALA : 0
      
    case CATEGORIES.GENERALA_DOBLE:
      // Solo se puede anotar si ya se anotó generala antes
      const hasGeneralaDoble = Object.values(counts).some(count => count === 5)
      return hasGeneralaDoble ? SCORES.GENERALA_DOBLE : 0
      
    default:
      return 0
  }
}

// Calcular puntaje total de un jugador
function calculateTotalScore(scorecard) {
  if (!scorecard) return 0
  return Object.values(scorecard).reduce((sum, score) => sum + (score || 0), 0)
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id)

  socket.on('room:create', ({ hostName }, cb) => {
    const code = makeCode()
    rooms[code] = {
      code,
      hostId: socket.id,
      players: [{ id: socket.id, name: hostName || 'Host', score: 0, scorecard: {} }],
      gameState: { 
        dice: [1,1,1,1,1], 
        rollsLeft: 3,
        currentTurn: 0,
        gameStarted: false,
        round: 1,
        maxRounds: 11 // Una ronda por cada categoría
      }
    }
    socket.join(code)
    cb && cb({ ok: true, roomCode: code })
    io.to(code).emit('room:update', { 
      players: rooms[code].players,
      gameState: rooms[code].gameState,
      hostId: rooms[code].hostId
    })
    io.to(code).emit('room:log', { event: 'room:created', code })
  })

  socket.on('room:join', ({ code, playerName }, cb) => {
    const room = rooms[code]
    if (!room) return cb && cb({ ok: false, error: 'Sala no encontrada' })
    
    // Verificar límite de 6 jugadores
    if (room.players.length >= 6) {
      return cb && cb({ ok: false, error: 'Sala llena (máximo 6 jugadores)' })
    }
    
    // Verificar si el jugador ya está en la sala (evitar duplicados)
    const existingPlayerIdx = room.players.findIndex(p => p.name === playerName)
    if (existingPlayerIdx >= 0) {
      // Reconexión: actualizar ID de socket
      const player = room.players[existingPlayerIdx]
      const wasHost = player.id === room.hostId
      player.id = socket.id
      
      // Si era el anfitrión, actualizar el hostId
      if (wasHost) {
        room.hostId = socket.id
      }
      
      socket.join(code)
      cb && cb({ ok: true, room: { code, reconnected: true } })
      io.to(code).emit('room:update', { 
        players: room.players,
        gameState: room.gameState,
        hostId: room.hostId
      })
      io.to(code).emit('room:log', { 
        event: 'player:reconnected', 
        player: { id: player.id, name: player.name } 
      })
      return
    }
    
    // Verificar si el juego ya comenzó
    if (room.gameState.gameStarted) {
      return cb && cb({ ok: false, error: 'El juego ya comenzó' })
    }
    
    const player = { 
      id: socket.id, 
      name: playerName || 'Anon', 
      score: 0,
      scorecard: {}
    }
    
    room.players.push(player)
    socket.join(code)
    io.to(code).emit('room:update', { 
      players: room.players,
      gameState: room.gameState,
      hostId: room.hostId
    })
    io.to(code).emit('room:log', { 
      event: 'player:joined', 
      player: { id: player.id, name: player.name } 
    })
    // Emitir evento para reproducir sonido cuando un jugador se une
    io.to(code).emit('player:joined', { 
      player: { id: player.id, name: player.name } 
    })
    cb && cb({ ok: true, room: { code } })
  })

  socket.on('game:addBot', ({ roomCode, level = 1 }, cb) => {
    const room = rooms[roomCode]
    if (!room) return cb && cb({ ok: false, error: 'Sala no encontrada' })
    
    // Solo el host puede añadir bots
    if (socket.id !== room.hostId) {
      return cb && cb({ ok: false, error: 'Solo el anfitrión puede añadir bots' })
    }
    
    // Verificar si el juego ya comenzó
    if (room.gameState.gameStarted) {
      return cb && cb({ ok: false, error: 'El juego ya comenzó' })
    }
    
    // Validar nivel del bot (1-3)
    const botLevel = Math.min(Math.max(parseInt(level) || 1, 1), 3)
    
    // Crear un bot con un nombre aleatorio
    const botNames = ['Bot-Cacho', 'RobotDice', 'AI-Player', 'DiceBot', 'AutoDice']
    const randomName = botNames[Math.floor(Math.random() * botNames.length)] + ` (Nivel ${botLevel})`
    const botId = 'bot-' + Date.now()
    
    const botPlayer = { 
      id: botId, 
      name: randomName, 
      score: 0,
      scorecard: {},
      isBot: true,
      level: botLevel
    }
    
    room.players.push(botPlayer)
    
    io.to(roomCode).emit('room:update', { 
      players: room.players,
      gameState: room.gameState,
      hostId: room.hostId
    })
    
    io.to(roomCode).emit('room:log', { 
      event: 'bot:joined', 
      player: { id: botPlayer.id, name: botPlayer.name } 
    })
    
    // Emitir evento para reproducir sonido cuando un bot se une
    io.to(roomCode).emit('player:joined', { 
      player: { id: botPlayer.id, name: botPlayer.name } 
    })
    
    cb && cb({ ok: true })
  })

  socket.on('player:leave', ({ roomCode, playerName }) => {
    const room = rooms[roomCode]
    if (!room) return
    
    // Emitir evento para reproducir sonido cuando un jugador sale
    io.to(roomCode).emit('player:left', { 
      player: { name: playerName } 
    })
    
    io.to(roomCode).emit('room:log', { 
      event: 'player:left', 
      player: { name: playerName } 
    })
  })

  socket.on('game:start', ({ roomCode }, cb) => {
    const room = rooms[roomCode]
    if (!room) return cb && cb({ ok: false, error: 'Sala no encontrada' })
    
    // Solo el host puede iniciar el juego
    if (socket.id !== room.hostId) {
      return cb && cb({ ok: false, error: 'Solo el anfitrión puede iniciar el juego' })
    }
    
    // Iniciar juego
    room.gameState.gameStarted = true
    room.gameState.currentTurn = 0
    room.gameState.round = 1
    room.gameState.rollsLeft = 3
    room.gameState.dice = [1,1,1,1,1]
    
    const firstPlayer = room.players[0]
    
    io.to(roomCode).emit('game:started', { 
      currentTurn: room.gameState.currentTurn,
      currentPlayer: firstPlayer.id
    })
    
    io.to(roomCode).emit('room:update', { 
      players: room.players,
      gameState: room.gameState,
      hostId: room.hostId
    })
    io.to(roomCode).emit('room:log', { 
      event: 'game:started', 
      by: socket.id 
    })
    
    // Si el primer jugador es un bot, jugar automáticamente después de un breve retraso
    if (firstPlayer.isBot) {
      setTimeout(() => {
        playBotTurn(roomCode, firstPlayer)
      }, 1500) // Esperar 1.5 segundos antes de que el bot juegue
    }
    
    cb && cb({ ok: true })
  })

  socket.on('game:roll', ({ roomCode, keep }, cb) => {
    const room = rooms[roomCode]
    if (!room) return cb && cb({ ok: false, error: 'Sala no encontrada' })
    
    const game = room.gameState
    if (!game.gameStarted) {
      return cb && cb({ ok: false, error: 'El juego no ha comenzado' })
    }
    
    // Verificar turno
    const currentPlayerIdx = game.currentTurn % room.players.length
    const currentPlayer = room.players[currentPlayerIdx]
    
    if (socket.id !== currentPlayer.id) {
      return cb && cb({ ok: false, error: 'No es tu turno' })
    }
    
    if (game.rollsLeft <= 0) {
      return cb && cb({ ok: false, error: 'No quedan tiradas' })
    }
    
    // Generar dados: keep[] indica qué dados mantener (true = mantener)
    const newDice = game.dice.slice()
    for (let i=0; i<5; i++) {
      if (!keep || !keep[i]) {
        // crypto random 1..6
        newDice[i] = crypto.randomInt(1,7)
      }
    }
    
    game.dice = newDice
    game.rollsLeft = Math.max(0, (game.rollsLeft||3)-1)
    
    io.to(roomCode).emit('game:rolled', { 
      dice: newDice, 
      rollsLeft: game.rollsLeft,
      playerId: currentPlayer.id
    })
    
    io.to(roomCode).emit('room:log', { 
      event: 'game:rolled', 
      by: socket.id, 
      dice: newDice 
    })
    
    cb && cb({ ok: true })
  })

  socket.on('game:score', ({ roomCode, category }, cb) => {
    const room = rooms[roomCode]
    if (!room) return cb && cb({ ok: false, error: 'Sala no encontrada' })
    
    const game = room.gameState
    if (!game.gameStarted) {
      return cb && cb({ ok: false, error: 'El juego no ha comenzado' })
    }
    
    // Verificar turno
    const currentPlayerIdx = game.currentTurn % room.players.length
    const currentPlayer = room.players[currentPlayerIdx]
    
    if (socket.id !== currentPlayer.id) {
      return cb && cb({ ok: false, error: 'No es tu turno' })
    }
    
    // Verificar que la categoría no esté ya utilizada
    if (currentPlayer.scorecard[category] !== undefined) {
      return cb && cb({ ok: false, error: 'Categoría ya utilizada' })
    }
    
    // Calcular puntaje
    const score = validateCategory(game.dice, category)
    
    // Actualizar scorecard del jugador
    currentPlayer.scorecard[category] = score
    currentPlayer.score = calculateTotalScore(currentPlayer.scorecard)
    
    // Emitir evento para reproducir sonido en todos los clientes
    io.to(roomCode).emit('game:scored', { 
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      category,
      score
    })
    
    // Pasar al siguiente turno
    game.currentTurn = (game.currentTurn + 1) % room.players.length
    
    // Si completamos una vuelta, incrementar ronda
    if (game.currentTurn === 0) {
      game.round++
    }
    
    // Reiniciar dados y tiradas para el siguiente jugador
    game.dice = [1,1,1,1,1]
    game.rollsLeft = 3
    
    // Verificar fin del juego (todas las categorías llenas)
    const allCategoriesFilled = room.players.every(player => 
      Object.keys(player.scorecard).length >= Object.keys(CATEGORIES).length
    )
    
    if (allCategoriesFilled || game.round > game.maxRounds) {
      // Fin del juego
      game.gameStarted = false
      
      // Determinar ganador
      const winner = [...room.players].sort((a, b) => b.score - a.score)[0]
      
      io.to(roomCode).emit('game:ended', { 
        winner: winner,
        finalScores: room.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
      })
      
      io.to(roomCode).emit('room:log', { 
        event: 'game:ended', 
        winner: winner.name,
        score: winner.score
      })
    } else {
      // Continuar juego - siguiente turno
      io.to(roomCode).emit('game:nextTurn', { 
        currentTurn: game.currentTurn,
        currentPlayer: room.players[game.currentTurn].id,
        round: game.round
      })
      
      // Verificar si el siguiente jugador es un bot y hacer que juegue automáticamente
      const nextPlayer = room.players[game.currentTurn]
      if (nextPlayer && nextPlayer.isBot) {
        setTimeout(() => {
          playBotTurn(roomCode, nextPlayer)
        }, 2000) // Esperar 2 segundos antes de que el bot juegue
      }
    }
    
    io.to(roomCode).emit('room:update', { 
      players: room.players,
      gameState: game
    })
    
    cb && cb({ ok: true, score })
  })

  socket.on('disconnect', () => {
    // Remover jugador de las salas
    for (const code of Object.keys(rooms)) {
      const room = rooms[code]
      const idx = room.players.findIndex(p => p.id === socket.id)
      
      if (idx >= 0) {
        // Si el juego está en curso, mantener al jugador en la lista pero marcarlo como desconectado
        if (room.gameState.gameStarted) {
          room.players[idx].disconnected = true
          io.to(code).emit('room:update', { players: room.players })
          io.to(code).emit('room:log', { 
            event: 'player:disconnected', 
            id: room.players[idx].id,
            name: room.players[idx].name
          })
          
          // Si era su turno, pasar al siguiente
          const currentPlayerIdx = room.gameState.currentTurn % room.players.length
          if (idx === currentPlayerIdx) {
            room.gameState.currentTurn = (room.gameState.currentTurn + 1) % room.players.length
            room.gameState.dice = [1,1,1,1,1]
            room.gameState.rollsLeft = 3
            
            const nextPlayer = room.players[room.gameState.currentTurn]
            
            io.to(code).emit('game:nextTurn', { 
              currentTurn: room.gameState.currentTurn,
              currentPlayer: nextPlayer.id,
              round: room.gameState.round
            })
            
            io.to(code).emit('room:log', { 
              event: 'game:skipTurn', 
              reason: 'player_disconnected',
              player: room.players[idx].name
            })
            
            // Si el siguiente jugador es un bot, jugar automáticamente
            if (nextPlayer.isBot) {
              setTimeout(() => {
                playBotTurn(code, nextPlayer)
              }, 1500)
            }
          }
        } else {
          // Si el juego no ha comenzado, eliminar al jugador
          const [removed] = room.players.splice(idx, 1)
          io.to(code).emit('room:update', { 
            players: room.players,
            gameState: room.gameState
          })
          io.to(code).emit('room:log', { 
            event: 'player:left', 
            id: removed.id,
            name: removed.name
          })
          
          // Si era el host, asignar nuevo host
          if (removed.id === room.hostId && room.players.length > 0) {
            room.hostId = room.players[0].id
            io.to(code).emit('room:hostChanged', { 
              newHostId: room.hostId,
              newHostName: room.players[0].name
            })
          }
        }
        
        // Si la sala queda vacía, eliminarla
        if (room.players.length === 0) {
          delete rooms[code]
        }
      }
    }
    
    console.log('socket disconnected', socket.id)
  })
})

app.get('/', (req, res) => res.send('Cacho socket server running'))
server.listen(PORT, () => console.log('Server listening on', PORT))
