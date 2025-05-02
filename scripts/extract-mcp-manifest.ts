#!/usr/bin/env node

/**
 * Script to extract MCP manifest from a GitHub repository
 *
 * Usage: node extract-mcp-manifest.ts <github-repo-url> [github-token]
 * Example: node extract-mcp-manifest.ts https://github.com/mendableai/firecrawl-mcp-server
 */

import { extractGitHubInfo } from './gather-mcp-server-info'
import fs from 'fs'
import path from 'path'

async function main() {
  const repoUrl = process.argv[2]
  const githubToken = process.argv[3]

  if (!repoUrl) {
    console.error('Error: GitHub repository URL is required')
    console.log('Usage: node extract-mcp-manifest.ts <github-repo-url> [github-token]')
    console.log('Example: node extract-mcp-manifest.ts https://github.com/mendableai/firecrawl-mcp-server')
    process.exit(1)
  }

  // Validate GitHub URL format
  if (!repoUrl.startsWith('https://github.com/') || repoUrl.split('/').length < 5) {
    console.error('Error: Invalid GitHub repository URL format')
    console.log('URL must be in format: https://github.com/{owner}/{repo}')
    process.exit(1)
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
    const outputDir = path.join(process.cwd(), 'manifests')

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
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
