import { HEDERA_LOGO_URL } from "../constants";
import { ChainMetadata, ChainsMap, NamespaceMetadata } from "../helpers";

export const HederaMetadata: NamespaceMetadata = {
  testnet: {
    logo: HEDERA_LOGO_URL,
    rgb: "118, 90, 234",
  },
};

export const HederaChainData: ChainsMap = {
  testnet: {
    name: "Hedera Testnet",
    id: "hedera:testnet",
    rpc: ["https://testnet.hashio.io/api"],
    slip44: 3030,
    testnet: true,
  },
};

export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = HederaMetadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}
