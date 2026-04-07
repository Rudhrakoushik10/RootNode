import { abimethod, Account, assert, Contract, Global, GlobalState, itxn, Txn, Uint64, bytes } from '@algorandfoundation/algorand-typescript'
import type { gtxn } from '@algorandfoundation/algorand-typescript'
import type { uint64 } from '@algorandfoundation/algorand-typescript'

const STATUS_PENDING = Uint64(0)
const STATUS_COMPLETED = Uint64(1)
const STATUS_REFUNDED = Uint64(2)
const STATUS_EXPIRED = Uint64(3)

export class EscrowContract extends Contract {
  agent = GlobalState<Account>()
  provider = GlobalState<Account>()
  amountLocked = GlobalState<uint64>()
  status = GlobalState<uint64>()
  serviceId = GlobalState<string>()
  serviceResult = GlobalState<bytes>()
  lockTime = GlobalState<uint64>()
  timeout = GlobalState<uint64>()

  @abimethod({ allowActions: 'NoOp' })
  public initialize(agent: Account, provider: Account, serviceId: string, amount: uint64, timeoutSecs: uint64): void {
    this.agent.value = agent
    this.provider.value = provider
    this.serviceId.value = serviceId
    this.amountLocked.value = amount
    this.status.value = STATUS_PENDING
    this.lockTime.value = Global.latestTimestamp
    this.timeout.value = timeoutSecs
    this.serviceResult.value = Global.zeroAddress.bytes
  }

  @abimethod({ allowActions: 'NoOp' })
  public lockFunds(payment: gtxn.PaymentTxn): void {
    assert(Txn.sender === this.agent.value, 'Only agent can lock funds')
    assert(this.status.value === STATUS_PENDING, 'Escrow not in pending state')
    assert(
      payment.receiver === Global.currentApplicationAddress,
      'Payment must go to escrow'
    )
    assert(
      payment.amount === this.amountLocked.value,
      'Payment amount must match locked amount'
    )
  }

  @abimethod({ allowActions: 'NoOp' })
  public confirmService(serviceResult: bytes): void {
    assert(Txn.sender === this.provider.value, 'Only provider can confirm')
    assert(this.status.value === STATUS_PENDING, 'Escrow not in pending state')
    this.serviceResult.value = serviceResult
    this.status.value = STATUS_COMPLETED
  }

  @abimethod({ allowActions: 'NoOp' })
  public updateStatus(newStatus: uint64): void {
    assert(false, 'updateStatus is deprecated and should not be used');
  }

  @abimethod({ allowActions: 'NoOp' })
  public releaseFunds(): void {
    assert(Txn.sender === this.agent.value, 'Only agent can release')
    assert(this.status.value === STATUS_COMPLETED, 'Service not confirmed')

    itxn.payment({
      receiver: this.provider.value,
      amount: this.amountLocked.value,
      fee: Uint64(0),
    }).submit()

    // Ensure status is updated only after successful payment
    this.status.value = STATUS_COMPLETED
  }

  @abimethod({ allowActions: 'NoOp' })
  public rejectAndRefund(reason: string): void {
    assert(Txn.sender === this.provider.value || Txn.sender === this.agent.value, 'Only provider or agent')
    assert(this.status.value === STATUS_PENDING, 'Escrow not in pending state')

    itxn.payment({
      receiver: this.agent.value,
      amount: this.amountLocked.value,
      fee: Uint64(0),
    }).submit()

    this.status.value = STATUS_REFUNDED
  }

  @abimethod({ allowActions: 'NoOp' })
  public expireAndRefund(): void {
    assert(Global.latestTimestamp > this.lockTime.value + this.timeout.value, 'Not expired')
    assert(this.status.value === STATUS_PENDING, 'Already resolved')

    itxn.payment({
      receiver: this.agent.value,
      amount: this.amountLocked.value,
      fee: Uint64(0),
    }).submit()

    this.status.value = STATUS_EXPIRED
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getEscrowInfo(): [Account, Account, uint64, uint64] {
    return [
      this.agent.value,
      this.provider.value,
      this.amountLocked.value,
      this.status.value,
    ]
  }

  @abimethod({ allowActions: 'NoOp', readonly: true })
  public getStatus(): uint64 {
    return this.status.value
  }
}
