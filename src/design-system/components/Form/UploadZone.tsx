"use client"

import { useState, type InputHTMLAttributes, type ReactNode } from "react"
import { UploadIcon } from "../../icons"
import { cn } from "../../utils/cn"
import styles from "./Form.module.css"

export interface UploadZoneProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "title"> {
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  onFilesChange?: (files: File[]) => void
}

/** Dashed drop / pick area for documents (`.upload-zone`). */
export function UploadZone({
  title = "Dosya seçin veya sürükleyip bırakın",
  description = "PDF, JPG veya PNG · en fazla 10 MB",
  icon = <UploadIcon size={22} />,
  onFilesChange,
  className,
  multiple,
  ...props
}: UploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const [names, setNames] = useState<string[]>([])
  const handle = (list: FileList | null) => {
    const files = Array.from(list ?? [])
    if (!files.length) return
    setNames(files.map((f) => f.name))
    onFilesChange?.(files)
  }
  return (
    <label
      className={cn(styles.upload, className)}
      data-dragging={dragging}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handle(e.dataTransfer.files)
      }}
    >
      {icon}
      <strong>{title}</strong>
      <span>{description}</span>
      {names.length > 0 && <small>{names.join(", ")}</small>}
      <input
        type="file"
        className={styles.srOnly}
        multiple={multiple}
        onChange={(e) => handle(e.target.files)}
        {...props}
      />
    </label>
  )
}
