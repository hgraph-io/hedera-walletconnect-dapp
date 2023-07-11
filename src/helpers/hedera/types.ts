import { TypedRequestParams } from "../types";

/**
 * `transaction.type` should be an instance of `RequestType` from `@hashgraph/sdk`.
 * e.g. RequestType.CryptoTransfer.toString()
 */
export type HederaSignAndSendTransactionParams = {
  transaction: {
    type: string;
    bytes: Uint8Array;
  };
};

export type HederaSessionRequestParams =
  TypedRequestParams<HederaSignAndSendTransactionParams>;
