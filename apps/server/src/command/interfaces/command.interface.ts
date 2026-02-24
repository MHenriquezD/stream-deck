export interface StreamCommand {
  id: string;
  label: string;
  icon?: string;
  type: string;
  payload: string;
  backgroundColor?: string;
  color?: string;
}

export interface Command {
  id: string;
  name: string;
  command: string;
  backgroundColor?: string;
  color?: string;
}
