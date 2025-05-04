# MCP Bar

Your all-in-one CLI manager for MCP servers and home to an open registry with 1500+ ready-to-use servers. Install, manage, and discover AI tools effortlessly.

## 🧩 MCP Manifest Concept

MCPBar implements a standardized approach for MCP servers using `mcp.json` manifest files. This solution:

- 📄 Uses a **standardized manifest format** (`mcp.json`) similar to `package.json` in npm
- 🌐 Supports a **decentralized distribution model** where developers can host manifests anywhere
- 🔄 Allows installation directly from URLs, local files, or package aliases
- 🔍 Features an optional registry for enhanced discoverability
- 🔐 Securely handles server configuration with explicit handling of sensitive inputs
- 📚 Includes an **open registry** with 1500+ MCP servers in the `registry` directory

This approach simplifies discovery, installation, and configuration of MCP servers across different clients, making the MCP ecosystem more accessible and organized.

The extensive registry is the foundation of an open and standardized MCP ecosystem, enabling developers to easily discover, share, and contribute to the growing collection of MCP servers.

For more details, see the [MCP Manifest Proposal](./doc/proposal.md) and [Concept Overview](./doc/idea.md).

## 🌟 Features

- 🔄 Simple installation and management of MCP servers
- 🛠️ User-friendly command-line interface with interactive prompts for easy configuration
- 📱 Works cross-platform including Windows, macOS, and Linux
- 🔍 Search, install, disable, and enable MCP servers with ease
- 🔌 Supports multiple MCP clients including Claude, Cline, Cursor, Windsurf, Witsy, and more

## 📦 Installation

```sh
npm install -g mcpbar
```

## 🔧 Usage

### Basic Commands

```sh
# 🔍 Install a server
mcpbar install ./manifests/github.json

# 🗑️ Remove a server
mcpbar remove playwright # remove playwright server

# 📋 List installed servers
mcpbar list # show existing mcp servers installed on the device
```

### Search for MCP Servers

Search for available MCP packages in the registry:

```bash
mcpbar search <query>        # Search for MCP servers and opens in your browser
mcpbar s <query>             # Short alias for search
```

### Install a MCP Server

Install a MCP server from a URL (any protocol supported by fetch), file path, or package alias:

```bash
mcpbar install <path-to-manifest.json>  # Install from local manifest file
mcpbar i <path-to-manifest.json>        # Short alias for install
mcpbar install https://example.com/manifest.json  # Install from HTTP URL
mcpbar install file:///path/to/manifest.json     # Install using file protocol
mcpbar install vendor/package-name      # Install using package alias
```

Example:

```bash
# Install from a local manifest file
mcpbar install ./manifests/github.json

# Install using package alias (shorthand)
mcpbar i 21st-dev/magic-mcp

# Install from a URL
mcpbar install https://esm.sh/gh/in-fun/mcpbar/registry/21st-dev/magic-mcp.json

# Install using file protocol
mcpbar install file:///Users/username/projects/manifests/custom.json
```

### Remove a MCP Server

Remove a MCP server:

```bash
mcpbar remove <name>         # Remove a specific server
mcpbar rm <name>             # Short alias for remove
```

### List MCP Servers

View all your configured MCP servers:

```bash
mcpbar list
# Or use the short alias
mcpbar ls
```

### Start an MCP Server

Run a MCP server on standalone mode.

```bash
mcpbar start <name>
# Or use the alias
mcpbar s <name>
```

## 📋 Example Workflow

```bash
# Search for available servers
mcpbar search playwright

# Install the server you want
mcpbar install playwright

# Verify installation
mcpbar list
```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
