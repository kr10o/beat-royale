<!-- pages/index.vue -->
<template>
  <div class="landing-container">
    <!-- Neon grid background -->
    <div class="grid-overlay"></div>
    <div class="glow-orb blue"></div>
    <div class="glow-orb magenta"></div>

    <header class="navbar">
      <div class="logo">BEAT <span class="accent">ROYALE</span></div>
      <div class="nav-links">
        <a href="#features">FEATURES</a>
        <a href="#rules">RULES</a>
        <NuxtLink to="/register" class="nav-cta">ENTER ARENA</NuxtLink>
      </div>
    </header>

    <main class="hero-section">
      <div class="badge-row">
        <span class="live-tag">LIVE</span>
        <span class="badge-text">EDGE-NATIVE MULTIPLAYER DAW BATTLES</span>
      </div>
      
      <h1 class="hero-title">
        THE ULTIMATE REAL-TIME <br/>
        <span class="gradient-text">BEATMAKING BATTLEGROUND</span>
      </h1>
      
      <p class="hero-lead">
        Compete against producers worldwide in synchronized 10-minute DAW rounds.
        Zero buffer delay. Edge-rendered absolute clocks. Direct-to-cloud asset extraction.
      </p>

      <div class="action-row">
        <NuxtLink to="/register" class="primary-btn">CREATE PRODUCER PROFILE</NuxtLink>
        <NuxtLink to="/battle/main-stage" class="secondary-btn">SPECTATE MAIN STAGE</NuxtLink>
      </div>

      <!-- Quick Platform Stats -->
      <section class="stats-row">
        <div class="stat-card">
          <h4>24.1ms</h4>
          <p>Global Edge Latency</p>
        </div>
        <div class="stat-card">
          <h4>10,482</h4>
          <p>Active Battle Loops</p>
        </div>
        <div class="stat-card">
          <h4>$150k+</h4>
          <p>Cleared Clearance Prizes</p>
        </div>
      </section>

      <!-- Detailed Platform Specifications -->
      <section id="features" class="features-grid">
        <div class="feature-card">
          <div class="icon">🌀</div>
          <h3>Client-Side Isolation</h3>
          <p>Mathematical audio processing runs inside a dedicated iframe boundary to bypass Vue VDOM hydration crashes.</p>
        </div>
        
        <div class="feature-card">
          <div class="icon">⏱️</div>
          <h3>Absolute Time Sync</h3>
          <p>Cloudflare Durable Objects calculate definitive future timestamps preventing temporal network drift.</p>
        </div>

        <div class="feature-card">
          <div class="icon">⚡</div>
          <h3>Direct-to-Cloud Uploads</h3>
          <p>Bypasses worker RAM capacity limits by shipping finalized WebM mixdowns directly to Cloudflare R2 via presigned PUT links.</p>
        </div>

        <div class="feature-card">
          <div class="icon">💾</div>
          <h3>JSZip In-Memory Extractor</h3>
          <p>Extracts heavy drum samples into ArrayBuffers in memory, saving precious network handshakes during startup.</p>
        </div>
      </section>
    </main>

    <footer class="footer">
      <p>&copy; 2026 Beat Battle Royale. Edge audio processing pipeline built with Nuxt 3, Hono, and Cloudflare serverless isolates.</p>
    </footer>
  </div>
</template>

<style scoped>
.landing-container {
  min-height: 100vh;
  background-color: #050508;
  color: #f1f1f5;
  font-family: 'Inter', sans-serif;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: 40px 40px;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  pointer-events: none;
  z-index: 1;
}

.glow-orb {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.15;
  pointer-events: none;
  z-index: 1;
}

.glow-orb.blue {
  top: -10%;
  left: -10%;
  background: #00f2fe;
}

.glow-orb.magenta {
  bottom: 10%;
  right: -10%;
  background: #ff007f;
}

.navbar {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 48px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(5, 5, 8, 0.6);
  backdrop-filter: blur(12px);
}

.logo {
  font-family: 'Outfit', sans-serif;
  font-size: 1.3rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.logo .accent {
  color: #ff007f;
  text-shadow: 0 0 10px rgba(255, 0, 127, 0.4);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 32px;
}

.nav-links a {
  color: #8c8c9e;
  text-decoration: none;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  transition: color 0.2s ease;
}

.nav-links a:hover {
  color: #00f2fe;
}

.nav-cta {
  background: linear-gradient(90deg, #ff007f 0%, #d00062 100%);
  color: #fff !important;
  padding: 10px 20px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(255, 0, 127, 0.3);
}

.nav-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(255, 0, 127, 0.5);
}

.hero-section {
  position: relative;
  z-index: 5;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 24px;
  max-width: 1100px;
  margin: 0 auto;
}

.badge-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 6px 16px;
  border-radius: 99px;
  margin-bottom: 24px;
}

.live-tag {
  background: #ff007f;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 99px;
  letter-spacing: 0.05em;
  box-shadow: 0 0 8px #ff007f;
}

.badge-text {
  font-size: 0.65rem;
  font-weight: 800;
  color: #a0a0b0;
  letter-spacing: 0.12em;
}

.hero-title {
  font-family: 'Outfit', sans-serif;
  font-size: 4rem;
  font-weight: 950;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin-bottom: 24px;
}

.gradient-text {
  background: linear-gradient(135deg, #00f2fe 0%, #ff007f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-lead {
  font-size: 1.15rem;
  color: #8c8c9e;
  max-width: 680px;
  line-height: 1.6;
  margin-bottom: 40px;
}

.action-row {
  display: flex;
  gap: 16px;
  margin-bottom: 64px;
}

.primary-btn {
  background: #00f2fe;
  color: #000;
  text-decoration: none;
  font-weight: 800;
  padding: 16px 32px;
  border-radius: 8px;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  box-shadow: 0 6px 20px rgba(0, 242, 254, 0.3);
  transition: all 0.2s ease;
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 242, 254, 0.5);
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.03);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-decoration: none;
  font-weight: 700;
  padding: 16px 32px;
  border-radius: 8px;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  transition: all 0.2s ease;
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.stats-row {
  display: flex;
  width: 100%;
  max-width: 800px;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px 48px;
  margin-bottom: 80px;
  gap: 24px;
}

.stat-card h4 {
  font-family: 'Outfit', sans-serif;
  font-size: 2rem;
  font-weight: 900;
  color: #fff;
}

.stat-card p {
  font-size: 0.75rem;
  color: #606072;
  font-weight: 700;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  width: 100%;
}

.feature-card {
  background: rgba(18, 18, 24, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 32px;
  text-align: left;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.feature-card:hover {
  border-color: rgba(0, 242, 254, 0.2);
  background: rgba(18, 18, 24, 0.7);
  transform: translateY(-2px);
}

.feature-card .icon {
  font-size: 2rem;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.2rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 12px;
}

.feature-card p {
  font-size: 0.85rem;
  color: #8c8c9e;
  line-height: 1.5;
}

.footer {
  position: relative;
  z-index: 10;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding: 32px 24px;
  text-align: center;
  font-size: 0.75rem;
  color: #555562;
  margin-top: auto;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .stats-row {
    flex-direction: column;
    padding: 24px;
    align-items: center;
    gap: 32px;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
