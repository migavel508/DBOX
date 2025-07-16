const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcrypt');
const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');

const walletPath = path.join(__dirname, 'wallet');
const credentialsPath = path.join(__dirname, 'credentials.json');

// Initialize credentials file if it doesn't exist
if (!fs.existsSync(credentialsPath)) {
  fs.writeFileSync(credentialsPath, JSON.stringify({ admins: {}, users: {} }, null, 2));
  console.log('✅ Created credentials.json file');
}

// Initialize wallet directory structure
if (!fs.existsSync(walletPath)) {
  fs.mkdirSync(walletPath, { recursive: true });
  console.log('✅ Created wallet directory');
}

const ccpPath = path.join(__dirname, 'connection-org1.json');
if (!fs.existsSync(ccpPath)) {
  console.error(`❌ Connection profile not found at ${ccpPath}`);
  console.error('Please make sure the test network is running and the connection profile has been generated.');
  process.exit(1);
}

console.log('Reading connection profile...');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
console.log('Connection profile loaded successfully');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function main() {
  try {
    // Default admin credentials for CA
    const adminId = 'admin';
    const adminPassword = 'adminpw';
    
    // Application admin credentials
    const appAdminId = 'adminApp';
    const appAdminPassword = await ask('Enter password for application admin (adminApp): ');

    console.log('Creating wallet instance...');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`✅ Wallet path: ${walletPath}`);

    // Check if adminApp already exists
    const appAdminExists = await wallet.get(appAdminId);
    if (appAdminExists) {
      console.log(`✅ An identity for the admin user "${appAdminId}" already exists in the wallet`);
      return;
    }

    // Get CA instance
    console.log('Getting CA info from connection profile...');
    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    if (!caInfo) {
      throw new Error('No CA details found in the connection profile');
    }

    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(caInfo.url, { 
      trustedRoots: caTLSCACerts,
      verify: false  // Disable TLS verification for test environment
    }, caInfo.caName);

    // First enroll the admin to get credentials for registering other users
    console.log('Enrolling admin with the Fabric CA...');
    const enrollment = await ca.enroll({ 
      enrollmentID: adminId, 
      enrollmentSecret: adminPassword,
      attr_reqs: [
        { name: 'hf.Registrar.Roles' },
        { name: 'hf.Registrar.Attributes' }
      ]
    });

    const adminX509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    // Store admin in wallet temporarily to register appAdmin
    await wallet.put(adminId, adminX509Identity);

    // Get admin identity for registering appAdmin
    const provider = wallet.getProviderRegistry().getProvider(adminX509Identity.type);
    const adminUser = await provider.getUserContext(adminX509Identity, adminId);

    // Register adminApp with admin role and attributes
    console.log('Registering application admin (adminApp)...');
    try {
      await ca.register({
        affiliation: 'org1.department1',
        enrollmentID: appAdminId,
        enrollmentSecret: appAdminPassword,
        role: 'admin',
        attrs: [
          { name: 'hf.Registrar.Roles', value: '*', ecert: true },
          { name: 'hf.Registrar.Attributes', value: '*', ecert: true },
          { name: 'hf.Revoker', value: 'true', ecert: true },
          { name: 'hf.GenCRL', value: 'true', ecert: true },
          { name: 'admin', value: 'true', ecert: true },
          { name: 'role', value: 'admin:ecert', ecert: true }
        ]
      }, adminUser);
    } catch (error) {
      if (error.message.includes('Identity \'adminApp\' already exists')) {
        console.log('Admin identity already registered, proceeding with enrollment');
      } else {
        throw error;
      }
    }

    // Enroll adminApp with all attributes
    console.log('Enrolling application admin...');
    const appAdminEnrollment = await ca.enroll({
      enrollmentID: appAdminId,
      enrollmentSecret: appAdminPassword,
      attr_reqs: [
        { name: 'hf.Registrar.Roles', optional: false },
        { name: 'hf.Registrar.Attributes', optional: false },
        { name: 'hf.Revoker', optional: false },
        { name: 'hf.GenCRL', optional: false },
        { name: 'admin', optional: false },
        { name: 'role', optional: false }
      ]
    });

    // Create proper MSP structure for adminApp
    const adminAppPath = path.join(walletPath, appAdminId);
    const mspPath = path.join(adminAppPath, 'msp');
    const keystore = path.join(mspPath, 'keystore');
    const signcerts = path.join(mspPath, 'signcerts');

    fs.mkdirSync(mspPath, { recursive: true });
    fs.mkdirSync(keystore, { recursive: true });
    fs.mkdirSync(signcerts, { recursive: true });

    // Store the credentials in proper MSP structure
    const keyPath = path.join(keystore, 'priv.key');
    const certPath = path.join(signcerts, 'cert.pem');
    
    fs.writeFileSync(keyPath, appAdminEnrollment.key.toBytes());
    fs.writeFileSync(certPath, appAdminEnrollment.certificate);

    // Create identity JSON
    const appAdminIdentity = {
      credentials: {
        certificate: appAdminEnrollment.certificate,
        privateKey: appAdminEnrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    // Store in wallet
    await wallet.put(appAdminId, appAdminIdentity);
    
    // Remove temporary admin identity
    await wallet.remove(adminId);

    // Save hashed password to credentials.json
    const credentials = JSON.parse(fs.readFileSync(credentialsPath));
    const hash = await bcrypt.hash(appAdminPassword, 10);
    credentials.admins[appAdminId] = hash;
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));

    console.log('✅ Application admin setup complete:');
    console.log(`- Identity stored in wallet/${appAdminId}`);
    console.log(`- MSP structure created with keystore and signcerts`);
    console.log(`- Admin credentials saved securely`);
    console.log('- Admin attributes and roles configured');

  } catch (error) {
    console.error(`❌ Failed to set up admin: ${error}`);
    process.exit(1);
  }
}

main();
