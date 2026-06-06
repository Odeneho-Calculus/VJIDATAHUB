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
      bg: 'bg-yellow-400',
      text: 'text-black',
      border: 'border-yellow-400',
      ring: 'ring-yellow-50',
      accent: 'text-yellow-700',
      gradient: 'from-yellow-400 to-yellow-500',
      hoverBorder: 'hover:border-yellow-400',
      lightBg: 'bg-yellow-50',
      // palette for custom components
      palette: {
        main: '#FFCB05',
        bg: '#FFF9E5',
        soft: '#FFFDF0',
        glow: 'rgba(255, 203, 5, 0.25)',
        isGradient: true,
        gradient: 'linear-gradient(135deg, #FFCB05 0%, #FFA000 100%)',
        text: '#000000'
      },
      // modal-specific
      cardGradient: 'from-yellow-50 to-yellow-100',
      cardBorder: 'border-yellow-200/50',
      blobBg: 'bg-yellow-100/30',
      selectedOption: 'border-yellow-400 bg-yellow-50/30',
      selectedIcon: 'bg-yellow-400 text-black',
      unselectedText: 'text-yellow-700',
      focusBorder: 'focus:border-yellow-400',
      focusGroupText: 'group-focus-within:text-yellow-500',
      buttonBg: 'bg-yellow-400',
      buttonText: 'text-black',
      buttonHover: 'hover:bg-yellow-500',
      buttonShadow: 'shadow-yellow-200/50',
    };
  }

  if (n.includes('TELECEL')) {
    return {
      bg: 'bg-red-600',
      text: 'text-white',
      border: 'border-red-600',
      ring: 'ring-red-50',
      accent: 'text-red-600',
      gradient: 'from-red-600 to-red-700',
      hoverBorder: 'hover:border-red-600',
      lightBg: 'bg-red-50',
      palette: {
        main: '#E60000',
        bg: '#FEE2E2',
        soft: '#FFF5F5',
        glow: 'rgba(230, 0, 0, 0.25)',
        isGradient: true,
        gradient: 'linear-gradient(135deg, #E60000 0%, #990000 100%)',
        text: '#ffffff'
      },
      cardGradient: 'from-red-50 to-pink-50',
      cardBorder: 'border-red-200/50',
      blobBg: 'bg-red-100/30',
      selectedOption: 'border-red-500 bg-red-50/30',
      selectedIcon: 'bg-red-600 text-white',
      unselectedText: 'text-red-600',
      focusBorder: 'focus:border-red-500',
      focusGroupText: 'group-focus-within:text-red-600',
      buttonBg: 'bg-red-600',
      buttonText: 'text-white',
      buttonHover: 'hover:bg-red-700',
      buttonShadow: 'shadow-red-200/50',
    };
  }

  if (n.includes('AIRTELTIGO') || n.includes('AIRTEL') || n.includes('TIGO') || n.startsWith('AT')) {
    return {
      bg: 'bg-blue-600',
      text: 'text-white',
      border: 'border-blue-600',
      ring: 'ring-blue-50',
      accent: 'text-blue-600',
      gradient: 'from-red-600 to-blue-600',
      hoverBorder: 'hover:border-blue-500',
      lightBg: 'bg-blue-50',
      palette: {
        main: '#0054A6',
        bg: '#DBEAFE',
        soft: '#EFF6FF',
        glow: 'rgba(0, 84, 166, 0.25)',
        isGradient: true,
        gradient: 'linear-gradient(135deg, #ED1C24 0%, #0054A6 100%)',
        text: '#ffffff'
      },
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
    palette: {
      main: '#0F172A',
      bg: '#F1F5F9',
      soft: '#F8FAFC',
      glow: 'rgba(15, 23, 42, 0.06)'
    },
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
