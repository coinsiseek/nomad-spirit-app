import { supabase } from './supabase';

export async function markAttendance(memberId: string, sessionDate: string) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                memberId,
                sessionDate,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to mark attendance');
        }

        return await response.json();
    } catch (err) {
        console.error('Error marking attendance:', err);
        throw err;
    }
}

export async function getActivePass(memberId: string) {
    try {
        const { data, error } = await supabase
            .from('passes')
            .select('*')
            .eq('member_id', memberId)
            .eq('is_active', true)
            .single();

        if (error) {
            console.error('Error fetching active pass:', error);
            return null;
        }

        return data;
    } catch (err) {
        console.error('Error in getActivePass:', err);
        return null;
    }
}

export async function getAttendanceRecords(passId: string) {
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('session_date')
            .eq('pass_id', passId)
            .order('session_date', { ascending: true });

        if (error) {
            console.error('Error fetching attendance:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Error in getAttendanceRecords:', err);
        return [];
    }
}
