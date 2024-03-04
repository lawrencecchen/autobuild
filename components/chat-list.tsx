import { Separator } from "@/components/ui/separator";
import { Fragment } from "react";

export function ChatList({ messages }: { messages: any[] }) {
  if (!messages.length) {
    return null;
  }

  return (
    <div className="relative mx-auto max-w-4xl px-4 gap-4 flex flex-col">
      {messages.map((message, index) => (
        <Fragment key={index}>{message.display}</Fragment>
      ))}
    </div>
  );
}
