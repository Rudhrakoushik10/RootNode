import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { SpendTrackerContractFactory } from '../artifacts/spend_tracker/SpendTrackerContractClient'

export async function deploy() {
  console.log('=== Deploying SpendTrackerContract ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(SpendTrackerContractFactory, {
    defaultSender: deployer.addr,
  })

  const { appClient, result } = await factory.deploy({
    onUpdate: 'append',
    onSchemaBreak: 'append',
    createArgs: {
      owner: deployer.addr,
    },
  })

  if (['create', 'replace'].includes(result.operationPerformed)) {
    await algorand.send.payment({
      amount: (0.1).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
  }

  console.log(`SpendTrackerContract deployed: ${appClient.appClient.appId}`)
  return appClient.appClient.appId
}
