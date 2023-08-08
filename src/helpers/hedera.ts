import axios, { AxiosInstance } from "axios";
import { EngineTypes } from "@walletconnect/types";
import {
  AccountCreateTransaction,
  AccountId,
  Client,
  Hbar,
  PrivateKey,
  RequestType,
  TopicCreateTransaction,
  Transaction,
} from "@hashgraph/sdk";

type TypedRequestParams<T> = Omit<EngineTypes.RequestParams, "request"> & {
  request: Omit<EngineTypes.RequestParams["request"], "params"> & {
    params: T;
  };
};

/**
 * `transaction.type` should be an instance of `RequestType` from `@hashgraph/sdk`.
 * e.g. RequestType.CryptoTransfer.toString()
 */
export type HederaSignAndExecuteTransactionParams = {
  transaction: {
    type: string;
    bytes: string;
  };
};

export type HederaSignMessageParams = {
  message: string;
};

export type HederaSessionRequestParams = TypedRequestParams<
  HederaSignAndExecuteTransactionParams | HederaSignMessageParams
>;

export class HederaParamsFactory {
  public static buildTransactionPayload(
    type: RequestType,
    transaction: Transaction
  ): HederaSignAndExecuteTransactionParams {
    this._setNodeAccountIds(transaction);
    this._freezeTransaction(transaction);
    return {
      transaction: {
        type: type.toString(),
        bytes: this._encodeTransactionBytes(transaction),
      },
    };
  }

  public static buildSignMessagePayload(
    message: string
  ): HederaSignMessageParams {
    return {
      message: Buffer.from(message).toString("base64"),
    };
  }

  private static _freezeTransaction(transaction: Transaction): void {
    if (!transaction.isFrozen()) {
      transaction.freeze();
    }
  }

  private static _setNodeAccountIds(transaction: Transaction): void {
    const nodeIds = transaction.nodeAccountIds;
    if (!nodeIds || nodeIds.length === 0) {
      transaction.setNodeAccountIds([new AccountId(3)]);
    }
  }

  private static _encodeTransactionBytes(transaction: Transaction): string {
    const transactionBytes = transaction.toBytes();
    return Buffer.from(transactionBytes).toString("base64");
  }
}

const hederaApi: AxiosInstance = axios.create({
  timeout: 10000, // 10 secs
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  baseURL: "https://testnet.mirrornode.hedera.com/api/v1",
});

const formatTinybarAsHbar = (balance: number | string): string => {
  return Hbar.fromTinybars(balance).toBigNumber().toFormat(8);
};

export const apiGetHederaAccountBalance = async (address: string) => {
  const response = await hederaApi.get(`/accounts/${address}`);
  const { balance } = response.data.balance;
  return {
    balance: formatTinybarAsHbar(balance),
    name: "HBAR",
    symbol: "ℏ",
  };
};

const createTestnetClient = () => {
  try {
    /**
     * !!!WARNING!!!
     * Do not use this approach of storing/accessing private keys in production.
     * This app is not configured with a secure storage mechanism, so this is just the
     * best way to make it work and showcase Hedera integration with WalletConnect.
     */
    const privateKey = process.env.NEXT_PUBLIC_HEDERA_PRIVATE_KEY;
    const accountAddress = process.env.NEXT_PUBLIC_HEDERA_ACCOUNT_ID;

    if (!accountAddress || !privateKey) {
      throw new Error(
        "Missing required env vars: `NEXT_PUBLIC_HEDERA_ACCOUNT_ID` and/or `HEDERA_PRIVATE_KEY`"
      );
    }

    const id = Number(accountAddress.split(".").pop());
    const accountId = new AccountId(id);

    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);
    client.setDefaultMaxTransactionFee(new Hbar(100));
    client.setMaxQueryPayment(new Hbar(50));

    return client;
  } catch (e) {
    console.error("Failed to initialize Hedera wallet", e);
    return null;
  }
};

export const hederaTestnetClient = createTestnetClient();

/** Submitting to this topic may fail, but we attempt to create a new one below */
const DEFAULT_HEDERA_TOPIC_ID = "0.0.12345";
const HEDERA_TOPIC_ID_KEY = "hedera-topic-id";

export const createOrRestoreHederaTopicId = async () => {
  let topicId =
    localStorage.getItem(HEDERA_TOPIC_ID_KEY) ?? DEFAULT_HEDERA_TOPIC_ID;
  if (topicId === DEFAULT_HEDERA_TOPIC_ID) {
    try {
      /**
       * Create a new topic id and save to local storage.
       * Note: Hedera Testnet occassionally resets data. If you have a stale topic id
       * saved in local storage, just remove it by running `localStorage.removeItem('hedera-topic-id')`
       * in the browswer console and then reload the app.
       */
      if (hederaTestnetClient) {
        const topicCreateTxn = new TopicCreateTransaction();
        const response = await topicCreateTxn.execute(hederaTestnetClient);
        const receipt = await response.getReceipt(hederaTestnetClient);
        const newTopicId = receipt.topicId?.toString() ?? topicId;
        topicId = newTopicId;
      }
    } catch (e) {
      console.error(e);
    }
  }
  localStorage.setItem(HEDERA_TOPIC_ID_KEY, topicId);
  return topicId;
};

/** Transferring to this account may fail, but we attempt to create a new one below */
const DEFAULT_HEDERA_RECEIVER_ADDRESS = "0.0.54321";
const HEDERA_RECEIVER_ADDRESS_KEY = "hedera-transfer-recipient-address";

export const createOrRestoreHederaTransferReceiverAddress = async () => {
  let receiverAddress =
    localStorage.getItem(HEDERA_RECEIVER_ADDRESS_KEY) ??
    DEFAULT_HEDERA_RECEIVER_ADDRESS;
  if (receiverAddress === DEFAULT_HEDERA_RECEIVER_ADDRESS) {
    try {
      /**
       * Create a new Hedera test account and save the account id to local storage.
       * Note: Hedera Testnet occassionally resets data. If you have a stale account id
       * saved in local storage, just remove it by running `localStorage.removeItem('hedera-transfer-recipient-address')`
       * in the browswer console and then reload the app.
       */
      if (hederaTestnetClient) {
        //Create new account keys
        const newAccountPrivateKeys = PrivateKey.generateED25519();
        const newAccountPublicKey = newAccountPrivateKeys.publicKey;

        //Create a new account with 1,000 tinybar starting balance
        const newAccount = await new AccountCreateTransaction()
          .setKey(newAccountPublicKey)
          .setInitialBalance(Hbar.fromTinybars(1000))
          .execute(hederaTestnetClient);

        //Get the new account ID
        const receipt = await newAccount.getReceipt(hederaTestnetClient);
        receiverAddress = receipt.accountId?.toString() ?? receiverAddress;
      }
    } catch (e) {
      console.error(e);
    }
  }
  localStorage.setItem(HEDERA_RECEIVER_ADDRESS_KEY, receiverAddress);
  return receiverAddress;
};
