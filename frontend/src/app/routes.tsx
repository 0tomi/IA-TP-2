import { Navigate, Route, Routes } from "react-router-dom";
import { CalendarPage } from "../features/calendar/CalendarPage";
import { ChatPage } from "../features/chat/ChatPage";

export const appRoutes = (
  <Routes>
    <Route path="/" element={<Navigate to="/chat" replace />} />
    <Route path="/chat" element={<ChatPage />} />
    <Route path="/calendar" element={<CalendarPage />} />
  </Routes>
);
