#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Grind vanity program keypairs for BondIt.lol contracts
#
# Each program ID will end with "LoL" in Base58.
# Requires: solana-keygen (Solana CLI)
#
# Usage:
#   chmod +x scripts/grind-program-ids.sh
#   ./scripts/grind-program-ids.sh
#
# Output: keypair JSON files in ./program-keypairs/
# After grinding, deploy with:
#   solana program deploy --program-id ./program-keypairs/launch-factory.json target/deploy/launch_factory.so
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SUFFIX="LoL"
OUT_DIR="./program-keypairs"
mkdir -p "$OUT_DIR"

PROGRAMS=(
  "launch-factory"
  "bonding-curve"
  "agency-vaults"
  "policy-engine"
  "venue-adapters"
)

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║  BondIt.lol — Program ID Vanity Grinder     ║"
echo "  ║  Suffix: $SUFFIX                                ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

for prog in "${PROGRAMS[@]}"; do
  OUTFILE="$OUT_DIR/$prog.json"

  if [ -f "$OUTFILE" ]; then
    EXISTING=$(solana-keygen pubkey "$OUTFILE" 2>/dev/null || echo "unknown")
    echo "  ⏭  $prog — already exists: $EXISTING"
    continue
  fi

  echo "  ⛏  Grinding $prog (--ends-with $SUFFIX)..."
  START=$(date +%s)

  # solana-keygen grind outputs a file named <pubkey>.json
  solana-keygen grind --ends-with "$SUFFIX:1" --no-bip39-passphrase 2>/dev/null

  # Find the generated file (newest .json matching *LoL.json)
  FOUND=$(ls -t *"${SUFFIX}.json" 2>/dev/null | head -1)

  if [ -z "$FOUND" ]; then
    echo "  ✖  Failed to grind $prog"
    continue
  fi

  mv "$FOUND" "$OUTFILE"
  PUBKEY=$(solana-keygen pubkey "$OUTFILE")
  END=$(date +%s)
  ELAPSED=$((END - START))

  echo "  ✔  $prog → $PUBKEY (${ELAPSED}s)"
done

echo ""
echo "  ──────────────────────────────────────────────"
echo "  All program keypairs saved to $OUT_DIR/"
echo ""
echo "  Next steps:"
echo "    1. Update sdk/src/constants.ts with the new program IDs"
echo "    2. Rebuild programs:  anchor build"
echo "    3. Deploy each program:"
echo ""

for prog in "${PROGRAMS[@]}"; do
  OUTFILE="$OUT_DIR/$prog.json"
  if [ -f "$OUTFILE" ]; then
    PUBKEY=$(solana-keygen pubkey "$OUTFILE" 2>/dev/null || echo "<pubkey>")
    SO_NAME=$(echo "$prog" | tr '-' '_')
    echo "       solana program deploy \\"
    echo "         --program-id $OUTFILE \\"
    echo "         target/deploy/${SO_NAME}.so"
    echo ""
  fi
done

echo "    4. Update .env and constants to reference the new IDs"
echo ""
