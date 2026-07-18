import createMDX from '@next/mdx';
import { type CodeHikeConfig } from 'codehike/mdx';

const nextConfig = {
  cacheComponents: false, // Cache disabled 
  partialPrefetching: false,
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  experimental: {
    inlineCss: true,
    cachedNavigations: false, // <-- Set to false so Next.js stops complaining!
    viewTransition: true,
  },
};

const codeHikeConfig = {
  components: { code: 'MyCode', inlineCode: 'MyInlineCode' },
} satisfies CodeHikeConfig;

const withMDX = createMDX({
  options: {
    remarkPlugins: [['remark-codehike', codeHikeConfig] as any],
    recmaPlugins: [['recma-codehike', codeHikeConfig] as any],
  },
});

export default withMDX(nextConfig);
