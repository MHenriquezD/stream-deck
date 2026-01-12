import { defineStore } from 'pinia'
import { getCommands, saveCommand } from '../api/commands.api'
import type { Command } from '../models/command.model'

export const useCommandsStore = defineStore('commands', {
  state: () => ({
    commands: [] as Command[],
    loading: false,
  }),

  actions: {
    async fetchCommands() {
      this.loading = true
      this.commands = await getCommands()
      this.loading = false
    },

    async addCommand(command: Command) {
      await saveCommand(command)
      await this.fetchCommands()
    },
  },
})
