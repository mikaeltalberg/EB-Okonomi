import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DEBUG } from "../_shared/debug.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  DEBUG.request(req.method, req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    DEBUG.log('CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
    const GITHUB_OWNER = Deno.env.get('GITHUB_OWNER') || 'mikaeltalberg';
    const GITHUB_REPO = Deno.env.get('GITHUB_REPO') || 'EB-Okonomi-UserData';

    DEBUG.api('GitHub', 'config', { 
      owner: GITHUB_OWNER, 
      repo: GITHUB_REPO,
      hasToken: !!GITHUB_TOKEN 
    });

    if (!GITHUB_TOKEN) {
      DEBUG.error('GITHUB_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'GITHUB_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { email, userData } = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    const queryEmail = url.searchParams.get('email');
    const userEmail = email || queryEmail;
    
    DEBUG.api('GitHub', 'request', { method: req.method, email: userEmail });

    if (!userEmail) {
      DEBUG.warn('Email required but not provided');
      return new Response(
        JSON.stringify({ error: 'Email required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const filePath = `users/${userEmail}.json`;
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

    DEBUG.network('GitHub API', apiUrl, { filePath });

    // GET: Fetch user data
    if (req.method === 'GET') {
      DEBUG.api('GitHub', 'getUser', { email: userEmail });
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'EB-Okonomi-App'
        }
      });

      DEBUG.response(response.status, { email: userEmail });

      if (response.status === 404) {
        DEBUG.info('User not found', { email: userEmail });
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!response.ok) {
        DEBUG.error('GitHub API error', { status: response.status, email: userEmail });
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      // Decode base64 content
      const content = JSON.parse(atob(data.content.replace(/\s/g, '')));
      
      DEBUG.api('GitHub', 'getUserSuccess', { email: userEmail });
      
      return new Response(
        JSON.stringify(content),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: Create or update user data
    if (req.method === 'POST') {
      DEBUG.api('GitHub', 'saveUser', { email: userEmail, hasData: !!userData });
      
      if (!userData) {
        DEBUG.warn('User data required but not provided');
        return new Response(
          JSON.stringify({ error: 'User data required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // First, try to get existing file to get SHA (for updates)
      let sha = null;
      try {
        DEBUG.log('Checking for existing user file', { email: userEmail });
        const getResponse = await fetch(apiUrl, {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (getResponse.ok) {
          const existingData = await getResponse.json();
          sha = existingData.sha;
          DEBUG.info('Existing user file found, will update', { email: userEmail });
        } else {
          DEBUG.info('No existing user file, will create new', { email: userEmail });
        }
      } catch (e) {
        // File doesn't exist, will create new
        DEBUG.log('File does not exist, will create new', { email: userEmail });
      }

      // Encode content to base64
      const content = btoa(JSON.stringify(userData, null, 2));
      const message = sha ? `Update user ${userEmail}` : `Create user ${userEmail}`;

      DEBUG.network('PUT', apiUrl, { email: userEmail, isUpdate: !!sha });

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          content: content,
          sha: sha // Include SHA if updating existing file
        })
      });

      DEBUG.response(response.status, { email: userEmail, isUpdate: !!sha });

      if (!response.ok) {
        const error = await response.json();
        DEBUG.error('GitHub API error on save', { 
          status: response.status, 
          error: error.message,
          email: userEmail 
        });
        throw new Error(`GitHub API error: ${error.message}`);
      }

      const result = await response.json();
      DEBUG.api('GitHub', 'saveUserSuccess', { email: userEmail, isUpdate: !!sha });
      
      return new Response(
        JSON.stringify({ success: true, user: userData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    DEBUG.error('GitHub API error', { 
      error: error.message, 
      stack: error.stack,
      method: req.method 
    });
    console.error('GitHub API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
