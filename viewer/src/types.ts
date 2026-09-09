export type VaultFile = {
  path: string
  title: string
  doc: string
  status: string
  updated: string
  body: string
}

export type VaultFolder = {
  name: string
  count: number
}

export type VaultIndex = {
  generatedAt: string
  folders: VaultFolder[]
  files: VaultFile[]
}
