"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
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

// --- 类型定义 ---
// --- MODIFIED ---: Renamed 'date' to 'startDate' for clarity and consistency
interface EventType {
  id: number;
  title: string;
  startDate: Date;
  endDate: Date;
  color: string;
}

// --- NEW ---: Type for raw data coming from the API
interface ApiEvent {
  id: number;
  title: string;
  start_date: string; // The backend sends snake_case strings
  end_date: string;
  color: string;
}

// --- 图标组件 (No changes) ---
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
    {" "}
    <polyline points="15 18 9 12 15 6"></polyline>{" "}
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
    {" "}
    <polyline points="9 18 15 12 9 6"></polyline>{" "}
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
    {" "}
    <line x1="18" y1="6" x2="6" y2="18"></line>{" "}
    <line x1="6" y1="6" x2="18" y2="18"></line>{" "}
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

  // --- NEW ---: Centralized function to fetch and process events from the API
  const fetchEvents = useCallback(async () => {
    try {
      // We will fetch from the correct API endpoint for classes/events
      const response = await fetch(`/api/events`);
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      const { data } = await response.json();

      // Transform the raw API data into the format our component uses (string -> Date)
      const formattedEvents = data.map((event: ApiEvent) => ({
        id: event.id,
        title: event.title,
        startDate: parseISO(event.start_date),
        endDate: parseISO(event.end_date),
        color: event.color,
      }));
      setEvents(formattedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      // Optionally, show an error message to the user
    }
  }, []);

  // --- MODIFIED ---: This useEffect now fetches from the API on initial component load
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // --- REMOVED ---: The two useEffect hooks for localStorage have been removed.

  // --- 日历逻辑 (No changes) ---
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    return events.reduce((acc: { [key: string]: EventType[] }, event) => {
      const dateKey = format(event.startDate, "yyyy-MM-dd");
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      acc[dateKey].sort(
        (a, b) => a.startDate.getTime() - b.startDate.getTime()
      );
      return acc;
    }, {});
  }, [events]);

  // --- 事件处理器 (No changes to these handlers) ---
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleGoToToday = () => setCurrentDate(new Date());
  const handleExportAsPNG = () => {
    if (calendarRef.current) {
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
    setSelectedDate(event.startDate);
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // --- MODIFIED ---: handleSaveEvent now communicates with the backend API
  const handleSaveEvent = async (
    eventData: Omit<EventType, "id" | "startDate"> & {
      date: Date;
      endDate: Date;
    }
  ) => {
    // The API expects 'date' and 'endDate' properties in the body
    const payload = {
      title: eventData.title,
      date: eventData.date.toISOString(),
      endDate: eventData.endDate.toISOString(),
      color: eventData.color,
    };

    try {
      let response;
      if (selectedEvent) {
        // Editing an existing event (PUT request)
        response = await fetch(`/api/events/${selectedEvent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Creating a new event (POST request)
        response = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save event");
      }

      // After a successful save, refresh the events from the server
      await fetchEvents();
    } catch (error) {
      console.error("Error saving event:", error);
    } finally {
      closeModal();
    }
  };

  // --- MODIFIED ---: handleDeleteEvent now communicates with the backend API
  const handleDeleteEvent = async () => {
    if (selectedEvent) {
      try {
        const response = await fetch(`/api/events/${selectedEvent.id}`, {
          method: "DELETE",
        });

        if (!response.ok && response.status !== 204) {
          // 204 is a valid success response for DELETE
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete event");
        }

        // After a successful delete, refresh the events from the server
        await fetchEvents();
      } catch (error) {
        console.error("Error deleting event:", error);
      } finally {
        closeModal();
      }
    }
  };

  // --- JSX (No major changes, only minor adjustments for clarity) ---
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
                      className={`${event.color} text-white text-[10px] sm:text-xs rounded px-1.5 py-0.5 truncate cursor-pointer flex items-center justify-between`}
                    >
                      <span className="truncate">{event.title}</span>
                      <span className="font-semibold ml-1.5 flex-shrink-0">
                        {format(event.startDate, "HH:mm")}-
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
// --- MODIFIED ---: The onSave prop type has been updated to reflect the new payload
interface EventModalProps {
  date: Date | null;
  event: EventType | null;
  onSave: (data: {
    title: string;
    date: Date;
    endDate: Date;
    color: string;
  }) => void;
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
  const [startTime, setStartTime] = useState<Date>(
    event?.startDate || date || new Date()
  );
  const [endTime, setEndTime] = useState<Date>(
    event?.endDate || event?.startDate || new Date()
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
    const targetDate = type === "start" ? startTime : endTime;
    const newDate = new Date(targetDate);
    newDate.setHours(parseInt(hours, 10));
    newDate.setMinutes(parseInt(minutes, 10));

    if (type === "start") {
      setStartTime(newDate);
      if (newDate > endTime) {
        setEndTime(newDate);
      }
    } else {
      setEndTime(newDate);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      return;
    }
    if (startTime > endTime) {
      alert("结束时间不能早于开始时间");
      return;
    }
    // --- MODIFIED ---: The payload now uses 'date' to match the API expectation
    onSave({ title, date: startTime, endDate: endTime, color });
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
                  value={format(startTime, "HH:mm")}
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
                  value={format(endTime, "HH:mm")}
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
