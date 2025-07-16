import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import FabricCAServices from 'fabric-ca-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function buildCAClient() {
    // Load the network configuration
    const ccpPath = resolve(__dirname, '..', '..', '..', 'test-network',
        'organizations', 'peerOrganizations', 'org1.example.com',
        'connection-org1.json');
    const contents = fs.readFileSync(ccpPath, 'utf8');
    const ccp = JSON.parse(contents);

    // Create a new CA client for interacting with the CA
    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const caClient = new FabricCAServices(caInfo.url, {
        trustedRoots: caTLSCACerts,
        verify: false
    }, caInfo.caName);

    return caClient;
}

function buildCCPOrg1() {
    // load the common connection configuration file
    const ccpPath = resolve(__dirname, '..', '..', '..', 'test-network',
        'organizations', 'peerOrganizations', 'org1.example.com',
        'connection-org1.json');
    const fileExists = fs.existsSync(ccpPath);
    if (!fileExists) {
        throw new Error(`no such file or directory: ${ccpPath}`);
    }
    const contents = fs.readFileSync(ccpPath, 'utf8');

    // build a JSON object from the file contents
    const ccp = JSON.parse(contents);

    console.log(`Loaded the network configuration located at ${ccpPath}`);
    return ccp;
}

async function registerAndEnrollUser(caClient, wallet, orgMspId, userId, role) {
    try {
        // Check if user already exists in wallet
        const userIdentity = await wallet.get(userId);
        if (userIdentity) {
            throw new Error(`User ${userId} already exists in wallet`);
        }

        // Must use an admin to register a new user
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            throw new Error('Admin identity not found in wallet');
        }

        // build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // Register the user
        const secret = await caClient.register({
            affiliation: 'org1.department1',
            enrollmentID: userId,
            role: role,
            attrs: [{
                name: 'role',
                value: role,
                ecert: true
            }]
        }, adminUser);

        // Enroll the user and import the new identity into the wallet
        const enrollment = await caClient.enroll({
            enrollmentID: userId,
            enrollmentSecret: secret
        });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: orgMspId,
            type: 'X.509',
        };

        await wallet.put(userId, x509Identity);
        console.log(`Successfully registered and enrolled user ${userId} and imported it into the wallet`);
    } catch (error) {
        throw new Error(`Failed to register user ${userId}: ${error.message}`);
    }
}

export {
    buildCAClient,
    buildCCPOrg1,
    registerAndEnrollUser
}; 