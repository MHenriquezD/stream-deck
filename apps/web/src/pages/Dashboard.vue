<script setup lang="ts">
import { onMounted } from 'vue'
import { useCommandsStore } from '../store/commands.store'

const store = useCommandsStore()

onMounted(() => {
  store.fetchCommands()
})
</script>

<template>
  <div class="deck">
    <StreamDeckButton
      v-for="cmd in store.commands"
      :key="cmd.id"
      :command="cmd"
    />
  </div>
</template>
