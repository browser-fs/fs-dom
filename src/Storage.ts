import { SyncStore, SimpleSyncStore, SimpleSyncRWTransaction, SyncRWTransaction, SyncStoreFS } from '@zenfs/core/backends/SyncStore.js';
import { ApiError, ErrorCode } from '@zenfs/core/ApiError.js';
import { type Backend } from '@zenfs/core/backends/backend.js';
import { decode, encode } from '@zenfs/core/utils.js';
import type { Ino } from '@zenfs/core/inode.js';

/**
 * A synchronous key-value store backed by Storage.
 */
export class StorageStore implements SyncStore, SimpleSyncStore {
	public get name(): string {
		return Storage.name;
	}

	constructor(protected _storage: Storage) {}

	public clear(): void {
		this._storage.clear();
	}

	public beginTransaction(): SyncRWTransaction {
		// No need to differentiate.
		return new SimpleSyncRWTransaction(this);
	}

	public get(key: Ino): Uint8Array | undefined {
		const data = this._storage.getItem(key.toString());
		if (typeof data != 'string') {
			return;
		}

		return encode(data);
	}

	public put(key: Ino, data: Uint8Array, overwrite: boolean): boolean {
		try {
			if (!overwrite && this._storage.getItem(key.toString()) !== null) {
				// Don't want to overwrite the key!
				return false;
			}
			this._storage.setItem(key.toString(), decode(data));
			return true;
		} catch (e) {
			throw new ApiError(ErrorCode.ENOSPC, 'Storage is full.');
		}
	}

	public remove(key: Ino): void {
		try {
			this._storage.removeItem(key.toString());
		} catch (e) {
			throw new ApiError(ErrorCode.EIO, 'Unable to delete key ' + key + ': ' + e);
		}
	}
}

/**
 * Options to pass to the StorageFileSystem
 */
export interface StorageOptions {
	/**
	 * The Storage to use. Defaults to globalThis.localStorage.
	 */
	storage: Storage;
}

/**
 * A synchronous file system backed by a `Storage` (e.g. localStorage).
 */
export const Storage: Backend = {
	name: 'Storage',

	options: {
		storage: {
			type: 'object',
			required: false,
			description: 'The Storage to use. Defaults to globalThis.localStorage.',
		},
	},

	isAvailable(storage: Storage = globalThis.localStorage): boolean {
		return storage instanceof globalThis.Storage;
	},

	create({ storage = globalThis.localStorage }: StorageOptions) {
		return new SyncStoreFS({ store: new StorageStore(storage) });
	},
};
