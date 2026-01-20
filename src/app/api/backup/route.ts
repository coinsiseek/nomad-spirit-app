import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create admin client with service role key
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        console.log('=== BACKUP API START ===');
        console.log('Environment check:');
        console.log('- NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log('- SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            console.error('No valid auth header');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.slice(7);
        console.log('Token received');
        
        // Verify token with admin instance
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError) {
            console.error('User verification error:', userError.message);
            return NextResponse.json({ error: 'Invalid token: ' + userError.message }, { status: 401 });
        }

        if (!user) {
            console.error('No user returned from getUser');
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        console.log('User verified:', user.id);

        // Verify user is admin
        const { data: memberData, error: memberError } = await supabaseAdmin
            .from('members')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (memberError) {
            console.error('Member query error:', memberError.message);
            return NextResponse.json({ error: 'Member query error: ' + memberError.message }, { status: 500 });
        }

        if (!memberData?.is_admin) {
            console.error('User is not admin. is_admin:', memberData?.is_admin);
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        console.log('Admin verified');

        // Fetch all passes - use rpc or raw query approach
        console.log('Fetching passes...');
        const { data: passesData, error: passesError } = await supabaseAdmin
            .from('passes')
            .select('*');

        if (passesError) {
            console.error('Passes fetch error:', passesError.message);
            return NextResponse.json({ error: 'Failed to fetch passes: ' + passesError.message }, { status: 500 });
        }

        console.log('Passes fetched:', passesData?.length || 0);

        // Fetch all members
        console.log('Fetching members...');
        const { data: membersData, error: membersError } = await supabaseAdmin
            .from('members')
            .select('*');

        if (membersError) {
            console.error('Members fetch error:', membersError.message);
            return NextResponse.json({ error: 'Failed to fetch members: ' + membersError.message }, { status: 500 });
        }

        console.log('Members fetched:', membersData?.length || 0);

        // Fetch attendance data
        console.log('Fetching attendance...');
        const { data: attendanceData, error: attendanceError } = await supabaseAdmin
            .from('attendance')
            .select('*');

        if (attendanceError) {
            console.error('Attendance fetch error:', attendanceError.message);
            return NextResponse.json({ error: 'Failed to fetch attendance: ' + attendanceError.message }, { status: 500 });
        }

        console.log('Attendance fetched:', attendanceData?.length || 0);

        // Combine passes with member info
        const passesWithMembers = (passesData || []).map(pass => {
            const member = (membersData || []).find(m => m.id === pass.member_id);
            return {
                ...pass,
                member_full_name: member?.full_name,
                member_email: member?.email,
            };
        });

        const backup = {
            backup_timestamp: new Date().toISOString(),
            passes: passesWithMembers,
            members: membersData || [],
            attendance: attendanceData || [],
            summary: {
                total_passes: passesData?.length || 0,
                total_members: membersData?.length || 0,
                total_attendance_records: attendanceData?.length || 0,
            },
        };

        console.log('=== BACKUP PREPARED SUCCESSFULLY ===');

        return NextResponse.json(backup, {
            headers: {
                'Content-Disposition': `attachment; filename="nomad-spirit-backup-${new Date().toISOString().split('T')[0]}.json"`,
            },
        });
    } catch (err: any) {
        console.error('=== BACKUP API ERROR ===');
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        return NextResponse.json({ 
            error: err.message || 'Backup failed',
            type: err.constructor?.name
        }, { status: 500 });
    }
}
