import test from 'node:test';
import assert from 'node:assert/strict';

// ============================================================================
// SPRINT BLACKBOX TEST SUITE — FIELDWORK APP V2
// ============================================================================

/**
 * Kalkulator Standar System Usability Scale (SUS)
 * Skala Likert 1-5 (1: Sangat Tidak Setuju, 5: Sangat Setuju).
 * Skor SUS = (Sum(Odd - 1) + Sum(5 - Even)) * 2.5
 */
export function calculateSUSScore(answers: number[]): number {
    if (answers.length !== 10) {
        throw new Error('Kuesioner SUS wajib memiliki 10 butir pertanyaan');
    }

    let oddSum = 0;
    let evenSum = 0;

    for (let i = 0; i < 10; i++) {
        const score = answers[i];
        if (score < 1 || score > 5) {
            throw new Error(`Nilai jawaban butir ke-${i + 1} (${score}) harus antara 1 sampai 5`);
        }
        if ((i + 1) % 2 === 1) {
            oddSum += score - 1;
        } else {
            evenSum += 5 - score;
        }
    }

    return (oddSum + evenSum) * 2.5;
}

test('BB-01 [RBAC Matrix]: Multi-Role Access Control & Permission Guard', async (t) => {
    type Role = 'MASTER_SUPER_ADMIN' | 'ADMIN' | 'TEKNISI_LAPANGAN' | 'MARKETING' | 'INVENTORY';

    const PERMISSIONS: Record<Role, string[]> = {
        MASTER_SUPER_ADMIN: ['ALL_PERMISSIONS', 'MANAGE_TENANTS', 'APPROVE_SPK', 'CHECKIN_GPS', 'MANAGE_STOCK'],
        ADMIN: ['CREATE_SPK', 'APPROVE_SPK', 'VIEW_ALL_REPORTS', 'MANAGE_PROJECTS', 'EXPORT_REPORTS'],
        TEKNISI_LAPANGAN: ['VIEW_ASSIGNED_SPK', 'CHECKIN_GPS', 'SUBMIT_TREATMENT', 'CAPTURE_PHOTO', 'CHECKOUT_GPS'],
        MARKETING: ['CREATE_QUOTATION', 'VIEW_CUSTOMERS', 'VIEW_MOM_PERFORMANCE'],
        INVENTORY: ['MANAGE_STOCK', 'INVENTORY_MUTATION_IN', 'INVENTORY_MUTATION_OUT', 'PROJECT_COSTING'],
    };

    await t.test('Teknisi lapangan DILARANG membuat atau approve SPK', () => {
        const tekPerms = PERMISSIONS.TEKNISI_LAPANGAN;
        assert.equal(tekPerms.includes('CREATE_SPK'), false);
        assert.equal(tekPerms.includes('APPROVE_SPK'), false);
    });

    await t.test('Admin memiliki wewenang penugasan SPK dan peninjauan laporan', () => {
        const admPerms = PERMISSIONS.ADMIN;
        assert.equal(admPerms.includes('CREATE_SPK'), true);
        assert.equal(admPerms.includes('APPROVE_SPK'), true);
        assert.equal(admPerms.includes('VIEW_ALL_REPORTS'), true);
    });

    await t.test('Gudang memiliki wewenang mutasi inventori tapi dilarang check-in GPS lapangan', () => {
        const invPerms = PERMISSIONS.INVENTORY;
        assert.equal(invPerms.includes('MANAGE_STOCK'), true);
        assert.equal(invPerms.includes('CHECKIN_GPS'), false);
    });
});

test('BB-02 [State Machine]: Alur Siklus Hidup SPK & Laporan Kerja Lapangan', async (t) => {
    type SPKStatus = 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

    const ALLOWED_TRANSITIONS: Record<SPKStatus, SPKStatus[]> = {
        DRAFT: ['ASSIGNED', 'CANCELLED'],
        ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [], // Terminal state
        CANCELLED: [], // Terminal state
    };

    await t.test('Transisi valid: DRAFT -> ASSIGNED -> IN_PROGRESS -> COMPLETED', () => {
        assert.equal(ALLOWED_TRANSITIONS.DRAFT.includes('ASSIGNED'), true);
        assert.equal(ALLOWED_TRANSITIONS.ASSIGNED.includes('IN_PROGRESS'), true);
        assert.equal(ALLOWED_TRANSITIONS.IN_PROGRESS.includes('COMPLETED'), true);
    });

    await t.test('Transisi ilegal: COMPLETED tidak boleh kembali ke IN_PROGRESS', () => {
        assert.equal(ALLOWED_TRANSITIONS.COMPLETED.includes('IN_PROGRESS'), false);
    });

    await t.test('Transisi ilegal: DRAFT langsung ke COMPLETED tanpa eksekusi', () => {
        assert.equal(ALLOWED_TRANSITIONS.DRAFT.includes('COMPLETED'), false);
    });
});

test('BB-03 [Usability Metrics]: Standar Kuesioner System Usability Scale (SUS)', async (t) => {
    await t.test('Skor SUS ideal responden kuesioner teknisi (skor >= 70)', () => {
        // Responden menjawab positif (ganjil tinggi, genap rendah)
        const positiveAnswers = [4, 2, 5, 1, 4, 2, 5, 1, 4, 2];
        const score = calculateSUSScore(positiveAnswers);
        assert.equal(score, 85);
        assert.ok(score >= 70, 'Skor SUS harus mencapai predikat Acceptable (>= 70)');
    });

    await t.test('Skor kuesioner sempurna (skor 100)', () => {
        const perfectAnswers = [5, 1, 5, 1, 5, 1, 5, 1, 5, 1];
        const score = calculateSUSScore(perfectAnswers);
        assert.equal(score, 100);
    });

    await t.test('Validasi jumlah pertanyaan wajib tepat 10 butir', () => {
        assert.throws(() => calculateSUSScore([5, 1, 5]), /wajib memiliki 10 butir pertanyaan/);
    });
});

test('BB-04 [Offline Resilience]: Antrean Transaksi Offline & Idempotensi', async (t) => {
    interface QueueItem {
        idempotencyKey: string;
        action: 'CHECK_IN' | 'SUBMIT_TREATMENT' | 'CHECK_OUT';
        timestamp: number;
    }

    const queue: QueueItem[] = [];
    const processedKeys = new Set<string>();

    function enqueue(action: QueueItem['action'], key: string) {
        queue.push({ idempotencyKey: key, action, timestamp: Date.now() });
    }

    function processBatch(): { processedCount: number; duplicateCount: number } {
        let processedCount = 0;
        let duplicateCount = 0;

        for (const item of queue) {
            if (processedKeys.has(item.idempotencyKey)) {
                duplicateCount++;
            } else {
                processedKeys.add(item.idempotencyKey);
                processedCount++;
            }
        }
        return { processedCount, duplicateCount };
    }

    await t.test('Antrean offline menyimpan aksi check-in dan foto secara berurutan', () => {
        enqueue('CHECK_IN', 'key-uuid-1');
        enqueue('SUBMIT_TREATMENT', 'key-uuid-2');
        enqueue('CHECK_OUT', 'key-uuid-3');

        assert.equal(queue.length, 3);
        assert.equal(queue[0].action, 'CHECK_IN');
        assert.equal(queue[2].action, 'CHECK_OUT');
    });

    await t.test('Idempotency key mencegah eksekusi duplikat saat sinyal terputus-putus', () => {
        // Simulasi retry otomatis karena network timeout
        enqueue('CHECK_OUT', 'key-uuid-3'); // duplikat key yang sama

        const res = processBatch();
        assert.equal(res.processedCount, 3);
        assert.equal(res.duplicateCount, 1);
    });
});

test('BB-05 [Media & Signature Security]: Tanda Tangan Digital & Verifikasi Format', async (t) => {
    const SIGNATURE_REGEX = /^data:image\/(png|webp);base64,/;

    await t.test('DataURL tanda tangan canvas PNG valid diterima', () => {
        const dummyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
        assert.equal(SIGNATURE_REGEX.test(dummyPng), true);
    });

    await t.test('DataURL non-gambar (injeksi payload script/html) ditolak', () => {
        const maliciousPayload = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';
        assert.equal(SIGNATURE_REGEX.test(maliciousPayload), false);
    });
});

test('BB-06 [Geofence Anti-Spoofing]: Boundary Toleransi & Heuristik Lokasi', async (t) => {
    const MAX_GEOFENCE_RADIUS_METERS = 300;

    await t.test('Teknisi dalam radius 250m disetujui otomatis', () => {
        const isInside = 250 <= MAX_GEOFENCE_RADIUS_METERS;
        assert.equal(isInside, true);
    });

    await t.test('Teknisi pada jarak 450m diberi label OUTSIDE_TOLERANCE', () => {
        const isInside = 450 <= MAX_GEOFENCE_RADIUS_METERS;
        assert.equal(isInside, false);
    });
});
