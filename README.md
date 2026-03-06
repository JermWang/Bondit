# BondIt.lol
## Transparent Bundler v2 — Agency-Based Genesis + Liquidity Stewardship

Solana-native launchpad with deterministic Agency Stewardship for memecoin launches.

## Architecture

```
bondit-lol/
├── programs/           # Anchor on-chain programs
│   ├── launch-factory/ # Token creation + Agency registration
│   ├── bonding-curve/  # Pump-like curve trading pre-graduation
│   ├── agency-vaults/  # Treasury, LP Reserve, Fee, House vaults
│   ├── policy-engine/  # Deterministic rules engine
│   └── venue-adapters/ # Meteora DLMM + Raydium CLMM adapters
├── app/                # Next.js frontend (Launch UI + Dashboard)
├── services/           # Off-chain infrastructure
│   ├── indexer/        # Event streaming + analytics
│   ├── keeper/         # Deterministic scheduler/executor
│   └── bondit-ai/      # Advisory AI service
├── sdk/                # TypeScript SDK for program interaction
└── tests/              # Integration tests
```

## Key Parameters

| Parameter | Value |
|-----------|-------|
| Total Supply | 1,000,000,000 |
| Curve Supply | 800,000,000 (80%) |
| Agency Treasury | 150,000,000 (15%) |
| LP Reserve | 50,000,000 (5%) |
| Graduation Target | 85 SOL |
| Protocol Fee | 1% (100 bps) |
| Fee Split | 99% LP / 1% House |
| Flight Mode Holders | 15,000 |
| Flight Mode Top10 | ≤18% |
| Max Stewardship | 180 days |

## Development

```bash
# Install dependencies
yarn install

# Build programs
anchor build

# Run tests
anchor test

# Start frontend
cd app && yarn dev

# Start services
cd services && docker-compose up
```

## License
MIT
