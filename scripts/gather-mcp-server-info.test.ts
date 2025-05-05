import { extractGitHubInfo } from './gather-mcp-server-info'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

// Test GitHub repositories with Docker-based MCP servers
const testRepos = [
  'https://github.com/github/github-mcp-server',
  'https://github.com/picahq/mcp-server',
]

describe('Docker-based MCP Server Extraction', () => {
  // Set longer timeout since we're making real API calls
  jest.setTimeout(30000)

  test('should extract Docker-based MCP servers from GitHub repos', async () => {
    const githubToken = process.env.GITHUB_TOKEN

    for (const repoUrl of testRepos) {
      // Extract manifest information
      const manifest = await extractGitHubInfo(repoUrl, githubToken)

      // Verify extraction results
      expect(manifest).not.toBeNull()

      if (manifest) {
        // Verify basic manifest structure
        expect(manifest.name).toBeDefined()
        expect(manifest.server).toBeDefined()
        expect(manifest.server.command).toBeDefined()
        expect(manifest.server.args).toBeDefined()

        // Verify Docker command
        expect(manifest.server.command).toBe('docker')
        expect(manifest.server.args).toContain('run')
      }
    }
  })

  test('should handle extraction failures gracefully', async () => {
    const invalidRepoUrl = 'https://github.com/invalid/nonexistent-repo'
    const githubToken = process.env.GITHUB_TOKEN

    // Attempt to extract from an invalid repository
    const manifest = await extractGitHubInfo(invalidRepoUrl, githubToken)

    // Verify the result is null for invalid repositories
    expect(manifest).toBeNull()
  })
})
