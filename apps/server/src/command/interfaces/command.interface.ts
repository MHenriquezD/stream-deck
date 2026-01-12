export interface StreamCommand {
  id: string;
  label: string;
  icon?: string;
  type: 'command';
  payload: string;
}

export interface Command {
  id: string;
  name: string;
  command: string;
}
