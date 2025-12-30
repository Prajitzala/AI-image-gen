// Server-side interfaces
export interface VectorizerOptions {
  mode?: string
  maxColors?: number
  retentionDays?: number
  palette?: string
  minAreaPx?: number
  fileFormat?: "svg" | "eps" | "pdf" | "dxf" | "png"
}

export interface DownloadOptions {
  imageToken: string
  receipt?: string
  fileFormat?: "svg" | "eps" | "pdf" | "dxf" | "png"
}

export interface AccountStatus {
  subscriptionPlan: string
  subscriptionState: string
  credits: number
}

// Server-side functions
export async function vectorizeImage(
  imageFile: File,
  options: VectorizerOptions = {},
  credentials: { username: string; password: string },
): Promise<{ data: string; headers: Headers }> {
  const { username, password } = credentials

  // Create a new FormData for the API request
  const apiFormData = new FormData()
  apiFormData.append("image", imageFile)

  // Add options to formData
  if (options.mode) {
    apiFormData.append("mode", options.mode)
  }

  if (options.maxColors !== undefined) {
    apiFormData.append("processing.max_colors", options.maxColors.toString())
  }

  if (options.retentionDays !== undefined) {
    apiFormData.append("policy.retention_days", options.retentionDays.toString())
  }

  if (options.palette) {
    apiFormData.append("processing.palette", options.palette)
  }

  if (options.minAreaPx !== undefined) {
    apiFormData.append("processing.shapes.min_area_px", options.minAreaPx.toString())
  }

  if (options.fileFormat) {
    apiFormData.append("output.file_format", options.fileFormat)
  }

  // Basic authentication
  const authString = Buffer.from(`${username}:${password}`).toString("base64")

  // Make the API request
  const response = await fetch("https://vectorizer.ai/api/v1/vectorize", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
    },
    body: apiFormData,
  })

  if (!response.ok) {
    let errorMessage = "Vectorizer API error"
    try {
      const errorData = await response.json()
      errorMessage = errorData.error?.message || errorMessage
    } catch {
      errorMessage = `${errorMessage}: ${response.status}`
    }
    throw new Error(errorMessage)
  }

  // Get the response data
  const data = await response.text()

  return { data, headers: response.headers }
}

export async function downloadVector(
  options: DownloadOptions,
  credentials: { username: string; password: string },
): Promise<{ data: string; headers: Headers }> {
  const { username, password } = credentials

  // Create a new FormData for the API request
  const apiFormData = new FormData()
  apiFormData.append("image.token", options.imageToken)

  if (options.receipt) {
    apiFormData.append("receipt", options.receipt)
  }

  if (options.fileFormat) {
    apiFormData.append("output.file_format", options.fileFormat)
  }

  // Basic authentication
  const authString = Buffer.from(`${username}:${password}`).toString("base64")

  // Make the API request
  const response = await fetch("https://vectorizer.ai/api/v1/download", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
    },
    body: apiFormData,
  })

  if (!response.ok) {
    let errorMessage = "Vectorizer API error"
    try {
      const errorData = await response.json()
      errorMessage = errorData.error?.message || errorMessage
    } catch {
      errorMessage = `${errorMessage}: ${response.status}`
    }
    throw new Error(errorMessage)
  }

  // Get the response data
  const data = await response.text()

  return { data, headers: response.headers }
}

export async function deleteImage(
  imageToken: string,
  credentials: { username: string; password: string },
): Promise<boolean> {
  const { username, password } = credentials

  // Create a new FormData for the API request
  const apiFormData = new FormData()
  apiFormData.append("image.token", imageToken)

  // Basic authentication
  const authString = Buffer.from(`${username}:${password}`).toString("base64")

  // Make the API request
  const response = await fetch("https://vectorizer.ai/api/v1/delete", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
    },
    body: apiFormData,
  })

  if (!response.ok) {
    let errorMessage = "Vectorizer API error"
    try {
      const errorData = await response.json()
      errorMessage = errorData.error?.message || errorMessage
    } catch {
      errorMessage = `${errorMessage}: ${response.status}`
    }
    throw new Error(errorMessage)
  }

  // Get the response data
  const data = await response.json()

  return data.success === true
}

export async function getAccountStatus(credentials: {
  username: string
  password: string
}): Promise<AccountStatus> {
  const { username, password } = credentials

  // Basic authentication
  const authString = Buffer.from(`${username}:${password}`).toString("base64")

  // Make the API request
  const response = await fetch("https://vectorizer.ai/api/v1/account", {
    method: "GET",
    headers: {
      Authorization: `Basic ${authString}`,
    },
  })

  if (!response.ok) {
    let errorMessage = "Vectorizer API error"
    try {
      const errorData = await response.json()
      errorMessage = errorData.error?.message || errorMessage
    } catch {
      errorMessage = `${errorMessage}: ${response.status}`
    }
    throw new Error(errorMessage)
  }

  // Get the response data
  const data = await response.json()

  return {
    subscriptionPlan: data.subscriptionPlan,
    subscriptionState: data.subscriptionState,
    credits: data.credits,
  }
}
