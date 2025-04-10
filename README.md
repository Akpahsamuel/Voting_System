# Blockchain Voting Application

A decentralized voting application built on the Sui blockchain, featuring a modern React frontend and Move smart contracts.

## 🚀 Features

- Secure and transparent voting system on Sui blockchain
- Modern React frontend with TypeScript
- Real-time vote tracking and results
- User-friendly interface with Tailwind CSS
- Smart contract-based vote management
- Wallet integration with Sui

## 📋 Prerequisites

- Node.js (v18 or higher)
- pnpm package manager
- Sui CLI
- A Sui wallet (for development and testing)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd voting-app
```

### 2. Install Sui CLI
```bash
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch devnet sui
```

### 3. Set Up Sui Development Environment
```bash
# Create a new Sui wallet
sui client new-address ed25519

# Get test tokens from devnet faucet
sui client faucet
```

### 4. Install Frontend Dependencies
```bash
cd frontend
pnpm install
```

## 💻 Development

### Smart Contracts

The smart contracts are located in the `contracts/voting_system` directory. They are written in Move and handle the core voting logic.

To build the contracts:
```bash
cd contracts/voting_system
sui move build
```

To run tests:
```bash
sui move test
```

To deploy to devnet:
```bash
sui client publish --gas-budget 10000000
```

### Frontend

The frontend is built with React, TypeScript, and Vite. It uses Tailwind CSS for styling and includes Sui wallet integration.

To start the development server:
```bash
cd frontend
pnpm dev
```

To build for production:
```bash
pnpm build
```

## 🏗️ Project Structure

```
voting-app/
├── contracts/
│   └── voting_system/
│       ├── sources/         # Move smart contract source files
│       ├── tests/          # Contract test files
│       └── Move.toml       # Move package configuration
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── views/         # Page components
│   │   ├── providers/     # Context providers
│   │   ├── config/        # Configuration files
│   │   └── assets/        # Static assets
│   ├── public/            # Public assets
│   └── package.json       # Frontend dependencies
└── README.md
```

## 🔧 Configuration

### Smart Contract Configuration

The smart contract configuration is in `contracts/voting_system/Move.toml`. After deployment, update the package address in this file with your deployed contract address.

### Frontend Configuration

The frontend configuration is in `frontend/src/config/`. Update the following files as needed:
- Network configuration
- Contract addresses
- API endpoints

## 🔐 Security

- All voting transactions are recorded on the Sui blockchain
- Smart contracts are audited and tested
- Frontend implements secure wallet connection
- User authentication through Sui wallet

## 🧪 Testing

### Smart Contracts
```bash
cd contracts/voting_system
sui move test
```

### Frontend
```bash
cd frontend
pnpm test
```

## 📦 Deployment

### Smart Contracts
1. Build the contracts:
```bash
cd contracts/voting_system
sui move build
```

2. Deploy to Sui network:
```bash
sui client publish --gas-budget 10000000
```

3. Update the contract address in the frontend configuration

### Frontend
1. Build the frontend:
```bash
cd frontend
pnpm build
```

2. Deploy the built files to your hosting service

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Sui Blockchain
- React Team
- Move Language Team
- All contributors and supporters

## 📞 Support

For support, please open an issue in the repository or contact the maintainers.
