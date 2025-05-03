# MCP Manifest Extraction Scripts

This directory contains scripts for extracting and managing Model Context Protocol (MCP) manifests.

## Batch Extraction Script

The `batch-extract-mcp-manifests.ts` script allows you to extract MCP manifests from multiple GitHub repositories in a batch process, with rate limiting to avoid hitting GitHub API limits.

### Setup

1. Create a `source.json` file in the `scripts` directory with the following structure:

   ```json
   [
     {
       "name": "Repository Name",
       "repository": "https://github.com/owner/repo",
       "slug": "owner/repo",
       "homepage": "optional homepage URL",
       "overview": "Brief description of the repository"
     },
     ...
   ]
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Configure environment variables (optional):

   Create a `.env` file in the project root with the following variables:

   ```
   # GitHub Token for API access (recommended to avoid rate limits)
   GITHUB_TOKEN=your_github_personal_access_token

   # Rate limiting configuration
   RATE_LIMIT_PER_MINUTE=30
   DELAY_BETWEEN_REQUESTS_MS=2000
   ```

### Usage

You can configure the GitHub token in several ways (in order of priority):

1. Pass as a command-line argument:

   ```
   npm run extract-mcp -- your_github_token
   ```

2. Set as an environment variable:

   ```
   export GITHUB_TOKEN=your_github_token
   npm run extract-mcp
   ```

3. Add to a `.env` file in the project root

Run without specifying a GitHub token (will use environment variable or .env if available):

```
npm run extract-mcp
```

The script will:

1. Read the repositories from `source.json`
2. Create a registry directory structure based on GitHub slugs
3. Extract MCP manifests for each repository
4. Save the manifests in the registry directory
5. Apply rate limiting to avoid GitHub API restrictions

### Rate Limiting

The script includes rate limiting to avoid hitting GitHub API limits. You can configure these settings through environment variables:

- `RATE_LIMIT_PER_MINUTE`: Number of requests per minute (default: 30)
- `DELAY_BETWEEN_REQUESTS_MS`: Milliseconds between requests (default: 2000)

### Registry Directory Structure

The extracted manifests will be saved in a registry directory with the following structure:

```
registry/
  owner1/
    repo1.json
    repo2.json
  owner2/
    repo1.json
```

## Single Repository Extraction

The `extract-mcp-manifest.ts` script can be used to extract a manifest from a single repository:

```
npm run extract-mcp-single -- https://github.com/owner/repo
```

This script also supports environment variables for the GitHub token just like the batch extraction script.

## Development

To add new features or fix issues:

1. Make changes to the scripts
2. Run the TypeScript compiler to check for errors:
   ```
   npx tsc
   ```
3. Test your changes with a small subset of repositories

# Environment Variables

Both scripts support the following environment variables:

| Variable                    | Description                                        | Default                         |
| --------------------------- | -------------------------------------------------- | ------------------------------- |
| `GITHUB_TOKEN`              | GitHub personal access token for API access        | none                            |
| `RATE_LIMIT_PER_HOUR`       | Number of requests per hour for batch extraction   | 5000 with token, 60 without     |
| `DELAY_BETWEEN_REQUESTS_MS` | Milliseconds between requests for batch extraction | Calculated based on rate limits |
| `REGISTRY_PATH`             | Custom path for saving batch manifests             | ./registry                      |
| `MANIFESTS_PATH`            | Custom path for saving single manifests            | ./manifests                     |

You can set these in your environment or in a `.env` file at the project root.

## Rate Limiting

The batch script uses GitHub's official API [rate limits](https://docs.github.com/en/enterprise-cloud@latest/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28#primary-rate-limit-for-authenticated-users):

- **With authentication**: 5000 requests per hour
- **Without authentication**: 60 requests per hour

The script automatically calculates appropriate delays between requests based on these limits. If you provide a GitHub token, the script will use the higher rate limit. You can override these defaults by setting the `RATE_LIMIT_PER_HOUR` environment variable.
