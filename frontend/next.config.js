/** @type {import('next').NextConfig} */
const nextConfig = {
  // appDir ya es el comportamiento predeterminado en Next.js 15
  reactStrictMode: true,
  // Deshabilitar RSC para evitar errores de navegación
  compiler: {
    styledComponents: true
  }
}
module.exports = nextConfig
