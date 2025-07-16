const fs = require('fs');
const readline = require('readline');
const bcrypt = require('bcrypt');
const path = require('path');
const { Wallets } = require('fabric-network');

const credentialsPath = path.join(__dirname, 'credentials.json');
const walletPath = path.join(__dirname, 'wallet');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function verifyAdmin(id, password) {
  if (!fs.existsSync(credentialsPath)) return false;
  const creds = JSON.parse(fs.readFileSync(credentialsPath));
  const hash = creds.admins[id];
  return hash && await bcrypt.compare(password, hash);
}

async function removeUser() {
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const users = fs.readdirSync(walletPath).filter(file => file !== 'admin.id').map(file => file.replace('.id', ''));

  if (users.length === 0) {
    console.log('ℹ️ No users to remove.');
    return;
  }

  console.log('\n👥 Registered Users:');
  users.forEach((u, i) => console.log(`${i + 1}. ${u}`));
  const index = await ask('Enter number of user to remove: ');
  const selectedUser = users[parseInt(index) - 1];

  if (!selectedUser) {
    console.log('❌ Invalid selection');
    return;
  }

  // Remove from wallet
  await wallet.remove(selectedUser);
  console.log(`🧹 Removed wallet identity: ${selectedUser}`);

  // Remove from credentials.json
  const creds = JSON.parse(fs.readFileSync(credentialsPath));
  delete creds.users[selectedUser];
  fs.writeFileSync(credentialsPath, JSON.stringify(creds, null, 2));
  console.log(`🧹 Removed from credentials: ${selectedUser}`);
}

async function main() {
  const adminId = await ask('🆔 Admin ID: ');
  const adminPass = await ask('🔑 Admin Password: ');

  if (!await verifyAdmin(adminId, adminPass)) {
    console.log('❌ Admin verification failed');
    return;
  }

  console.log('\n✅ Admin verified!');
  console.log('\n📋 Choose an option:');
  console.log('1. ➕ Add User');
  console.log('2. ❌ Remove User');
  const choice = await ask('Enter 1 or 2: ');

  if (choice === '1') {
    const confirmId = await ask('🆔 Re-enter Admin ID: ');
    const confirmPass = await ask('🔑 Re-enter Admin Password: ');
    if (await verifyAdmin(confirmId, confirmPass)) {
      require('child_process').spawn('node', ['registerUser.js'], { stdio: 'inherit' });
    } else {
      console.log('❌ Re-authentication failed.');
    }
  } else if (choice === '2') {
    const confirmId = await ask('🆔 Re-enter Admin ID: ');
    const confirmPass = await ask('🔑 Re-enter Admin Password: ');
    if (await verifyAdmin(confirmId, confirmPass)) {
      await removeUser();
    } else {
      console.log('❌ Re-authentication failed.');
    }
  } else {
    console.log('❌ Invalid option');
  }
}

main();
