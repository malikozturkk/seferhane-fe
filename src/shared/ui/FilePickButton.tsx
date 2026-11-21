"use client"

import { useRef, type ReactNode } from "react"
import { Button, UploadIcon, type ButtonProps } from "@/design-system"

/** Button that opens the native file picker (WhatsApp'tan gelen fotoğraf / PDF yükleme). */
export function FilePickButton({
  onFiles,
  accept,
  multiple,
  children,
  icon = <UploadIcon size={14} />,
  ...props
}: Omit<ButtonProps, "onClick" | "children"> & {
  onFiles: (files: File[]) => void
  accept?: string
  multiple?: boolean
  children: ReactNode
  icon?: ReactNode
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button leftIcon={icon} {...props} onClick={() => ref.current?.click()}>
        {children}
      </Button>
      <input
        ref={ref}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) onFiles(files)
          e.target.value = ""
        }}
      />
    </>
  )
}
