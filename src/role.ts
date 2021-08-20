import { ethers } from "hardhat";
import { Contract } from "ethers";

export enum Role {
  AssetWhitelister = "ASSET_WHITELIST_ROLE",
  Settler = "SETTLER_ROLE",
  Manager = "MANAGER_ROLE",
  VenueWhitelister = "VENUE_WHITELIST_ROLE",
  Admin = "DEFAULT_ADMIN_ROLE",
}

export interface IGrantRole {
  grantor: Contract;
  role: Role;
  grantee: String;
}

// grantor must be connected to signer
export async function grantRole(roleArgs: IGrantRole) {
  const role = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(roleArgs.role));
  await roleArgs.grantor.grantRole(role, roleArgs.grantee);
}
