import React from 'react'

interface DayStripProps {
  weekDays: Date[]
  selectedDay: string
  onSelectDay: (dateStr: string) => void
  isDiaNoLaborable: (date: Date) => boolean
  formatDate: (date: Date) => string
  getDayName: (date: Date) => string
}

export const DayStrip: React.FC<DayStripProps> = ({
  weekDays,
  selectedDay,
  onSelectDay,
  isDiaNoLaborable,
  formatDate,
  getDayName,
}) => {
  const todayStr = formatDate(new Date())

  return (
    <div className="md:hidden flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
      {weekDays.map(date => {
        const dateStr = formatDate(date)
        const isSelected = dateStr === selectedDay
        const isToday = dateStr === todayStr
        const isNoLaborable = isDiaNoLaborable(date)

        return (
          <button
            key={dateStr}
            onClick={() => onSelectDay(dateStr)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 transition-opacity ${isNoLaborable ? 'opacity-40' : ''}`}
            style={{ minWidth: 44 }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wide"
              style={{ color: isSelected ? '#4f46e5' : '#9ca3af' }}
            >
              {getDayName(date)}
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all"
              style={
                isSelected
                  ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', boxShadow: '0 4px 12px rgba(109,40,217,.35)' }
                  : isToday
                  ? { background: '#ede9fe', color: '#4f46e5' }
                  : { background: 'transparent', color: '#374151' }
              }
            >
              {date.getDate()}
            </div>
            <div
              className="w-1 h-1 rounded-full"
              style={{ background: isSelected ? 'rgba(255,255,255,.7)' : isToday ? '#4f46e5' : 'transparent' }}
            />
          </button>
        )
      })}
    </div>
  )
}
