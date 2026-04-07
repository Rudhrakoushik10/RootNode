import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { PolicyContractFactory } from '../artifacts/policy/PolicyContractClient'

export async function deploy() {
  console.log('=== Deploying PolicyContract ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(PolicyContractFactory, {
    defaultSender: deployer.addr,
  })

  const { appClient, result } = await factory.deploy({
    onUpdate: 'append',
    onSchemaBreak: 'append',
  })

  if (['create', 'replace'].includes(result.operationPerformed)) {
    console.log('Calling initialize...')
    await appClient.send.initialize({
      args: {
        owner: deployer.addr,
        maxPerCallMicroAlgos: BigInt(10000),
        totalBudgetMicroAlgos: BigInt(500000),
      },
    })
    
    console.log('Funding app account for boxes...')
    await algorand.send.payment({
      amount: (0.2).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })

    console.log('Creating category boxes...')
    for (const category of ['weather', 'medical', 'satellite', 'routing', 'finance']) {
      try {
        await appClient.send.createCategoryBox({
          args: { category },
        })
        console.log(`  Created box for: ${category}`)
      } catch (e) {
        console.log(`  Failed to create box for ${category}:`, e)
      }
    }

    console.log('Adding whitelisted categories...')
    for (const category of ['weather', 'medical', 'satellite', 'routing', 'finance']) {
      try {
        await appClient.send.addCategory({
          args: { category },
        })
        console.log(`  Added category: ${category}`)
      } catch (e) {
        console.log(`  Failed to add category ${category}:`, e)
      }
    }
  }

  console.log(`PolicyContract deployed: ${appClient.appClient.appId}`)
  return appClient.appClient.appId
}
