<script setup lang="ts">
import type { Command } from '../../models/command.model'

const props = defineProps<{
  command: Command
}>()

const execute = () => {
  fetch(`http://localhost:3000/commands/execute/${props.command.id}`, {
    method: 'POST',
  })
}
</script>

<template>
  <button class="deck-button" @click="execute">
    <img v-if="props.command.icon" :src="props.command.icon" />
    <span>{{ props.command.name }}</span>
  </button>
</template>
