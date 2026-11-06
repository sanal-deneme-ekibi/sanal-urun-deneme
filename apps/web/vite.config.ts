import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// "npm run dev:telefon" → HTTPS + ağdaki cihazlara açık (telefonda kamera için)
// "npm run dev"         → her zamanki gibi http://localhost:5173
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'telefon' ? [basicSsl()] : [])],
}))