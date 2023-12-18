import { createPublicClient, createWalletClient, http, getContract, formatEther, defineChain, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import arg from 'arg'

const abis = [
  'function nextId() view returns (uint256)',
  'function create(address creator, uint256 questionId, string _uri) public',
  'function buy(uint256 id, uint256 amount) external payable',
  'function sell(uint256 id, uint256 amount) external',
  'event Created(uint256 indexed id, uint256 indexed questionId, address indexed creator, string uri)',
  'event Bought(uint256 indexed id, address indexed sender, uint256 amount, uint256 price, uint256 fee)',
  'event Sold(uint256 indexed id, address indexed sender, uint256 amount, uint256 price, uint256 fee)',
  'function CREATOR_PREMINT_SHARE() view returns (uint256)',
  //
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
  //
  'function getBuyPrice(uint256 id, uint256 amount) view returns (uint256)',
  'function getSellPrice(uint256 id, uint256 amount) view returns (uint256)',
  'function getBuyPriceWithFee(uint256 id, uint256 amount) view returns (uint256)',
  'function getSellPriceWithFee(uint256 id, uint256 amount) view returns (uint256)',
] as const

async function main() {
  const args = arg({
    '--rpc-url': String,
    '--private-key': String,
    '--address': String,
  })
  if (!args['--private-key']) {
    throw new Error('missing --private-key')
  }
  if (!args['--rpc-url']) {
    throw new Error('missing --rpc-url')
  }
  if (!args['--address']) {
    throw new Error('missing --address')
  }
  const rpcUrl = args['--rpc-url']
  console.log('RPC:', rpcUrl)

  // const chain = polygonMumbai
  const chain = defineChain({
    id: 595,
    name: 'Acala Mandala Testnet',
    network: 'acala',
    nativeCurrency: {
      decimals: 18,
      name: 'ACA',
      symbol: 'ACA',
    },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
      public: {
        http: [rpcUrl],
      }
    }
  })

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  })
  const chainId = await publicClient.getChainId()

  const account = privateKeyToAccount(args['--private-key'] as `0x${string}`)
  const walletClient = createWalletClient({
    chain,
    transport: http(),
    account,
  })

  console.log('chainId:', chainId)
  console.log('operator:', account.address)

  const balance = await publicClient.getBalance({ address: account.address })
  const tokens = formatEther(balance)
  console.log('balance:', tokens)

  const contract = getContract({
    address: args['--address'] as `0x${string}`,
    abi: parseAbi(abis),
    publicClient: publicClient,
    walletClient: walletClient,
  })

  const price = await contract.read.getBuyPriceWithFee([BigInt(1), BigInt(1e18)])
  const gasPrice = await publicClient.getGasPrice()
  console.log('gasPrice', gasPrice)
  const gasLimit = await contract.estimateGas.buy([BigInt(1), BigInt(1e18)], { account, value: price })
  console.log('gasLimit', gasLimit)

  // const hash = await contract.write.buy([BigInt(1), BigInt(1e18)], { account, value: price })
  // console.log('final hash', hash)
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err)
  process.exit(1)
})
