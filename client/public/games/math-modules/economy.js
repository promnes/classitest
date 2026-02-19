// ===== Emoji Kingdom — Economy Module =====
// Coins, Boosters, Hints, Shop with escalating prices

export const BOOSTER_TYPES = {
  hammer:    { icon: '🔨', basePrice: 50,  escalation: 1.10 },
  shuffle:   { icon: '🔄', basePrice: 30,  escalation: 1.10 },
  extraTime: { icon: '⏱️', basePrice: 20,  escalation: 1.10 },
  hint:      { icon: '💡', basePrice: 40,  escalation: 1.10 },
};

export function addCoins(p, amount) {
  p.coins = (p.coins || 0) + Math.round(amount);
}

export function getCoins(p) {
  return p.coins || 0;
}

export function getBoosterCount(p, type) {
  return (p.boosters && p.boosters[type]) || 0;
}

export function useBooster(p, type) {
  if (!p.boosters) p.boosters = {};
  const count = p.boosters[type] || 0;
  if (count <= 0) return false;
  p.boosters[type] = count - 1;
  return true;
}

export function getBoosterPrice(p, type) {
  const bt = BOOSTER_TYPES[type];
  if (!bt) return 999;
  const purchases = (p.purchaseCounts && p.purchaseCounts[type]) || 0;
  return Math.round(bt.basePrice * Math.pow(bt.escalation, purchases));
}

export function buyBooster(p, type) {
  const price = getBoosterPrice(p, type);
  if ((p.coins || 0) < price) return { success: false, reason: 'notEnough' };
  p.coins -= price;
  if (!p.boosters) p.boosters = {};
  p.boosters[type] = (p.boosters[type] || 0) + 1;
  if (!p.purchaseCounts) p.purchaseCounts = {};
  p.purchaseCounts[type] = (p.purchaseCounts[type] || 0) + 1;
  return { success: true, newCount: p.boosters[type], newCoins: p.coins };
}

export function getShopItems(p) {
  return Object.keys(BOOSTER_TYPES).map(type => ({
    type,
    icon: BOOSTER_TYPES[type].icon,
    price: getBoosterPrice(p, type),
    owned: getBoosterCount(p, type),
    canAfford: (p.coins || 0) >= getBoosterPrice(p, type),
  }));
}
