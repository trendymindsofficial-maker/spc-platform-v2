"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import AdminProtected from "@/components/AdminProtected";

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  const sendNotification = async () => {
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle || !cleanMessage) {
      alert("Please enter notification title and message.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      alert("Admin login required.");
      return;
    }

    try {
      setSending(true);
      setResult("");

      const idToken = await user.getIdToken();

      const response = await fetch(
        "/api/admin/notifications/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            title: cleanTitle,
            message: cleanMessage,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to send notification."
        );
      }

      setResult(
        `✅ Notification sent. ${data.successCount} students received it.`
      );

      setTitle("");
      setMessage("");
    } catch (error) {
      console.error(error);

      setResult(
        `❌ ${
          error instanceof Error
            ? error.message
            : "Failed to send notification."
        }`
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminProtected>
      <main className="min-h-screen bg-gray-100 p-6 md:p-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-blue-700">
              🔔 Send Notification
            </h1>

            <p className="mt-2 text-gray-600">
              Send a web push notification to all
              students who have enabled notifications.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl">
            <div className="mb-6 rounded-2xl bg-blue-50 p-5">
              <p className="font-bold text-blue-800">
                🎯 Audience
              </p>

              <p className="mt-1 text-blue-700">
                All Registered Students
              </p>

              <p className="mt-2 text-sm text-blue-600">
                Only students who allowed browser
                notifications will receive the push.
              </p>
            </div>

            <label className="mb-2 block font-bold text-gray-700">
              Notification Title
            </label>

            <input
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="Example: 🎉 New SBC Offer"
              maxLength={100}
              className="mb-6 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              disabled={sending}
            />

            <label className="mb-2 block font-bold text-gray-700">
              Message
            </label>

            <textarea
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              placeholder="Example: New student offers are now available!"
              maxLength={300}
              rows={5}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              disabled={sending}
            />

            <button
              onClick={sendNotification}
              disabled={
                sending ||
                !title.trim() ||
                !message.trim()
              }
              className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending
                ? "Sending..."
                : "🔔 Send to All Students"}
            </button>

            {result && (
              <div className="mt-6 rounded-xl bg-gray-50 p-4 font-semibold text-gray-700">
                {result}
              </div>
            )}
          </div>
        </div>
      </main>
    </AdminProtected>
  );
}