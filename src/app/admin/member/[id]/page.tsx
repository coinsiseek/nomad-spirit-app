'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { getAttendanceRecords } from '@/lib/attendance';

interface Member {
    id: string;
    full_name: string;
    profile_picture_url: string | null;
}

interface Pass {
    id: string;
    used_sessions: number;
    total_sessions: number;
    is_active: boolean;
}

export default function MemberViewPage() {
    const router = useRouter();
    const params = useParams();
    const memberId = params.id as string;

    const [member, setMember] = useState<Member | null>(null);
    const [activePass, setActivePass] = useState<Pass | null>(null);
    const [attendanceDates, setAttendanceDates] = useState<string[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMemberData = async () => {
            try {
                // Verify user is admin
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.push('/login');
                    return;
                }

                const { data: adminData } = await supabase
                    .from('members')
                    .select('is_admin')
                    .eq('id', session.user.id)
                    .single();

                if (!adminData?.is_admin) {
                    router.push('/dashboard');
                    return;
                }

                // Fetch member data
                const { data: memberData, error: memberError } = await supabase
                    .from('members')
                    .select('id, full_name, profile_picture_url')
                    .eq('id', memberId)
                    .single();

                if (memberError || !memberData) {
                    router.push('/admin');
                    return;
                }

                setMember(memberData);

                // Fetch all passes for this member
                const { data: passes } = await supabase
                    .from('passes')
                    .select('*')
                    .eq('member_id', memberId)
                    .order('created_at', { ascending: false });

                // Get the most recent pass (could be active or inactive)
                if (passes && passes.length > 0) {
                    const pass = passes[0];
                    setActivePass(pass);

                    // Fetch attendance records for this pass
                    const records = await getAttendanceRecords(pass.id);
                    setAttendanceDates(records.map(r => r.session_date));
                }

                setLoading(false);
            } catch (err) {
                console.error('Error loading member data:', err);
                router.push('/admin');
            }
        };

        loadMemberData();
    }, [router, memberId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white p-6">
                <div className="text-center">Betöltés...</div>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="min-h-screen bg-gray-900 text-white p-6">
                <div className="text-center">Tag nem található</div>
            </div>
        );
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
    firstDayOfMonth = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const monthName = currentMonth.toLocaleString('hu-HU', { month: 'long', year: 'numeric' });

    const attendanceDateSet = new Set(attendanceDates.map(date =>
        new Date(date).toISOString().split('T')[0]
    ));

    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-semibold"
                    >
                        ← Vissza
                    </button>
                    <h1 className="text-3xl font-bold text-center flex-1">
                        {member.full_name}
                    </h1>
                    <div className="w-10"></div>
                </div>

                {/* Member Info Card */}
                <div className="bg-glass border border-gray-700 rounded-lg p-6 backdrop-blur-sm mb-6">
                    <div className="flex items-center gap-4 mb-6">
                        {member.profile_picture_url ? (
                            <img
                                src={member.profile_picture_url}
                                alt={member.full_name}
                                className="w-20 h-20 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl">
                                {member.full_name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl font-bold">{member.full_name}</h2>
                        </div>
                    </div>

                    {/* Pass Info */}
                    {activePass ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-400 mb-2">Bérlet Státusz: {activePass.is_active ? '🟢 Aktív' : '🔴 Inaktív'}</p>
                                <div className="text-4xl font-bold text-yellow-400">{activePass.used_sessions}</div>
                                <div className="text-3xl font-bold text-blue-400">{activePass.total_sessions}</div>
                            </div>

                            <div>
                                <p className="text-sm text-gray-400 mb-2">Maradt: <span className="text-2xl font-bold text-green-400">{remainingSessions}</span> edzés</p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-400 mb-2">Edzések:</p>
                                <div className="flex flex-wrap gap-2">
                                    {sessionsArray.map((used, index) => (
                                        <div
                                            key={index}
                                            className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                                                used ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'
                                            }`}
                                        >
                                            {used ? '✓' : index + 1}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-yellow-400">Nincs aktív bérlet</p>
                    )}
                </div>

                {/* Calendar */}
                {activePass && (
                    <div className="bg-glass border border-gray-700 rounded-lg p-6 backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-6">
                            <button
                                onClick={handlePrevMonth}
                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded"
                            >
                                ←
                            </button>
                            <h3 className="text-xl font-bold">{monthName}</h3>
                            <button
                                onClick={handleNextMonth}
                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded"
                            >
                                →
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].map(day => (
                                <div key={day} className="text-center font-bold text-sm text-gray-400 py-2">
                                    {day}
                                </div>
                            ))}
                            {calendarDays.map((day, idx) => {
                                if (day === null) {
                                    return <div key={`empty-${idx}`} className="aspect-square"></div>;
                                }

                                const dateStr = new Date(
                                    currentMonth.getFullYear(),
                                    currentMonth.getMonth(),
                                    day
                                ).toISOString().split('T')[0];

                                const isAttendanceDay = attendanceDateSet.has(dateStr);

                                return (
                                    <div
                                        key={day}
                                        className={`aspect-square flex items-center justify-center rounded font-bold text-sm cursor-default ${
                                            isAttendanceDay
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-700 text-gray-400'
                                        }`}
                                    >
                                        {day}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
