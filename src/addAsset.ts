import { ethers } from "hardhat";
import { Contract } from "ethers";

export interface IAddAsset {
  contract: Contract;
  asset: string;
  feed: string;
  symbol: string;
}

// whitelist address and add config
export async function addAsset(assetConfig: IAddAsset) {
  await assetConfig.contract.whitelistAsset(assetConfig.asset);
  await assetConfig.contract.addAssetFeedConfig(
    assetConfig.symbol,
    assetConfig.asset,
    assetConfig.feed
  );
}
