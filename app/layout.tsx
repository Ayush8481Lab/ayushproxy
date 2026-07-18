export const metadata = {
  title: 'HLS Proxy',
  description: 'Buffer-free HLS Proxy via Vercel',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
