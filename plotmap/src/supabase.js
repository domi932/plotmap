import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Surface a readable error in the browser rather than a blank white page.
  document.body.style.cssText =
    'margin:0;background:#0f0e11;color:#e8e4dc;font-family:DM Sans,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center'
  document.body.innerHTML = `
    <div>
      <h2 style="color:#c8a96e;font-size:20px;margin-bottom:12px">Missing configuration</h2>
      <p style="color:#7a7585;font-size:14px;line-height:1.6;max-width:480px">
        Create <code style="color:#c8a96e">plotmap/.env.local</code> with your Supabase credentials:<br><br>
        <code style="color:#c8a96e">VITE_SUPABASE_URL=https://your-project.supabase.co<br>
        VITE_SUPABASE_ANON_KEY=your-anon-key<br>
        VITE_API_URL=http://localhost:8000</code><br><br>
        Then restart the dev server (<code style="color:#c8a96e">npm run dev</code>).
      </p>
    </div>`
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
