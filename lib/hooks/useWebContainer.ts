"use client";
import { WebContainer, type FileSystemTree } from "@webcontainer/api";
import { useEffect, useState } from "react";

const ENABLE_CONSOLE = false;
// const ENABLE_CONSOLE = true;

declare global {
  interface Window {
    webContainerPromise: Promise<WebContainer> | null;
    webContainer: WebContainer | null;
    webContainerServer: {
      port: number;
      url: string;
    } | null;
  }
}
if (typeof window !== "undefined") {
  if (!window.webContainerPromise) {
    const webContainerPromise = WebContainer.boot();
    window.webContainerPromise = webContainerPromise;

    void (async () => {
      const template = await fetch("/templates/vite-tailwind-react.json").then(
        (r) => r.json() as unknown as FileSystemTree
      );
      const webContainer = await webContainerPromise;
      window.webContainer = webContainer;
      webContainer.on("server-ready", (port, url) => {
        window.webContainerServer = {
          port,
          url,
        };
        console.log(`Server ready at ${url}!`);
      });
      await webContainer.mount(template);
      const npmInstall = await webContainer.spawn("npm", ["install"]);
      if (ENABLE_CONSOLE) {
        void npmInstall.output.pipeTo(
          new WritableStream<string>({
            write(data) {
              console.log(data);
            },
          })
        );
      }
      const installExitCode = await npmInstall.exit;
      if (installExitCode !== 0) {
        throw new Error("npm install failed");
      }
      const npmRunDev = await webContainer.spawn("npm", ["run", "dev"]);
      if (ENABLE_CONSOLE) {
        void npmRunDev.output.pipeTo(
          new WritableStream<string>({
            write(data) {
              console.log(data);
            },
          })
        );
      }
    })();
  }
}

export function overrideConsoleLogWithIgnoreList() {
  const ignoreList = ["[vite] hot updated"];
  const overrideLog = (type: "log" | "debug" | "info") => {
    const original = console[type];
    console[type] = (...args) => {
      if (
        !args.some(
          (arg) =>
            typeof arg === "string" &&
            ignoreList.some((ignoreItem) => arg.includes(ignoreItem))
        )
      ) {
        original(...args);
      }
    };
  };

  overrideLog("log");
  overrideLog("debug");
  overrideLog("info");
}
overrideConsoleLogWithIgnoreList();

export function useWebContainer() {
  const [port, setPort] = useState<number | null>(
    globalThis?.window?.webContainerServer?.port ?? null
  );
  const [url, setUrl] = useState<string | null>(
    globalThis?.window?.webContainerServer?.url ?? null
  );
  const [webContainer, setWebContainer] = useState<WebContainer | null>(
    globalThis?.window?.webContainer ?? null
  );

  useEffect(() => {
    let canceled = false;
    function onServerReady(port: number, url: string) {
      if (canceled) {
        return;
      }
      setPort(port);
      setUrl(url);
      setWebContainer(window.webContainer);
    }
    void window.webContainerPromise?.then((webContainer) => {
      webContainer.on("server-ready", onServerReady);
    });
    return () => {
      canceled = true;
      // TODO: remove webcontainerInstance/fix memory leak...
    };
  }, []);
  return {
    port,
    url,
    webContainer,
  };
}
