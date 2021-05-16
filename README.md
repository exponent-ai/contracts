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
