/**
 * Type definitions for MCP server manifests
 * Following the schema defined in the proposal
 */

export interface McpServerInput {
  id: string
  type: string
  description: string
  password?: boolean
  required?: boolean
}

export interface McpServerEnv {
  [key: string]: string
}

export interface McpServerConfig {
  command: string
  args: string[]
  env: McpServerEnv
  timeout?: number
}

export interface McpRepository {
  type: string
  url: string
}

export interface McpServerManifest {
  name: string
  version: string
  description: string
  vendor: string
  homepage?: string
  repository?: McpRepository
  license?: string
  keywords?: string[]
  platforms?: string[]
  protocol: string
  inputs: McpServerInput[]
  server: McpServerConfig
}

// Internal runtime representation of an MCP server
export interface McpServer {
  name: string
  description: string
  aliases: string[]
  manifest: McpServerManifest
  buildConfig: (inputs: Record<string, any>) => {
    command: string
    args: string[]
    env: Record<string, string>
  }
}
