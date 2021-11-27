<script setup lang="ts">
import { NMessageProvider } from 'naive-ui'
</script>

<template>
  <n-message-provider>
    <router-view />
  </n-message-provider>
</template>

<style>
#app {
  background-color: rgb(54, 54, 54);
  width: 100vw;
  height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
