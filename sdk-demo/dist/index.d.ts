interface StorageConfig {
    publisherUrl?: string;
    aggregatorUrl?: string;
}
declare class StorageSDK {
    private publisherUrl;
    private aggregatorUrl;
    constructor(config?: StorageConfig);
    storeFile(file: File, epochs?: number): Promise<any>;
    readFile(blobId: string): Promise<ReadableStream<Uint8Array>>;
}
