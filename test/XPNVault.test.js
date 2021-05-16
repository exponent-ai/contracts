const { expect } = require("chai");

describe("XPNVault", function () {
  beforeEach(async function () {
    [this.depositor, this.admin] = await ethers.getSigners();
    const MockToken = await ethers.getContractFactory("MockERC20");
    this.token = await MockToken.deploy("DAI token", "DAI");
    await this.token.deployed();
    this.shares = await MockToken.deploy("Enzyme Shares", "SHARES");
    await this.shares.deployed();
    const Vault = await ethers.getContractFactory("XPNVaultSpy");
    this.vault = await Vault.deploy(
      this.admin.address,
      this.token.address,
      this.shares.address,
      "Exponent DAI LP Token",
      "EXLP-DAI"
    );
    await this.vault.deployed();
    const lpaddress = await this.vault.lptoken();
    this.lptoken = await ethers.getContractAt("LPToken", lpaddress);
    this.mintAmount = 10000;
    this.withdrawAmount = 10000;
    await this.vault.setAmountToMint(this.mintAmount);
    await this.token.mint(this.mintAmount);
  });

  describe("deposit", function () {
    it("should deposit successfully", async function () {
      await this.token.approve(this.vault.address, this.mintAmount);
      await this.vault.setAmountToMint(this.mintAmount);
      await this.vault.deposit(this.mintAmount);
      expect(await this.lptoken.balanceOf(this.depositor.address)).to.be.equal(
        this.mintAmount
      );
      expect(await this.lptoken.totalSupply()).to.be.equal(this.mintAmount);
      expect(await this.token.balanceOf(this.vault.address)).to.be.equal(
        this.mintAmount
      );
      expect(await this.vault.depositHookCalled()).to.be.true;
    });

    it("should emit an event", async function () {
      await this.token.approve(this.vault.address, this.mintAmount);
      await expect(this.vault.deposit(this.mintAmount))
        .to.emit(this.vault, "Deposit")
        .withArgs(this.depositor.address, this.mintAmount);
    });

    it("should not allow zero value amount", async function () {
      await expect(this.vault.deposit(0)).to.be.revertedWith(
        "Vault: _amount cant be zero"
      );
    });

    it("should revert user does not have enough balance in denom asset", async function () {
      await this.token.approve(this.vault.address, this.mintAmount);
      await expect(
        this.vault.deposit(this.mintAmount + 1000)
      ).to.be.revertedWith("Vault: not enough balance to deposit");
    });

    it("should revert if the denom asset was not successfully transfered", async function () {
      await this.token.approve(this.vault.address, this.mintAmount);
      await this.token.setReturnToFalse();
      await expect(this.vault.deposit(this.mintAmount)).to.be.revertedWith(
        "Vault: unsuccessful deposit"
      );
    });

    it("should revert if balance before != after", async function () {
      await this.vault.setAmountToMint(500);
      await this.token.setReturnAmount(500);
      await this.token.approve(this.vault.address, this.mintAmount);
      await expect(this.vault.deposit(this.mintAmount)).to.be.revertedWith(
        "Vault: incorrect balance after deposit"
      );
    });
  });

  describe("withdraw", function () {
    it("should withdraw successfully", async function () {
      await this.token.approve(this.vault.address, this.mintAmount);
      await this.vault.setAmountToMint(this.mintAmount);
      await this.vault.setAmountToWithdraw(this.withdrawAmount);
      await this.vault.deposit(this.mintAmount);

      await this.lptoken.approve(this.vault.address, this.mintAmount);
      await this.vault.withdraw(this.withdrawAmount);
      expect(await this.lptoken.totalSupply()).to.be.equal(0);
      expect(await this.token.balanceOf(this.vault.address)).to.be.equal(0);
      expect(await this.token.balanceOf(this.depositor.address)).to.be.equal(
        this.mintAmount
      );
      expect(await this.vault.withdrawHookCalled()).to.be.true;
    });

    it("should emit an event", async function () {
      await this.token.approve(this.vault.address, this.mintAmount);
      await this.vault.setAmountToMint(this.mintAmount);
      await this.vault.setAmountToWithdraw(this.withdrawAmount);
      await this.vault.deposit(this.mintAmount);

      await this.lptoken.approve(this.vault.address, this.mintAmount);
      await expect(this.vault.withdraw(this.withdrawAmount))
        .to.emit(this.vault, "Withdraw")
        .withArgs(
          this.depositor.address,
          [this.token.address],
          [this.withdrawAmount]
        );
    });

    it("should not allow zero value amount", async function () {
      await expect(this.vault.withdraw(0)).to.be.revertedWith(
        "Vault: _amount cant be zero"
      );
    });

    it("should revert if there is not enough lptoken to withdraw", async function () {
      await expect(this.vault.withdraw(this.withdrawAmount)).to.be.revertedWith(
        "Vault: not enough lptoken to withdrwal"
      );
    });

    it("should revert transfer to withdrawer is unsuccessful", async function () {
      await this.token.approve(this.vault.address, this.mintAmount);
      await this.vault.setAmountToMint(this.mintAmount);
      await this.vault.setAmountToWithdraw(this.withdrawAmount);
      await this.vault.deposit(this.mintAmount);

      await this.token.setReturnToFalse();
      await this.lptoken.approve(this.vault.address, this.withdrawAmount);
      await expect(this.vault.withdraw(this.withdrawAmount)).to.be.revertedWith(
        "Vault: unsuccessful transfer to withdrawer"
      );
    });
  });
  describe("fees redemption", function () {
    it("should redeem correctly to the admin", async function () {
      await this.token.approve(this.vault.address, this.mintAmount);
      await this.vault.setAmountToMint(this.mintAmount);
      await this.vault.deposit(this.mintAmount);
      await this.vault.setAmountToWithdraw(this.mintAmount);
      await this.vault.setSharesToRedeem(this.mintAmount + this.mintAmount); //expect shares to be higher than circulating LPtokens
      await this.vault
        .connect(this.admin)
        .redeemFees(this.admin.address, [this.admin.address]);
      expect(await this.vault.redeemFeesCalled()).to.be.true;
      expect(await this.vault.withdrawHookCalled()).to.be.true;
      expect(await this.token.balanceOf(this.admin.address)).to.be.equal(
        this.mintAmount
      );
    });
    it("should revert if no fee shares are available", async function () {
      await this.token.approve(this.vault.address, this.mintAmount);
      await this.vault.setAmountToMint(this.mintAmount);
      await this.vault.deposit(this.mintAmount);
      await this.vault.setAmountToWithdraw(this.mintAmount);
      await this.vault.setSharesToRedeem(this.mintAmount); //expect shares to be higher than circulating LPtokens
      await expect(
        this.vault
          .connect(this.admin)
          .redeemFees(this.admin.address, [this.admin.address])
      ) // substitute random addresses
        .to.be.revertedWith("_redeemFees: no fee shares available");
    });
    it("should revert if payout is unsuccessful", async function () {
      await this.token.approve(this.vault.address, this.mintAmount);
      await this.vault.setAmountToMint(this.mintAmount);
      await this.vault.deposit(this.mintAmount);
      await this.vault.setAmountToWithdraw(this.mintAmount);
      await this.vault.setSharesToRedeem(this.mintAmount + this.mintAmount); //expect shares to be higher than circulating LPtokens
      await this.token.setReturnToFalse();
      await expect(
        this.vault
          .connect(this.admin)
          .redeemFees(this.admin.address, [this.admin.address])
      ) // substitute random addresses
        .to.be.revertedWith("Vault: unsuccessful redemption");
    });
  });
});
