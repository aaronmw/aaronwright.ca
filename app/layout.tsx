import '@/styles/globals.css';

export const metadata = {
  title: 'Aaron M. Wright',
  description: 'Aaron M. Wright',
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
