import axios, { AxiosInstance } from "axios";
import { AssetData } from "./types";

export const rpcProvidersByChainId: Record<number, any> = {
  1: {
    name: "Ethereum Mainnet",
    baseURL: "https://mainnet.infura.io/v3/5dc0df7abe4645dfb06a9a8c39ede422",
    token: {
      name: "Ether",
      symbol: "ETH",
    },
  },
  5: {
    name: "Ethereum Goerli",
    baseURL: "https://goerli.infura.io/v3/5dc0df7abe4645dfb06a9a8c39ede422",
    token: {
      name: "Ether",
      symbol: "ETH",
    },
  },
};

const apiConfig = {
  timeout: 10000, // 10 secs
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
};

const api: AxiosInstance = axios.create({
  ...apiConfig,
  baseURL: "https://ethereum-api.xyz",
});

const hederaApi: AxiosInstance = axios.create({
  ...apiConfig,
  baseURL: "https://testnet.mirrornode.hedera.com/api/v1",
});

export async function apiGetAccountBalance(
  address: string,
  chainId: string
): Promise<AssetData> {
  const namespace = chainId.split(":")[0];
  if (namespace === "hedera") {
    const response = await hederaApi.get(`/accounts/${address}`);
    const { data } = response;
    const balance = data.balance.balance;
    return {
      balance,
      name: "HBar",
      symbol: "ℏ",
    };
  }
  if (namespace !== "eip155") {
    return { balance: "", symbol: "", name: "" };
  }
  const ethChainId = chainId.split(":")[1];
  const rpc = rpcProvidersByChainId[Number(ethChainId)];
  if (!rpc) {
    return { balance: "", symbol: "", name: "" };
  }
  const { baseURL, token } = rpc;
  const response = await api.post(baseURL, {
    jsonrpc: "2.0",
    method: "eth_getBalance",
    params: [address, "latest"],
    id: 1,
  });
  const { result } = response.data;
  const balance = parseInt(result, 16).toString();
  return { balance, ...token };
}

export const apiGetAccountNonce = async (
  address: string,
  chainId: string
): Promise<number> => {
  const ethChainId = chainId.split(":")[1];
  const { baseURL } = rpcProvidersByChainId[Number(ethChainId)];
  const response = await api.post(baseURL, {
    jsonrpc: "2.0",
    method: "eth_getTransactionCount",
    params: [address, "latest"],
    id: 1,
  });
  const { result } = response.data;
  const nonce = parseInt(result, 16);
  return nonce;
};

export const apiGetGasPrice = async (chainId: string): Promise<string> => {
  const ethChainId = chainId.split(":")[1];
  const { baseURL } = rpcProvidersByChainId[Number(ethChainId)];
  const response = await api.post(baseURL, {
    jsonrpc: "2.0",
    method: "eth_gasPrice",
    params: [],
    id: 1,
  });
  const { result } = response.data;
  return result;
};
