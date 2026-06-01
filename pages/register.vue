<!-- pages/register.vue -->
<template>
  <div class="auth-page">
    <div class="grid-overlay"></div>
    <div class="glow-orb magenta"></div>
    
    <header class="navbar">
      <NuxtLink to="/" class="logo">BEAT <span class="accent">ROYALE</span></NuxtLink>
    </header>

    <div class="auth-content">
      <LoginForm />
      <OAuthButtons />
    </div>
  </div>
</template>

<script setup>
import LoginForm from '~/components/auth/LoginForm.vue';
import OAuthButtons from '~/components/auth/OAuthButtons.vue';
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background-color: #050508;
  color: #fff;
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
  opacity: 0.12;
  pointer-events: none;
  z-index: 1;
}

.glow-orb.magenta {
  top: 20%;
  right: -10%;
  background: #ff007f;
}

.navbar {
  position: relative;
  z-index: 10;
  padding: 24px 48px;
}

.logo {
  font-family: 'Outfit', sans-serif;
  font-size: 1.3rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #fff;
  text-decoration: none;
}

.logo .accent {
  color: #ff007f;
}

.auth-content {
  position: relative;
  z-index: 5;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}
</style>
