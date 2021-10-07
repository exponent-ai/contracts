# exponent-protocol

Smart contracts for Exponent project

# Installation

1. Clone the repository
2. Run `npm install` in root
3. Run `npm run compile` to verify that things work properly

# Test

### Unit

Run `npm run test`

### Integration

to run a test against a local mainnet fork:

1. create `.env` file inside the root directory
2. copy the content of the `env.sample`
3. create a new Alchemy account (necessary for Mainnet fork)
4. paste the Alchemy mainnet RPC endpoint
5. run `npm run test:integration`

# Code Formatter

1. Run `npm run lint`
2. Run `npm run format`

### Pre-push

Lint checks are automatically performed by [Husky](https://typicode.github.io/husky/#/) before code push.

# Local Node

to spin up a local hardhat node with exponent contracts run
  1. `npx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/<key> --fork-block-number 13088415`
  2. `npm run deploy:local`
  
to send ether to an address:
`npm run send:ether --amount=1 --to=0x1234`

to send USDC or WETH to an address
`npm run send:token --amount=1 --to=0x1234 --token=WETH`

get the addresses of the currently deployed contracts
`npm run get:address`

# License 
Exponent is licensed under the terms of the [GPL-3.0 License](LICENSE).
