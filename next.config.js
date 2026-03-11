/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    BLOB_READ_WRITE_TOKEN: process.env.PBLOB_READ_WRITE_TOKEN,
  },
};

module.exports = nextConfig;
