// storage-sdk/index.ts
interface StorageConfig {
  publisherUrl?: string;
  aggregatorUrl?: string;
}

class StorageSDK {
  private publisherUrl: string;
  private aggregatorUrl: string;

  constructor(config: StorageConfig = {}) {
    this.publisherUrl =
      config.publisherUrl ?? "https://publisher.walrus-testnet.walrus.space";
    this.aggregatorUrl =
      config.aggregatorUrl ?? "https://aggregator.walrus-testnet.walrus.space";
  }

  async storeFile(file: File, epochs: number = 5): Promise<any> {
    try {
      const url = `${this.publisherUrl}/v1/store?epochs=${epochs}`;

      const response = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Upload error: ${error.message}`);
    }
  }

  async readFile(blobId: string): Promise<ReadableStream<Uint8Array>> {
    try {
      const url = `${this.aggregatorUrl}/v1/${blobId}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.body!;
    } catch (error: any) {
      throw new Error(`Read error: ${error.message}`);
    }
  }
}

module.exports = StorageSDK;
