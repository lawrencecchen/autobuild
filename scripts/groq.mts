import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: "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",
  baseURL: "https://api.groq.com/openai/v1",
});

const completionResponse = await groq.chat.completions.create({
  model: "mixtral-8x7b-32768",
  messages: [
    {
      role: "system",
      content:
        "Write React components with TypeScript, and Tailwind CSS. Respond immediately with ```tsx\n. Do not preface with conversation.",
    },
    {
      role: "user",
      content: "Create a pricing page. Respond immediately with ```tsx\n",
    },
  ],
  temperature: 0.1,
  // functions: [
  //   {
  //     name: "run_python",
  //     description: "Run Python code",
  //     parameters: {
  //       code: {
  //         type: "string",
  //         description: "The Python code to run",
  //       },
  //     },
  //   },
  // ],
  stream: true,
});

let builder = "";
for await (const message of completionResponse) {
  const content = message.choices[0].delta.content;
  if (content) {
    builder += content;
    process.stdout.write(content);
  }
}

process.exit(0);
