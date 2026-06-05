/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Wajib jika menggunakan Next/Image pada static export
  },
}

module.exports = nextConfig