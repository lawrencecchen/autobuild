import { Button } from "@/components/ui/button";
import { IconArrowRight } from "@/components/ui/icons";

const exampleMessages = [
  {
    heading: "Show all customers.",
    message: "Show all customers.",
  },
  {
    heading: "Who are my best employees?",
    message: "Who are my best employees?",
  },
  {
    heading: "Which products are most popular?",
    message: "Which products are most popular?",
  },
  {
    heading: "Create counter app.",
    message: "Create counter app.",
  },
];

export function EmptyScreen({
  submitMessage,
}: {
  submitMessage: (message: string) => void;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4">
      <div className="rounded-lg border bg-background p-8 mb-4">
        <h1 className="mb-2 text-lg font-semibold">
          The fastest way to build React apps based on your database
        </h1>
        <p className="mb-2 leading-normal text-muted-foreground">
          Autobuild can write SQL queries, make safe updates/inserts/deletes to
          your database, and create React components to display the results.
        </p>
        {/* <p className="mb-2 leading-normal text-muted-foreground">
          The demo is built with{" "}
          <ExternalLink href="https://nextjs.org">Next.js</ExternalLink> and the{" "}
          <ExternalLink href="https://sdk.vercel.ai/docs">
            Vercel AI SDK
          </ExternalLink>
          .
        </p>
        <p className="mb-2 leading-normal text-muted-foreground">
          It uses{" "}
          <ExternalLink href="https://vercel.com/blog/ai-sdk-3-generative-ui">
            React Server Components
          </ExternalLink>{" "}
          to combine text with UI generated as output of the LLM. The UI state
          is synced through the SDK so the model is aware of your interactions
          as they happen.
        </p> */}
        <p className="leading-normal text-muted-foreground">Try an example:</p>
        <div className="mt-4 flex flex-col items-start space-y-2 mb-4">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              onClick={async () => {
                submitMessage(message.message);
              }}
            >
              <IconArrowRight className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
      {/* <p className="leading-normal text-muted-foreground text-[0.8rem] text-center">
        Note: This is not real financial advice.
      </p> */}
    </div>
  );
}
