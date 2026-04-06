import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { ReceiptAnchorContractFactory } from '../artifacts/receipt_anchor/ReceiptAnchorContractClient'

export async function deploy() {
  console.log('=== Deploying ReceiptAnchorContract ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(ReceiptAnchorContractFactory, {
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
      },
    })
    
    await algorand.send.payment({
      amount: (0.1).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
  }

  console.log(`ReceiptAnchorContract deployed: ${appClient.appClient.appId}`)
  return appClient.appClient.appId
}
