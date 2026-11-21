import type { ZodError } from "zod"
import type { ProblemDetails } from "@/shared/contracts/common"

export class ApiError extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail?: string,
    public errors?: Record<string, string>,
  ) {
    super(detail ?? title)
  }

  toJSON(): ProblemDetails {
    return {
      type: `https://seferhane.com/problems/${this.status}`,
      title: this.title,
      status: this.status,
      detail: this.detail,
      errors: this.errors,
    }
  }
}

export const badRequest = (detail: string, errors?: Record<string, string>) =>
  new ApiError(400, "Geçersiz istek", detail, errors)
export const unauthorized = (detail = "Oturum açmanız gerekiyor.") => new ApiError(401, "Oturum gerekli", detail)
export const forbidden = (detail = "Bu işlem için yetkiniz yok.") => new ApiError(403, "Yetkisiz işlem", detail)
export const notFound = (detail = "Kayıt bulunamadı.") => new ApiError(404, "Bulunamadı", detail)
/** Business rule violation (blocked vehicle, missing documents, plan limit…). */
export const conflict = (detail: string) => new ApiError(409, "İşlem engellendi", detail)

export function fromZod(error: ZodError): ApiError {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_"
    errors[key] ??= issue.message
  }
  return badRequest("Formdaki alanları kontrol edin.", errors)
}
