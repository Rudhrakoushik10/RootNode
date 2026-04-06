import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { EscrowContractFactory } from '../artifacts/escrow/EscrowContractClient'

export async function deploy() {
  console.log('=== Deploying EscrowContract (not deployed automatically - use via backend API) ===')
  console.log('Note: EscrowContract is created per-transaction, not globally')
  
  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(EscrowContractFactory, {
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
        agent: deployer.addr,
        provider: deployer.addr,
        serviceId: 'placeholder',
        amount: BigInt(1000),
        timeoutSecs: BigInt(300),
      },
    })
    
    await algorand.send.payment({
      amount: (0.1).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
  }

  console.log(`EscrowContract deployed: ${appClient.appClient.appId}`)
  return appClient.appClient.appId
}
