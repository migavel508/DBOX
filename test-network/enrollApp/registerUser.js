const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcrypt');
const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');

const walletPath = path.join(__dirname, 'wallet');
const credentialsPath = path.join(__dirname, 'credentials.json');
const ccpPath = path.join(__dirname, 'connection-org1.json');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function main() {
  try {
    // Get user details
    const userId = await ask('Enter User ID: ');
    const userPassword = await ask('Enter User Password: ');
    const userRole = await ask('Enter User Role (member/admin): ');

    if (!['member', 'admin'].includes(userRole)) {
      console.log('❌ Invalid role. Must be either "member" or "admin"');
      return;
    }

    // Load the network configuration
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create a new file system based wallet for managing identities.
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`✅ Wallet path: ${walletPath}`);

    // Check if user already exists
    const userIdentity = await wallet.get(userId);
    if (userIdentity) {
      console.log(`❌ An identity for the user "${userId}" already exists in the wallet`);
      return;
    }

    // Check if adminApp exists in the wallet
    const adminIdentity = await wallet.get('adminApp');
    if (!adminIdentity) {
      console.log('❌ An identity for the adminApp does not exist in the wallet');
      console.log('Run registerAdmin.js first');
      return;
    }

    // Create a new CA client for interacting with the CA
    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(caInfo.url, {
      trustedRoots: caTLSCACerts,
      verify: false  // Disable TLS verification for test environment
    }, caInfo.caName);

    // Get adminApp context for registering new users
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'adminApp');

    // Prepare registration request with role attributes
    const roleValue = userRole === 'admin' ? 'admin:ecert' : 'member:ecert';
    const attributes = [
      { name: 'role', value: roleValue, ecert: true }
    ];

    if (userRole === 'admin') {
      attributes.push(
        { name: 'admin', value: 'true', ecert: true },
        { name: 'hf.Registrar.Roles', value: 'client,user', ecert: true },
        { name: 'hf.Registrar.Attributes', value: 'role,*', ecert: true }
      );
    }

    // Register the user with attributes
    console.log(`Registering user with role: ${userRole}`);
    const secret = await ca.register({
      affiliation: 'org1.department1',
      enrollmentID: userId,
      enrollmentSecret: userPassword,
      role: userRole,
      attrs: attributes
    }, adminUser);

    // Enroll the user with attribute requirements
    console.log('Enrolling user...');
    const enrollment = await ca.enroll({
      enrollmentID: userId,
      enrollmentSecret: secret,
      attr_reqs: [
        { name: 'role', optional: false }
      ].concat(userRole === 'admin' ? [
        { name: 'admin', optional: false },
        { name: 'hf.Registrar.Roles', optional: false },
        { name: 'hf.Registrar.Attributes', optional: false }
      ] : [])
    });

    // Create proper MSP structure for the user
    const userPath = path.join(walletPath, userId);
    const mspPath = path.join(userPath, 'msp');
    const keystore = path.join(mspPath, 'keystore');
    const signcerts = path.join(mspPath, 'signcerts');

    fs.mkdirSync(mspPath, { recursive: true });
    fs.mkdirSync(keystore, { recursive: true });
    fs.mkdirSync(signcerts, { recursive: true });

    // Store the credentials in proper MSP structure
    const keyPath = path.join(keystore, 'priv.key');
    const certPath = path.join(signcerts, 'cert.pem');
    
    fs.writeFileSync(keyPath, enrollment.key.toBytes());
    fs.writeFileSync(certPath, enrollment.certificate);

    // Create identity JSON
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    // Store in wallet
    await wallet.put(userId, x509Identity);

    // Save user credentials
    const credentials = JSON.parse(fs.readFileSync(credentialsPath));
    const hash = await bcrypt.hash(userPassword, 10);
    credentials.users[userId] = {
      hash: hash,
      role: userRole
    };
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));

    console.log('✅ Registration complete:');
    console.log(`- User "${userId}" registered and enrolled`);
    console.log(`- Role: ${userRole} (${roleValue})`);
    console.log(`- Identity stored in wallet/${userId}`);
    console.log('- MSP structure created with keystore and signcerts');
    console.log(`- ${userRole === 'admin' ? 'Admin attributes and roles configured' : 'Member attributes configured'}`);

  } catch (error) {
    console.error(`❌ Failed to register user: ${error}`);
    process.exit(1);
  }
}

main();
