import { ProposalTypes } from "@walletconnect/types";
import {
  DEFAULT_EIP155_METHODS,
  DEFAULT_EIP_155_EVENTS,
  DEFAULT_NEAR_EVENTS,
  DEFAULT_EIP155_OPTIONAL_METHODS,
  DEFAULT_HEDERA_METHODS,
  DEFAULT_HEDERA_EVENTS,
} from "../constants";

export const getNamespacesFromChains = (chains: string[]) => {
  const supportedNamespaces: string[] = [];
  chains.forEach((chainId) => {
    const [namespace] = chainId.split(":");
    if (!supportedNamespaces.includes(namespace)) {
      supportedNamespaces.push(namespace);
    }
  });

  return supportedNamespaces;
};

export const getSupportedRequiredMethodsByNamespace = (namespace: string) => {
  switch (namespace) {
    case "eip155":
      return Object.values(DEFAULT_EIP155_METHODS);
    case "hedera":
      return Object.values(DEFAULT_HEDERA_METHODS);
    default:
      throw new Error(
        `No default required methods for namespace: ${namespace}`
      );
  }
};

export const getSupportedOptionalMethodsByNamespace = (namespace: string) => {
  switch (namespace) {
    case "eip155":
      return Object.values(DEFAULT_EIP155_OPTIONAL_METHODS);
    case "hedera":
      return [];
    default:
      throw new Error(
        `No default optional methods for namespace: ${namespace}`
      );
  }
};

export const getSupportedEventsByNamespace = (namespace: string) => {
  switch (namespace) {
    case "eip155":
      return Object.values(DEFAULT_EIP_155_EVENTS);
    case "hedera":
      return Object.values(DEFAULT_HEDERA_EVENTS);
    default:
      throw new Error(`No default events for namespace: ${namespace}`);
  }
};

export const getRequiredNamespaces = (
  chains: string[]
): ProposalTypes.RequiredNamespaces => {
  const selectedNamespaces = getNamespacesFromChains(chains);
  console.log("selected required namespaces:", selectedNamespaces);

  return Object.fromEntries(
    selectedNamespaces.map((namespace) => [
      namespace,
      {
        methods: getSupportedRequiredMethodsByNamespace(namespace),
        chains: chains.filter((chain) => chain.startsWith(namespace)),
        events: getSupportedEventsByNamespace(namespace) as any[],
      },
    ])
  );
};

export const getOptionalNamespaces = (
  chains: string[]
): ProposalTypes.OptionalNamespaces => {
  const selectedNamespaces = getNamespacesFromChains(chains);
  console.log("selected optional namespaces:", selectedNamespaces);

  return Object.fromEntries(
    selectedNamespaces.map((namespace) => [
      namespace,
      {
        methods: getSupportedOptionalMethodsByNamespace(namespace),
        chains: chains.filter((chain) => chain.startsWith(namespace)),
        events: [],
      },
    ])
  );
};
