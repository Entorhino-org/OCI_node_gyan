import { OAuth2Client } from 'google-auth-library';
import logger from '../utils/logger.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

if (!GOOGLE_CLIENT_ID) {
    logger.warn('[Google Auth] GOOGLE_CLIENT_ID not set. Google authentication will not work.');
}

/**
 * Verify Google ID Token with Timeout handling
 */
export const verifyGoogleToken = async (idToken) => {
    logger.info('[Google Auth] Verification attempt started');

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Google verification timed out')), 5000)
    );

    try {
        const ticket = await Promise.race([
            client.verifyIdToken({
                idToken,
                audience: GOOGLE_CLIENT_ID,
            }),
            timeoutPromise
        ]);

        const payload = ticket.getPayload();

        if (!payload.email || !payload.email_verified) {
            logger.warn('[Google Auth] Verification failed: Email not verified or missing');
            throw new Error('Valid verified Google email is required');
        }

        logger.info(`[Google Auth] Token verified for: ${payload.email}`);

        return {
            google_id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture
        };
    } catch (err) {
        logger.error(`[Google Auth] Verification failed: ${err.message}`);
        throw new Error(err.message.includes('timed out') ? 'Auth service busy, try again' : 'Invalid Google account');
    }
};

/**
 * Optimized Handle Google OAuth Login/Signup
 */
export const handleGoogleAuth = async (supabase, idToken, role) => {
    try {
        const ALLOWED_GOOGLE_ROLES = ['STUDENT', 'TEACHER', 'ADMIN'];
        if (!ALLOWED_GOOGLE_ROLES.includes(role)) {
            logger.warn(`[Google Auth] Unauthorized role attempt: ${role}`);
            throw new Error('Google signup not allowed for this role');
        }

        // 1. Verify Google token (Fast-fail with timeout)
        const googleUser = await verifyGoogleToken(idToken);
        logger.info(`[Google Auth] Processing user: ${googleUser.email}`);

        // 2. Identify target table and fields
        let table = role === 'TEACHER' ? 'teachers' : role === 'ADMIN' ? 'schools' : role === 'DEVELOPER' ? 'system_users' : 'students';
        const emailField = role === 'ADMIN' ? 'adminEmail' : 'email';

        // Full select (with Google columns) - used when DB schema is up to date
        const selectFields = role === 'ADMIN'
            ? 'id, name, adminEmail, google_id, auth_provider'
            : role === 'DEVELOPER'
                ? 'id, name, email, google_id, role, auth_provider'
                : 'id, name, email, google_id, schoolId, auth_provider';

        // Safe select (without Google columns) - used as fallback when DB schema is missing columns
        const safeSelectFields = role === 'ADMIN'
            ? 'id, name, adminEmail'
            : role === 'DEVELOPER'
                ? 'id, name, email, role'
                : 'id, name, email, schoolId';

        // 3. Combined Performance Lookup (Single DB Trip)
        // Check for both google_id (primary) and email (secondary) in one query
        let users = [];
        let schemaHasGoogleColumns = true; // Assume true, flip if lookup fails

        // First attempt: full lookup with google_id + email
        const { data: fullData, error: findError } = await supabase
            .from(table)
            .select(`${selectFields}, ${emailField}`)
            .or(`google_id.eq.${googleUser.google_id},${emailField}.eq.${googleUser.email}`);

        if (findError) {
            const errMsg = (findError.message || '') + (findError.details || '') + (findError.hint || '');
            const isSchemaMissing = errMsg.toLowerCase().includes('column') || errMsg.toLowerCase().includes('does not exist');

            if (isSchemaMissing) {
                // [ROBUSTNESS] DB doesn't have Google columns yet — fall back to email-only lookup
                logger.warn(`[Google Auth] DB schema missing Google columns in '${table}'. Falling back to email-only lookup.`);
                schemaHasGoogleColumns = false;

                const { data: fallbackData, error: fallbackError } = await supabase
                    .from(table)
                    .select(`${safeSelectFields}, ${emailField}`)
                    .eq(emailField, googleUser.email);

                if (fallbackError) {
                    logger.error(`[Google Auth] Fallback lookup also failed: ${fallbackError.message}`);
                    throw new Error('Database lookup failed');
                }
                users = fallbackData || [];
            } else {
                logger.error(`[Google Auth] Lookup Error: ${findError.message}`);
                throw new Error('Database lookup failed');
            }
        } else {
            users = fullData || [];
        }

        // 4. Resolve found user logic
        if (users && users.length > 0) {
            // Priority: Match by google_id
            const byId = users.find(u => u.google_id === googleUser.google_id);
            if (byId) {
                logger.info(`[Google Auth] Login successful for existing user: ${byId.id}`);
                return { success: true, user: byId, isNewUser: false };
            }

            // Secondary: Match by email (Account Linking required)
            const byEmail = users.find(u => u[emailField] === googleUser.email);
            if (byEmail) {
                if (byEmail.google_id && byEmail.google_id !== googleUser.google_id) {
                    logger.warn(`[Google Auth] Account link conflict for ${googleUser.email}: already linked to diff ID`);
                    throw new Error('Email is already linked to another Google profile');
                }

                logger.info(`[Google Auth] Linking account: ${byEmail.id}`);
                if (schemaHasGoogleColumns) {
                    try {
                        const { data: linked, error: linkError } = await supabase
                            .from(table)
                            .update({
                                google_id: googleUser.google_id,
                                auth_provider: 'google',
                                oauth_linked_at: new Date().toISOString()
                            })
                            .eq('id', byEmail.id)
                            .is('google_id', null) // Safety guard
                            .select(selectFields)
                            .single();

                        if (linkError) throw linkError;
                        return { success: true, user: linked, isNewUser: false, accountLinked: true };
                    } catch (linkErr) {
                        logger.warn(`[Google Auth] Link failed (likely schema missing): ${linkErr.message}`);
                        return { success: true, user: byEmail, isNewUser: false, accountLinked: false };
                    }
                } else {
                    // Schema doesn't have Google columns — just return the found user
                    logger.info(`[Google Auth] Schema missing Google cols, returning existing user without linking.`);
                    return { success: true, user: byEmail, isNewUser: false, accountLinked: false };
                }
            }
        }

        // 5. Creation Flow (User not found)
        logger.info(`[Google Auth] Creating new ${role} profile for ${googleUser.email}`);

        let newUserData = {
            id: `USR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            [emailField]: googleUser.email,
            google_id: googleUser.google_id,
            auth_provider: 'google',
            oauth_linked_at: new Date().toISOString(),
            password: null
        };

        // Role mapping for new user creation
        if (role === 'STUDENT') {
            const baseName = googleUser.email.split('@')[0];
            newUserData = { ...newUserData, name: googleUser.name, username: `${baseName}_${Math.floor(100 + Math.random() * 899)}`, status: 'Active', attendance: 100, avgScore: 0 };
        } else if (role === 'TEACHER') {
            newUserData = { ...newUserData, name: googleUser.name, joinedAt: new Date().toISOString(), assignedClasses: [] };
        } else if (role === 'ADMIN') {
            // Admin -> creates a school record with basic info from Google
            const inviteCode = `SCH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            newUserData = {
                ...newUserData,
                name: googleUser.name ? `${googleUser.name}'s School` : 'My School',
                inviteCode,
                studentCount: 0,
                maxStudents: 200,
                subscriptionStatus: 'trial'
            };
        } else {
            newUserData = { ...newUserData, name: googleUser.name };
        }

        if (!schemaHasGoogleColumns) {
            // DB schema is missing Google columns — insert without them
            logger.warn(`[Google Auth] Creating new user without Google columns (DB schema not updated).`);
            delete newUserData.google_id;
            delete newUserData.auth_provider;
            delete newUserData.oauth_linked_at;
        }

        const insertSelect = schemaHasGoogleColumns ? selectFields : safeSelectFields;

        const { data: newUser, error: createError } = await supabase
            .from(table)
            .insert([newUserData])
            .select(insertSelect)
            .single();

        if (createError) {
            if (createError.code === '23505') { // Unique constraint conflict race
                const lookupField = schemaHasGoogleColumns ? 'google_id' : emailField;
                const lookupValue = schemaHasGoogleColumns ? googleUser.google_id : googleUser.email;
                const { data: winner } = await supabase.from(table).select(insertSelect).eq(lookupField, lookupValue).single();
                if (winner) return { success: true, user: winner, isNewUser: false };
            }
            logger.error(`[Google Auth] Create Error: ${createError.message}`);
            throw new Error(createError.message);
        }

        logger.info(`[Google Auth] Successfully created new user: ${newUser.id}`);
        return { success: true, user: newUser, isNewUser: true };

    } catch (err) {
        logger.error(`[Google Auth] Global Error: ${err.message}`);
        return {
            success: false,
            error: err.message || 'Authentication failed. Please try again.'
        };
    }
};

/**
 * Link Google Account manually (Optional component)
 */
export const linkGoogleAccount = async (supabase, userId, idToken, role) => {
    try {
        const googleUser = await verifyGoogleToken(idToken);
        const table = role === 'TEACHER' ? 'teachers' : role === 'ADMIN' ? 'schools' : 'students';

        const { data: updated, error } = await supabase
            .from(table)
            .update({ google_id: googleUser.google_id, auth_provider: 'google', oauth_linked_at: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, user: updated };
    } catch (err) {
        return { success: false, error: err.message };
    }
};
