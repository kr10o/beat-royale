<!-- components/auth/LoginForm.vue -->
<template>
  <div class="glass-form-card">
    <h2 class="form-title">{{ isRegister ? 'CREATE PRODUCER PROFILE' : 'SIGN IN TO DAW BENCH' }}</h2>
    <p class="form-subtitle">{{ isRegister ? 'Register your ELO identity' : 'Load your credentials & setups' }}</p>

    <form @submit.prevent="handleSubmit" class="form-fields">
      <div v-if="isRegister" class="input-group">
        <label for="display-name">Display Producer Name</label>
        <input type="text" id="display-name" v-model="displayName" placeholder="e.g. BEAT_GOD_42" required />
      </div>

      <div class="input-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" v-model="email" placeholder="producer@beatroyale.com" required />
      </div>

      <div class="input-group">
        <label for="password">Security Password</label>
        <input type="password" id="password" v-model="password" placeholder="••••••••" required />
      </div>

      <div v-if="errorMsg" class="alert-error">
        {{ errorMsg }}
      </div>

      <div v-if="successMsg" class="alert-success">
        {{ successMsg }}
      </div>

      <button type="submit" class="submit-btn" :disabled="loading">
        {{ loading ? 'PROCESSING SESSION...' : (isRegister ? 'INITIALIZE PROFILE' : 'ENTER LOBBY') }}
      </button>
    </form>

    <div class="switch-mode">
      <span class="muted-text">{{ isRegister ? 'Already registered?' : 'Need a competitive portfolio?' }}</span>
      <button type="button" class="toggle-btn" @click="isRegister = !isRegister">
        {{ isRegister ? 'Sign In Instead' : 'Register Account' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from '#app';
import { useAuth } from '~/composables/useAuth';

const isRegister = ref(false);
const displayName = ref('');
const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const router = useRouter();
const auth = useAuth();

const handleSubmit = async () => {
  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    if (isRegister.value) {
      const res = await auth.register(email.value, password.value, displayName.value);
      if (res.success) {
        successMsg.value = "Registration successful! Loading DAW...";
        setTimeout(() => router.push(`/profile/${res.userId}`), 1000);
      } else {
        errorMsg.value = res.error || "Registration failed. Try another email.";
      }
    } else {
      const res = await auth.login(email.value, password.value);
      if (res.success) {
        successMsg.value = "Welcome back! Entering staging...";
        // For demonstration, redirect to main-stage battle lobby or profile
        setTimeout(() => router.push('/battle/main-stage'), 1000);
      } else {
        errorMsg.value = res.message || "Invalid credentials provided.";
      }
    }
  } catch (err) {
    errorMsg.value = "Connection lost to edge worker server.";
    console.error(err);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.glass-form-card {
  background: rgba(18, 18, 24, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.form-title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: -0.01em;
  margin-bottom: 8px;
  color: #fff;
  background: linear-gradient(135deg, #00f2fe 0%, #ff007f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
}

.form-subtitle {
  font-size: 0.85rem;
  color: #8f8f9e;
  text-align: center;
  margin-bottom: 32px;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #a0a0b0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.input-group input {
  background: rgba(10, 10, 14, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  padding: 12px 16px;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s ease;
}

.input-group input:focus {
  border-color: #00f2fe;
  box-shadow: 0 0 0 2px rgba(0, 242, 254, 0.15);
  background: rgba(10, 10, 14, 0.9);
}

.alert-error {
  background: rgba(255, 0, 127, 0.15);
  border: 1px solid rgba(255, 0, 127, 0.3);
  border-radius: 8px;
  color: #ff3399;
  padding: 12px;
  font-size: 0.85rem;
  text-align: center;
}

.alert-success {
  background: rgba(57, 255, 20, 0.15);
  border: 1px solid rgba(57, 255, 20, 0.3);
  border-radius: 8px;
  color: #39ff14;
  padding: 12px;
  font-size: 0.85rem;
  text-align: center;
}

.submit-btn {
  background: linear-gradient(90deg, #00f2fe 0%, #0072ff 100%);
  color: #000;
  border: none;
  border-radius: 8px;
  padding: 14px;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: all 0.2s ease;
  margin-top: 10px;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 242, 254, 0.3);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.switch-mode {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
}

.muted-text {
  color: #707080;
}

.toggle-btn {
  background: none;
  border: none;
  color: #00f2fe;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.2s ease;
}

.toggle-btn:hover {
  color: #ff007f;
  text-decoration: underline;
}
</style>
