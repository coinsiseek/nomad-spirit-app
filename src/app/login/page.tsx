'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSigningUp, setIsSigningUp] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
            console.log('Login response:', { data, loginError });
            if (loginError) {
                setError(loginError.message);
                setLoading(false);
                return;
            }
            // Wait a moment for the session to be established
            await new Promise(resolve => setTimeout(resolve, 1000));
            router.push('/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            setError('An unexpected error occurred');
            setLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (!fullName.trim()) {
                setError('Please enter your full name');
                setLoading(false);
                return;
            }

            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/dashboard`,
                    data: {
                        full_name: fullName,
                    }
                }
            });

            if (signUpError) {
                setError(signUpError.message);
                setLoading(false);
                return;
            }

            // ✅ COMPRESS & UPLOAD PROFILE PICTURE (if provided)
            if (profilePicture && data?.user?.id) {
                try {
                    // Compress the image
                    const compressedFile = await import('browser-image-compression').then(async ({ default: imageCompression }) => {
                        return await imageCompression(profilePicture, {
                            maxSizeMB: 0.2,        // Max 200KB
                            maxWidthOrHeight: 800, // Resize large images
                            useWebWorker: true,
                            fileType: profilePicture.type.startsWith('image/jpeg') ? 'image/jpeg' :
                                profilePicture.type.startsWith('image/png') ? 'image/png' : 'image/webp',
                        });
                    });

                    // Keep original extension
                    const fileExt = profilePicture.name.split('.').pop()?.toLowerCase() || 'jpg';
                    const fileName = `${data.user.id}/profile.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('profile_pictures')
                        .upload(fileName, compressedFile, { upsert: true });

                    if (uploadError) {
                        console.error('Profile picture upload failed:', uploadError);
                    }
                } catch (err) {
                    console.error('Error compressing/uploading profile picture:', err);
                }
            }

            setError('');
            setFullName('');
            setProfilePicture(null);
            alert('Check your email for confirmation!');
            setLoading(false);
        } catch (err) {
            console.error('Sign up error:', err);
            setError('An unexpected error occurred during sign up');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
            <img src="/logonomad.svg" alt="Nomad Spirit Team Logo" className="w-32 h-32 mb-8 drop-shadow-lg" />
            <div className="bg-glass border border-glass rounded-xl p-6 backdrop-blur-xs w-full max-w-md">
                <h1 className="text-2xl font-bold mb-4 text-center">Nomad Spirit</h1>
                {error && (
                    <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-100 text-sm">
                        {error}
                    </div>
                )}
                {isSigningUp ? (
                    <form onSubmit={handleSignUp} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                            required
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                            required
                        />
                        <div>
                            <label className="text-sm text-gray-300">Profile Picture (Optional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
                                className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-sm"
                            />
                            {profilePicture && (
                                <p className="text-xs text-green-400 mt-1">✓ {profilePicture.name}</p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2 bg-green-600 hover:bg-green-700 rounded"
                        >
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsSigningUp(false);
                                setError('');
                                setFullName('');
                                setProfilePicture(null);
                            }}
                            className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                        >
                            Back to Login
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded"
                    >
                        {loading ? 'Loading...' : 'Log In'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsSigningUp(true);
                            setError('');
                        }}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 rounded mt-2"
                    >
                        Sign Up
                    </button>
                    </form>
                )}
            </div>
        </div>
    );
}