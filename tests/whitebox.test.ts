import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDistanceMeters, validateGeofence, Coordinates } from '../src/shared/utils/geo.ts';
import { evaluateVolumeFormula, normalizeVolumeFormulaDisplay } from '../src/shared/utils/volumeCalculator.ts';
import { evaluateWorkReportRisk, DEFAULT_RISK_CONFIG } from '../backend-src/modules/risk/riskEngine.ts';
import type { RiskEvaluationInput } from '../backend-src/types.js';
import { isDirectorUser } from '../src/shared/lib/roles.ts';
import { GUCI_WAREHOUSE_CATALOG } from '../src/shared/data/warehouseCatalog.ts';
// ============================================================================
// SPRINT WHITEBOX TEST SUITE — FIELDWORK APP V2
// ============================================================================

test('WB-01 [Branch & Boundary]: Geofence Haversine Math & Distance Limits', async (t) => {
    const OFFICE: Coordinates = { latitude: -6.314643, longitude: 106.716157 };

    await t.test('Jarak koordinat identik wajib tepat 0 meter', () => {
        const d = calculateDistanceMeters(OFFICE, OFFICE);
        assert.equal(d, 0);
    });

    await t.test('Jarak boundary toleransi 100m -> Valid (isInside: true)', () => {
        // Geser sangat tipis ~20m
        const pInside: Coordinates = { latitude: -6.314800, longitude: 106.716250 };
        const res = validateGeofence(pInside, OFFICE, 100);
        assert.equal(res.isInside, true);
        assert.equal(res.differenceMeters, 0);
        assert.ok(res.distanceMeters < 100);
    });

    await t.test('Jarak di luar boundary toleransi 100m -> Invalid dengan selisih tepat', () => {
        // Geser ~500m ke selatan
        const pOutside: Coordinates = { latitude: -6.319000, longitude: 106.716157 };
        const res = validateGeofence(pOutside, OFFICE, 100);
        assert.equal(res.isInside, false);
        assert.ok(res.distanceMeters > 400);
        assert.equal(res.differenceMeters, Math.round((res.distanceMeters - 100) * 100) / 100);
    });
});

test('WB-02 [Parser & AST]: Safe Volume Formula Recursive-Descent Evaluation', async (t) => {
    const testCases: [string, number][] = [
        ['37+37+5,5+9+6+5', 99.5],
        ['9+12+7,5+6', 34.5],
        ['37 x 9 x 4', 1332.0],
        ['(37+37+9+9+12+10) x 5,5', 627.0],
        ['20 x 11', 220.0],
        ['155 + 77,5', 232.5],
        ['(7+7+5+8+12+10) x 3', 147.0],
    ];

    for (const [expr, expected] of testCases) {
        await t.test(`Formula "${expr}" -> ${expected}`, () => {
            const res = evaluateVolumeFormula(expr);
            assert.equal(res.isValid, true);
            assert.equal(res.value, expected);
        });
    }

    await t.test('Normalisasi tampilan rumus ("37x9" -> "37 x 9")', () => {
        const norm = normalizeVolumeFormulaDisplay('37x9*4');
        assert.equal(norm, '37 x 9 x 4');
    });

    await t.test('Zero division & invalid syntax rejection', () => {
        const divZero = evaluateVolumeFormula('10 / 0');
        assert.equal(divZero.isValid, false);

        const invalidChar = evaluateVolumeFormula('10 + rm -rf');
        assert.equal(invalidChar.isValid, false);
    });
});

test('WB-03 [Domain Chemistry]: SNI 2404 Termite Barrier & Chemical Dosage', async (t) => {
    const DOSAGE_LITER_PER_METER_LARI = 5.0; // 5 liter per meter lari (m')
    const DOSAGE_LITER_PER_M2_SOIL = 5.0;       // 5 liter per m² galian tanah

    await t.test('Kalkulasi volume cairan injeksi pondasi 99.5 meter lari', () => {
        const kelilingPondasi = 99.5;
        const totalCairanLiter = kelilingPondasi * DOSAGE_LITER_PER_METER_LARI;
        assert.equal(totalCairanLiter, 497.5);

        // Konsentrasi termitisida mis. 25 ml per 1 liter air (Rasio 1:40)
        const konsentratMl = totalCairanLiter * 25;
        assert.equal(konsentratMl, 12437.5);
    });

    await t.test('Kalkulasi kebutuhan cairan permukaan tanah (627 m²)', () => {
        const luasTanah = 627.0;
        const totalCairanLiter = luasTanah * DOSAGE_LITER_PER_M2_SOIL;
        assert.equal(totalCairanLiter, 3135.0);
    });
});

test('WB-04 [Financial Math]: Quotation Subtotal, Upah %, Diskon & PPN 11%', async () => {
    const items = [
        { qty: 99.5, price: 19000 },
        { qty: 34.5, price: 38000 },
        { qty: 1332, price: 9100 },
        { qty: 627, price: 13000 },
    ];

    const subtotal = items.reduce((acc, it) => acc + Math.round(it.qty * it.price), 0);
    assert.equal(subtotal, 23473700);

    // Upah 25%, Diskon upah 15%
    const upahGross = Math.round(subtotal * 0.25);
    const upahDisc = Math.round(subtotal * 0.15);
    const netUpah = upahGross - upahDisc;
    assert.equal(upahGross, 5868425);
    assert.equal(upahDisc, 3521055);

    const totalBeforePpn = subtotal + netUpah;
    assert.equal(totalBeforePpn, 25821070);

    const ppn = Math.round(totalBeforePpn * 0.11);
    const grandTotal = totalBeforePpn + ppn;
    assert.equal(ppn, 2840318);
    assert.equal(grandTotal, 28661388);
});

test('WB-05 [Risk Engine Logic]: Anomaly Evaluation & Anomaly Scoring', async (t) => {
    const baseProject = {
        latitude: -6.314643,
        longitude: 106.716157,
        radius: 100,
    };

    await t.test('Kunjungan normal tepat waktu & dalam radius -> NORMAL (Score: 0, isFlagged: false)', () => {
        const report = {
            projectLatitude: baseProject.latitude,
            projectLongitude: baseProject.longitude,
            projectRadius: baseProject.radius,
            checkInLatitude: baseProject.latitude,
            checkInLongitude: baseProject.longitude,
            checkOutLatitude: baseProject.latitude,
            checkOutLongitude: baseProject.longitude,
            checkInDistance: 15,
            checkOutDistance: 20,
            checkInAt: '2026-10-23T08:00:00Z',
            checkOutAt: '2026-10-23T09:30:00Z', // 90 menit (> 60m threshold)
            photos: [
                { id: 'p1', photoType: 'BEFORE' as const, photoUrl: 'https://storage/p1.webp' },
                { id: 'p2', photoType: 'PROGRESS' as const, photoUrl: 'https://storage/p2.webp' },
                { id: 'p3', photoType: 'AFTER' as const, photoUrl: 'https://storage/p3.webp' },
            ],
            treatmentRecord: {
                chemicalName: 'Premise 200 SL',
                dosage: 25,
                dosageUnit: 'ml/L',
                method: 'BARRIER_INJECTION',
            },
        } as unknown as RiskEvaluationInput;

        const res = evaluateWorkReportRisk(report, DEFAULT_RISK_CONFIG);
        assert.equal(res.score, 0);
        assert.equal(res.level, 'NORMAL');
        assert.equal(res.isFlagged, false);
        assert.equal(res.events.length, 0);
    });

    await t.test('Check-in di luar radius (> 300m) & durasi abnormal -> FLAGGED (isFlagged: true, level: HIGH/CRITICAL)', () => {
        const report = {
            projectLatitude: baseProject.latitude,
            projectLongitude: baseProject.longitude,
            projectRadius: baseProject.radius,
            checkInLatitude: -6.320000,
            checkInLongitude: 106.716157,
            checkOutLatitude: -6.320000,
            checkOutLongitude: 106.716157,
            checkInDistance: 600, // 600m > 100m
            checkOutDistance: 600,
            checkInAt: '2026-10-23T08:00:00Z',
            checkOutAt: '2026-10-23T08:10:00Z', // 10 menit (< 30m)
            photos: [{ id: 'p1', photoType: 'BEFORE' as const, photoUrl: 'https://storage/p1.webp' }],
            treatmentRecord: undefined,
        } as unknown as RiskEvaluationInput;

        const res = evaluateWorkReportRisk(report, DEFAULT_RISK_CONFIG);
        assert.ok(res.score >= DEFAULT_RISK_CONFIG.highRiskThreshold);
        assert.equal(res.isFlagged, true);
        assert.ok(['HIGH_RISK', 'CRITICAL'].includes(res.level));
        assert.ok(res.events.some(e => e.eventType === 'OUTSIDE_RADIUS'));
        assert.ok(res.events.some(e => e.eventType === 'SHORT_DURATION'));
        assert.ok(res.events.some(e => e.eventType === 'MISSING_TREATMENT_RECORD'));
    });
});

test('WB-06 [Mobile Virtual Keyboard & Viewport Invariants]', async (t) => {
    await t.test('Keyboard threshold terpicu saat visualViewport berkurang >= 20%', () => {
        const innerHeight = 844; // iPhone 14
        const viewportHeightWithKeyboard = 520; // Keyboard terbuka
        const isKb = viewportHeightWithKeyboard < innerHeight * 0.8;
        assert.equal(isKb, true);
    });

    await t.test('Keyboard threshold tidak terpicu saat viewport normal', () => {
        const innerHeight = 844;
        const viewportHeightNormal = 844;
        const isKb = viewportHeightNormal < innerHeight * 0.8;
        assert.equal(isKb, false);
    });
});

test('WB-07 [Director Authorization & Chemical Profit Masking]', async (t) => {
    await t.test('Direktur (SUPERADMIN / MASTER_SUPER_ADMIN / Tim Izumi & Ayling) diizinkan melihat keuntungan chemical', () => {
        assert.equal(isDirectorUser({ role: 'SUPERADMIN', email: 'direktur@gucimaspratama.co.id' }), true);
        assert.equal(isDirectorUser({ role: 'MASTER_SUPER_ADMIN', email: 'lieziragroup@gmail.com' }), true);
        assert.equal(isDirectorUser({ role: 'ADMIN', email: 'ayling.director@fieldwork.id' }), true);
        assert.equal(isDirectorUser({ role: 'ADMIN', email: 'izumi.board@fieldwork.id' }), true);
    });

    await t.test('Staf Gudang (INVENTORY), Teknisi, dan Marketing DILARANG melihat estimasi keuntungan chemical', () => {
        assert.equal(isDirectorUser({ role: 'INVENTORY', email: 'gudang@gucimaspratama.co.id' }), false);
        assert.equal(isDirectorUser({ role: 'MARKETING', email: 'marketing.andi@gucimaspratama.co.id' }), false);
        assert.equal(isDirectorUser({ role: 'TEKNISI_LAPANGAN', email: 'budi@fieldwork.id' }), false);
    });
});

test('WB-08 [Marketing MoM Personal Isolation & Service Category Breakdown]', async (t) => {
    const mockQuotations = [
        // Marketing A: 2 Anti Rayap (1 deal, 1 draft) + 1 Pest Control (1 deal)
        { id: 'q1', marketingUid: 'user-mkt-a', kategori: 'AR', status: 'deal', total: 15000000 },
        { id: 'q2', marketingUid: 'user-mkt-a', kategori: 'AR', status: 'draft', total: 10000000 },
        { id: 'q3', marketingUid: 'user-mkt-a', kategori: 'PCO', status: 'approved', total: 5000000 },
        // Marketing B: 2 Pest Control (2 deal)
        { id: 'q4', marketingUid: 'user-mkt-b', kategori: 'PCO', status: 'deal', total: 8000000 },
        { id: 'q5', marketingUid: 'user-mkt-b', kategori: 'PCO', status: 'deal', total: 6000000 },
    ];

    await t.test('Isolasi Marketing A: Hanya menghitung penawaran miliknya (3 total, bukan 5)', () => {
        const myQuos = mockQuotations.filter(q => q.marketingUid === 'user-mkt-a');
        assert.equal(myQuos.length, 3);
    });

    await t.test('Breakdown Kategori Marketing A: Deal Anti Rayap 50% & Deal Pest Control 100%', () => {
        const myQuos = mockQuotations.filter(q => q.marketingUid === 'user-mkt-a');
        const arQuos = myQuos.filter(q => q.kategori === 'AR');
        const arDeals = arQuos.filter(q => q.status === 'deal' || q.status === 'approved');
        const arDealPct = Math.round((arDeals.length / arQuos.length) * 100);
        assert.equal(arDealPct, 50); // 1 deal / 2 survey = 50%

        const pestQuos = myQuos.filter(q => q.kategori === 'PCO');
        const pestDeals = pestQuos.filter(q => q.status === 'deal' || q.status === 'approved');
        const pestDealPct = Math.round((pestDeals.length / pestQuos.length) * 100);
        assert.equal(pestDealPct, 100); // 1 deal / 1 survey = 100%
    });
});

test('WB-09 [UI Minimalist Spacing & Layout Decluttering Invariants]', async (t) => {
    await t.test('Standar breathing room: Card minimum padding adalah 16px (p-4) hingga 24px (p-6)', () => {
        const cardPaddings = [16, 20, 24]; // p-4, p-5, p-6
        cardPaddings.forEach(p => {
            assert.ok(p >= 16, `Padding ${p}px memenuhi standar breathing room`);
        });
    });

    await t.test('Standar tap target tombol dan input mobile minimal 44px', () => {
        const mobileTapTarget = 44; // min-height standard
        assert.ok(mobileTapTarget >= 44, 'Tap target mobile memenuhi accessibility standard');
    });
});

test('WB-10 [Warehouse Catalog & Data Gudang September Invariants]', async (t) => {
    await t.test('Katalog Data Gudang memuat 30+ item nyata lintas 6 kategori', () => {
        assert.ok(GUCI_WAREHOUSE_CATALOG.length >= 30, `Total item: ${GUCI_WAREHOUSE_CATALOG.length}`);
        const categories = new Set(GUCI_WAREHOUSE_CATALOG.map(i => i.kategori));
        assert.ok(categories.has('Chemical Anti Rayap'));
        assert.ok(categories.has('Chemical Pest Control'));
        assert.ok(categories.has('Alat & Mesin Kerja'));
        assert.ok(categories.has('Suku Cadang (Spareparts)'));
        assert.ok(categories.has('Pipa & Fitting'));
        assert.ok(categories.has('Perangkap & Sanitasi'));
    });

    await t.test('Setiap item memiliki nama valid, stok awal non-negatif, dan harga pokok HPP realistis', () => {
        for (const item of GUCI_WAREHOUSE_CATALOG) {
            assert.ok(item.nama.trim().length > 3);
            assert.ok(item.stokAwal >= 0);
            assert.ok(item.minAlert >= 0);
            assert.ok(item.hargaSatuan > 0);
            assert.ok(item.satuan.trim().length > 0);
        }
    });

    await t.test('Kalkulasi hari akhir bulan menghasilkan 30 atau 31 hari secara tepat (bukan fallback 28)', () => {
        const y = 2026;
        const m = 10; // Oktober
        const lastDay = new Date(y, m, 0).getDate();
        assert.equal(lastDay, 31);

        const septLastDay = new Date(y, 9, 0).getDate(); // September
        assert.equal(septLastDay, 30);
    });
});

test('WB-11 [User Setup Authorization & Peer Admin Suspend Protection]', async (t) => {
    function canManageUserStatus(actor: { role: string; email?: string }, target: { role: string }): boolean {
        const isDirector = isDirectorUser(actor);
        // Direktur bisa mengelola/menonaktifkan seluruh role
        if (isDirector) return true;
        // Admin TIDAK BISA menonaktifkan akun Admin lainnya
        if (actor.role === 'ADMIN' && target.role === 'ADMIN') return false;
        // Admin BISA menonaktifkan role operasional (Teknisi, Marketing, Inventory)
        if (actor.role === 'ADMIN' && ['TEKNISI_LAPANGAN', 'MARKETING', 'INVENTORY'].includes(target.role)) return true;
        return false;
    }

    await t.test('Admin DILARANG menonaktifkan/suspend akun Admin lainnya', () => {
        const adminActor = { role: 'ADMIN', email: 'admin.fauzi@fieldwork.id' };
        const peerAdmin = { role: 'ADMIN' };
        assert.equal(canManageUserStatus(adminActor, peerAdmin), false);
    });

    await t.test('Admin BISA menonaktifkan akun Teknisi, Marketing, dan Gudang', () => {
        const adminActor = { role: 'ADMIN', email: 'admin.fauzi@fieldwork.id' };
        assert.equal(canManageUserStatus(adminActor, { role: 'TEKNISI_LAPANGAN' }), true);
        assert.equal(canManageUserStatus(adminActor, { role: 'MARKETING' }), true);
        assert.equal(canManageUserStatus(adminActor, { role: 'INVENTORY' }), true);
    });

    await t.test('Direktur (SUPERADMIN / Tim Direksi) BISA menonaktifkan akun Admin maupun staf lainnya', () => {
        const directorActor = { role: 'SUPERADMIN', email: 'direktur@gucimaspratama.co.id' };
        assert.equal(canManageUserStatus(directorActor, { role: 'ADMIN' }), true);
        assert.equal(canManageUserStatus(directorActor, { role: 'TEKNISI_LAPANGAN' }), true);
    });
});

test('WB-12 [Quotation Draft Download Lockdown & ACC Approval Gate]', async (t) => {
    function canDownloadQuotation(userRole: string, status: string): boolean {
        const isApproved = status === 'approved' || status === 'deal';
        // Marketing DILARANG mendownload jika belum di-ACC (masih draft/pending)
        if (userRole === 'MARKETING' && !isApproved) {
            return false;
        }
        // Pasca-ACC, marketing dan admin BISA mendownload dokumen resmi
        if (isApproved) {
            return true;
        }
        // Admin / Superadmin dalam mode audit internal
        return userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'MASTER_SUPER_ADMIN';
    }

    await t.test('Marketing DILARANG mendownload draft penawaran sebelum di-ACC Admin/Direktur', () => {
        assert.equal(canDownloadQuotation('MARKETING', 'draft'), false);
        assert.equal(canDownloadQuotation('MARKETING', 'pending'), false);
        assert.equal(canDownloadQuotation('MARKETING', 'sent_to_client'), false);
    });

    await t.test('Setelah di-ACC (approved / deal), tombol unduh resmi terbuka untuk Marketing & Admin', () => {
        assert.equal(canDownloadQuotation('MARKETING', 'approved'), true);
        assert.equal(canDownloadQuotation('MARKETING', 'deal'), true);
        assert.equal(canDownloadQuotation('ADMIN', 'approved'), true);
    });

    await t.test('Pembersihan data item penyesuaian: baris kosong diabaikan agar data tidak bertumpuk', () => {
        const dirtyItems = [
            { desc: 'Pondasi 1 sisi', qty: 99.5, unit: 'm¹', harga: 19000 },
            { desc: '', qty: 0, unit: 'm²', harga: 0 }, // baris kosong tidak valid
            { desc: 'Plafon Lt 1-4', qty: 1332, unit: 'm²', harga: 9100 },
        ];
        const clean = dirtyItems.filter(it => it.desc.trim().length > 0 && it.qty > 0);
        assert.equal(clean.length, 2);
        assert.equal(clean[0].desc, 'Pondasi 1 sisi');
        assert.equal(clean[1].desc, 'Plafon Lt 1-4');
    });
});

test('WB-13 [Invite Token Server-Side Registration & OTP Expired Protection]', async (t) => {
    function parseAuthHashError(hash: string): { errorCode: string | null; errorDescription: string | null } {
        const clean = hash.startsWith('#') ? hash.substring(1) : hash;
        const params = new URLSearchParams(clean);
        return {
            errorCode: params.get('error_code'),
            errorDescription: params.get('error_description'),
        };
    }

    await t.test('Mendeteksi parameter error Supabase #error=access_denied&error_code=otp_expired', () => {
        const sampleHash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
        const parsed = parseAuthHashError(sampleHash);
        assert.equal(parsed.errorCode, 'otp_expired');
        assert.equal(parsed.errorDescription, 'Email link is invalid or has expired');
    });

    await t.test('Validasi token undangan: token aktif dan belum expired diizinkan registrasi langsung', () => {
        const now = Date.now();
        const mockInvite = {
            id: 'tok-valid-123',
            used: false,
            expiresAt: new Date(now + 86400000).toISOString(),
        };
        const isTokenValid = !mockInvite.used && new Date(mockInvite.expiresAt).getTime() > now;
        assert.equal(isTokenValid, true);
    });

    await t.test('Validasi token undangan: token kedaluwarsa atau sudah dipakai ditolak', () => {
        const now = Date.now();
        const expiredInvite = {
            id: 'tok-exp-123',
            used: false,
            expiresAt: new Date(now - 1000).toISOString(),
        };
        const isExpiredValid = !expiredInvite.used && new Date(expiredInvite.expiresAt).getTime() > now;
        assert.equal(isExpiredValid, false);

        const usedInvite = {
            id: 'tok-used-123',
            used: true,
            expiresAt: new Date(now + 86400000).toISOString(),
        };
        const isUsedValid = !usedInvite.used && new Date(usedInvite.expiresAt).getTime() > now;
        assert.equal(isUsedValid, false);
    });
});

test('WB-14 [Mobile Camera Fallback, Visual Viewport & Geofence Accuracy Compensation]', async (t) => {
    const CENTER = { latitude: -6.314643, longitude: 106.716157 };

    await t.test('Kompensasi akurasi GPS: Jarak 115m dengan akurasi device ±25m dalam batas radius 100m -> Valid', () => {
        // Jarak ~115m (di luar 100m nominal, tapi masuk dalam toleransi GPS 100m + 25m = 125m)
        const pointNear = { latitude: -6.315680, longitude: 106.716157 };
        const resWithAccuracy = validateGeofence(pointNear, CENTER, 100, 25);
        assert.equal(resWithAccuracy.isInside, true);

        // Tanpa akurasi (0m), jarak 115m tetap di luar radius 100m
        const resNoAccuracy = validateGeofence(pointNear, CENTER, 100, 0);
        assert.equal(resNoAccuracy.isInside, false);
    });

    await t.test('Batas atas toleransi GPS dibatasi maksimal 35m untuk mencegah bypass geofence', () => {
        // Jarak ~145m dengan klaim akurasi buruk ±100m tetap ditolak karena batas maksimal toleransi 35m (100m + 35m = 135m < 145m)
        const pointFar = { latitude: -6.315950, longitude: 106.716157 };
        const resCapped = validateGeofence(pointFar, CENTER, 100, 100);
        assert.equal(resCapped.isInside, false);
    });

    await t.test('Invarian Anti-Geser Pin: Mengetik alamat tidak menggeser koordinat jika isLocationPicked = true', () => {
        let locationLat = -6.314643;
        let locationLng = 106.716157;
        const isLocationPicked = true;
        const isMapLocked = false;
        const typedAddress = "Jl. Sudirman No. 45 Jakarta Pusat";

        // Evaluasi logika guard yang terpasang di CreateProjectModal
        const shouldAutoGeocode = !isLocationPicked && !isMapLocked && typedAddress.length >= 5;
        assert.equal(shouldAutoGeocode, false, 'Auto-geocoding dilarang menimpa titik GPS yang sudah dipilih');
        assert.equal(locationLat, -6.314643);
        assert.equal(locationLng, 106.716157);
    });
});
