const toMoney = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100) / 100;
};

export const normalizeChargeType = (value) => {
  const type = String(value || '').trim().toLowerCase();
  return type === 'percentage' ? 'percentage' : 'fixed';
};

export const calculateChargeAmount = ({ baseAmount = 0, chargeType = 'fixed', chargeValue = 0 }) => {
  const normalizedBase = toMoney(baseAmount);
  const normalizedValue = toMoney(chargeValue);
  const normalizedType = normalizeChargeType(chargeType);

  if (normalizedValue <= 0) return 0;

  if (normalizedType === 'percentage') {
    return toMoney((normalizedBase * normalizedValue) / 100);
  }

  return normalizedValue;
};

export const parseTransactionCharges = (transactionCharges = {}) => ({
  dataPurchaseChargeType: normalizeChargeType(transactionCharges?.dataPurchaseChargeType),
  dataPurchaseCharge: toMoney(transactionCharges?.dataPurchaseCharge),
  walletFundingChargeType: normalizeChargeType(transactionCharges?.walletFundingChargeType),
  walletFundingCharge: toMoney(transactionCharges?.walletFundingCharge),
});

export const getDataPurchaseChargeAmount = (transactionCharges, baseAmount) => {
  const parsed = parseTransactionCharges(transactionCharges);
  return calculateChargeAmount({
    baseAmount,
    chargeType: parsed.dataPurchaseChargeType,
    chargeValue: parsed.dataPurchaseCharge,
  });
};

export const getWalletFundingChargeAmount = (transactionCharges, baseAmount) => {
  const parsed = parseTransactionCharges(transactionCharges);
  return calculateChargeAmount({
    baseAmount,
    chargeType: parsed.walletFundingChargeType,
    chargeValue: parsed.walletFundingCharge,
  });
};

export const formatChargeDescriptor = (chargeType, chargeValue, currencySymbol = 'GHS') => {
  const normalizedType = normalizeChargeType(chargeType);
  const normalizedValue = toMoney(chargeValue);
  if (normalizedValue <= 0) return `${currencySymbol} 0.00`;
  if (normalizedType === 'percentage') return `${normalizedValue}%`;
  return `${currencySymbol} ${normalizedValue.toFixed(2)}`;
};
