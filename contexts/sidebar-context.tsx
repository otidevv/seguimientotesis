'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface SidebarContextType {
  isOpen: boolean
  isMobile: boolean
  isCollapsed: boolean
  setIsOpen: (open: boolean) => void
  setIsCollapsed: (collapsed: boolean) => void
  toggle: () => void
  close: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth >= 1024) {
        setIsOpen(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggle = () => setIsOpen(!isOpen)
  const close = () => setIsOpen(false)

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isMobile,
        isCollapsed,
        setIsOpen,
        setIsCollapsed,
        toggle,
        close,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
