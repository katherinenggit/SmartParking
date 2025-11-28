import { ReactNode, useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        sidebarExpanded ? 'w-64' : 'w-20'
      }`} style={{ transition: 'width 0.3s ease' }}>
        {/* Car Icon with Background */}
        <div className="p-4">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">🚗</span>
          </div>
          
          {/* Navigation Text - Show/hide based on expanded state */}
          {sidebarExpanded ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-700" style={{ fontFamily: 'serif' }}>
                Navigation
              </div>
              <div className="text-xs text-gray-700" style={{ fontFamily: 'serif' }}>
                Space Detection
              </div>
            </div>
          ) : (
            <div className="h-10" />
          )}
        </div>
        
        {/* Expand/Collapse Button */}
        <button
          onClick={() => {
            console.log('Sidebar toggle clicked, current state:', sidebarExpanded);
            setSidebarExpanded(!sidebarExpanded);
          }}
          className="mt-auto p-2 text-xs text-gray-500 hover:text-gray-700 border-t border-gray-200 w-full text-left"
        >
          {sidebarExpanded ? '◀ Collapse' : 'Expand ▶'}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white">
          {/* Hamburger Menu */}
          <button className="text-gray-700 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Title - Smart Parking (Serif Font) */}
          <h1 className="text-2xl font-serif font-bold text-black" style={{ fontFamily: 'serif' }}>Smart Parking</h1>

          {/* Right Icon - Black Circle */}
          <div className="w-8 h-8 bg-black rounded-full"></div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}

