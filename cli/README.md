# @bondit/cli

Command-line interface for launching tokens on BondIt.lol with Agency stewardship.

## Install

```bash
cd cli
npm install
npm run build
npm link  # makes `bondit` available globally
```

## Commands

### `bondit launch init`
Interactive wizard that creates a `bondit-launch.json` config file.

```bash
bondit launch init          # interactive prompts
bondit launch init --yes    # defaults (for scripting / agents)
```

### `bondit launch validate`
Validates config against schema rules and business constraints.

```bash
bondit launch validate
```

### `bondit launch simulate`
Builds the `create_launch` transaction and runs RPC simulation without submitting.

```bash
bondit launch simulate
```

### `bondit launch create`
Signs, submits, and confirms the launch transaction on-chain.

```bash
bondit launch create
bondit launch create --skip-simulate  # not recommended
```

### `bondit launch status <launchId>`
Fetches on-chain launch state by hex ID or base58 address.

```bash
bondit launch status <64-char-hex-id>
bondit launch status <base58-address> --rpc https://api.devnet.solana.com
```

## Config File (`bondit-launch.json`)

### With Phantom (recommended)

```json
{
  "name": "My Token",
  "symbol": "MYTKN",
  "uri": "https://arweave.net/...",
  "mode": "native",
  "walletProvider": "phantom",
  "rpcUrl": "https://api.devnet.solana.com",
  "phantomWalletId": "wlt_abc123...",
  "idempotencyKey": "bondit_m3x9a_k8f2p1qw"
}
```

### With raw keypair (legacy)

```json
{
  "name": "My Token",
  "symbol": "MYTKN",
  "uri": "https://arweave.net/...",
  "mode": "native",
  "walletProvider": "keypair",
  "rpcUrl": "https://api.devnet.solana.com",
  "keypairPath": "~/.config/solana/id.json",
  "idempotencyKey": "bondit_m3x9a_k8f2p1qw"
}
```

## Wallet Providers

### Phantom Server SDK (recommended)

The official wallet for BondIt CLI launches. Uses Phantom's `@phantom/server-sdk` for managed wallet creation, transaction signing, and built-in simulation security.

**Setup:**

1. Create an app at [Phantom Portal](https://portal.phantom.app)
2. Get your Organization ID, App ID, and API Private Key
3. Set environment variables:

```bash
export PHANTOM_ORG_ID="org_your_org_id"
export PHANTOM_APP_ID="app_your_app_id"
export PHANTOM_API_KEY="your_api_private_key"
export PHANTOM_WALLET_ID="wlt_..."  # optional, reuse existing wallet
```

**How it works:**
- First run creates a Phantom-managed wallet (save the wallet ID to reuse it)
- Transactions are signed server-side through Phantom's infrastructure
- Phantom's simulation layer blocks malicious transactions before broadcast
- No raw private keys on disk — keys are managed by Phantom

### Raw Keypair (legacy)

Standard Solana CLI keypair file. Use this if you already have a keypair or prefer self-custody.

```bash
export BONDIT_KEYPAIR_PATH="~/.config/solana/id.json"
# or
export SOLANA_KEYPAIR_PATH="~/.config/solana/id.json"
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` | Solana RPC endpoint |
| **`PHANTOM_ORG_ID`** | — | Phantom Portal organization ID |
| **`PHANTOM_APP_ID`** | — | Phantom Portal app ID |
| **`PHANTOM_API_KEY`** | — | Phantom Portal API private key |
| `PHANTOM_WALLET_ID` | (auto-created) | Reuse an existing Phantom wallet |
| `PHANTOM_API_URL` | (Phantom default) | Custom Phantom API base URL |
| `BONDIT_KEYPAIR_PATH` | `~/.config/solana/id.json` | Wallet keypair file (keypair mode) |
| `SOLANA_KEYPAIR_PATH` | (fallback) | Standard Solana CLI keypair |

## Safety

- **Idempotency**: Each config gets a unique key. Re-running `create` with the same key detects existing launches.
- **Preflight simulation**: `simulate` runs before `create` by default.
- **Phantom security**: Phantom's simulation layer blocks malicious txs automatically.
- **Retry policy**: 3 retries with exponential backoff; non-retryable errors fail fast.
- **Balance check**: Warns if wallet has insufficient SOL before submitting.
- **No raw keys for agents**: Phantom wallet mode means agents never touch private keys directly.

## Agent Integration

Agents should use Phantom as the wallet provider. The agent drafts config and orchestrates the flow; Phantom manages the signing key.

```bash
# Set Phantom credentials
export PHANTOM_ORG_ID="org_..."
export PHANTOM_APP_ID="app_..."
export PHANTOM_API_KEY="key_..."

# Agent workflow
bondit launch init --yes          # auto-detects Phantom, creates config
bondit launch validate            # checks config + Phantom credentials
bondit launch simulate            # dry-run via RPC
bondit launch create              # signs via Phantom Server SDK + submits
bondit launch status <launch-id>  # check on-chain state
```

The agent never handles raw private keys. Phantom Server SDK signs transactions server-side through authenticated API calls.
