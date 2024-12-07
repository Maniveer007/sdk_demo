"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class StorageSDK {
    constructor(config = {}) {
        var _a, _b;
        this.publisherUrl =
            (_a = config.publisherUrl) !== null && _a !== void 0 ? _a : "https://publisher.walrus-testnet.walrus.space";
        this.aggregatorUrl =
            (_b = config.aggregatorUrl) !== null && _b !== void 0 ? _b : "https://aggregator.walrus-testnet.walrus.space";
    }
    storeFile(file_1) {
        return __awaiter(this, arguments, void 0, function* (file, epochs = 5) {
            try {
                const url = `${this.publisherUrl}/v1/store?epochs=${epochs}`;
                const response = yield fetch(url, {
                    method: "PUT",
                    body: file,
                    headers: {
                        "Content-Type": "application/octet-stream",
                    },
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return yield response.json();
            }
            catch (error) {
                throw new Error(`Upload error: ${error.message}`);
            }
        });
    }
    readFile(blobId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const url = `${this.aggregatorUrl}/v1/${blobId}`;
                const response = yield fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.body;
            }
            catch (error) {
                throw new Error(`Read error: ${error.message}`);
            }
        });
    }
}
module.exports = StorageSDK;
