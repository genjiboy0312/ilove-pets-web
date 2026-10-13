export class LocalContentStorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LocalContentStorageError"
  }
}

export class LocalContentMetadataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LocalContentMetadataError"
  }
}
