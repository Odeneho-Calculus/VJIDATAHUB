const SystemSettings = require('../models/SystemSettings');

const toMoney = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100) / 100;
};

const normalizeChargeType = (value) => {
  const type = String(value || '').trim().toLowerCase();
  return type === 'percentage' ? 'percentage' : 'fixed';
};

const calculateChargeAmount = ({ baseAmount, chargeType = 'fixed', chargeValue = 0 }) => {
  const normalizedBase = toMoney(baseAmount);
  const normalizedValue = toMoney(chargeValue);
  const normalizedType = normalizeChargeType(chargeType);

  if (normalizedValue <= 0) return 0;

  if (normalizedType === 'percentage') {
    return toMoney((normalizedBase * normalizedValue) / 100);
  }

  return normalizedValue;
};

const getTransactionChargesSettings = async () => {
  const settings = await SystemSettings.getSettings();
  const charges = settings?.transactionCharges || {};

  return {
    dataPurchaseChargeType: normalizeChargeType(charges.dataPurchaseChargeType),
    dataPurchaseCharge: toMoney(charges.dataPurchaseCharge),
    walletFundingChargeType: normalizeChargeType(charges.walletFundingChargeType),
    walletFundingCharge: toMoney(charges.walletFundingCharge),
  };
};

const calculateDataPurchaseCharge = ({
  dataPurchaseCharge,
  isGuest = false,
  isStoreBuyer = false,
  isRegisteredUser = false,
  paymentMethod = 'paystack',
  baseAmount = 0,
  dataPurchaseChargeType = 'fixed',
}) => {
  const charge = calculateChargeAmount({
    baseAmount,
    chargeType: dataPurchaseChargeType,
    chargeValue: dataPurchaseCharge,
  });
  const method = String(paymentMethod || '').trim().toLowerCase();

  if (isGuest || isStoreBuyer) {
    return charge;
  }

  if (isRegisteredUser && method === 'paystack') {
    return charge;
  }

  return 0;
};

const calculateWalletFundingCharge = ({
  walletFundingCharge,
  walletFundingChargeType = 'fixed',
  baseAmount = 0,
}) => {
  return calculateChargeAmount({
    baseAmount,
    chargeType: walletFundingChargeType,
    chargeValue: walletFundingCharge,
  });
};

module.exports = {
  toMoney,
  normalizeChargeType,
  calculateChargeAmount,
  getTransactionChargesSettings,
  calculateDataPurchaseCharge,
  calculateWalletFundingCharge,
};
