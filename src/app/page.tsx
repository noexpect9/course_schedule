"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import * as htmlToImage from "html-to-image";
import { toPng, toJpeg, toBlob, toPixelData, toSvg } from "html-to-image";

// --- 类型定义 ---
interface EventType {
  id: number;
  title: string;
  date: Date; // 将 'date' 视为开始时间
  endDate: Date; // 新增结束时间
  color: string;
}

// --- 图标组件 ---
const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

// --- 主日历组件 ---
export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  // --- 数据持久化 ---
  useEffect(() => {
    try {
      const savedEvents = localStorage.getItem("calendar_events");
      if (savedEvents) {
        const parsedEvents: EventType[] = JSON.parse(savedEvents).map(
          (e: any) => ({
            ...e,
            date: parseISO(e.date),
            endDate: parseISO(e.endDate),
          })
        );
        setEvents(parsedEvents);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error("Failed to load events from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("calendar_events", JSON.stringify(events));
    } catch (error) {
      console.error("Failed to save events to localStorage", error);
    }
  }, [events]);

  // --- 日历逻辑 ---
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    return events.reduce((acc: { [key: string]: EventType[] }, event) => {
      const dateKey = format(event.date, "yyyy-MM-dd");
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      acc[dateKey].sort((a, b) => a.date.getTime() - b.date.getTime());
      return acc;
    }, {});
  }, [events]);

  // --- 事件处理器 ---
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleGoToToday = () => setCurrentDate(new Date());
  const handleExportAsPNG = () => {
    if (calendarRef.current) {
      console.log(calendarRef.current);
      htmlToImage
        .toPng(calendarRef.current)
        .then((dataUrl) => {
          const link = document.createElement("a");
          link.download = "calendar.png";
          link.href = dataUrl;
          link.click();
        })
        .catch((error) => {
          console.error("Error exporting calendar as PNG:", error);
        });
    }
  };

  const openModalForNewEvent = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const openModalForEditEvent = (event: EventType) => {
    setSelectedDate(event.date);
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveEvent = (eventData: Omit<EventType, "id">) => {
    if (selectedEvent) {
      setEvents(
        events.map((e) =>
          e.id === selectedEvent.id ? { ...selectedEvent, ...eventData } : e
        )
      );
    } else {
      setEvents([...events, { id: Date.now(), ...eventData }]);
    }
    closeModal();
  };

  const handleDeleteEvent = () => {
    if (selectedEvent) {
      setEvents(events.filter((e) => e.id !== selectedEvent.id));
      closeModal();
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen font-sans p-2 sm:p-4 flex flex-col">
      <div
        ref={calendarRef}
        className="max-w-6xl w-full mx-auto bg-white rounded-2xl shadow-lg p-4 flex flex-col flex-grow"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 w-28 sm:w-32">
              {format(currentDate, "yyyy年 MMMM", { locale: zhCN })}
            </h2>
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-full hover:bg-slate-200 transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-full hover:bg-slate-200 transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div>
            <button
              onClick={handleGoToToday}
              className="text-sm font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-lg transition-colors"
            >
              今天
            </button>
            <button
              onClick={handleExportAsPNG}
              className="text-sm font-semibold text-blue-600 bg-blue-100 hover:bg-blue-200 px-4 py-2 ml-2 rounded-lg transition-colors"
            >
              导出
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 grid-rows-1 flex-shrink-0">
          {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
            <div
              key={day}
              className="text-center font-medium text-slate-500 text-xs sm:text-sm py-2 border-b"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-6 flex-grow">
          {calendarDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDate[dayKey] || [];
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toString()}
                className={`relative border-t border-l border-slate-200 p-1.5 flex flex-col group hover:bg-slate-50 transition-colors
                  ${
                    !isSameMonth(day, currentDate)
                      ? "text-slate-400 bg-slate-50"
                      : "text-slate-700"
                  }
                `}
                onClick={() => openModalForNewEvent(day)}
              >
                <span
                  className={`text-xs sm:text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0
                  ${isToday ? "bg-blue-600 text-white" : ""}
                `}
                >
                  {format(day, "d")}
                </span>
                <div className="flex-grow overflow-y-auto mt-1 space-y-1 pr-1">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openModalForEditEvent(event);
                      }}
                      className={`${event.color} text-white text-[10px] sm:text-xs rounded px-1.5 py-0.5 truncate cursor-pointer flex flex-wrap gap-1.5 text-center`}
                    >
                      <span className="">{event.title}</span>
                      <span className="font-semibold mr-1.5">
                        {format(event.date, "HH:mm")}-
                        {format(event.endDate, "HH:mm")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {isModalOpen && (
        <EventModal
          date={selectedDate}
          event={selectedEvent}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// --- 事件编辑/新增弹窗组件 ---
interface EventModalProps {
  date: Date | null;
  event: EventType | null;
  onSave: (data: Omit<EventType, "id">) => void;
  onDelete: () => void;
  onClose: () => void;
}

function EventModal({
  date,
  event,
  onSave,
  onDelete,
  onClose,
}: EventModalProps) {
  const [title, setTitle] = useState(event?.title || "");
  const [startDate, setStartDate] = useState<Date>(
    event?.date || date || new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    event?.endDate || event?.date || new Date()
  );
  const [color, setColor] = useState(event?.color || "bg-blue-500");

  const colorOptions = [
    "bg-blue-500",
    "bg-green-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];

  const handleTimeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "start" | "end"
  ) => {
    const [hours, minutes] = e.target.value.split(":");
    const targetDate = type === "start" ? startDate : endDate;
    const newDate = new Date(targetDate);
    newDate.setHours(parseInt(hours, 10));
    newDate.setMinutes(parseInt(minutes, 10));

    if (type === "start") {
      setStartDate(newDate);
      if (newDate > endDate) {
        setEndDate(newDate); // 如果开始时间晚于结束时间，自动将结束时间设为开始时间
      }
    } else {
      setEndDate(newDate);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      alert("请输入标题");
      return;
    }
    if (startDate > endDate) {
      alert("结束时间不能早于开始时间");
      return;
    }
    onSave({ title, date: startDate, endDate: endDate, color });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">
            {event ? "编辑事件" : "新增事件"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-full"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                标题*
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="例如：舞蹈伎乐飞天"
              />
            </div>
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  开始时间
                </label>
                <input
                  type="time"
                  value={format(startDate, "HH:mm")}
                  onChange={(e) => handleTimeChange(e, "start")}
                  className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  结束时间
                </label>
                <input
                  type="time"
                  value={format(endDate, "HH:mm")}
                  onChange={(e) => handleTimeChange(e, "end")}
                  className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                颜色标记
              </label>
              <div className="mt-2 flex flex-wrap gap-3">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-full ${c} transition-transform hover:scale-110 ${
                      color === c ? "ring-2 ring-offset-2 ring-blue-500" : ""
                    }`}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-b-2xl">
            {event ? (
              <button
                type="button"
                onClick={onDelete}
                className="text-white bg-red-600 hover:bg-red-700 font-semibold rounded-lg text-sm px-5 py-2.5 text-center transition-colors"
              >
                删除
              </button>
            ) : (
              <div className="w-[68px]"></div>
            )}
            <button
              type="submit"
              className="text-white bg-blue-600 hover:bg-blue-700 font-semibold rounded-lg text-sm px-5 py-2.5 text-center transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      </div>
      <style jsx global>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in-scale {
          animation: fadeInScale 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
