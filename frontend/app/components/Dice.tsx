'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type DiceProps = {
  value: number;
  held: boolean;
  onClick?: () => void;
  disabled?: boolean;
  rolling?: boolean;
};

const diceVariants = {
  rolling: {
    rotateX: [0, 360, 720, 1080],
    rotateY: [0, 360, 720, 1080],
    scale: [1, 1.1, 1],
    transition: {
      duration: 2,
      ease: 'easeOut',
      rotateX: {
        times: [0, 0.33, 0.66, 1]
      },
      rotateY: {
        times: [0, 0.33, 0.66, 1]
      },
      scale: {
        times: [0, 0.5, 1]
      }
    }
  },
  idle: { rotateX: 0, rotateY: 0, scale: 1 }
};

export default function Dice({ value, held, onClick, disabled, rolling }: DiceProps) {
  // Mapeo de valores a patrones de puntos
  const getDots = () => {
    switch (value) {
      case 1:
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-black rounded-full"></div>
          </div>
        );
      case 2:
        return (
          <div className="absolute inset-0 grid grid-cols-2 p-2">
            <div className="flex items-start justify-start">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
            <div className="flex items-end justify-end">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-2">
            <div className="flex items-start justify-start">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
            <div></div>
            <div></div>
            <div></div>
            <div className="flex items-center justify-center">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
            <div></div>
            <div></div>
            <div></div>
            <div className="flex items-end justify-end">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-2">
            <div className="flex items-start justify-start">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
            <div className="flex items-start justify-end">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
            <div className="flex items-end justify-start">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
            <div className="flex items-end justify-end">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-2">
            <div className="flex items-start justify-start">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
            <div></div>
            <div className="flex items-start justify-end">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
            <div></div>
            <div className="flex items-center justify-center">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
            <div></div>
            <div className="flex items-end justify-start">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
            <div></div>
            <div className="flex items-end justify-end">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-2">
            <div className="flex items-start justify-start">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
            <div></div>
            <div className="flex items-start justify-end">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
            <div className="flex items-center justify-start">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
            <div></div>
            <div className="flex items-center justify-end">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
            <div className="flex items-end justify-start">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
            <div></div>
            <div className="flex items-end justify-end">
              <div className="w-3 h-3 bg-black rounded-full"></div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      className={`relative w-16 h-16 rounded-lg shadow-lg border border-gray-300 cursor-pointer
        ${held ? 'ring-2 ring-green-500 bg-green-100 dark:bg-green-400' : 'bg-white dark:bg-neutral-200'}
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      onClick={disabled ? undefined : onClick}
      variants={diceVariants}
      animate={rolling ? 'rolling' : 'idle'}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
    >
      {getDots()}
    </motion.div>
  );
}