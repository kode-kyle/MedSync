const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase keys in .env.local');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const demoUsers = [
    { email: 'sclarke@medsync.jm', password: 'Doctor123!', role: 'doctor', name: 'Dr. Sandra Clarke', license: 'MD-10101' },
    { email: 'mreid@medsync.jm', password: 'Patient123!', role: 'patient', name: 'Marcus Anthony Reid', trn: '123-456-789' },
    { email: 'nwilliams@carib-pharma.jm', password: 'Pharma123!', role: 'pharmacist', name: 'Nadia Williams', pharmacy: 'Caribbean Pharma Ltd.' },
];

async function seedAuth() {
    console.log('Seeding Supabase Auth Demo Users...');
    for (const u of demoUsers) {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                console.log(`User ${u.email} already exists.`);
                continue;
            }
            console.error(`Error creating ${u.email}:`, authError.message);
            continue;
        }

        const userId = authData.user.id;
        console.log(`Created Auth User: ${u.email} (${userId})`);

        await supabaseAdmin.from('profiles').upsert({
            id: userId,
            role: u.role,
            full_name: u.name,
            email: u.email
        });

        if (u.role === 'doctor') {
            await supabaseAdmin.from('doctors').insert({ profile_id: userId, license_number: u.license, is_verified: true });
        } else if (u.role === 'pharmacist') {
            await supabaseAdmin.from('pharmacists').insert({ profile_id: userId, pharmacy_name: u.pharmacy, is_verified: true });
        } else if (u.role === 'patient') {
            await supabaseAdmin.from('patients').upsert({ profile_id: userId, trn: u.trn, full_name: u.name, date_of_birth: '1988-05-14', email: u.email });
        }
    }
    console.log('Seed complete!');
}

seedAuth();
