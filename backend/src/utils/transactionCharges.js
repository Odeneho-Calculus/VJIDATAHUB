const SystemSettings = require('../models/SystemSettings');

const toMoney = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100) / 100;
};

const getTransactionChargesSettings = async () => {
  const settings = await SystemSettings.getSettings();
  const charges = settings?.transactionCharges || {};

  return {
    dataPurchaseCharge: toMoney(charges.dataPurchaseCharge),
    walletFundingCharge: toMoney(charges.walletFundingCharge),
  };
};

const calculateDataPurchaseCharge = ({
  dataPurchaseCharge,
  isGuest = false,
  isStoreBuyer = false,
  isRegisteredUser = false,
  paymentMethod = 'paystack',
}) => {
  const charge = toMoney(dataPurchaseCharge);
  const method = String(paymentMethod || '').trim().toLowerCase();

  if (isGuest || isStoreBuyer) {
    return charge;
  }

  if (isRegisteredUser && method === 'paystack') {
    return charge;
  }

  return 0;
};

const calculateWalletFundingCharge = ({ walletFundingCharge }) => {
  return toMoney(walletFundingCharge);
};

module.exports = {
  toMoney,
  getTransactionChargesSettings,
  calculateDataPurchaseCharge,
  calculateWalletFundingCharge,
};
