const { Blockchain } = require('../client/lib/ft3');
const Asset = require("../test_admin/testnetAdmin/testnet-asset");

const DirectoryService = require('../test_admin/util/directory-service-util');


const Config = {
    chainId: "A30D99841004DE1133D8B40FF01A50BBAA6ED944E0794D5BF52052696E214FBC",
    chains: [
        {
            rid: 'F9C55606AF6C9D8C36FDC5DFDB744CA6C8A8D9CC3E222B933BD36473A6D92EF0',
            url: 'https://dev.vault-node.chromia-development.com',
        }
    ]
}

async function createAssetIfNeeded(asset, blockchain) {
  console.log(`Checking if '${asset}' exists...`)

  const assets = await Asset.getByName(asset, blockchain)

  if (assets.length > 0) {
    console.log(`'${asset}' already exists.`)
    return
  }

  console.log(`Asset doesn't exist. Creating asset...`)

  await Asset.register('CHROMA', Config.chainId, blockchain)

  console.log('Done creating asset')
}

async function registerSideChains(blockchain) {
  await Promise.all(
    Config.chains.map(async ({ rid }) => {
      if (rid.toUpperCase() === Config.chainId.toUpperCase()) {
        return
      }

      const ridBuffer = Buffer.from(rid, 'hex')

      const isLinked = await blockchain.isLinkedWithChain(ridBuffer)

      if (!isLinked) {
        await blockchain.linkChain(ridBuffer)
      }
    }),
  )
}

;(async () => {
  const blockchain = await Blockchain.initialize(
    Config.chainId,
    new DirectoryService(),
  )
  await createAssetIfNeeded('CHROMA', blockchain)
  await registerSideChains(blockchain)
})()
