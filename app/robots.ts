import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/landlord/', '/tenant/', '/admin/', '/auth/', '/api/'],
    },
    sitemap: 'https://rentos.homes/sitemap.xml',
  };
}
