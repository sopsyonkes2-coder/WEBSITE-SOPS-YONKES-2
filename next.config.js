/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Wajib jika menggunakan Next/Image pada static export
  },
}

module.exports = nextConfig