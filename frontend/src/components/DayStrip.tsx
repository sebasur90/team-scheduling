import React from 'react'

interface DayStripProps {
  weekDays: Date[]
  selectedDay: string // YYYY-MM-DD format
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
  return (
    <div className="md:hidden flex gap-2 overflow-x-auto pb-2 mb-4">
      {weekDays.map(date => {
        const dateStr = formatDate(date)
        const isSelected = dateStr === selectedDay
        const isNoLaborable = isDiaNoLaborable(date)

        return (
          <button
            key={dateStr}
            onClick={() => onSelectDay(dateStr)}
            className={`flex-shrink-0 py-2 px-3 rounded-lg text-center transition ${
              isSelected
                ? 'bg-sky-700 text-white'
                : 'bg-white text-gray-700 border border-gray-200'
            } ${isNoLaborable ? 'opacity-50' : ''}`}
          >
            <div className="text-xs font-medium">{getDayName(date)}</div>
            <div className="text-lg font-bold">{date.getDate()}</div>
          </button>
        )
      })}
    </div>
  )
}
