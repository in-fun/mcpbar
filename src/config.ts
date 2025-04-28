import path from 'node:path'
import os from 'node:os'
import fs from 'fs/promises'
import { logger } from './logger'

// Configuration paths for different MCP clients
const homeDir = os.homedir()
const platformPaths = {
  win32: {
    baseDir: process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'),
    vscodePath: path.join('Code', 'User', 'globalStorage'),
  },
  darwin: {
    baseDir: path.join(homeDir, 'Library', 'Application Support'),
    vscodePath: path.join('Code', 'User', 'globalStorage'),
  },
  linux: {
    baseDir: process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config'),
    vscodePath: path.join('Code/User/globalStorage'),
  },
}

const platform = process.platform as keyof typeof platformPaths
const { baseDir, vscodePath } = platformPaths[platform]

export const clientPaths: Record<string, string> = {
  claude: path.join(baseDir, 'Claude', 'claude_desktop_config.json'),
  cline: path.join(baseDir, vscodePath, 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
  'roo-cline': path.join(baseDir, vscodePath, 'rooveterinaryinc.roo-cline', 'settings', 'cline_mcp_settings.json'),
  windsurf: path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json'),
  witsy: path.join(baseDir, 'Witsy', 'settings.json'),
  enconvo: path.join(homeDir, '.config', 'enconvo', 'mcp_config.json'),
  cursor: path.join(homeDir, '.cursor', 'mcp.json'),
}

export async function readClientConfig(client: string) {
  const configFile = clientPaths[client]
  if (!configFile) {
    throw new Error(`Unknown client: ${client}`)
  }

  try {
    const rawConfig = await fs.readFile(configFile, 'utf-8')
    return JSON.parse(rawConfig)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      // File doesn't exist, create initial config
      const initialConfig = { mcpServers: {} }
      await fs.mkdir(path.dirname(configFile), { recursive: true })
      await fs.writeFile(configFile, JSON.stringify(initialConfig, null, 2))
      return initialConfig
    }
    throw err
  }
}

export async function writeClientConfig(client: string, config: any) {
  const configFile = clientPaths[client]
  if (!configFile) {
    throw new Error(`Unknown client: ${client}`)
  }

  await fs.mkdir(path.dirname(configFile), { recursive: true })
  await fs.writeFile(configFile, JSON.stringify(config, null, 2))
  logger.success(`${client} configuration updated at ${configFile}`)
}

export function getAvailableClients(): string[] {
  return Object.keys(clientPaths)
}
