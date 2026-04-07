const { execSync } = require('child_process');
const path = require('path');

const action = 'recordSpend';
// Use TW7OBZKTB5DPNSXODKJMSA5RGNCGFG4YXZVRI2CLND5IZQRTAOZDUQ67Z4 (contract creator)
const paramsStr = 'agentAddress:TW7OBZKTB5DPNSXODKJMSA5RGNCGFG4YXZVRI2CLND5IZQRTAOZDUQ67Z4 serviceId:test_script_1 amountMicroAlgos:500000';

const cwd = path.join(__dirname, 'projects/RootNode-backend');

try {
  const result = execSync(`node scripts/callContract.cjs ${action} ${paramsStr}`, {
    cwd,
    encoding: 'utf-8'
  });
  console.log('Result:', result);
} catch (error) {
  console.error('Error:', error.message);
  console.error('stdout:', error.stdout);
  console.error('stderr:', error.stderr);
}