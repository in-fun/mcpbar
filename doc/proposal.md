# 📄 RFC: `mcp.json` – A Standardized Manifest for Model Context Protocol Servers

**RFC Status**: Draft\
**Author**: lilac\
**Date**: April 14, 2025\
**Category**: Specification\
**Reviewers**: [List of Reviewers]

---

## Table of Contents

- [📄 RFC: `mcp.json` – A Standardized Manifest for Model Context Protocol Servers](#-rfc-mcpjson--a-standardized-manifest-for-model-context-protocol-servers)
  - [Table of Contents](#table-of-contents)
  - [Abstract](#abstract)
  - [Motivation](#motivation)
  - [Proposal](#proposal)
    - [Overview](#overview)
    - [Design Principles](#design-principles)
  - [Schema Definition](#schema-definition)
  - [Benefits](#benefits)
  - [Implementation Considerations](#implementation-considerations)
  - [Security Considerations](#security-considerations)
  - [References](#references)

---

## Abstract

This proposal introduces a standardized manifest file, `mcp.json`, for Model Context Protocol (MCP) servers. The manifest aims to streamline the discovery, installation, and configuration of MCP servers across various clients, such as Visual Studio Code and Claude. By adopting a structured approach similar to `package.json` in Node.js, this proposal seeks to enhance the MCP ecosystem's scalability and interoperability.

---

## Motivation

Currently, the MCP ecosystem lacks a standardized method for:

- Discovering available MCP servers.
- Installing and configuring MCP servers seamlessly across different clients.
- Managing user-specific configurations, such as tokens and secrets.

This absence hinders the adoption and integration of MCP servers, leading to fragmented solutions and increased setup complexity.

---

## Proposal

### Overview

Introduce a standardized `mcp.json` manifest file that encapsulates all necessary metadata and configuration details required to install and run an MCP server. This file will serve as a single source of truth for MCP server specifications, facilitating easier integration and management.

### Design Principles

- **Simplicity**: Each `mcp.json` describes a single MCP server to maintain clarity and ease of use.
- **Standardization**: Adopt conventions similar to existing package managers to leverage familiar patterns.
- **Extensibility**: Allow for future enhancements without breaking existing implementations.
- **Security**: Explicitly define user inputs required for server operation, such as tokens, to ensure secure handling.

---

## Schema Definition

Below is the proposed structure for `mcp.json`:

```json
{
  "name": "github",
  "version": "1.0.0",
  "description": "GitHub MCP Server for AI tools using Model Context Protocol (MCP).",
  "homepage": "https://github.com/github/github-mcp-server",
  "repository": {
    "type": "git",
    "url": "https://github.com/github/github-mcp-server.git"
  },
  "license": "MIT",
  "keywords": [
    "mcp",
    "ai",
    "github",
    "copilot",
    "claude",
    "agent",
    "integration"
  ],
  "inputs": [
    {
      "id": "github_token",
      "type": "promptString",
      "description": "GitHub Personal Access Token",
      "password": true
    }
  ],
  "server": {
    "command": "docker",
    "args": [
      "run",
      "-i",
      "--rm",
      "-e",
      "GITHUB_PERSONAL_ACCESS_TOKEN",
      "ghcr.io/github/github-mcp-server"
    ],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "${input:github_token}"
    },
    "timeout": 60
  }
}
```

**Field Descriptions**:

- **name**: Unique identifier for the MCP server.
- **version**: Semantic versioning of the server.
- **description**: Brief overview of the server's functionality.
- **homepage**: URL to the server's homepage or documentation.
- **repository**: Details of the source code repository.
- **license**: License under which the server is distributed.
- **keywords**: Tags to aid in discovery.
- **inputs**: Array of user inputs required for server operation.
- **server**: Configuration details to run the server, including command, arguments, environment variables, and timeout.

---

## Benefits

- **Enhanced Discoverability**: Standardized metadata facilitates easier discovery of MCP servers by both humans and AI systems.
- **Simplified Installation**: Clients can automate the installation process using the manifest.
- **Improved Security**: Explicit input definitions ensure secure handling of sensitive information.
- **Greater Interoperability**: Consistent configurations across different clients reduce integration issues.
- **AI Integration**: With standardized manifests, AI systems can programmatically discover and suggest MCP servers. This enables powerful new use cases such as MCP tool search engines that can be queried by LLMs. For example, a user may ask their AI agent to search for and recommend a new MCP server based on functionality and integration, expanding the discoverability and utility of MCP tools beyond manually installed options.

---

## Implementation Considerations

- **Tooling**: Development of a CLI tool (e.g., `mcp install <URL>`) to automate installation and configuration based on `mcp.json`.
- **Registry**: Optional centralized registry to index and search available MCP servers.
- **Validation**: Schema validation to ensure manifest files adhere to the defined structure.

---

## Security Considerations

- **Sensitive Inputs**: Fields marked with `"password": true` should be handled securely, ensuring they are not logged or exposed.
- **Environment Variables**: Care must be taken to prevent leakage of sensitive environment variables during server execution.

---

## References

- [ECMAScript Modules (ESM) in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [NPM package.json Specification](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
- [GitHub MCP Server](https://github.com/github/github-mcp-server)
- [VS Code MCP Server Configuration Docs](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)
