"use client";

import { type AI } from "@/app/action";
import { useActions, useUIState } from "ai/rsc";
import { useEffect, useRef } from "react";

export function Continue() {
  const { submitUserMessage } = useActions();
  const [, setMessages] = useUIState<typeof AI>();

  const done = useRef(false);
  useEffect(() => {
    if (done.current) {
      return;
    }
    done.current = true;
    void (async () => {
      console.log("continue...");
      try {
        // Submit and get response message
        // explicitly set undefined to just continue openai loop
        const responseMessage = await submitUserMessage(undefined);
        setMessages((currentMessages) => [...currentMessages, responseMessage]);
      } catch (error) {
        // You may want to show a toast or trigger an error state.
        console.error(error);
      }
    })();
  }, [setMessages, submitUserMessage]);

  return null;
}
