#!/usr/bin/env node

/**
 * Script to extract MCP manifests from GitHub repositories in batch
 * With rate limiting to avoid hitting GitHub API limits
 *
 * Usage: node batch-extract-mcp-manifests.ts
 *
 * Environment variables:
 * - GITHUB_TOKEN: GitHub personal access token (can also be set in .env file)
 * - RATE_LIMIT_PER_HOUR: Number of requests per hour (default: follows GitHub limits - 5000 with token, 60 without)
 * - DELAY_BETWEEN_REQUESTS_MS: Milliseconds between requests (default: 1000)
 * - REGISTRY_PATH: Custom path for saving manifests (default: ./registry)
 */

import fs from 'fs'
import path from 'path'
import { SourceRepo, RateLimit } from './types'
import { extractGitHubInfo } from './gather-mcp-server-info'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

// Get GitHub token from environment variables or CLI args
const getGitHubToken = (): string | undefined => {
  // Priority:
  // 1. Command line argument
  // 2. Environment variable
  const cliToken = process.argv[2]
  const envToken = process.env.GITHUB_TOKEN

  return cliToken || envToken
}

// GitHub API rate limits
// https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
const GITHUB_RATE_LIMITS = {
  AUTHENTICATED: 5000, // 5000 requests per hour with authentication
  UNAUTHENTICATED: 60, // 60 requests per hour without authentication
}

// Determine rate limits based on whether a token is provided
const calculateRateLimits = (token?: string): RateLimit => {
  const userProvidedLimit = Number(process.env.RATE_LIMIT_PER_HOUR) || 0
  const hasToken = !!token

  // Use user-provided limit, or GitHub's limits based on authentication
  const requestsPerHour =
    userProvidedLimit || (hasToken ? GITHUB_RATE_LIMITS.AUTHENTICATED : GITHUB_RATE_LIMITS.UNAUTHENTICATED)

  // Apply a 10% safety buffer to stay well under the limit
  const safeRequestsPerHour = Math.floor(requestsPerHour * 0.9)

  // Calculate delay between requests in milliseconds
  // Formula: (60 * 60 * 1000) ms per hour / requests per hour
  const delayMs = Math.ceil(3600000 / safeRequestsPerHour)

  // Use the calculated delay or the user-specified delay, whichever is longer
  // Enforce a minimum delay of 100ms to prevent hammering the API
  const delayBetweenRequests = Math.max(100, Number(process.env.DELAY_BETWEEN_REQUESTS_MS) || delayMs)

  // Calculate effective requests per minute based on the delay
  // This is just for informational purposes
  const requestsPerMinute = Math.floor(60000 / delayBetweenRequests)

  return {
    requestsPerMinute,
    delayBetweenRequests,
  }
}

// Sleep function for rate limiting
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Process a single repository
 */
async function processRepository(repo: SourceRepo, registryDir: string, githubToken?: string): Promise<boolean> {
  // Extract GitHub URL from repository field
  const repoUrl = repo.repository

  if (!repoUrl || !repoUrl.startsWith('https://github.com/')) {
    console.warn(`Skipping invalid GitHub URL: ${repoUrl}`)
    return false
  }

  if (!repo.slug) {
    console.warn(`Skipping invalid slug: ${repo.slug}`)
    return false
  }

  // Get the slug parts to create directory structure
  const slugParts = repo.slug.split('/')

  if (slugParts.length < 2) {
    console.warn(`Invalid slug format: ${repo.slug}, skipping`)
    return false
  }

  // Extract MCP manifest
  try {
    if (typeof repoUrl !== 'string') {
      console.warn(`Invalid repository URL for ${repo.slug}: ${repoUrl}`)
      return false
    }

    console.log(`Extracting MCP manifest for ${repo.slug}...`)

    const manifest = await extractGitHubInfo(repoUrl, githubToken)

    if (manifest) {
      // Only create directories and save the file if we have a valid manifest
      const ownerDir = path.join(registryDir, slugParts[0] as string)

      // Create owner directory if it doesn't exist
      if (!fs.existsSync(ownerDir)) {
        fs.mkdirSync(ownerDir, { recursive: true })
        console.log(`Created directory for owner: ${slugParts[0]}`)
      }

      const outputFilePath = path.join(registryDir, `${slugParts[0]}/${slugParts[1]}.json`)

      // Save manifest to file
      fs.writeFileSync(outputFilePath, JSON.stringify(manifest, null, 2))
      console.log(`✅ Successfully saved manifest to ${outputFilePath}`)
      return true
    } else {
      console.warn(`❌ Failed to extract MCP manifest for ${repo.repository}`)
      return false
    }
  } catch (error) {
    console.error(`❌ Error processing ${repo.slug}:`, error instanceof Error ? error.message : error)
    return false
  }
}

async function batchExtractMCPManifests(githubToken?: string): Promise<void> {
  console.log('🚀 Starting batch extraction of MCP manifests...')

  // Calculate rate limits based on token
  const rateLimits = calculateRateLimits(githubToken)

  // Log rate limiting information
  console.log('📊 Rate limiting configuration:')
  console.log(`  - Requests per minute: ${rateLimits.requestsPerMinute}`)
  console.log(`  - Delay between requests: ${rateLimits.delayBetweenRequests}ms`)

  // Read source.json file
  const sourceFilePath = path.resolve(process.cwd(), 'scripts', 'source.json')
  // Also check current directory if running from scripts directory
  const altSourceFilePath = path.resolve(process.cwd(), 'source.json')

  let sourceFile = sourceFilePath
  if (!fs.existsSync(sourceFilePath) && fs.existsSync(altSourceFilePath)) {
    sourceFile = altSourceFilePath
  }

  if (!fs.existsSync(sourceFile)) {
    console.error(`Error: Source file not found at either:\n  - ${sourceFilePath}\n  - ${altSourceFilePath}`)
    process.exit(1)
  }

  let sourceRepos: SourceRepo[]
  try {
    console.log(`Reading source file from ${sourceFile}`)
    const sourceContent = fs.readFileSync(sourceFile, 'utf8')
    sourceRepos = JSON.parse(sourceContent)
    console.log(`Found ${sourceRepos.length} repositories to process`)

    // Calculate estimate completion time based on rate limits
    const estimatedMinutes = Math.ceil((sourceRepos.length * rateLimits.delayBetweenRequests) / 60000)
    console.log(`Estimated completion time: ~${estimatedMinutes} minutes`)
  } catch (error) {
    console.error('Error parsing source.json:', error instanceof Error ? error.message : error)
    process.exit(1)
  }

  // Create registry directory if it doesn't exist
  const registryPathFromEnv = process.env.REGISTRY_PATH
  const registryDir = registryPathFromEnv ? path.resolve(registryPathFromEnv) : path.join(process.cwd(), 'registry')

  if (!fs.existsSync(registryDir)) {
    fs.mkdirSync(registryDir, { recursive: true })
    console.log(`Created registry directory at ${registryDir}`)
  } else {
    console.log(`Using existing registry directory at ${registryDir}`)
  }

  // Process each repository with rate limiting
  let processedCount = 0
  let successCount = 0
  let errorCount = 0
  const startTime = new Date()

  for (const repo of sourceRepos) {
    const currentTime = new Date()
    const elapsedTimeInMs = currentTime.getTime() - startTime.getTime()
    const remainingItems = sourceRepos.length - processedCount
    const estimatedRemainingTimeInMs = (elapsedTimeInMs / processedCount || 0) * remainingItems
    const remainingMinutes = Math.ceil(estimatedRemainingTimeInMs / 60000)

    console.log(
      `\n📦 Processing [${processedCount + 1}/${sourceRepos.length}] ` +
        `(${Math.round((processedCount / sourceRepos.length) * 100)}%): ${repo.slug}`,
    )

    if (processedCount > 0) {
      console.log(
        `⏱️ Progress: ${processedCount}/${sourceRepos.length} repositories processed, ` +
          `estimated ${remainingMinutes} minutes remaining`,
      )
    }

    const success = await processRepository(repo, registryDir, githubToken)
    if (success) {
      successCount++
    } else {
      errorCount++
    }

    processedCount++

    // Apply rate limiting for the next request
    if (processedCount < sourceRepos.length) {
      console.log(`⏱️ Rate limiting: waiting ${rateLimits.delayBetweenRequests}ms before next request`)
      await sleep(rateLimits.delayBetweenRequests)
    }
  }

  console.log('\n=== 📊 Batch Processing Summary ===')
  console.log(`Total repositories: ${sourceRepos.length}`)
  console.log(`Successfully processed: ${successCount}`)
  console.log(`Failed: ${errorCount}`)

  // Calculate and display performance information
  const endTime = new Date()
  const totalTimeInMs = endTime.getTime() - startTime.getTime()
  const totalMinutes = Math.round((totalTimeInMs / 60000) * 10) / 10 // Round to 1 decimal place
  const averageTimePerRepo = Math.round((totalTimeInMs / processedCount / 1000) * 10) / 10 // In seconds

  console.log(`\n=== ⏱️ Performance ===`)
  console.log(`Total runtime: ${totalMinutes} minutes`)
  console.log(`Average time per repository: ${averageTimePerRepo} seconds`)
  console.log(`Rate limit delay: ${rateLimits.delayBetweenRequests}ms between requests`)

  if (successCount > 0) {
    console.log(`\n✨ MCP manifests saved to ${path.resolve(registryDir)}`)
  }
}

async function main(): Promise<void> {
  const githubToken = getGitHubToken()

  if (githubToken) {
    console.log('🔑 GitHub token provided, using for API requests')
  } else {
    console.warn('⚠️ Warning: No GitHub token provided. API rate limits will be lower.')
    console.log('To provide a token, you can:')
    console.log('  1. Set GITHUB_TOKEN environment variable')
    console.log('  2. Add GITHUB_TOKEN to .env file')
    console.log('  3. Pass token as argument: node batch-extract-mcp-manifests.ts <github-token>')
  }

  try {
    await batchExtractMCPManifests(githubToken)
  } catch (error) {
    console.error('❌ Fatal error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
