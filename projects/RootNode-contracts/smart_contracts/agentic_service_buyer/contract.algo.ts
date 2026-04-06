import { Contract } from '@algorandfoundation/algorand-typescript'

export class AgenticServiceBuyer extends Contract {
  hello(name: string): string {
    return `Hello, ${name}`
  }
}
