import { BigNumber, utils } from "ethers";
import { createContext, ReactNode, useContext, useState } from "react";
import * as encoding from "@walletconnect/encoding";
import { Transaction as EthTransaction } from "@ethereumjs/tx";
import {
  Hbar,
  TransferTransaction,
  AccountId,
  TransactionId,
  RequestType,
} from "@hashgraph/sdk";
import {
  HederaParamsFactory,
  eip712,
  formatTestTransaction,
  getLocalStorageTestnetFlag,
  hashPersonalMessage,
  hashTypedDataMessage,
  verifySignature,
} from "../helpers";
import { useWalletConnectClient } from "./ClientContext";
import {
  DEFAULT_EIP155_METHODS,
  DEFAULT_NEAR_METHODS,
  DEFAULT_EIP155_OPTIONAL_METHODS,
  DEFAULT_HEDERA_METHODS,
} from "../constants";
import { useChainData } from "./ChainDataContext";
import { rpcProvidersByChainId } from "../../src/helpers/api";
import { EngineTypes } from "@walletconnect/types";
import { HederaSessionRequestParams } from "../helpers/hedera/types";

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
  nearRpc: {
    testSignAndSendTransaction: TRpcRequestCallback;
    testSignAndSendTransactions: TRpcRequestCallback;
  };
  hederaRpc: {
    testSignAndSendTransaction: TRpcRequestCallback;
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

  const { client, session, accounts, balances } = useWalletConnectClient();

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

        let valid = false;
        const [, reference] = chainId.split(":");

        valid = EthTransaction.fromSerializedTx(
          signedTx as any
        ).verifySignature();

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

  // -------- HEDERA RPC METHODS --------

  const hederaRpc = {
    testSignAndSendTransaction: _createJsonRpcRequestHandler(
      async (
        chainId: string,
        address: string
      ): Promise<IFormattedRpcResponse> => {
        const method = DEFAULT_HEDERA_METHODS.HEDERA_SIGN_AND_SEND_TRANSACTION;
        const topic = session!.topic;

        const payerAccountId = new AccountId(Number(address.split(".").pop()));
        const transactionId = TransactionId.generate(payerAccountId);
        const transactionAmt = 1000;
        const receiverAddress = "0.0.14838598"; // hard-coded to my 2nd test account for now
        const memo = `Transfer amount: ${Hbar.fromTinybars(
          transactionAmt
        ).toString()}, from: ${address}, to: ${receiverAddress}`;

        const transaction = new TransferTransaction()
          .addHbarTransfer(address, Hbar.fromTinybars(-transactionAmt))
          .addHbarTransfer(receiverAddress, Hbar.fromTinybars(transactionAmt))
          .setTransactionMemo(memo)
          .setTransactionId(transactionId);

        const params = HederaParamsFactory.buildSignAndSendTransactionPayload(
          RequestType.CryptoTransfer,
          transaction
        );

        const payload: HederaSessionRequestParams = {
          topic,
          chainId,
          request: {
            method,
            params,
          },
        };

        const result = await client!.request(payload);

        return {
          method,
          address,
          valid: true,
          result: JSON.stringify(result),
        };
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

  return (
    <JsonRpcContext.Provider
      value={{
        ping,
        ethereumRpc,
        nearRpc,
        hederaRpc,
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
