import fs from 'fs/promises'
import path from 'path'
import { McpServer, McpServerManifest } from './types'
import { logger } from './logger'
/**
 * MCP server definitions and management
 */

// Map of MCP servers keyed by name
export const servers: Record<string, McpServer> = {}

// Alias for backward compatibility
export const packages = servers

/**
 * Initialize MCP servers from manifest files
 */
export async function loadManifests(manifestsDir = 'manifests'): Promise<void> {
  try {
    // Check if manifests directory exists
    const dirExists = await fs.stat(manifestsDir).catch(() => false)
    if (!dirExists) {
      logger.warn(`Manifests directory '${manifestsDir}' does not exist`)
      return
    }

    // Read all json files in the manifests directory
    const files = await fs.readdir(manifestsDir)
    const manifestFiles = files.filter((file) => file.endsWith('.json'))

    for (const file of manifestFiles) {
      try {
        const filePath = path.join(manifestsDir, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const manifest = JSON.parse(content) as McpServerManifest

        // Convert manifest to McpServer
        const server = manifestToServer(manifest)

        // Add to servers map
        servers[manifest.name] = server
      } catch (error: any) {
        logger.error(`Error loading manifest from ${file}: ${error.message}`)
      }
    }
  } catch (error: any) {
    logger.error(`Error loading manifests: ${error.message}`)
  }
}

/**
 * Load a manifest from a URL or file path
 */
export async function downloadManifest(source: string): Promise<McpServer | null> {
  try {
    logger.info(`Loading MCP server manifest from ${source}...`)

    let content: string

    // Check for URL schemes - either includes "://" or starts with "data:"
    if (source.includes('://') || source.startsWith('data:')) {
      // It's a URL, fetch it
      const response = await fetch(source)

      if (!response.ok) {
        throw new Error(`Failed to download manifest: ${response.statusText}`)
      }

      content = await response.text()
    } else {
      // Treat as a file path
      try {
        content = await fs.readFile(source, 'utf-8')
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          throw new Error(`Manifest file not found: ${source}`)
        }
        throw error
      }
    }

    const manifest = JSON.parse(content) as McpServerManifest

    // Convert manifest to McpServer
    const server = manifestToServer(manifest)

    // Add to servers map
    servers[manifest.name] = server

    return server
  } catch (error: any) {
    logger.error(`Error loading manifest from ${source}: ${error.message}`)
    return null
  }
}

/**
 * Convert a manifest to an McpServer object
 */
function manifestToServer(manifest: McpServerManifest): McpServer {
  // Generate aliases from keywords and name
  const aliases = manifest.keywords ? manifest.keywords.filter((k) => k !== 'mcp' && k !== 'ai') : []

  // Create the runtime server object
  return {
    name: manifest.vendor || manifest.name,
    description: manifest.description,
    aliases,
    manifest,
    buildConfig: (inputs: Record<string, any>) => {
      // Create a copy of the env object from the manifest
      const env: Record<string, string> = { ...manifest.server.env }

      // Replace variable placeholders with actual input values
      for (const [key, value] of Object.entries(env)) {
        // Handle variables like ${input:github_token}
        if (typeof value === 'string' && value.startsWith('${input:') && value.endsWith('}')) {
          const inputName = value.substring(8, value.length - 1)
          if (inputs[inputName]) {
            env[key] = inputs[inputName]
          }
        }
      }

      return {
        command: manifest.server.command,
        args: manifest.server.args,
        env,
      }
    },
  }
}

// Helper function to search servers
export async function searchPackages(term: string): Promise<string[]> {
  if (Object.keys(servers).length === 0) {
    await loadManifests()
  }
  const serverNames = Object.keys(servers)
  if (!term) return serverNames

  const results = serverNames.filter((name) => {
    const server = servers[name]
    return (
      name.includes(term.toLowerCase()) ||
      server?.description.toLowerCase().includes(term.toLowerCase()) ||
      server?.aliases.some((alias) => alias.includes(term.toLowerCase()))
    )
  })
  return results
}
