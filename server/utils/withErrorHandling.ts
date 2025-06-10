// Utility to wrap route handlers with internet connectivity and error handling
// Usage: export default defineEventHandler(withErrorHandling(async (event) => { ... }, options))

import type { H3Event } from 'h3'

// Extend H3Event to include our custom properties
declare module 'h3' {
  interface H3Event {
    isOnline: activityStatus;
  }
}

interface ErrorHandlingOptions {
  skipProcesses?:Array<keyof generalResponse>
}

interface ErrorWithStatus {
  message?: string;
  statusCode?: number;
}

export default function withErrorHandling<ReturnT>(handler: (event: H3Event) => Promise<generalResponse& ReturnT>, options: ErrorHandlingOptions = {}) {
  return async function(event: H3Event) {
    try {
      // 1. Internet connectivity check
      const isOnline = (await ping()) ? "online" : "offline";
      if (isOnline === "offline" && !options.skipProcesses?.includes("connectionActivity")) {
        return {
          status: "bad",
          connectionActivity: "offline",
          statusCode: 503,
          message: "Service unavailable: cannot reach the internet.",
        };
      }

      

      // 2. Attach isOnline to event for downstream use
      event.isOnline = isOnline;

      // 3. Execute handler
      return await handler(event);
    } catch (error) {
      // Convert error to meaningful message
      let message = "Internal server error";
      let statusCode = 500;

      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === "string") {
        message = error;
      } else if (error && typeof error === "object") {
        const err = error as ErrorWithStatus;
        message = err.message || message;
        statusCode = err.statusCode || statusCode;
      }

      return {
        status: "bad",
        connectionActivity: "online",
        statusCode,
        message,
        success: false,
      };
    }
  };
}