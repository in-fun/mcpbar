/**
 * Type definitions for MCP manifest extraction
 */

// Source repository structure from source.json
export interface SourceRepo {
  name: string
  repository: string
  slug: string
  homepage: string | null
  overview: string
}

// MCP server configuration
export interface MCPServerConfig {
  command: string
  args: string[]
  env: Record<string, string>
  timeout?: number
}

// MCP input definition
export interface MCPInput {
  id: string
  type: string
  description: string
  password?: boolean
}

// Complete MCP manifest structure
export interface MCPManifest {
  name: string
  version: string
  description: string
  homepage: string
  repository?: {
    type: string
    url: string
  }
  license: string
  keywords?: string[]
  inputs?: MCPInput[]
  server: MCPServerConfig
}

// Rate limiting configuration
export interface RateLimit {
  requestsPerMinute: number
  delayBetweenRequests: number
}
