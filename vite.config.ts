/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/chinese-poker/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // Every AI-controlled seat now runs generateOptimalArrangement's brute-force search
    // (~150-300ms/seat); App-level tests that deal multiple rounds can approach 5s even
    // on a fast machine, and comfortably exceed it on a slower CI runner.
    testTimeout: 15000,
  },
})
