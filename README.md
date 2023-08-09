# Archived
This app was created for R&D purposes. Please refer to the full version of the demo apps linked below:
- [WalletConnect React dApp](https://github.com/WalletConnect/web-examples/tree/main/dapps/react-dapp-v2)
- [WalletConnect React Wallet](https://github.com/WalletConnect/web-examples/tree/main/wallets/react-wallet-v2)
- [Hgraph fork of WalletConnect/web-examples](https://github.com/hgraph-io/web-examples)

# React dApp (with standalone v2 client)

This demo dApp is a pared down version of WalletConnect's [react-dapp-v2 demo](https://github.com/WalletConnect/web-examples/tree/main/dapps/react-dapp-v2). This version of the app only showcases connecting a dApp and a wallet for Ethereum (EVM) chains via JSON-RPC and Hedera via the official `@hashgraph/sdk` [library](https://github.com/hashgraph/hedera-sdk-js).

This dApp is meant to be used in conjuction with the corresponding [hedera-walletconnect-wallet](https://github.com/hgraph-io/hedera-walletconnect-wallet). Please also set up that project.

For integrating Hedera, The dApp's responsibility is to build the transaction with the Hedera SDK, freeze the transaction, convert the transaction to bytes, and then pass the payload to the wallet via WalletConnect to the wallet. The wallet's responsibility is to use the Hedera SDK to reconstruct the transaction object from bytes, extract and format information about the transaction to present to the user, sign and submit the transaction to the Hedera network if approved, and report approval/rejection results back to the dApp.

## Overview

This is an example implementation of a React dApp (generated via `create-react-app`) using the standalone
client for WalletConnect v2 to:

- handle pairings
- manage sessions
- send JSON-RPC requests to a paired wallet

## Running locally

1. Install the app's dependencies:

```bash
yarn
```

2. To test Hedera integration, go to [Hedera Portal](https://portal.hedera.com/) to create a Testnet account.
3. Set up your local environment variables by copying the example into your own `.env.local` file:

```bash
cp .env.local.example .env.local
```

Your `.env.local` now contains the following environment variables:

- `NEXT_PUBLIC_PROJECT_ID` (placeholder) - You can generate your own ProjectId at https://cloud.walletconnect.com
- `NEXT_PUBLIC_RELAY_URL` (already set)
- `NEXT_PUBLIC_HEDERA_ACCOUNT_ID` (placeholder) - Get your testnet account id from https://portal.hedera.com/
- `NEXT_PUBLIC_HEDERA_PRIVATE_KEY` (placeholder) - Get your testnet private key from https://portal.hedera.com/

## Develop

```bash
yarn dev
```

Then go to http://localhost:3000 (Note that you may have a better experience running in an incognito browser window)

## Test

```bash
yarn test
```

## Build

```bash
yarn build
```

## Demo

https://github.com/hgraph-io/hedera-walletconnect-dapp/assets/136644362/a4440481-f51d-4faf-ae3d-8afeeef33779
