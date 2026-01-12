<script setup lang="ts">
import { v4 as uuid } from 'uuid'
import { ref } from 'vue'
import { useCommandsStore } from '../../store/commands.store'

const store = useCommandsStore()

const name = ref('')
const command = ref('')

const save = async () => {
  await store.addCommand({
    id: uuid(),
    name: name.value,
    command: command.value,
  })
}
</script>

<template>
  <div>
    <input v-model="name" placeholder="Nombre" />
    <input v-model="command" placeholder="Comando" />
    <button @click="save">Guardar</button>
  </div>
</template>
