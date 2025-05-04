#!/usr/bin/env node

/**
 * Script to extract MCP manifest from a GitHub repository
 *
 * Usage: node extract-mcp-manifest.ts <github-repo-url> [github-token]
 * Example: node extract-mcp-manifest.ts https://github.com/mendableai/firecrawl-mcp-server
 *
 * Environment variables:
 * - GITHUB_TOKEN: GitHub personal access token (can also be set in .env file)
 * - MANIFESTS_PATH: Custom path for saving manifests (default: ./manifests)
 */

import { extractGitHubInfo } from './gather-mcp-server-info'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config({ debug: true })

// Get GitHub token from environment variables or CLI args
const getGitHubToken = (): string | undefined => {
  // Priority:
  // 1. Command line argument
  // 2. Environment variable
  const cliToken = process.argv[3]
  const envToken = process.env.GITHUB_TOKEN

  return cliToken || envToken
}

async function main() {
  const repoUrl = process.argv[2]
  const githubToken = getGitHubToken()

  if (!repoUrl) {
    console.error('Error: GitHub repository URL is required')
    console.log('Usage: node extract-mcp-manifest.ts <github-repo-url> [github-token]')
    console.log('Example: node extract-mcp-manifest.ts https://github.com/mendableai/firecrawl-mcp-server')
    console.log('\nYou can also set the GITHUB_TOKEN environment variable or add it to .env file')
    process.exit(1)
  }

  // Validate GitHub URL format
  if (!repoUrl.startsWith('https://github.com/') || repoUrl.split('/').length < 5) {
    console.error('Error: Invalid GitHub repository URL format')
    console.log('URL must be in format: https://github.com/{owner}/{repo}')
    process.exit(1)
  }

  if (githubToken) {
    console.log(`Using GitHub token for authentication`)
  } else {
    console.log('No GitHub token provided. API rate limits will be lower.')
  }

  console.log(`Extracting MCP manifest from ${repoUrl}...`)

  try {
    const manifest = await extractGitHubInfo(repoUrl, githubToken)

    if (!manifest) {
      console.error('Failed to extract MCP manifest')
      process.exit(1)
    }

    // Output the manifest info
    console.log('\n=== MCP Server Information ===')
    console.log(`Name: ${manifest.name}`)
    console.log(`Description: ${manifest.description}`)
    console.log(`Version: ${manifest.version}`)
    console.log(`License: ${manifest.license}`)
    console.log(`Homepage: ${manifest.homepage}`)
    console.log(`Repository: ${manifest.repository?.url || repoUrl}`)

    if (manifest.keywords && manifest.keywords.length > 0) {
      console.log(`Keywords: ${manifest.keywords.join(', ')}`)
    }

    if (manifest.inputs && manifest.inputs.length > 0) {
      console.log(`\nInputs:`)
      manifest.inputs.forEach((input) => {
        console.log(`  - ${input.id}: ${input.description} (${input.password ? 'password' : 'text'})`)
      })
    }

    console.log(`\nServer configuration:`)
    console.log(`  Command: ${manifest.server.command}`)
    console.log(`  Args: ${manifest.server.args.join(' ')}`)
    console.log(`  Environment variables: ${Object.keys(manifest.server.env).join(', ')}`)

    // Save to file
    const repoName = repoUrl.split('/').pop() || 'unknown-repo'
    const manifestsPathFromEnv = process.env.MANIFESTS_PATH
    const outputDir = manifestsPathFromEnv ? path.resolve(manifestsPathFromEnv) : path.join(process.cwd(), 'manifests')

    // Create output directory only after successfully extracting the manifest
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
      console.log(`Created output directory at ${outputDir}`)
    }

    const outputFile = path.join(outputDir, `${repoName}.json`)
    fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2))

    console.log(`\nManifest saved to: ${outputFile}`)
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message)
    } else {
      console.error('An unknown error occurred')
    }
    process.exit(1)
  }
}

main()
