import { Category } from './types';

import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Función para calcular el valor de una categoría dado un conjunto de dados
export function calculateCategoryValue(dice: number[], category: Category): number {
  // Contar ocurrencias de cada número
  const counts: Record<number, number> = {1:0, 2:0, 3:0, 4:0, 5:0, 6:0};
  dice.forEach(d => counts[d]++);
  
  switch(category) {
    case Category.ONES:
      return counts[1] * 1;
    case Category.TWOS:
      return counts[2] * 2;
    case Category.THREES:
      return counts[3] * 3;
    case Category.FOURS:
      return counts[4] * 4;
    case Category.FIVES:
      return counts[5] * 5;
    case Category.SIXES:
      return counts[6] * 6;
      
    case Category.ESCALERA:
      // Verificar si hay secuencia de 5 números consecutivos
      const sorted = [...dice].sort((a,b) => a-b);
      const uniqueValues = new Set(sorted).size;
      if (uniqueValues < 5) return 0;
      
      const isEscalera = sorted.every((num, i) => i === 0 || num === sorted[i-1] + 1);
      return isEscalera ? 20 : 0;
      
    case Category.FULL:
      // Verificar si hay 3 de un número y 2 de otro
      const values = Object.values(counts);
      const hasFull = values.includes(3) && values.includes(2);
      return hasFull ? 30 : 0;
      
    case Category.POKER:
      // Verificar si hay 4 o más iguales
      const hasPoker = Object.values(counts).some(count => count >= 4);
      return hasPoker ? 40 : 0;
      
    case Category.GENERALA:
      // Verificar si hay 5 iguales
      const hasGenerala = Object.values(counts).some(count => count === 5);
      return hasGenerala ? 50 : 0;
      
    case Category.GENERALA_DOBLE:
      // Solo se puede anotar si ya se anotó generala antes
      const hasGeneralaDoble = Object.values(counts).some(count => count === 5);
      return hasGeneralaDoble ? 100 : 0;
      
    default:
      return 0;
  }
}

// Función para animar dados
export function animateDiceRoll(
  onFrame: (diceValues: number[]) => void,
  finalValues: number[],
  duration: number = 1000
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 1) {
        // Durante la animación, generar valores aleatorios
        const randomDice = Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
        onFrame(randomDice);
        requestAnimationFrame(animate);
      } else {
        // Al final, mostrar los valores finales
        onFrame(finalValues);
        resolve();
      }
    };
    
    animate();
  });
}

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs))
}