import { Toaster } from '@/components/ui/sonner'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {children}
      <Toaster position="top-right" richColors closeButton />
    </div>
  )
}
