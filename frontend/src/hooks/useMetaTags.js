export const useMetaTags = (config = {}) => {
  const {
    title = 'VJI Data Hub - Fast & Cheap Mobile Data Bundles | MTN, Telecel, AirtelTigo',
    description = 'Buy cheap data bundles online with VJI Data Hub. Quick delivery on MTN, Telecel and AirtelTigo. No signup fees. Trusted by thousands.',
    image = `${import.meta.env.VITE_APP_URL || 'https://www.vjidatahub.com'}/og-image.png`,
    url = import.meta.env.VITE_APP_URL || 'https://www.vjidatahub.com',
    type = 'website',
  } = config;

  const updateMetaTags = () => {
    // Update title
    document.title = title;

    // Update or create meta tags
    const setMetaTag = (property, content) => {
      let element = document.querySelector(`meta[property="${property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('property', property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    const setNameTag = (name, content) => {
      let element = document.querySelector(`meta[name="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('name', name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Open Graph tags
    setMetaTag('og:title', title);
    setMetaTag('og:description', description);
    setMetaTag('og:type', type);
    setMetaTag('og:site_name', 'VJI Data Hub');
    setMetaTag('og:url', url);
    setMetaTag('og:image', image);
    setMetaTag('og:image:width', '1200');
    setMetaTag('og:image:height', '630');
    setMetaTag('og:image:alt', 'VJI Data Hub - Buy Mobile Data Bundles Online');

    // Twitter Card tags
    setNameTag('twitter:card', 'summary_large_image');
    setNameTag('twitter:title', title);
    setNameTag('twitter:description', description);
    setNameTag('twitter:image', image);
    setNameTag('twitter:site', '@vjidatahub');

    // Additional meta tags
    setNameTag('description', description);
  };

  // Update on mount and config changes
  if (typeof window !== 'undefined') {
    updateMetaTags();
  }

  return updateMetaTags;
};
