import { BigNumber, utils } from "ethers";
import { createContext, ReactNode, useContext, useState } from "react";
import * as encoding from "@walletconnect/encoding";
import { Transaction as EthTransaction } from "@ethereumjs/tx";
import { recoverTransaction } from "@celo/wallet-base";
import bs58 from "bs58";
import { verifyMessageSignature } from "solana-wallet";
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction as SolanaTransaction,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  eip712,
  formatTestTransaction,
  getLocalStorageTestnetFlag,
  getProviderUrl,
  hashPersonalMessage,
  hashTypedDataMessage,
  verifySignature,
} from "../helpers";
import { useWalletConnectClient } from "./ClientContext";
import {
  DEFAULT_EIP155_METHODS,
  DEFAULT_SOLANA_METHODS,
  DEFAULT_NEAR_METHODS,
  DEFAULT_TEZOS_METHODS,
  DEFAULT_EIP155_OPTIONAL_METHODS,
} from "../constants";
import { useChainData } from "./ChainDataContext";
import { rpcProvidersByChainId } from "../../src/helpers/api";

/**
 * Types
 */
interface IFormattedRpcResponse {
  method?: string;
  address?: string;
  valid: boolean;
  result: string;
}

type TRpcRequestCallback = (chainId: string, address: string) => Promise<void>;

interface IContext {
  ping: () => Promise<void>;
  ethereumRpc: {
    testSendTransaction: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
    testEthSign: TRpcRequestCallback;
    testSignPersonalMessage: TRpcRequestCallback;
    testSignTypedData: TRpcRequestCallback;
    testSignTypedDatav4: TRpcRequestCallback;
  };
  solanaRpc: {
    testSignMessage: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
  };
  nearRpc: {
    testSignAndSendTransaction: TRpcRequestCallback;
    testSignAndSendTransactions: TRpcRequestCallback;
  };
  tezosRpc: {
    testGetAccounts: TRpcRequestCallback;
    testSignMessage: TRpcRequestCallback;
    testSignTransaction: TRpcRequestCallback;
  };
  rpcResult?: IFormattedRpcResponse | null;
  isRpcRequestPending: boolean;
  isTestnet: boolean;
  setIsTestnet: (isTestnet: boolean) => void;
}

/**
 * Context
 */
export const JsonRpcContext = createContext<IContext>({} as IContext);

/**
 * Provider
 */
export function JsonRpcContextProvider({
  children,
}: {
  children: ReactNode | ReactNode[];
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<IFormattedRpcResponse | null>();
  const [isTestnet, setIsTestnet] = useState(getLocalStorageTestnetFlag());

  const { client, session, accounts, balances, solanaPublicKeys } =
    useWalletConnectClient();

  const { chainData } = useChainData();

  const _createJsonRpcRequestHandler =
    (
      rpcRequest: (
        chainId: string,
        address: string
      ) => Promise<IFormattedRpcResponse>
    ) =>
    async (chainId: string, address: string) => {
      if (typeof client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      if (typeof session === "undefined") {
        throw new Error("Session is not connected");
      }

      try {
        setPending(true);
        const result = await rpcRequest(chainId, address);
        setResult(result);
      } catch (err: any) {
        console.error("RPC request failed: ", err);
        setResult({
          address,
          valid: false,
          result: err?.message ?? err,
        });
      } finally {
        setPending(false);
      }
    };

  const _verifyEip155MessageSignature = (
    message: string,
    signature: string,
    address: string
  ) =>
    utils.verifyMessage(message, signature).toLowerCase() ===
    address.toLowerCase();

  const ping = async () => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    if (typeof session === "undefined") {
      throw new Error("Session is not connected");
    }

    try {
      setPending(true);

      let valid = false;

      try {
        await client.ping({ topic: session.topic });
        valid = true;
      } catch (e) {
        valid = false;
      }

      // display result
      setResult({
        method: "ping",
        valid,
        result: valid ? "Ping succeeded" : "Ping failed",
      });
    } catch (e) {
      console.error(e);
      setResult(null);
    } finally {
      setPending(false);
    }
  };

  // -------- ETHEREUM/EIP155 RPC METHODS --------

  const ethereumRpc = {
    testSendTransaction: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        const caipAccountAddress = `${chainId}:${address}`;
        const account = accounts.find(
          (account) => account === caipAccountAddress
        );
        if (account === undefined)
          throw new Error(`Account for ${caipAccountAddress} not found`);

        const tx = await formatTestTransaction(account);

        const balance = BigNumber.from(balances[account][0].balance || "0");
        if (balance.lt(BigNumber.from(tx.gasPrice).mul(tx.gasLimit))) {
          return {
            method: DEFAULT_EIP155_METHODS.ETH_SEND_TRANSACTION,
            address,
            valid: false,
            result: "Insufficient funds for intrinsic transaction cost",
          };
        }

        const result = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_METHODS.ETH_SEND_TRANSACTION,
            params: [tx],
          },
        });

        // format displayed result
        return {
          method: DEFAULT_EIP155_METHODS.ETH_SEND_TRANSACTION,
          address,
          valid: true,
          result,
        };
      }
    ),
    testSignTransaction: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        const caipAccountAddress = `${chainId}:${address}`;
        const account = accounts.find(
          (account) => account === caipAccountAddress
        );
        if (account === undefined)
          throw new Error(`Account for ${caipAccountAddress} not found`);

        const tx = await formatTestTransaction(account);

        const signedTx = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TRANSACTION,
            params: [tx],
          },
        });

        const CELO_ALFAJORES_CHAIN_ID = 44787;
        const CELO_MAINNET_CHAIN_ID = 42220;

        let valid = false;
        const [, reference] = chainId.split(":");
        if (
          reference === CELO_ALFAJORES_CHAIN_ID.toString() ||
          reference === CELO_MAINNET_CHAIN_ID.toString()
        ) {
          const [, signer] = recoverTransaction(signedTx);
          valid = signer.toLowerCase() === address.toLowerCase();
        } else {
          valid = EthTransaction.fromSerializedTx(
            signedTx as any
          ).verifySignature();
        }

        return {
          method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TRANSACTION,
          address,
          valid,
          result: signedTx,
        };
      }
    ),
    testSignPersonalMessage: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        // test message
        const message = `My email is john@doe.com - ${Date.now()}`;

        // encode message (hex)
        const hexMsg = encoding.utf8ToHex(message, true);
        // personal_sign params
        const params = [hexMsg, address];

        // send message
        const signature = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_METHODS.PERSONAL_SIGN,
            params,
          },
        });

        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }

        const hashMsg = hashPersonalMessage(message);
        const valid = await verifySignature(
          address,
          signature,
          hashMsg,
          rpc.baseURL
        );

        // format displayed result
        return {
          method: DEFAULT_EIP155_METHODS.PERSONAL_SIGN,
          address,
          valid,
          result: signature,
        };
      }
    ),
    testEthSign: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        // test message
        const message = `My email is john@doe.com - ${Date.now()}`;
        // encode message (hex)
        const hexMsg = encoding.utf8ToHex(message, true);
        // eth_sign params
        const params = [address, hexMsg];

        // send message
        const signature = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN,
            params,
          },
        });

        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }

        const hashMsg = hashPersonalMessage(message);
        const valid = await verifySignature(
          address,
          signature,
          hashMsg,
          rpc.baseURL
        );

        // format displayed result
        return {
          method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN + " (standard)",
          address,
          valid,
          result: signature,
        };
      }
    ),
    testSignTypedData: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        const message = JSON.stringify(eip712.example);

        // eth_signTypedData params
        const params = [address, message];

        // send message
        const signature = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA,
            params,
          },
        });

        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }

        const hashedTypedData = hashTypedDataMessage(message);
        const valid = await verifySignature(
          address,
          signature,
          hashedTypedData,
          rpc.baseURL
        );

        return {
          method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA,
          address,
          valid,
          result: signature,
        };
      }
    ),
    testSignTypedDatav4: _createJsonRpcRequestHandler(
      async (chainId: string, address: string) => {
        const message = JSON.stringify(eip712.example);
        console.log("eth_signTypedData_v4");

        // eth_signTypedData_v4 params
        const params = [address, message];

        // send message
        const signature = await client!.request<string>({
          topic: session!.topic,
          chainId,
          request: {
            method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA_V4,
            params,
          },
        });

        //  split chainId
        const [namespace, reference] = chainId.split(":");
        const rpc = rpcProvidersByChainId[Number(reference)];

        if (typeof rpc === "undefined") {
          throw new Error(
            `Missing rpcProvider definition for chainId: ${chainId}`
          );
        }

        const hashedTypedData = hashTypedDataMessage(message);
        const valid = await verifySignature(
          address,
          signature,
          hashedTypedData,
          rpc.baseURL
        );

        return {
          method: DEFAULT_EIP155_OPTIONAL_METHODS.ETH_SIGN_TYPED_DATA,
          address,
          valid,
          result: signature,
        };
      }
    ),
  };

  // -------- SOLANA RPC METHODS --------

  const solanaRpc = {
    testSignTransaction: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        if (!solanaPublicKeys) {
          throw new Error("Could not find Solana PublicKeys.");
        }

        const senderPublicKey = solanaPublicKeys[address];

        // rpc.walletconnect.com doesn't support solana testnet yet
        const connection = new Connection(
          isTestnet ? clusterApiUrl("testnet") : getProviderUrl(chainId)
        );

        // Using deprecated `getRecentBlockhash` over `getLatestBlockhash` here, since `mainnet-beta`
        // cluster only seems to support `connection.getRecentBlockhash` currently.
        const { blockhash } = await connection.getRecentBlockhash();

        const transaction = new SolanaTransaction({
          feePayer: senderPublicKey,
          recentBlockhash: blockhash,
        }).add(
          SystemProgram.transfer({
            fromPubkey: senderPublicKey,
            toPubkey: Keypair.generate().publicKey,
            lamports: 1,
          })
        );

        try {
          const result = await client!.request<{ signature: string }>({
            chainId,
            topic: session!.topic,
            request: {
              method: DEFAULT_SOLANA_METHODS.SOL_SIGN_TRANSACTION,
              params: {
                feePayer: transaction.feePayer!.toBase58(),
                recentBlockhash: transaction.recentBlockhash,
                instructions: transaction.instructions.map((i) => ({
                  programId: i.programId.toBase58(),
                  data: Array.from(i.data),
                  keys: i.keys.map((k) => ({
                    isSigner: k.isSigner,
                    isWritable: k.isWritable,
                    pubkey: k.pubkey.toBase58(),
                  })),
                })),
              },
            },
          });

          // We only need `Buffer.from` here to satisfy the `Buffer` param type for `addSignature`.
          // The resulting `UInt8Array` is equivalent to just `bs58.decode(...)`.
          transaction.addSignature(
            senderPublicKey,
            Buffer.from(bs58.decode(result.signature))
          );

          const valid = transaction.verifySignatures();

          return {
            method: DEFAULT_SOLANA_METHODS.SOL_SIGN_TRANSACTION,
            address,
            valid,
            result: result.signature,
          };
        } catch (error: any) {
          throw new Error(error);
        }
      }
    ),
    testSignMessage: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        if (!solanaPublicKeys) {
          throw new Error("Could not find Solana PublicKeys.");
        }

        const senderPublicKey = solanaPublicKeys[address];

        // Encode message to `UInt8Array` first via `TextEncoder` so we can pass it to `bs58.encode`.
        const message = bs58.encode(
          new TextEncoder().encode(
            `This is an example message to be signed - ${Date.now()}`
          )
        );

        try {
          const result = await client!.request<{ signature: string }>({
            chainId,
            topic: session!.topic,
            request: {
              method: DEFAULT_SOLANA_METHODS.SOL_SIGN_MESSAGE,
              params: {
                pubkey: senderPublicKey.toBase58(),
                message,
              },
            },
          });

          const valid = verifyMessageSignature(
            senderPublicKey.toBase58(),
            result.signature,
            message
          );

          return {
            method: DEFAULT_SOLANA_METHODS.SOL_SIGN_MESSAGE,
            address,
            valid,
            result: result.signature,
          };
        } catch (error: any) {
          throw new Error(error);
        }
      }
    ),
  };

  // -------- NEAR RPC METHODS --------

  const nearRpc = {
    testSignAndSendTransaction: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const method = DEFAULT_NEAR_METHODS.NEAR_SIGN_AND_SEND_TRANSACTION;
        const result = await client!.request({
          topic: session!.topic,
          chainId,
          request: {
            method,
            params: {
              transaction: {
                signerId: address,
                receiverId: "guest-book.testnet",
                actions: [
                  {
                    type: "FunctionCall",
                    params: {
                      methodName: "addMessage",
                      args: { text: "Hello from Wallet Connect!" },
                      gas: "30000000000000",
                      deposit: "0",
                    },
                  },
                ],
              },
            },
          },
        });

        return {
          method,
          address,
          valid: true,
          result: JSON.stringify((result as any).transaction),
        };
      }
    ),
    testSignAndSendTransactions: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const method = DEFAULT_NEAR_METHODS.NEAR_SIGN_AND_SEND_TRANSACTIONS;
        const result = await client!.request({
          topic: session!.topic,
          chainId,
          request: {
            method,
            params: {
              transactions: [
                {
                  signerId: address,
                  receiverId: "guest-book.testnet",
                  actions: [
                    {
                      type: "FunctionCall",
                      params: {
                        methodName: "addMessage",
                        args: { text: "Hello from Wallet Connect! (1/2)" },
                        gas: "30000000000000",
                        deposit: "0",
                      },
                    },
                  ],
                },
                {
                  signerId: address,
                  receiverId: "guest-book.testnet",
                  actions: [
                    {
                      type: "FunctionCall",
                      params: {
                        methodName: "addMessage",
                        args: { text: "Hello from Wallet Connect! (2/2)" },
                        gas: "30000000000000",
                        deposit: "0",
                      },
                    },
                  ],
                },
              ],
            },
          },
        });

        return {
          method,
          address,
          valid: true,
          result: JSON.stringify(
            (result as any).map((r: any) => r.transaction)
          ),
        };
      }
    ),
  };

  // -------- TEZOS RPC METHODS --------

  const tezosRpc = {
    testGetAccounts: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        try {
          const result = await client!.request<{ signature: string }>({
            chainId,
            topic: session!.topic,
            request: {
              method: DEFAULT_TEZOS_METHODS.TEZOS_GET_ACCOUNTS,
              params: {},
            },
          });

          return {
            method: DEFAULT_TEZOS_METHODS.TEZOS_GET_ACCOUNTS,
            address,
            valid: true,
            result: JSON.stringify(result, null, 2),
          };
        } catch (error: any) {
          throw new Error(error.message);
        }
      }
    ),
    testSignTransaction: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        try {
          const result = await client!.request<{ hash: string }>({
            chainId,
            topic: session!.topic,
            request: {
              method: DEFAULT_TEZOS_METHODS.TEZOS_SEND,
              params: {
                account: address,
                operations: [
                  {
                    kind: "transaction",
                    amount: "1", // 1 mutez, smallest unit
                    destination: address, // send to ourselves
                  },
                ],
              },
            },
          });

          return {
            method: DEFAULT_TEZOS_METHODS.TEZOS_SEND,
            address,
            valid: true,
            result: result.hash,
          };
        } catch (error: any) {
          throw new Error(error.message);
        }
      }
    ),
    testSignMessage: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const payload = "05010000004254";

        try {
          const result = await client!.request<{ signature: string }>({
            chainId,
            topic: session!.topic,
            request: {
              method: DEFAULT_TEZOS_METHODS.TEZOS_SIGN,
              params: {
                account: address,
                payload,
              },
            },
          });

          return {
            method: DEFAULT_TEZOS_METHODS.TEZOS_SIGN,
            address,
            valid: true,
            result: result.signature,
          };
        } catch (error: any) {
          throw new Error(error.message);
        }
      }
    ),
  };

  return (
    <JsonRpcContext.Provider
      value={{
        ping,
        ethereumRpc,
        solanaRpc,
        nearRpc,
        tezosRpc,
        rpcResult: result,
        isRpcRequestPending: pending,
        isTestnet,
        setIsTestnet,
      }}
    >
      {children}
    </JsonRpcContext.Provider>
  );
}

export function useJsonRpc() {
  const context = useContext(JsonRpcContext);
  if (context === undefined) {
    throw new Error("useJsonRpc must be used within a JsonRpcContextProvider");
  }
  return context;
}
