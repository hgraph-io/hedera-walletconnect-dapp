import { JsonRpcRequest } from "@walletconnect/jsonrpc-utils";

import {
  NamespaceMetadata,
  ChainMetadata,
  ChainRequestRender,
  convertHexToNumber,
  convertHexToUtf8,
  ChainsMap,
} from "../helpers";
import { BLOCKCHAIN_LOGO_BASE_URL } from "../constants";

export const EIP155Colors = {
  ethereum: "99, 125, 234",
  goerli: "189, 174, 155",
  zksync: "90, 90, 90",
  arbitrum: "44, 55, 75",
};

export const EIP155ChainData: ChainsMap = {
  "1": {
    name: "Ethereum Mainnet",
    id: "eip155:1",
    rpc: ["https://api.mycryptoapi.com/eth"],
    slip44: 60,
    testnet: false,
  },
  "5": {
    name: "Ethereum Goerli",
    id: "eip155:5",
    rpc: ["https://rpc.goerli.mudit.blog"],
    slip44: 60,
    testnet: true,
  },
  "42": {
    name: "Ethereum Kovan",
    id: "eip155:42",
    rpc: ["https://kovan.poa.network"],
    slip44: 60,
    testnet: true,
  },
  "280": {
    name: "zkSync Era Testnet",
    id: "eip155:280",
    rpc: ["https://testnet.era.zksync.dev"],
    slip44: 60,
    testnet: true,
  },
  "324": {
    name: "zkSync Era",
    id: "eip155:324",
    rpc: ["https://mainnet.era.zksync.io"],
    slip44: 60,
    testnet: false,
  },
  "42161": {
    name: "Arbitrum One",
    id: "eip155:42161",
    rpc: ["https://arb1.arbitrum.io/rpc"],
    slip44: 60,
    testnet: false,
  },
  "421611": {
    name: "Arbitrum Rinkeby",
    id: "eip155:421611",
    rpc: ["https://rinkeby.arbitrum.io/rpc"],
    slip44: 60,
    testnet: true,
  },
};

export const EIP155Metadata: NamespaceMetadata = {
  "1": {
    name: "Ethereum",
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:1.png",
    rgb: EIP155Colors.ethereum,
  },
  "5": {
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:1.png",
    rgb: EIP155Colors.ethereum,
  },
  "42": {
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:42.png",
    rgb: EIP155Colors.ethereum,
  },
  "280": {
    name: "zkSync Era Testnet",
    logo: "/assets/eip155-324.svg",
    rgb: EIP155Colors.zksync,
  },
  "324": {
    name: "zkSync Era",
    logo: "/assets/eip155-324.svg",
    rgb: EIP155Colors.zksync,
  },
  "42161": {
    name: "Arbitrum",
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:42161.png",
    rgb: EIP155Colors.arbitrum,
  },
  "421611": {
    logo: BLOCKCHAIN_LOGO_BASE_URL + "eip155:421611.png",
    rgb: EIP155Colors.arbitrum,
  },
};
export function getChainMetadata(chainId: string): ChainMetadata {
  const reference = chainId.split(":")[1];
  const metadata = EIP155Metadata[reference];
  if (typeof metadata === "undefined") {
    throw new Error(`No chain metadata found for chainId: ${chainId}`);
  }
  return metadata;
}

export function getChainRequestRender(
  request: JsonRpcRequest
): ChainRequestRender[] {
  let params = [{ label: "Method", value: request.method }];

  switch (request.method) {
    case "eth_sendTransaction":
    case "eth_signTransaction":
      params = [
        ...params,
        { label: "From", value: request.params[0].from },
        { label: "To", value: request.params[0].to },
        {
          label: "Gas Limit",
          value: request.params[0].gas
            ? convertHexToNumber(request.params[0].gas)
            : request.params[0].gasLimit
            ? convertHexToNumber(request.params[0].gasLimit)
            : "",
        },
        {
          label: "Gas Price",
          value: convertHexToNumber(request.params[0].gasPrice),
        },
        {
          label: "Nonce",
          value: convertHexToNumber(request.params[0].nonce),
        },
        {
          label: "Value",
          value: request.params[0].value
            ? convertHexToNumber(request.params[0].value)
            : "",
        },
        { label: "Data", value: request.params[0].data },
      ];
      break;

    case "eth_sign":
      params = [
        ...params,
        { label: "Address", value: request.params[0] },
        { label: "Message", value: request.params[1] },
      ];
      break;
    case "personal_sign":
      params = [
        ...params,
        { label: "Address", value: request.params[1] },
        {
          label: "Message",
          value: convertHexToUtf8(request.params[0]),
        },
      ];
      break;
    default:
      params = [
        ...params,
        {
          label: "params",
          value: JSON.stringify(request.params, null, "\t"),
        },
      ];
      break;
  }
  return params;
}
