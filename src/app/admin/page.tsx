'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { markAttendance } from '@/lib/attendance';

interface Member {
    id: string;
    full_name: string;
    profile_picture_url: string | null;
    passes: Array<{
        id: string;
        used_sessions: number;
        total_sessions: number;
        is_active: boolean;
    }>;
}

export default function AdminDashboard() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
    const [marking, setMarking] = useState<string | null>(null);
    const [creatingPass, setCreatingPass] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    useEffect(() => {
        const checkAdminAndFetchMembers = async () => {
            try {
                // Check if user is admin
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

                // Fetch all members
                const { data: allMembers, error: membersError } = await supabase
                    .from('members')
                    .select('id, full_name, profile_picture_url')
                    .eq('is_admin', false);

                if (membersError) {
                    setError('Failed to fetch members');
                    setLoading(false);
                    return;
                }

                // Fetch all passes separately
                const { data: allPasses, error: passesError } = await supabase
                    .from('passes')
                    .select('*');

                if (passesError) {
                    console.error('Passes error:', passesError);
                    // Continue without passes - they can still see members
                }

                // Combine members with their passes
                const membersWithPasses = (allMembers || []).map(member => ({
                    ...member,
                    passes: (allPasses || []).filter(p => p.member_id === member.id)
                }));

                const sortedMembers = membersWithPasses.sort((a, b) => 
                    a.full_name.localeCompare(b.full_name)
                );

                setMembers(sortedMembers);
                setLoading(false);
            } catch (err) {
                console.error('Error:', err);
                setError('An error occurred');
                setLoading(false);
            }
        };

        checkAdminAndFetchMembers();
    }, [router]);

    const handleMarkAttendance = async (memberId: string) => {
        setMarking(memberId);
        setError('');
        setSuccess('');

        try {
            const result = await markAttendance(memberId, sessionDate);
            setSuccess(`Attendance marked for ${members.find(m => m.id === memberId)?.full_name}`);
            
            // Refresh members list
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: allMembers } = await supabase
                    .from('members')
                    .select('id, full_name, profile_picture_url')
                    .eq('is_admin', false);

                const { data: allPasses } = await supabase
                    .from('passes')
                    .select('*');

                const membersWithPasses = (allMembers || []).map(member => ({
                    ...member,
                    passes: (allPasses || []).filter(p => p.member_id === member.id)
                }));

                const sortedMembers = membersWithPasses.sort((a, b) => 
                    a.full_name.localeCompare(b.full_name)
                );

                setMembers(sortedMembers);
            }

            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to mark attendance');
        } finally {
            setMarking(null);
        }
    };

    const handleCreatePass = async (memberId: string) => {
        setCreatingPass(memberId);
        setError('');
        setSuccess('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setError('Not authenticated');
                setCreatingPass(null);
                return;
            }

            const response = await fetch('/api/passes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    memberId,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create pass');
            }

            const result = await response.json();
            setSuccess(`New pass created for ${members.find(m => m.id === memberId)?.full_name}`);
            
            // Refresh members list
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (currentSession) {
                const { data: allMembers } = await supabase
                    .from('members')
                    .select('id, full_name, profile_picture_url')
                    .eq('is_admin', false);

                const { data: allPasses } = await supabase
                    .from('passes')
                    .select('*');

                const membersWithPasses = (allMembers || []).map(member => ({
                    ...member,
                    passes: (allPasses || []).filter(p => p.member_id === member.id)
                }));

                const sortedMembers = membersWithPasses.sort((a, b) => 
                    a.full_name.localeCompare(b.full_name)
                );

                setMembers(sortedMembers);
            }

            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to create pass');
        } finally {
            setCreatingPass(null);
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
            <div className="max-w-6xl mx-auto">
                {/* Mobile: stacked | Desktop: inline */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">

                    {/* Left: Title */}
                    <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">
                        Admin Dashboard
                    </h1>

                    {/* Right: Date picker + Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">

                        {/* Action Buttons */}
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => router.push('/backup')}
                                className="flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 rounded text-xs sm:text-sm font-semibold whitespace-nowrap"
                            >
                                Biztonsági Mentés
                            </button>
                            <button
                                onClick={() => {
                                    supabase.auth.signOut();
                                    router.push('/login');
                                }}
                                className="flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 rounded text-xs sm:text-sm font-semibold whitespace-nowrap"
                            >
                                Kijelentkezés
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error & Success Messages */}
                {error && (
                    <div className="mb-4 p-4 bg-red-900 border border-red-700 rounded text-red-100 text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-4 bg-green-900 border border-green-700 rounded text-green-100 text-sm">
                        ✓ {success}
                    </div>
                )}

                <div className="mb-6 bg-glass border border-gray-700 rounded-lg p-4 backdrop-blur-sm">
                    <label className="block text-sm font-semibold mb-2">Edzés Dátuma</label>
                    <input
                        type="date"
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        className="px-4 py-2 rounded bg-gray-800 border border-gray-700 w-full max-w-xs"
                    />
                </div>

                <div className="grid gap-3 sm:gap-4">
                    {members.map((member) => {
                        const passes = Array.isArray(member.passes) ? member.passes : [];
                        const activePass = passes.find(p => p.is_active);
                        const passProgress = activePass ? (
                            <div className="text-xs sm:text-sm">
                                <span className="text-blue-400">{activePass.used_sessions}/{activePass.total_sessions}</span>
                                <span className="text-gray-400"> edzés használva</span>
                            </div>
                        ) : (
                            <div className="text-xs sm:text-sm text-yellow-400">Nincs aktív bérlet</div>
                        );

                        return (
                            <div
                                key={member.id}
                                className="bg-glass border border-gray-700 rounded-lg p-3 sm:p-4 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0"
                            >
                                {/* Member Info */}
                                <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full">
                                    {member.profile_picture_url ? (
                                        <img
                                            src={member.profile_picture_url}
                                            alt={member.full_name}
                                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-700 flex items-center justify-center text-sm sm:text-base">
                                            {member.full_name.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm sm:text-base truncate">
                                            {member.full_name}
                                        </h3>
                                        {passProgress}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => handleMarkAttendance(member.id)}
                                        disabled={marking === member.id || !activePass}
                                        title={!activePass ? "Nincs aktív bérlet" : ""}
                                        className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded font-medium text-xs sm:text-sm transition whitespace-nowrap ${marking === member.id
                                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                : activePass
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {marking === member.id ? 'Jelölés...' : 'Jelöl'}
                                    </button>
                                    <button
                                        onClick={() => handleCreatePass(member.id)}
                                        disabled={creatingPass === member.id || !!activePass}
                                        title={activePass ? "A tagnak már van aktív bérlete" : ""}
                                        className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded font-medium text-xs sm:text-sm transition whitespace-nowrap ${creatingPass === member.id
                                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                : activePass
                                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                    : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                                            }`}
                                    >
                                        {creatingPass === member.id ? 'Létrehozás...' : 'Új Bérlet'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {members.length === 0 && (
                    <div className="text-center text-gray-400 py-12">
                        No members found
                    </div>
                )}
            </div>
        </div>
    );
}
