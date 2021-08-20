import { ethers } from "hardhat";
import { Contract } from "ethers";

export interface SignalRegistra {
  name: string;
  metadata: string;
  symbols: Array<string>;
}

export interface ISignal {
  signalRegistra: SignalRegistra;
  contract: Contract;
}

export const defaultSignal: SignalRegistra = {
  name: "testsignal",
  metadata: "Simple",
  symbols: ["WETH", "BTC", "USDC"],
};

export class SignalService {
  public registra: SignalRegistra;
  public contract: Contract;
  constructor(signalConfig: ISignal) {
    this.registra = signalConfig.signalRegistra;
    this.contract = signalConfig.contract;
  }

  public async register() {
    await this.contract.registerSignal(
      this.registra.name,
      this.registra.metadata,
      this.registra.symbols
    );
  }

  public async submit(weights: Array<number>) {
    if (weights.length !== this.registra.symbols.length) {
      throw new Error("length unexpected length of signal symbols");
    }
    await this.contract.submitSignal(
      this.registra.name,
      this.registra.symbols,
      weights,
      "0x"
    );
  }
}
