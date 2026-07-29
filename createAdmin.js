const url = 'https://ddbcetqueswsszzftmjh.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTMzNjM2MCwiZXhwIjoyMTAwOTEyMzYwfQ.GdBmpCH4oQZi179qrzV77r_zTRp-pQEyBHNdGi1rFUo';
fetch(`${url}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@mangaverse.local',
    password: 'admin1234',
    email_confirm: true,
    user_metadata: { displayName: 'Admin' }
  })
}).then(r => r.json()).then(console.log).catch(console.error);
