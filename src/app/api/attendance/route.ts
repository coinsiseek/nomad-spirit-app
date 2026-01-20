import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase with service role key (server-side only)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
    try {
        // Verify the request is from an authorized coach/admin
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Missing or invalid authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.slice(7);

        // Verify the JWT token and check if user is an admin
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if user is an admin (you'll need to add an is_admin column to members table)
        const { data: memberData } = await supabaseAdmin
            .from('members')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!memberData?.is_admin) {
            return NextResponse.json(
                { error: 'Only admins can mark attendance' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { memberId, sessionDate } = body;

        if (!memberId || !sessionDate) {
            return NextResponse.json(
                { error: 'Missing memberId or sessionDate' },
                { status: 400 }
            );
        }

        // Get the member's active pass
        const { data: pass, error: passError } = await supabaseAdmin
            .from('passes')
            .select('*')
            .eq('member_id', memberId)
            .eq('is_active', true)
            .single();

        if (passError || !pass) {
            return NextResponse.json(
                { error: 'No active pass found for this member' },
                { status: 404 }
            );
        }

        // Check if already marked attendance for this date
        const { data: existingAttendance } = await supabaseAdmin
            .from('attendance')
            .select('id')
            .eq('pass_id', pass.id)
            .eq('session_date', sessionDate)
            .single();

        if (existingAttendance) {
            return NextResponse.json(
                { error: 'Attendance already marked for this member on this date' },
                { status: 400 }
            );
        }

        // Create attendance record
        const { data: attendance, error: attendanceError } = await supabaseAdmin
            .from('attendance')
            .insert([
                {
                    pass_id: pass.id,
                    session_date: sessionDate,
                }
            ])
            .select()
            .single();

        if (attendanceError) {
            return NextResponse.json(
                { error: 'Failed to create attendance record' },
                { status: 500 }
            );
        }

        // Increment used_sessions
        const newUsedSessions = pass.used_sessions + 1;
        const isActive = newUsedSessions < pass.total_sessions;

        const { error: updateError } = await supabaseAdmin
            .from('passes')
            .update({
                used_sessions: newUsedSessions,
                is_active: isActive,
            })
            .eq('id', pass.id);

        if (updateError) {
            return NextResponse.json(
                { error: 'Failed to update pass sessions' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            attendance,
            passStatus: {
                used_sessions: newUsedSessions,
                remaining_sessions: pass.total_sessions - newUsedSessions,
                is_active: isActive,
            },
        });
    } catch (err) {
        console.error('Error marking attendance:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
