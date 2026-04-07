import algosdk from 'algosdk';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';

async function main() {
  // Connect to LocalNet
  const algorand = AlgorandClient.defaultLocalNet();

  // Get the indexer client
  const indexerClient = algorand.client.indexer;

  // Search for all applications created by your address
  const apps = await indexerClient
    .searchForApplications()
    .creator('RHWKJHIPKZ3X6NDYF2WVT6JWSWLCIVZCRD6ENGW23FMQ4ARL2GSOFJFJRE')
    .do();

  console.log(algosdk.stringifyJSON(apps, undefined, 2));
}

main();
