<template>
  <div class="email-verified-container">
    <div class="card">
      <template v-if="status === 'success'">
        <div class="success-icon">✓</div>
        <h1>Email Verified!</h1>
        <p class="message">{{ message }}</p>
        <p class="redirect-text">Redirecting to login in {{ countdown }}s...</p>
      </template>
      
      <template v-else>
        <div class="error-icon">✕</div>
        <h1>Verification Failed</h1>
        <p class="message">{{ message }}</p>
        <router-link to="/register" class="btn-primary">
          Back to Registration
        </router-link>
      </template>
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';

const route = useRoute();
const router = useRouter();
const status = ref(route.query.status || 'error');
const message = ref(route.query.message || 'Unknown error occurred');
const countdown = ref(5);

onMounted(() => {
  if (status.value === 'success') {
    const interval = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearInterval(interval);
        router.push('/login');
      }
    }, 1000);
  }
});
</script>

<style scoped>
.email-verified-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
}

.success-icon {
  font-size: 60px;
  color: #28a745;
  margin-bottom: 20px;
}

.error-icon {
  font-size: 60px;
  color: #dc3545;
  margin-bottom: 20px;
}

h1 {
  margin: 20px 0 10px;
  color: #333;
}

.message {
  color: #666;
  margin: 20px 0;
  font-size: 16px;
}

.redirect-text {
  color: #999;
  font-size: 14px;
  margin-top: 20px;
}

.btn-primary {
  display: inline-block;
  padding: 10px 30px;
  background: #667eea;
  color: white;
  text-decoration: none;
  border-radius: 5px;
  margin-top: 20px;
  transition: background 0.3s;
}

.btn-primary:hover {
  background: #764ba2;
}
</style>
