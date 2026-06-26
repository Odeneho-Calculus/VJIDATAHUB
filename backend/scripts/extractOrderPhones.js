const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Order = require('../src/models/Order');
const Purchase = require('../src/models/Purchase');

const PHONE_REGEX = /^\d{10}$/;

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not defined');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  const [orderPhones, dataBundlePhones, afaPhones, purchaseRecipients] = await Promise.all([
    Order.distinct('phoneNumber'),
    Order.distinct('dataBundle.phoneNumber'),
    Order.distinct('afaRegistration.phoneNumber'),
    Purchase.distinct('recipient'),
  ]);

  const allPhones = new Set();
  [...orderPhones, ...dataBundlePhones, ...afaPhones, ...purchaseRecipients].forEach((value) => {
    if (value && PHONE_REGEX.test(String(value))) {
      allPhones.add(String(value));
    }
  });

  const sortedPhones = Array.from(allPhones).sort();
  const csvContent = sortedPhones.join(',');

  const outputPath = path.join(__dirname, '..', '..', 'orderNumbers.csv');
  fs.writeFileSync(outputPath, csvContent);

  console.log(`Extracted ${sortedPhones.length} unique phone numbers to ${outputPath}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
