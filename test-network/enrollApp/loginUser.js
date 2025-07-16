const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcrypt');
const { Wallets, Gateway } = require('fabric-network');

const walletPath = path.join(__dirname, 'wallet');
const credentialsPath = path.join(__dirname, 'credentials.json');
const ccpPath = path.join(__dirname, 'connection-org1.json');

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(q, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function main() {
  try {
    const userId = await ask('🆔 User ID: ');
    const password = await ask('🔑 User Password: ');

    if (!fs.existsSync(credentialsPath)) {
      console.log('❌ No credentials file found.');
      return;
    }

    // Load credentials and verify password
    const creds = JSON.parse(fs.readFileSync(credentialsPath));
    const userCreds = creds.users[userId];

    if (!userCreds || !(await bcrypt.compare(password, userCreds.hash))) {
      console.log('❌ Incorrect user ID or password.');
      return;
    }

    // Get wallet and check identity
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const userIdentity = await wallet.get(userId);
    
    if (!userIdentity) {
      console.log('❌ Identity not found in wallet.');
      return;
    }

    // Verify MSP structure
    const userPath = path.join(walletPath, userId);
    const mspPath = path.join(userPath, 'msp');
    const keystore = path.join(mspPath, 'keystore');
    const signcerts = path.join(mspPath, 'signcerts');

    if (!fs.existsSync(mspPath) || !fs.existsSync(keystore) || !fs.existsSync(signcerts)) {
      console.log('❌ Invalid MSP structure. Please re-register the user.');
      return;
    }

    // Connect to network to verify identity and role
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    const gateway = new Gateway();
    
    await gateway.connect(ccp, {
      wallet,
      identity: userId,
      discovery: { enabled: true, asLocalhost: true }
    });

    // Get user role from credentials
    const role = userCreds.role || 'member';
    
    console.log('\n✅ Login successful!');
    console.log(`- User: ${userId}`);
    console.log(`- Role: ${role}`);
    console.log('- Identity verified and loaded');
    console.log('- MSP structure validated');

    // Disconnect from the gateway
    await gateway.disconnect();

  } catch (error) {
    console.error(`❌ Login failed: ${error}`);
    process.exit(1);
  }
}

main();
