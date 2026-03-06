# BondIt Agent Authority Architecture

## Purpose
Define exactly **who can act** vs **who can advise** in BondIt launches, and provide a practical execution checklist to ship a production-safe CLI launch flow quickly.

---

## 1) Authority Model (Hard Boundaries)

### Can Act (State-Changing Authority)
1. **On-chain Programs** (`launch-factory`, `bonding-curve`, `agency-vaults`, `policy-engine`, `venue-adapters`)
   - Source of truth for launch lifecycle, vault balances, and status transitions.
   - Deterministic constraints enforced in program logic.
2. **Keeper Service** (`services/keeper`)
   - Authorized scheduler/executor for deterministic cranks (monitor, execute, compound, flight checks).
   - Must only execute policy-permitted transactions.
3. **User Wallet Signer** (web wallet or CLI keypair)
   - Signs launch genesis transaction and any user-authorized actions.

### Can Advise (No Execution Rights)
1. **OpenClaw AI Service** (`services/openclaw-ai`, package `@bondit/ai`)
   - Generates reports, anomaly summaries, and Q&A responses.
   - Explicitly advisory-only; no signer, no execution permissions.
2. **Frontend Copilot Surfaces** (`app/src/app/chat`, token advisory panels)
   - Presentation layer for AI responses and transparency summaries.

### Principle
- **AI never signs transactions.**
- **Keeper never changes policy parameters.**
- **On-chain charter stays immutable after genesis.**

---

## 2) Launch Lifecycle (Operational)

1. **Genesis (`create_launch`)**
   - Mint and allocate supply 80/15/5 (curve/treasury/LP reserve).
   - Launch status -> `CurveActive`.
2. **Curve Phase**
   - Bonding curve operates until graduation trigger.
3. **Graduation**
   - `record_graduation` links policy + adapter.
   - Status -> `Stewarding`.
4. **Stewardship**
   - Keeper jobs enforce deterministic cadence and release constraints.
5. **Flight Eligibility**
   - Holders, concentration, treasury threshold (or forced sunset).
6. **Flight Mode**
   - `record_flight_mode` finalizes Agency sunset.

---

## 3) Data & Service Topology

- **Indexer (3001):** Event ingestion + launch analytics API.
- **Keeper:** Cron-based deterministic executor.
- **OpenClaw AI (3002):** Advisory API (`/reports/*`, `/query`, anomaly scan).
- **DB:** Postgres (`DATABASE_URL`, Supabase-compatible).
- **Frontend:** Reads indexer + AI APIs; does not execute backend policy actions.

---

## 4) CLI Launch Vision

### Product Modes
1. **Traditional CLI (local signer):**
   - `bondit launch init`
   - `bondit launch validate`
   - `bondit launch simulate`
   - `bondit launch create --mode native|pumproute`
   - `bondit launch status <launchId>`
2. **Web-assisted CLI:**
   - Site generates exact CLI command + launch config JSON.
3. **Agent-assisted CLI:**
   - Agent drafts config + simulation report.
   - User still signs final tx.

### Safety Requirements
- Idempotency key per launch request.
- Preflight simulation required.
- Structured error classes + retry policy.
- Launch audit log (request -> simulation -> tx -> final state).

---

## 5) Scalability & Reliability Controls

## Request Layer
- API key + wallet scoped rate limits.
- Burst queue for high-demand launch windows.
- Backpressure responses with retry-after.

## Execution Layer
- Idempotent job processing (launchId + nonce key).
- Exactly-once semantics around tx submission where possible.
- Dead-letter queue for failed launch workflows.

## Observability
- Core SLO metrics:
  - launch success rate
  - p95 launch latency
  - keeper job success rate
  - advisory freshness lag
- End-to-end trace IDs across app/indexer/keeper/ai.
- Alerting for stale cranks and failed transitions.

---

## 6) Tonight Delivery Checklist (Aggressive)

## A. Contract & SDK Readiness
- [ ] Confirm `create_launch` account map + PDA derivation parity in SDK.
- [ ] Add explicit typed helper in SDK for launch instruction assembly.
- [ ] Add input validation helper (name/symbol/uri length + mode checks).

## B. CLI Scaffold (`@bondit/cli`)
- [ ] Create package + command parser.
- [ ] Implement `launch init` (interactive + JSON file output).
- [ ] Implement `launch validate` (schema + business constraints).
- [ ] Implement `launch simulate` (RPC simulate + account checks).
- [ ] Implement `launch create` (sign/send/confirm + explorer links).
- [ ] Implement `launch status` (indexer + fallback RPC view).

## C. Ops Safety
- [ ] Add idempotency key generation and persistence in CLI flow.
- [ ] Add retry policy with non-retryable error guards.
- [ ] Add structured logs and trace IDs.

## D. Site Integration
- [ ] Add "Launch via CLI" card in launch page.
- [ ] Add "Copy CLI Command" + "Download Config JSON" actions.
- [ ] Add docs link to this architecture file from docs page.

## E. Keeper/Indexer Minimum Hardening
- [ ] Wire keeper `getActiveLaunches()` to DB.
- [ ] Implement tx submission stubs in monitor/execute/flight-check.
- [ ] Verify indexer endpoints needed by `launch status`.

## F. Final Verification
- [ ] Dry-run on local validator.
- [ ] Testnet end-to-end launch.
- [ ] Failure injection test (RPC timeout, duplicate launch request).
- [ ] Confirm audit log completeness.

---

## 7) Go/No-Go Criteria

**Go only if all are true:**
1. CLI create path passes simulate + confirm on testnet.
2. Duplicate submit uses same idempotency key and does not double-launch.
3. Keeper can process at least one complete stewardship cycle on test fixture.
4. Advisory responses show correct disclaimer + no execution capability.

---

## 8) Messaging Guidance

For users and community:
- "BondIt is deterministic infrastructure with AI intelligence overlays."
- "OpenClaw explains and audits; keeper + on-chain programs execute."
- "You can launch from web UI or CLI with the same underlying protocol guarantees."
