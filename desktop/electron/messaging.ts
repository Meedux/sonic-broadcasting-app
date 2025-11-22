export const IPC_CHANNELS = {
  GET_COMMUNICATION_STATE: 'communication:get-state',
  COMMUNICATION_STATUS: 'communication:status',
  GET_DESKTOP_SOURCES: 'desktop:get-sources',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
