const toPriceNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isPositivePrice = (value) => toPriceNumber(value) > 0;

const hasAnyConfiguredPrice = (plan) => (
  isPositivePrice(plan?.sellingPrice)
  || isPositivePrice(plan?.agentPrice)
  || isPositivePrice(plan?.vendorPrice)
);

const resolvePlanPrice = (plan, { userRole = 'user', agentFeeStatus = null } = {}) => {
  if (userRole === 'vendor' && isPositivePrice(plan?.vendorPrice)) {
    return toPriceNumber(plan.vendorPrice);
  }

  if ((agentFeeStatus === 'paid' || agentFeeStatus === 'protocol') && isPositivePrice(plan?.agentPrice)) {
    return toPriceNumber(plan.agentPrice);
  }

  if (isPositivePrice(plan?.sellingPrice)) {
    return toPriceNumber(plan.sellingPrice);
  }

  // Fallback to costPrice if no role-specific price is set
  // This ensures the service is never free unless admin explicitly sets all prices to 0
  if (isPositivePrice(plan?.costPrice)) {
    return toPriceNumber(plan.costPrice);
  }

  return 0;
};

const getOfferAccessStatus = (plan, { userRole = 'user', agentFeeStatus = null } = {}) => {
  return {
    hasAnyConfiguredPrice: hasAnyConfiguredPrice(plan),
    effectivePrice: resolvePlanPrice(plan, { userRole, agentFeeStatus }),
    hasPublicPrice: isPositivePrice(plan?.sellingPrice),
  };
};

module.exports = {
  toPriceNumber,
  isPositivePrice,
  hasAnyConfiguredPrice,
  resolvePlanPrice,
  getOfferAccessStatus,
};