"use client";

import React, { createContext, useContext, useState } from "react";
import AlertModal from ".//AlertModal";

type AlertOptions = { title?: string; okText?: string; onOk?: () => void };

type AlertCtx = {
  showAlert: (message: string, opts?: AlertOptions) => void;
};

const AlertContext = createContext<AlertCtx | null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Notice");
  const [message, setMessage] = useState("");
  const [okText, setOkText] = useState("OK");
  const [onOk, setOnOk] = useState<undefined | (() => void)>(undefined);

  const showAlert = (msg: string, opts?: AlertOptions) => {
    setTitle(opts?.title ?? "Notice");
    setMessage(msg);
    setOkText(opts?.okText ?? "OK");
    setOnOk(opts?.onOk);
    setOpen(true);
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AlertModal
        open={open}
        title={title}
        message={message}
        okText={okText}
        onOk={onOk}
        onClose={() => {
          setOpen(false);
          setOnOk(undefined);
        }}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used inside AlertProvider");
  return ctx;
}
