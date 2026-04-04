# Open Graph (OG) Meta Tags Setup

This project now has comprehensive Open Graph meta tags configured for social media sharing.

## Files Changed

### 1. **frontend/index.html**
- Added static OG meta tags in the `<head>` section
- Includes og:title, og:description, og:image, og:url, and more
- Added Twitter Card meta tags for Twitter/X sharing
- Update the og:url and og:image paths with your actual domain

### 2. **frontend/src/hooks/useMetaTags.js**
- Custom React hook for dynamic meta tag management
- Allows per-page customization of OG tags
- Automatically updates document title and meta tags

### 3. **frontend/src/pages/Home.jsx**
- Example implementation of the useMetaTags hook
- Shows how to customize og tags per page

### 4. **frontend/.env.example**
- Added `VITE_APP_URL` for easy domain configuration

## Setup Instructions

### For Development:
```bash
# Add to frontend/.env
VITE_APP_URL=http://localhost:5173
```

### For Production:
```bash
# Update frontend/.env
VITE_APP_URL=https://your-domain.com
```

## Usage

### Using the Hook in Any Page:
```jsx
import { useMetaTags } from '../hooks/useMetaTags';

export default function YourPage() {
  useMetaTags({
    title: 'Custom Page Title',
    description: 'Custom page description for social sharing',
    url: `${import.meta.env.VITE_APP_URL}/your-page`,
    image: `${import.meta.env.VITE_APP_URL}/custom-og-image.png`,
    type: 'website', // or 'article', 'product', etc.
  });

  return <div>Your page content</div>;
}
```

## Required Assets

Create an OG image for social media sharing (1200x630px recommended):
- Place at `frontend/public/og-image.png`
- Or customize the image path in the hook configuration

## Meta Tags Configured

- **og:title** - Page title for social sharing
- **og:description** - Page description
- **og:image** - Image displayed when link is shared
- **og:url** - Page URL
- **og:type** - Page type (website, article, etc.)
- **og:site_name** - Site name
- **twitter:card** - Twitter card type
- **twitter:title** - Twitter card title
- **twitter:description** - Twitter card description
- **twitter:image** - Twitter card image
- **twitter:site** - Twitter handle
- **description** - Standard meta description

## Testing Social Sharing

Test your OG tags using:
- Facebook: https://developers.facebook.com/tools/debug
- Twitter: https://cards-dev.twitter.com/validator
- LinkedIn: https://www.linkedin.com/feed/
- WhatsApp: Share a link and see preview

## Customization

- Update og:image to point to a custom image file
- Modify og:url to your actual domain
- Customize twitter:site with your Twitter handle
- Add og:image:alt for accessibility
