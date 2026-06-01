// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@pinia/nuxt',
  ],
  runtimeConfig: {
    public: {
      // Origin of the separately-deployed Hono Worker API.
      // Override in production with NUXT_PUBLIC_API_BASE (e.g. https://beat-battle-royale.<acct>.workers.dev).
      // Defaults to the local `wrangler dev` address for development.
      apiBase: 'http://localhost:8787',
    },
  },
  css: [
    '~/assets/css/index.css'
  ],
  app: {
    head: {
      title: 'Beat Battle Royale - Edge-Native DAW Battles',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Massively multiplayer, browser-based digital audio workstation battle platform. Compete against top producers in real time with edge-native synchronization.' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&display=swap' }
      ]
    }
  },
  nitro: {
    preset: 'cloudflare-pages'
  },

  // Redirect en-dash typos and bare paths → the real static file
  routeRules: {
    '/daw‑app':      { redirect: '/daw-app.html' },
    '/daw–app':      { redirect: '/daw-app.html' },
    '/daw-app':      { redirect: '/daw-app.html' },
  }
})
