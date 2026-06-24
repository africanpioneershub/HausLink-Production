/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', '.prisma/client'],
  },
  images: {
    domains: ['your-project.supabase.co'],
  },
};

module.exports = nextConfig;