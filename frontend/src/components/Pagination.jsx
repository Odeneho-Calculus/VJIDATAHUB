import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange, isLoading = false, themeColor }) {
  if (!totalPages || totalPages === 0) return null;

  const defaultTheme = { main: '#1D4ED8', bg: '#DBEAFE', soft: '#EFF6FF', glow: 'rgba(29,78,216,0.15)' };
  const c = themeColor || defaultTheme;

  const getPageNumbers = () => {
    const pages = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5 bg-[#fafaf7] border-t border-slate-100 rounded-b-2xl mt-0">
      <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">
        Page <span style={{ color: c.main }}>{currentPage}</span> of{' '}
        <span className="text-slate-600">{totalPages}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="p-2 rounded-lg border-1.5 border-slate-200 text-slate-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ 
            borderColor: currentPage === 1 || isLoading ? '#e4e4de' : '#e4e4de',
            background: '#fff'
          }}
          onMouseEnter={e => { if (currentPage !== 1 && !isLoading) { e.currentTarget.style.borderColor = c.main; e.currentTarget.style.color = c.main; e.currentTarget.style.background = c.soft; } }}
          onMouseLeave={e => { if (currentPage !== 1 && !isLoading) { e.currentTarget.style.borderColor = '#e4e4de'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = '#fff'; } }}
          title="Previous page"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>

        {pageNumbers.map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-slate-400 font-black">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={isLoading}
              className={`px-3.5 py-2 rounded-lg font-black text-xs transition-all ${
                page === currentPage
                  ? 'text-white scale-105'
                  : 'border-1.5 border-slate-200 text-slate-500 bg-white hover:border-slate-300 disabled:opacity-50'
              }`}
              style={page === currentPage ? { 
                background: c.main,
                boxShadow: `0 4px 12px ${c.glow}`
              } : {}}
              onMouseEnter={e => { if (page !== currentPage && !isLoading) { e.currentTarget.style.borderColor = c.main; e.currentTarget.style.color = c.main; e.currentTarget.style.background = c.soft; } }}
              onMouseLeave={e => { if (page !== currentPage && !isLoading) { e.currentTarget.style.borderColor = '#e4e4de'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = '#fff'; } }}
            >
              {page}
            </button>
          )
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="p-2 rounded-lg border-1.5 border-slate-200 text-slate-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ 
            borderColor: currentPage === totalPages || isLoading ? '#e4e4de' : '#e4e4de',
            background: '#fff'
          }}
          onMouseEnter={e => { if (currentPage !== totalPages && !isLoading) { e.currentTarget.style.borderColor = c.main; e.currentTarget.style.color = c.main; e.currentTarget.style.background = c.soft; } }}
          onMouseLeave={e => { if (currentPage !== totalPages && !isLoading) { e.currentTarget.style.borderColor = '#e4e4de'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = '#fff'; } }}
          title="Next page"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
