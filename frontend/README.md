# Cacho MVP (Next.js + Socket.IO)
Minimal scaffold para un juego de **Cacho** (similar a Generala) con salas por código y juego en tiempo real vía **Socket.IO**.

## Características
- Crear y unirse a salas con código único.
- Juego en tiempo real para hasta 6 jugadores.
- Reglas originales de Cacho implementadas.
- Interfaz en React/Next.js con animación de dados y tablero interactivo.
- Almacenamiento en memoria (MVP).

## Requisitos
- Node 18+
- npm

## Instalación y ejecución
1. `npm install`
2. `npm run dev`
3. Abre [http://localhost:3000](http://localhost:3000) y crea o únete a una sala.

## Notas
- Este es un MVP listo para ejecutar en local. Usa almacenamiento en memoria (no persistente).
- Para producción: usar DB (Postgres), Redis adapter para Socket.IO, autenticación, tests y CI/CD.
