import {
  managementFeeConfigArgs,
  feeManagerConfigArgs,
  performanceFeeConfigArgs,
  convertRateToScaledPerSecondRate,
} from "@enzymefinance/protocol";
import { ethers } from "hardhat";
import { BytesLike } from "ethers";

export interface EnzymeContracts {
  deployer: string;
  integrationManager: string;
  trackedAssetAdapter: string;
  policyManager: string;
  whitelistPolicy: string;
}

export interface IDeployerArgs {
  enzyme: EnzymeContracts;
  admin: string;
  settler: string;
  signal: string;
  signalName: string;
  denomAsset: string;
  denomSymbol: string;
  tokenSymbol: string;
  feeConfig: BytesLike;
}

export interface IFeeConfig {
  managementFeePercent: string;
  managementFeeAddress: string;
  performanceFeePercent?: string;
  performanceFeeAddress?: string;
}

export function feeConfig(feeArg: IFeeConfig): BytesLike {
  const rate = ethers.utils.parseEther(feeArg.managementFeePercent);
  const scaledPerSecondRate = convertRateToScaledPerSecondRate(rate);

  const managementFeeSettings = managementFeeConfigArgs(scaledPerSecondRate);
  if (feeArg.performanceFeePercent && feeArg.performanceFeeAddress) {
    const performanceFeeRate = ethers.utils.parseEther(
      feeArg.performanceFeePercent
    );
    const performanceFeePeriod = ethers.BigNumber.from(24 * 60 * 60 * 365);
    const performanceFeeConfig = performanceFeeConfigArgs({
      rate: performanceFeeRate,
      period: performanceFeePeriod,
    });

    return feeManagerConfigArgs({
      fees: [feeArg.managementFeeAddress, feeArg.performanceFeeAddress],
      settings: [managementFeeSettings, performanceFeeConfig],
    });
  }
  return feeManagerConfigArgs({
    fees: [feeArg.managementFeeAddress],
    settings: [managementFeeSettings],
  });
}

export function deployerArgs(args: IDeployerArgs) {
  return [
    args.admin,
    args.settler,
    args.signal,
    args.signalName,
    args.denomAsset,
    args.denomSymbol,
    args.enzyme.deployer,
    args.enzyme.integrationManager,
    args.enzyme.trackedAssetAdapter,
    args.enzyme.policyManager,
    args.enzyme.whitelistPolicy,
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    args.feeConfig,
    args.tokenSymbol,
  ];
}
