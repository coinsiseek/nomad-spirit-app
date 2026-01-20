'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ensureMemberExists } from '@/lib/auth';
import { getAttendanceRecords } from '@/lib/attendance';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

export default function DashboardPage() {
    const [fullName, setFullName] = useState('Tag');
    const [isAdmin, setIsAdmin] = useState(false);
    const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
    const [activePass, setActivePass] = useState<any>(null);
    const [attendanceDates, setAttendanceDates] = useState<string[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.push('/login');
                    return;
                }

                // Ensure member exists in database
                await ensureMemberExists();

                const userId = session.user.id;
                const { data } = await supabase
                    .from('members')
                    .select('full_name, is_admin, profile_picture_url')
                    .eq('id', userId)
                    .single();
                
                if (data) {
                    setFullName(data.full_name);
                    setIsAdmin(data.is_admin || false);
                    setProfilePictureUrl(data.profile_picture_url);
                    
                    // Redirect admins to admin dashboard
                    if (data.is_admin) {
                        router.push('/admin');
                        return;
                    }
                }

                // Fetch active pass only for non-admins
                const { data: passData } = await supabase
                    .from('passes')
                    .select('*')
                    .eq('member_id', userId)
                    .eq('is_active', true)
                    .single();

                if (passData) {
                    setActivePass(passData);
                    // Fetch attendance records
                    const records = await getAttendanceRecords(passData.id);
                    setAttendanceDates(records.map(r => r.session_date));
                }
                setLoading(false);
            } catch (err) {
                console.error('Error checking auth:', err);
                router.push('/login');
            }
        };

        checkAuth();
    }, [router]);

    if (loading) {
        return <div className="p-6"><p>Betöltés...</p></div>;
    }

    const remainingSessions = activePass
        ? activePass.total_sessions - activePass.used_sessions
        : 0;

    const sessionsArray = activePass
        ? Array.from({ length: activePass.total_sessions }, (_, i) => i < activePass.used_sessions)
        : [];

    // Calendar logic
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    let firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    // Adjust to Monday = 0 (subtract 1, and handle Sunday which is 0)
    firstDayOfMonth = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const monthName = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    const attendanceDateSet = new Set(attendanceDates.map(date => 
        new Date(date).toISOString().split('T')[0]
    ));

    const calendarDays = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null);
    }
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    return (
        <>
            <Head>
                <link rel="icon" href="data:," />
            </Head>
            <div className="min-h-screen bg-gray-900 text-white p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        {/* Left side: Avatar + Greeting */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            {/* Avatar */}
                            {profilePictureUrl ? (
                                <img
                                    src={profilePictureUrl}
                                    alt={fullName}
                                    className="w-16 h-16 rounded-full object-cover border-3 border-blue-500 self-start sm:self-center"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center border-3 border-gray-600 text-2xl font-bold self-start sm:self-center">
                                    {fullName.charAt(0)}
                                </div>
                            )}

                            {/* Greeting — smaller on mobile */}
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center sm:text-left">
                                Szia, {fullName}!
                            </h1>
                        </div>

                        {/* Right side: Buttons */}
                        <div className="flex gap-4 flex-wrap justify-center sm:justify-start">
                            <button
                                onClick={() => router.push('/profile')}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-sm font-semibold whitespace-nowrap"
                            >
                                Saját Profil
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => router.push('/admin')}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-semibold whitespace-nowrap"
                                >
                                    Admin Irányítópult
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    supabase.auth.signOut();
                                    router.push('/login');
                                }}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-semibold whitespace-nowrap"
                            >
                                Kijelentkezés
                            </button>
                        </div>
                    </div>

                    {activePass ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-glass border border-gray-700 rounded-lg p-8 backdrop-blur-sm">
                                <h2 className="text-2xl font-bold mb-6">A jelenlegi bérleted</h2>
                                
                                <div className="mb-8">
                                    <div className="flex justify-between mb-4">
                                        <span className="text-gray-300">Eddigi Edzések</span>
                                        <span className="text-2xl font-bold text-blue-400">
                                            {activePass.used_sessions} / {activePass.total_sessions}
                                        </span>
                                    </div>
                                    
                                    <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
                                            style={{
                                                width: `${(activePass.used_sessions / activePass.total_sessions) * 100}%`,
                                            }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-8 gap-3">
                                    {sessionsArray.map((used, index) => (
                                        <div
                                            key={index}
                                            className={`aspect-square rounded-lg flex items-center justify-center font-bold text-sm transition ${
                                                used
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-gray-700 text-gray-400 border-2 border-gray-600'
                                            }`}
                                        >
                                            {index + 1}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-glass border border-gray-700 rounded-lg p-6 backdrop-blur-sm">
                                <h3 className="text-xl font-bold mb-4">Jelenlét Naptár</h3>
                                
                                <div className="flex justify-between items-center mb-4">
                                    <button
                                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                                    >
                                        ←
                                    </button>
                                    <span className="font-semibold">{monthName}</span>
                                    <button
                                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                                    >
                                        →
                                    </button>
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                                    {['H', 'K', 'Sz', 'Cs', 'P', 'Szo', 'V'].map(day => (
                                        <div key={day} className="font-bold text-gray-400 py-2">
                                            {day}
                                        </div>
                                    ))}
                                    {calendarDays.map((day, idx) => {
                                        if (day === null) {
                                            return <div key={`empty-${idx}`} className="p-2"></div>;
                                        }
                                        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const hasAttendance = attendanceDateSet.has(dateStr);
                                        return (
                                            <div
                                                key={day}
                                                className={`p-2 rounded text-sm font-semibold transition ${
                                                    hasAttendance
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-gray-800 text-gray-400'
                                                }`}
                                            >
                                                {day}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="lg:col-span-3 grid grid-cols-3 gap-4">
                                <div className="bg-gray-800 rounded-lg p-4 text-center">
                                    <div className="text-gray-400 text-sm mb-2">Hátralévő</div>
                                    <div className="text-3xl font-bold text-green-400">{remainingSessions}</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-4 text-center">
                                    <div className="text-gray-400 text-sm mb-2">Felhasznált</div>
                                    <div className="text-3xl font-bold text-yellow-400">{activePass.used_sessions}</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-4 text-center">
                                    <div className="text-gray-400 text-sm mb-2">Összes</div>
                                    <div className="text-3xl font-bold text-blue-400">{activePass.total_sessions}</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-glass border border-gray-700 rounded-lg p-8 backdrop-blur-sm text-center">
                            <h2 className="text-2xl font-bold mb-4">Nincs Aktív Bérleted</h2>
                            <p className="text-gray-400 mb-6">Még nincs aktív bérleted. Kérd meg az edzőt, hogy segítsen.</p>
                            <button
                                onClick={() => router.push('/')}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
                            >
                                Vissza a Kezdőlapra
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}