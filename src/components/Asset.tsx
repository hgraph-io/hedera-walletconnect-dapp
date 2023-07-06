import * as React from "react";
import styled from "styled-components";

import Icon from "./Icon";

import { AssetData, fromWad } from "../helpers";

const SAsset = styled.div`
  width: 100%;
  padding: 20px;
  display: flex;
  justify-content: space-between;
`;
const SAssetLeft = styled.div`
  display: flex;
`;

const SAssetName = styled.div`
  display: flex;
  margin-left: 10px;
`;

const SAssetRight = styled.div`
  display: flex;
`;

const SAssetBalance = styled.div`
  display: flex;
`;

function getAssetIcon(asset: AssetData): JSX.Element {
  if (!!asset.contractAddress) {
    const src = `https://raw.githubusercontent.com/TrustWallet/tokens/master/tokens/${asset.contractAddress.toLowerCase()}.png`;
    return <Icon src={src} fallback={"/assets/erc20.svg"} />;
  }
  switch (asset.name.toLowerCase()) {
    case "ether":
      return <Icon src={"/assets/eth.svg"} />;
    case "hbar":
      return <Icon src={"/assets/hedera-hbar-logo.png"} />;
    default:
      return <Icon src={"/assets/erc20.svg"} />;
  }
}

function formatAssetBalance(asset: AssetData) {
  if (!asset.balance) return "0";
  switch (asset.name.toLowerCase()) {
    case "ether":
      return fromWad(asset.balance);
    default:
      return asset.balance;
  }
}

interface AssetProps {
  asset: AssetData;
}

const Asset = (props: AssetProps) => {
  const { asset } = props;
  return (
    <SAsset {...props}>
      <SAssetLeft>
        {getAssetIcon(asset)}
        <SAssetName>{asset.name}</SAssetName>
      </SAssetLeft>
      <SAssetRight>
        <SAssetBalance>{`${formatAssetBalance(asset)} ${
          asset.symbol
        }`}</SAssetBalance>
      </SAssetRight>
    </SAsset>
  );
};

export default Asset;
