'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const [fullName, setFullName] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
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

                const userId = session.user.id;
                const { data } = await supabase
                    .from('members')
                    .select('full_name, profile_picture_url')
                    .eq('id', userId)
                    .single();

                if (data) {
                    setFullName(data.full_name);
                    setProfilePicture(data.profile_picture_url);
                }
                setLoading(false);
            } catch (err) {
                console.error('Error loading profile:', err);
                setError('Nem sikerült betölteni a profilt');
                setLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1 * 1024 * 1024) { // 5MB limit
                setError('A fájl mérete legfeljebb 5MB lehet');
                return;
            }
            setSelectedFile(file);
            setError('');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Válasszon ki egy fájlt');
            return;
        }

        setUploading(true);
        setError('');
        setSuccess('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            const userId = session.user.id;

            // ✅ COMPRESS THE IMAGE HERE
            const compressedFile = await import('browser-image-compression').then(async ({ default: imageCompression }) => {
                return await imageCompression(selectedFile, {
                    maxSizeMB: 0.2,        // Max 200KB (was 1MB)
                    maxWidthOrHeight: 300, // Resize large images
                    useWebWorker: true,
                    fileType: selectedFile.type.startsWith('image/jpeg') ? 'image/jpeg' :
                        selectedFile.type.startsWith('image/png') ? 'image/png' : 'image/webp',
                });
            });

            // Keep original extension for consistency
            const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${userId}/profile.${fileExt}`;

            // Delete old picture if exists
            const { data: fileList } = await supabase.storage
                .from('profile_pictures')
                .list(userId);

            if (fileList && fileList.length > 0) {
                await supabase.storage
                    .from('profile_pictures')
                    .remove(fileList.map(f => `${userId}/${f.name}`));
            }

            // Upload COMPRESSED file
            const { error: uploadError } = await supabase.storage
                .from('profile_pictures')
                .upload(fileName, compressedFile, { upsert: true });

            if (uploadError) {
                setError('Nem sikerült feltölteni a képet: ' + uploadError.message);
                setUploading(false);
                return;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('profile_pictures')
                .getPublicUrl(fileName);

            // Update member record
            const { error: updateError } = await supabase
                .from('members')
                .update({ profile_picture_url: publicUrl })
                .eq('id', userId);

            if (updateError) {
                setError('Nem sikerült frissíteni a profilt');
                setUploading(false);
                return;
            }

            setProfilePicture(publicUrl);
            setSelectedFile(null);
            setSuccess('Profilkép sikeresen frissítve!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Nem sikerült feltölteni a képet');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white p-6">
                <div className="text-center">Betöltés...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Saját Profil</h1>
                    <button
                        onClick={() => router.push('/dashboard')}
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
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-4">Teljes Név</h2>
                        <div className="p-4 bg-gray-800 rounded-lg text-gray-300">
                            {fullName}
                        </div>
                        <p className="text-sm text-gray-400 mt-2">
                            ℹ️ A neved regisztráció után nem módosítható
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold mb-4">Profilkép</h2>
                        
                        <div className="flex items-center gap-8">
                            {profilePicture ? (
                                <img
                                    src={profilePicture}
                                    alt={fullName}
                                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center border-4 border-gray-600 text-4xl">
                                    {fullName.charAt(0)}
                                </div>
                            )}

                            <div className="flex-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-sm"
                                />
                                {selectedFile && (
                                    <p className="text-xs text-green-400 mt-2">
                                        ✓ {selectedFile.name} kiválasztva
                                    </p>
                                )}
                                <button
                                    onClick={handleUpload}
                                    disabled={!selectedFile || uploading}
                                    className={`mt-4 w-full py-2 rounded font-semibold transition ${
                                        uploading || !selectedFile
                                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                                    }`}
                                >
                                    {uploading ? 'Feltöltés...' : 'Kép Feltöltése'}
                                </button>
                            </div>
                        </div>

                        <p className="text-sm text-gray-400 mt-4">
                            ℹ️ Ajánlott méret: 400x400px vagy nagyobb. Maximum 5MB.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
