// Tipos para el juego de Cacho

export type Player = {
  id: string;
  name: string;
  score: number;
  scorecard: Record<string, number>;
  disconnected?: boolean;
};

export type GameState = {
  dice: number[];
  rollsLeft: number;
  currentTurn: number;
  gameStarted: boolean;
  round: number;
  maxRounds: number;
};

export type Reaction = {
  id: string;
  emoji: string;
  playerId: string;
  playerName: string;
  timestamp: number;
};

export type Room = {
  code: string;
  hostId: string;
  players: Player[];
  gameState: GameState;
  reactions?: Reaction[];
};

export enum Category {
  ONES = 'ones',
  TWOS = 'twos',
  THREES = 'threes',
  FOURS = 'fours',
  FIVES = 'fives',
  SIXES = 'sixes',
  ESCALERA = 'escalera',
  FULL = 'full',
  POKER = 'poker',
  GENERALA = 'generala',
  GENERALA_DOBLE = 'generalaDoble'
}

export const CategoryLabels: Record<Category, string> = {
  [Category.ONES]: 'Unos',
  [Category.TWOS]: 'Doses',
  [Category.THREES]: 'Treses',
  [Category.FOURS]: 'Cuatros',
  [Category.FIVES]: 'Cincos',
  [Category.SIXES]: 'Seises',
  [Category.ESCALERA]: 'Escalera',
  [Category.FULL]: 'Full',
  [Category.POKER]: 'Póker',
  [Category.GENERALA]: 'Generala',
  [Category.GENERALA_DOBLE]: 'Generala Doble'
};