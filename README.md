# React dApp (with standalone v2 client)

This demo dApp is a pared down version of WalletConnect's [react-dapp-v2 demo](https://github.com/WalletConnect/web-examples/tree/main/dapps/react-dapp-v2). This version of the app only showcases connecting a dApp and a wallet for Ethereum (EVM) chains via JSON-RPC and Hedera via the official `@hashgraph/sdk` [library](https://github.com/hashgraph/hedera-sdk-js).

This dApp is meant to be used in conjuction with the corresponding [hedera-walletconnect-wallet](https://github.com/hgraph-io/hedera-walletconnect-wallet). Please also set up that project.

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

2. Set up your local environment variables by copying the example into your own `.env.local` file:

```bash
cp .env.local.example .env.local
```

Your `.env.local` now contains the following environment variables:

- `NEXT_PUBLIC_PROJECT_ID` (placeholder) - You can generate your own ProjectId at https://cloud.walletconnect.com
- `NEXT_PUBLIC_RELAY_URL` (already set)

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
