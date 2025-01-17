/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'lh3.googleusercontent.com', // Google OAuth profile pictures
      'firebasestorage.googleapis.com', // Firebase Storage
    ],
  },
}

module.exports = nextConfig 