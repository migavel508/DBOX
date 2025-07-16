import { Wallets } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import { buildCAClient, buildCCPOrg1 } from './utils.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mspOrg1 = 'Org1MSP';
const userId = 'user1';
const userSecret = 'user1pw'; // This should match the secret from registration

async function enrollUser() {
    try {
        // build an in memory object with the network configuration (also known as a connection profile)
        const ccp = buildCCPOrg1();

        // build an instance of the fabric ca services client based on
        // the information in the network configuration
        const caClient = buildCAClient();

        // setup the wallet to hold the credentials of the application user
        const walletPath = resolve(__dirname, '../../wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const identity = await wallet.get(userId);
        if (identity) {
            console.log(`An identity for the user ${userId} already exists in the wallet`);
            return;
        }

        // Enroll the user and import the new identity into the wallet
        const enrollment = await caClient.enroll({
            enrollmentID: userId,
            enrollmentSecret: userSecret
        });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: mspOrg1,
            type: 'X.509',
        };

        await wallet.put(userId, x509Identity);
        console.log(`Successfully enrolled user ${userId} and imported it into the wallet`);
    } catch (error) {
        console.error(`Failed to enroll user: ${error}`);
        process.exit(1);
    }
}

enrollUser(); 