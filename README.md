# Portfolio Projects Overview

This repository contains two main projects and their associated smart contracts for blockchain monitoring and trading automation.

## Projects Overview

### 1. Unchained Monitors
A comprehensive blockchain monitoring system that provides real-time tracking and analysis of blockchain activities. The project includes:
- Real-time transaction monitoring
- Custom alert systems
- Discord integration for notifications
- Proxy management for reliable connections
- Advanced data analysis and visualization
- Configurable monitoring parameters

### 2. Friend.Tech Sniper
An automated trading bot specifically designed for the Friend.Tech platform. Features include:
- Automated trading execution
- Real-time price monitoring
- Transaction management
- User activity tracking
- Discord integration for alerts and controls
- Custom trading strategies implementation

## Smart Contracts

### 1. WebAIToken.sol
An ERC20 token contract with advanced features:
- Automated market maker (AMM) integration with Uniswap V2
- Dynamic fee system for buys and sells
- Anti-bot mechanisms
- Liquidity management
- Tax collection and distribution
- Trading limits and restrictions
- Whitelist functionality

### 2. UnchainedPass.sol
An ERC1155 token contract for access control:
- Whitelist minting with Merkle proof verification
- Public minting functionality
- Non-transferable tokens
- Owner minting capabilities
- Batch minting support
- Token revocation functionality
- Configurable pricing

### 3. MassMinter.sol
A contract for batch operations bypassing wallet limits:
- Worker contract deployment
- Batch transaction execution
- ERC20 token distribution
- NFT transfer management
- ETH distribution and recall
- Access control through UnchainedPass
- Worker management system

### 4. Execute.sol
A utility contract for executing transactions:
- ERC721 and ERC1155 token receiver
- ERC20 token transfers
- Generic contract calls 
- ETH management
- Security controls
- Transaction execution verification

## Technical Details

### Dependencies
Both projects utilize:
- Node.js
- Ethers.js for blockchain interaction
- Discord.js for bot integration
- Various blockchain monitoring libraries

### Security Features
- Access control mechanisms
- Rate limiting
- Transaction verification
- Secure key management
- Proxy support for reliability

### Configuration
Both projects use:
- Environment variables for sensitive data
- JSON configuration files
- Customizable monitoring parameters
- User-specific settings

## Setup and Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Configure environment variables
4. Set up Discord bot tokens
5. Configure monitoring parameters
6. Deploy smart contracts (if needed)

## Usage

### Unchained Monitors
1. Start the monitoring system:
```bash
node index.js
```

### Friend.Tech Sniper
1. Configure trading parameters
2. Set up API keys and wallet information
3. Start the bot:
```bash
node index.js
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
