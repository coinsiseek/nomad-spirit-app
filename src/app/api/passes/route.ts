import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase with service role key (server-side only)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
    try {
        // Verify the request is from an authorized admin
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

        // Check if user is an admin
        const { data: memberData } = await supabaseAdmin
            .from('members')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!memberData?.is_admin) {
            return NextResponse.json(
                { error: 'Only admins can create passes' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { memberId } = body;

        if (!memberId) {
            return NextResponse.json(
                { error: 'Missing memberId' },
                { status: 400 }
            );
        }

        // Check if member exists
        const { data: member, error: memberError } = await supabaseAdmin
            .from('members')
            .select('id')
            .eq('id', memberId)
            .single();

        if (memberError || !member) {
            return NextResponse.json(
                { error: 'Member not found' },
                { status: 404 }
            );
        }

        // Check if member already has an active pass
        const { data: activePass, error: activePassError } = await supabaseAdmin
            .from('passes')
            .select('id')
            .eq('member_id', memberId)
            .eq('is_active', true)
            .maybeSingle();

        if (activePassError) {
            console.error('Error checking for active pass:', activePassError.message, activePassError.details);
            return NextResponse.json(
                { error: 'Failed to check for active pass: ' + activePassError.message },
                { status: 500 }
            );
        }

        if (activePass) {
            return NextResponse.json(
                { error: 'A member can only have one active pass at a time.' },
                { status: 400 }
            );
        }

        // Create new pass
        console.log('Creating pass for member:', memberId);
        const { data: newPass, error: passError } = await supabaseAdmin
            .from('passes')
            .insert([
                {
                    member_id: memberId,
                    total_sessions: 8,
                    used_sessions: 0,
                    is_active: true,
                }
            ])
            .select()
            .single();

        if (passError) {
            console.error('Pass creation error:', passError.message, passError.details);
            return NextResponse.json(
                { error: 'Failed to create pass: ' + passError.message },
                { status: 500 }
            );
        }

        console.log('Pass created successfully:', newPass);

        return NextResponse.json({
            success: true,
            pass: newPass,
        });
    } catch (err) {
        console.error('Error creating pass:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
