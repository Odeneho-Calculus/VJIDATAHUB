import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange, isLoading = false }) {
  if (!totalPages || totalPages === 0) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5 bg-white border-t border-slate-100 rounded-b-2xl mt-4">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
        Page <span className="text-[#1D4ED8]">{currentPage}</span> of{' '}
        <span className="text-slate-600">{totalPages}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="p-2 rounded-lg border-1.5 border-slate-200 text-slate-400 hover:border-[#1D4ED8] hover:text-[#1D4ED8] hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {pageNumbers.map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-slate-400 font-bold">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={isLoading}
              className={`px-3 py-2 rounded-lg font-bold text-xs transition-all ${
                page === currentPage
                  ? 'bg-[#1D4ED8] text-white shadow-lg shadow-blue-200 scale-105'
                  : 'border-1.5 border-slate-200 text-slate-600 hover:border-[#1D4ED8] hover:text-[#1D4ED8] hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {page}
            </button>
          )
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="p-2 rounded-lg border-1.5 border-slate-200 text-slate-400 hover:border-[#1D4ED8] hover:text-[#1D4ED8] hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
