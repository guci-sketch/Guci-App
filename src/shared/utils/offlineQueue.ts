/**
 * Offline-First Queue Manager
 * Menyimpan mutasi data presensi & laporan kerja teknisi di IndexedDB/Memory
 * saat perangkat berada di area blank spot sinyal (basemen / gedung tebal).
 */

export interface OfflineQueueItem {
  id: string
  action: 'CHECK_IN' | 'SUBMIT_BAP' | 'CHEMICAL_USAGE'
  payload: Record<string, unknown>
  createdAt: string
  retryCount: number
  status: 'PENDING' | 'SYNCED' | 'FAILED'
}

export class OfflineQueueManager {
  private queue: OfflineQueueItem[] = []

  /**
   * Menambahkan aksi ke antrean lokal saat offline.
   */
  public enqueue(action: OfflineQueueItem['action'], payload: Record<string, unknown>): OfflineQueueItem {
    const item: OfflineQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'PENDING'
    }
    this.queue.push(item)
    return item
  }

  /**
   * Mengambil semua antrean yang belum tersinkronisasi.
   */
  public getPendingItems(): OfflineQueueItem[] {
    return this.queue.filter((item) => item.status === 'PENDING')
  }

  /**
   * Memproses sinkronisasi antrean ke server saat koneksi internet pulih.
   */
  public async syncAll(
    sender: (item: OfflineQueueItem) => Promise<boolean>
  ): Promise<{ syncedCount: number; failedCount: number }> {
    let syncedCount = 0
    let failedCount = 0

    for (const item of this.getPendingItems()) {
      try {
        const success = await sender(item)
        if (success) {
          item.status = 'SYNCED'
          syncedCount++
        } else {
          item.retryCount++
          failedCount++
        }
      } catch {
        item.retryCount++
        failedCount++
      }
    }

    return { syncedCount, failedCount }
  }

  /**
   * Mengosongkan item yang telah sukses tersinkronisasi.
   */
  public purgeSynced(): void {
    this.queue = this.queue.filter((item) => item.status !== 'SYNCED')
  }

  public getQueueLength(): number {
    return this.queue.length
  }
}

export const offlineQueue = new OfflineQueueManager()
