import axios, { AxiosError } from 'axios';
import algosdk from 'algosdk';
import { getBackendAccount, sendPayment, waitForTransaction, verifyTransaction } from './walletService.js';
import logger from '../utils/logger.js';

export interface PaymentRequirements {
  scheme: string;
  network: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: {
    feePayer?: string;
  };
}

export interface X402Response {
  paymentRequired: boolean;
  requirements?: PaymentRequirements;
  error?: string;
}

export interface X402PaymentResult {
  success: boolean;
  txId?: string;
  error?: string;
  data?: unknown;
}

const X402_HEADER = 'PAYMENT-REQUIRED';
const PAYMENT_SIGNATURE_HEADER = 'PAYMENT-SIGNATURE';

export async function callWithX402Payment(
  url: string,
  method: string = 'GET',
  data?: unknown
): Promise<X402PaymentResult> {
  const account = getBackendAccount();
  
  if (!account) {
    return { success: false, error: 'Backend wallet not initialized' };
  }

  logger.info('Making x402 request', { url, method });

  try {
    const response = await axios({
      method,
      url,
      data,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    return { success: true, data: response.data };
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      const status = error.response.status;
      const headers = error.response.headers;

      if (status === 402) {
        const paymentRequired = headers[X402_HEADER] || headers['payment-required'];
        
        if (!paymentRequired) {
          return { success: false, error: '402 response but no payment requirements header' };
        }

        try {
          const requirements: PaymentRequirements = JSON.parse(
            Buffer.from(paymentRequired, 'base64').toString('utf-8')
          );

          logger.info('Received payment requirements', {
            amount: requirements.amount,
            payTo: requirements.payTo,
            asset: requirements.asset,
          });

          const paymentResult = await executePayment(account, requirements);
          
          if (!paymentResult.success) {
            return { success: false, error: paymentResult.error };
          }

          logger.info('Payment executed', { txId: paymentResult.txId });

          const verified = await verifyPaymentOnChain(paymentResult.txId!);
          
          if (!verified) {
            logger.warn('Payment not yet verified on chain, waiting...');
            const confirmed = await waitForTransaction(paymentResult.txId!, 30000);
            if (!confirmed) {
              return { success: false, error: 'Payment not confirmed on chain' };
            }
          }

          const retryResponse = await axios({
            method,
            url,
            data,
            headers: {
              'Content-Type': 'application/json',
              [PAYMENT_SIGNATURE_HEADER]: JSON.stringify({
                txId: paymentResult.txId,
                payment: requirements,
              }),
            },
            timeout: 30000,
          });

          return {
            success: true,
            txId: paymentResult.txId,
            data: retryResponse.data,
          };

        } catch (parseError) {
          logger.error('Failed to parse payment requirements', {
            error: parseError instanceof Error ? parseError.message : 'Unknown error',
          });
          return { success: false, error: 'Invalid payment requirements format' };
        }
      }

      return {
        success: false,
        error: `HTTP error: ${status} - ${error.response.statusText}`,
      };
    }

    if (error instanceof AxiosError && error.code === 'ECONNREFUSED') {
      return { success: false, error: 'Connection refused - provider server may be down' };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function executePayment(
  account: { addr: string; sk: Uint8Array },
  requirements: PaymentRequirements
): Promise<{ success: boolean; txId?: string; error?: string }> {
  try {
    const algorand = getAlgorandClient();
    
    const amount = BigInt(requirements.amount);
    const receiver = requirements.payTo;

    logger.info('Executing payment', {
      from: account.addr,
      to: receiver,
      amount: amount.toString(),
    });

    const txId = await sendPayment(account, receiver, amount);

    if (!txId) {
      return { success: false, error: 'Failed to send payment transaction' };
    }

    return { success: true, txId };

  } catch (error) {
    logger.error('Payment execution failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment execution failed',
    };
  }
}

async function verifyPaymentOnChain(txId: string): Promise<boolean> {
  try {
    const verified = await verifyTransaction(txId);
    logger.info('Payment verification result', { txId, verified });
    return verified;
  } catch (error) {
    logger.warn('Payment verification error', { txId, error });
    return false;
  }
}

function getAlgodClient(): algosdk.Algodv2 {
  return new algosdk.Algodv2('aaaaa', 'http://localhost:4001', '4001');
}

function getAlgorandClient(): algosdk.Algodv2 {
  return getAlgodClient();
}

export function parsePaymentRequirements(headerValue: string): PaymentRequirements | null {
  try {
    const decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
    const requirements = JSON.parse(decoded);
    
    if (
      requirements.scheme &&
      requirements.network &&
      requirements.amount &&
      requirements.payTo
    ) {
      return requirements;
    }
    
    return null;
  } catch {
    return null;
  }
}

export function buildPaymentSignature(txId: string, requirements: PaymentRequirements): string {
  return JSON.stringify({
    txId,
    amount: requirements.amount,
    payTo: requirements.payTo,
    network: requirements.network,
    scheme: requirements.scheme,
  });
}

export async function getPaymentStatus(txId: string): Promise<{
  confirmed: boolean;
  txInfo?: unknown;
}> {
  try {
    const client = getAlgodClient();
    const pendingInfo = await client.pendingTransactionInformation(txId).do();
    
    return {
      confirmed: pendingInfo.confirmedRound !== undefined && pendingInfo.confirmedRound > 0,
      txInfo: pendingInfo,
    };
  } catch (error) {
    return { confirmed: false };
  }
}

export class X402Client {
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  async get<T = unknown>(url: string): Promise<X402PaymentResult> {
    return callWithX402Payment(url, 'GET');
  }

  async post<T = unknown>(url: string, data?: unknown): Promise<X402PaymentResult> {
    return callWithX402Payment(url, 'POST', data);
  }

  async put<T = unknown>(url: string, data?: unknown): Promise<X402PaymentResult> {
    return callWithX402Payment(url, 'PUT', data);
  }

  async delete<T = unknown>(url: string): Promise<X402PaymentResult> {
    return callWithX402Payment(url, 'DELETE');
  }
}

export const x402Client = new X402Client();
