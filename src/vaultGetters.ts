export interface IExponentConfig {
  0: string// denomAssetAddress;
  1: string// lptoken;
  2: string// signalPool;
  3: string// signalName;
  4: string// admin
}

export interface IEnzymeConfig {
  0: string// ezShares;
  1: string// ezComptroller;
  2: string// ezWhitelistPolicy;
  3: string// ezPolicy;
  4: string// ezTrackedAssetAdapter;
  5: string// ezIntegrationManager;
  6: string// ezDeployer;
}

// exponent config

export function getDenomAsset(config: IExponentConfig) {
  return config[0];
}

export function getLPToken(config: IExponentConfig) {
  return config[1];
}

export function getSignalPool(config: IExponentConfig) {
  return config[2];
}

export function getSignalName(config: IExponentConfig) {
  return config[3];
}

export function getAdmin(config: IExponentConfig) {
  return config[4];
}

// enzyme config

export function getShares(config: IEnzymeConfig) {
  return config[0];
}

export function getComptroller(config: IEnzymeConfig) {
  return config[1];
}

export function getWhitelistPolicy(config: IEnzymeConfig) {
  return config[2];
}

export function getPolicyManager(config: IEnzymeConfig) {
  return config[3];
}

export function getTrackedAssetAdapter(config: IEnzymeConfig) {
  return config[4];
}

export function getIntegrationManager(config: IEnzymeConfig) {
  return config[5];
}

export function getDeployer(config: IEnzymeConfig) {
  return config[6];
}
