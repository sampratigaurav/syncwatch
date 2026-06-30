import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
}

export const SEO = ({ 
  title = 'SyncWatch | Privacy-First Watch Party', 
  description = 'A privacy-first, synchronized video watch party experience. No accounts, zero cloud uploads. Chat, voice, and watch locally stored videos together with perfect sync.',
  url = 'https://syncwatch.samprati.dev/',
  image = 'https://syncwatch.samprati.dev/og-image.png'
}: SEOProps) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};
