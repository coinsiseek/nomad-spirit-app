import { supabase } from './supabase';

export async function ensureMemberExists() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
            console.log('No session found');
            return null;
        }

        const userId = session.user.id;
        const userEmail = session.user.email;

        // Check if member already exists
        const { data: existingMember, error: checkError } = await supabase
            .from('members')
            .select('id')
            .eq('id', userId)
            .single();

        if (existingMember) {
            console.log('Member already exists');
            return existingMember;
        }

        // Extract name from auth metadata or email
        const fullName = session.user.user_metadata?.full_name || userEmail?.split('@')[0] || 'Member';

        // Check if profile picture exists in storage
        let profilePictureUrl = null;
        try {
            const { data: fileList } = await supabase.storage
                .from('profile_pictures')
                .list(userId);

            if (fileList && fileList.length > 0) {
                const { data: { publicUrl } } = supabase.storage
                    .from('profile_pictures')
                    .getPublicUrl(`${userId}/${fileList[0].name}`);
                profilePictureUrl = publicUrl;
            }
        } catch (err) {
            console.log('No profile picture found:', err);
        }

        // Create new member
        const insertData = {
            id: userId,
            full_name: fullName,
            profile_picture_url: profilePictureUrl,
        };

        console.log('Attempting to insert member:', insertData);

        const response = await supabase
            .from('members')
            .insert([insertData])
            .select();

        console.log('Full response:', response);
        const { data: newMember, error } = response;

        if (error) {
            console.error('Error creating member:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
            });
            return null;
        }

        console.log('Member created successfully:', newMember);
        return newMember?.[0] || null;
    } catch (err) {
        console.error('Error in ensureMemberExists:', err);
        return null;
    }
}

