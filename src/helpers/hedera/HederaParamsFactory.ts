import { AccountId, RequestType, Transaction } from "@hashgraph/sdk";
import { HederaSignAndSendTransactionParams } from "./types";

export class HederaParamsFactory {
  public static buildSignAndSendTransactionPayload(
    type: RequestType,
    transaction: Transaction
  ): HederaSignAndSendTransactionParams {
    this._setNodeAccountIds(transaction);
    this._freezeTransaction(transaction);
    return {
      transaction: {
        type: type.toString(),
        bytes: transaction.toBytes(),
      },
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
}
