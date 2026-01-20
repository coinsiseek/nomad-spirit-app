'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function BackupPage() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.push('/login');
                    return;
                }

                const { data: memberData } = await supabase
                    .from('members')
                    .select('is_admin')
                    .eq('id', session.user.id)
                    .single();

                if (!memberData?.is_admin) {
                    router.push('/dashboard');
                    return;
                }

                setIsAdmin(true);
                setLoading(false);
            } catch (err) {
                console.error('Auth error:', err);
                router.push('/login');
            }
        };

        checkAuth();
    }, [router]);

    const downloadBackup = async (format: 'json' | 'csv') => {
        setDownloading(true);
        setError('');
        setSuccess('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            const response = await fetch('/api/backup', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Nem sikerült a biztonsági mentés');
            }

            const backupData = await response.json();

            if (format === 'json') {
                // Download as JSON
                const element = document.createElement('a');
                element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`);
                element.setAttribute('download', `nomad-spirit-backup-${new Date().toISOString().split('T')[0]}.json`);
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            } else if (format === 'csv') {
                // Download as CSV
                const passes = backupData.passes || [];
                const csvHeaders = ['Pass ID', 'Teljes Név', 'Email', 'Összes Edzés', 'Felhasznált Edzés', 'Aktív', 'Létrehozva'];
                const csvData = passes.map((pass: any) => [
                    pass.id,
                    pass.member?.full_name || 'N/A',
                    pass.member?.email || 'N/A',
                    pass.total_sessions,
                    pass.used_sessions,
                    pass.is_active ? 'Igen' : 'Nem',
                    new Date(pass.created_at).toLocaleDateString('hu-HU'),
                ]);

                const csv = [
                    csvHeaders.join(','),
                    ...csvData.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(',')),
                ].join('\n');

                const element = document.createElement('a');
                element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
                element.setAttribute('download', `nomad-spirit-passes-${new Date().toISOString().split('T')[0]}.csv`);
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            }

            setSuccess('Biztonsági mentés sikeresen letöltve!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            console.error('Backup error:', err);
            setError(err.message || 'Nem sikerült a biztonsági mentés');
        } finally {
            setDownloading(false);
        }
    };

    if (loading || !isAdmin) {
        return <div className="p-6 text-center">Betöltés...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Biztonsági Mentés</h1>
                    <button
                        onClick={() => router.push('/admin')}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-semibold"
                    >
                        Vissza az Irányítópultra
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-900 border border-red-700 rounded text-red-100">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-4 bg-green-900 border border-green-700 rounded text-green-100">
                        ✓ {success}
                    </div>
                )}

                <div className="bg-glass border border-gray-700 rounded-lg p-8 backdrop-blur-sm">
                    <h2 className="text-2xl font-bold mb-6">Adatok Exportálása</h2>
                    <p className="text-gray-300 mb-8">
                        A biztonsági mentés letöltése segít megőrizni az összes jelenlegi beutaló- és jelenléti adatot. 
                        Ez lehetővé teszi, hogy ha valami hiba lenne, mindig hozzáférhessek az adatokhoz.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* JSON Backup */}
                        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                            <h3 className="text-xl font-bold mb-4">JSON Formátum</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Teljes adatok JSON formátumban. Jó szoftveres feldolgozáshoz és adatbázis importáláshoz.
                            </p>
                            <button
                                onClick={() => downloadBackup('json')}
                                disabled={downloading}
                                className={`w-full py-2 px-4 rounded font-semibold transition ${
                                    downloading
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                                }`}
                            >
                                {downloading ? 'Letöltés...' : 'JSON Letöltés'}
                            </button>
                        </div>

                        {/* CSV Backup */}
                        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                            <h3 className="text-xl font-bold mb-4">CSV Formátum</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Beutaló adatok táblázat formátumban. Nyitható Excel-ben vagy Google Sheetsben.
                            </p>
                            <button
                                onClick={() => downloadBackup('csv')}
                                disabled={downloading}
                                className={`w-full py-2 px-4 rounded font-semibold transition ${
                                    downloading
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                                }`}
                            >
                                {downloading ? 'Letöltés...' : 'CSV Letöltés'}
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 p-6 bg-blue-900 border border-blue-700 rounded-lg">
                        <h3 className="text-lg font-bold mb-2">💡 Tippek</h3>
                        <ul className="text-sm text-gray-300 space-y-2">
                            <li>• Rendszeresen töltsd le a biztonsági mentést (hetente vagy havonta)</li>
                            <li>• Tárold a fájlokat biztonságos helyen (felhőben vagy külön meghajtón)</li>
                            <li>• A JSON formátum a legkomplettebb, az összes adatot tartalmazza</li>
                            <li>• A CSV formátumot könnyebben lehet elemezni táblázatkezelővel</li>
                            <li>• Minden biztonsági mentés időbélyeggel van jelölve</li>
                        </ul>
                    </div>

                    <div className="mt-6 p-6 bg-yellow-900 border border-yellow-700 rounded-lg">
                        <h3 className="text-lg font-bold mb-2">⚠️ Fontosság</h3>
                        <p className="text-sm text-gray-300">
                            Ez az adatexport nem helyettesíti az adatbázis automatikus biztonsági mentéseit. 
                            Ez csupán egy kiegészítő biztonsági intézkedés az adatokhoz való hozzáférés biztosítására 
                            az alkalmazáson kívül.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
