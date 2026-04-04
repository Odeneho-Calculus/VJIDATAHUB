/**
 * Returns a set of Tailwind class strings for a given network name.
 * Matching is done with includes/startsWith so it works with both
 * provider formats (e.g. "MTN", "MTNUP2U", "AT - ISHARE", "AIRTELTIGO").
 */
export function getNetworkStyles(network) {
  const n = network?.toUpperCase() ?? '';

  if (n.includes('MTN')) {
    return {
      // card / tag
      bg: 'bg-amber-400',
      text: 'text-amber-900',
      border: 'border-amber-400',
      ring: 'ring-amber-50',
      accent: 'text-amber-700',
      gradient: 'from-amber-400 to-amber-500',
      hoverBorder: 'hover:border-amber-400',
      lightBg: 'bg-amber-50',
      // modal-specific
      cardGradient: 'from-amber-50 to-yellow-50',
      cardBorder: 'border-amber-200/50',
      blobBg: 'bg-amber-100/30',
      selectedOption: 'border-amber-400 bg-amber-50/30',
      selectedIcon: 'bg-amber-400 text-amber-900',
      unselectedText: 'text-amber-700',
      focusBorder: 'focus:border-amber-400',
      focusGroupText: 'group-focus-within:text-amber-500',
      buttonBg: 'bg-amber-400',
      buttonText: 'text-amber-900',
      buttonHover: 'hover:bg-amber-500',
      buttonShadow: 'shadow-amber-200/50',
    };
  }

  if (n.includes('TELECEL')) {
    return {
      bg: 'bg-rose-600',
      text: 'text-white',
      border: 'border-rose-600',
      ring: 'ring-rose-50',
      accent: 'text-rose-600',
      gradient: 'from-rose-600 to-rose-700',
      hoverBorder: 'hover:border-rose-600',
      lightBg: 'bg-rose-50',
      cardGradient: 'from-rose-50 to-pink-50',
      cardBorder: 'border-rose-200/50',
      blobBg: 'bg-rose-100/30',
      selectedOption: 'border-rose-500 bg-rose-50/30',
      selectedIcon: 'bg-rose-600 text-white',
      unselectedText: 'text-rose-600',
      focusBorder: 'focus:border-rose-500',
      focusGroupText: 'group-focus-within:text-rose-600',
      buttonBg: 'bg-rose-600',
      buttonText: 'text-white',
      buttonHover: 'hover:bg-rose-700',
      buttonShadow: 'shadow-rose-200/50',
    };
  }

  if (n.includes('AIRTELTIGO') || n.includes('AIRTEL') || n.includes('TIGO') || n.startsWith('AT')) {
    return {
      bg: 'bg-blue-600',
      text: 'text-white',
      border: 'border-blue-600',
      ring: 'ring-blue-50',
      accent: 'text-blue-600',
      gradient: 'from-blue-600 to-rose-500',
      hoverBorder: 'hover:border-blue-500',
      lightBg: 'bg-blue-50',
      cardGradient: 'from-blue-50 to-indigo-50',
      cardBorder: 'border-blue-200/50',
      blobBg: 'bg-blue-100/30',
      selectedOption: 'border-blue-500 bg-blue-50/30',
      selectedIcon: 'bg-blue-600 text-white',
      unselectedText: 'text-blue-600',
      focusBorder: 'focus:border-blue-500',
      focusGroupText: 'group-focus-within:text-blue-600',
      buttonBg: 'bg-blue-600',
      buttonText: 'text-white',
      buttonHover: 'hover:bg-blue-700',
      buttonShadow: 'shadow-blue-200/50',
    };
  }

  // default
  return {
    bg: 'bg-slate-900',
    text: 'text-white',
    border: 'border-slate-900',
    ring: 'ring-slate-50',
    accent: 'text-slate-600',
    gradient: 'from-slate-800 to-slate-900',
    hoverBorder: 'hover:border-slate-900',
    lightBg: 'bg-slate-50',
    cardGradient: 'from-slate-50 to-slate-100',
    cardBorder: 'border-slate-200/50',
    blobBg: 'bg-slate-100/30',
    selectedOption: 'border-slate-500 bg-slate-50/30',
    selectedIcon: 'bg-slate-900 text-white',
    unselectedText: 'text-slate-600',
    focusBorder: 'focus:border-slate-500',
    focusGroupText: 'group-focus-within:text-slate-600',
    buttonBg: 'bg-slate-900',
    buttonText: 'text-white',
    buttonHover: 'hover:bg-slate-800',
    buttonShadow: 'shadow-slate-200/50',
  };
}
