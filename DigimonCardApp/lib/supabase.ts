import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uvbymfdtduhbcojqxzwi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2YnltZmR0ZHVoYmNvanF4endpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2ODY5NjcsImV4cCI6MjA1NzI2Mjk2N30.AUTvCLm4onmeXZSFyWMKp7NclcndptH-MP75ALekxlY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 