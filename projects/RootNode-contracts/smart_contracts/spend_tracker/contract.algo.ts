import { abimethod, Account, assert, Contract, GlobalState, Txn, Uint64 } from '@algorandfoundation/algorand-typescript'
import { BoxMap } from '@algorandfoundation/algorand-typescript'
import type { uint64 } from '@algorandfoundation/algorand-typescript'

export class SpendTrackerContract extends Contract {
  owner = GlobalState<Account>()
  totalSpent = GlobalState<uint64>()
  totalTransactions = GlobalState<uint64>()
  agentSpent = BoxMap<Account, uint64>({ keyPrefix: 'agent' })
  agentTxCount = BoxMap<Account, uint64>({ keyPrefix: 'agentcnt' })
  serviceSpend = BoxMap<string, uint64>({ keyPrefix: 'service' })

  @abimethod({ allowActions: 'NoOp' })
  public initialize(owner: Account): void {
    this.owner.value = owner
    this.totalSpent.value = Uint64(0)
    this.totalTransactions.value = Uint64(0)
  }

  @abimethod({ allowActions: 'NoOp' })
  public recordSpend(agent: Account, serviceId: string, amount: uint64): void {
    if (!this.agentSpent(agent).exists) {
      this.agentSpent(agent).value = Uint64(0)
      this.agentTxCount(agent).value = Uint64(0)
    }

    this.agentSpent(agent).value = this.agentSpent(agent).value + amount
    this.agentTxCount(agent).value = this.agentTxCount(agent).value + Uint64(1)
    this.serviceSpend(serviceId).value = this.serviceSpend(serviceId).get({ default: Uint64(0) }) + amount
    this.totalSpent.value = this.totalSpent.value + amount
    this.totalTransactions.value = this.totalTransactions.value + Uint64(1)
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getAgentStats(agent: Account): [uint64, uint64] {
    let totalSpent = Uint64(0)
    let txCount = Uint64(0)

    if (this.agentSpent(agent).exists) {
      totalSpent = this.agentSpent(agent).value
    }
    if (this.agentTxCount(agent).exists) {
      txCount = this.agentTxCount(agent).value
    }

    return [totalSpent, txCount]
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getServiceSpend(serviceId: string): uint64 {
    if (this.serviceSpend(serviceId).exists) {
      return this.serviceSpend(serviceId).value
    }
    return Uint64(0)
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getGlobalStats(): [uint64, uint64] {
    return [this.totalSpent.value, this.totalTransactions.value]
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getOwner(): Account {
    return this.owner.value
  }

  @abimethod({ allowActions: 'NoOp' })
  public recordRefund(agent: Account, amount: uint64): void {
    if (this.agentSpent(agent).exists) {
      const currentSpent = this.agentSpent(agent).value
      if (currentSpent >= amount) {
        this.agentSpent(agent).value = currentSpent - amount
      }
    }
    if (this.totalSpent.value >= amount) {
      this.totalSpent.value = this.totalSpent.value - amount
    }
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public verifySpendRecord(agent: Account, minExpectedSpent: uint64): boolean {
    if (!this.agentSpent(agent).exists) {
      return false
    }
    return this.agentSpent(agent).value >= minExpectedSpent
  }
}
