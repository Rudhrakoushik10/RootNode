import { abimethod, Account, assert, Contract, GlobalState, Txn, Uint64 } from '@algorandfoundation/algorand-typescript'
import type { uint64 } from '@algorandfoundation/algorand-typescript'

export class SpendTrackerContract extends Contract {
  owner = GlobalState<Account>()
  totalSpent = GlobalState<uint64>()
  totalTransactions = GlobalState<uint64>()
  lastServiceId = GlobalState<string>()
  lastAgentAddress = GlobalState<Account>()
  lastAmount = GlobalState<uint64>()

  @abimethod({ allowActions: 'NoOp' })
  public initialize(owner: Account): void {
    this.owner.value = owner
    this.totalSpent.value = Uint64(0)
    this.totalTransactions.value = Uint64(0)
  }

  @abimethod({ allowActions: 'NoOp' })
  public recordSpend(agent: Account, serviceId: string, amount: uint64): void {
    this.lastAgentAddress.value = agent
    this.lastServiceId.value = serviceId
    this.lastAmount.value = amount
    
    this.totalSpent.value = this.totalSpent.value + amount
    this.totalTransactions.value = this.totalTransactions.value + Uint64(1)
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getAgentStats(agent: Account): [uint64, uint64] {
    if (this.lastAgentAddress.value === agent) {
      return [this.lastAmount.value, Uint64(1)]
    }
    return [Uint64(0), Uint64(0)]
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getServiceSpend(serviceId: string): uint64 {
    if (this.lastServiceId.value === serviceId) {
      return this.lastAmount.value
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
    assert(Txn.sender === this.owner.value, 'Only owner can record refund')
    if (this.totalSpent.value >= amount) {
      this.totalSpent.value = this.totalSpent.value - amount
      this.totalTransactions.value = this.totalTransactions.value - Uint64(1)
    }
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public verifySpendRecord(agent: Account, minExpectedSpent: uint64): boolean {
    if (this.lastAgentAddress.value === agent && this.lastAmount.value >= minExpectedSpent) {
      return true
    }
    return this.totalSpent.value >= minExpectedSpent
  }
}