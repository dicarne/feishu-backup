<script setup lang="ts">
import { NMessageProvider, NDialogProvider } from 'naive-ui'


</script>

<template>
  <n-message-provider>
    <n-dialog-provider>
      <router-view />
    </n-dialog-provider>
  </n-message-provider>
</template>

<style>
body {
  margin: 0px;
}

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
